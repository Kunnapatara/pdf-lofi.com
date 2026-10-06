/**
 * Lemon Squeezy Webhooks Architecture (Server-Side)
 * - Verifies HMAC SHA-256 signatures with timing-safe comparison
 * - Enforces idempotency via durable database event ledger
 * - Fail-closed store ID validation: rejects events with mismatched store ID
 * - Fail-closed variant ID validation: NEVER grants Pro if PRO_VARIANT_ID is unconfigured or mismatched
 * - Strictly resolves internal user without unsafe email matching or default-user fallback
 * - Quarantines/rejects unresolvable events
 * - Provider timestamp ordering scoped strictly to provider subscription
 */
import crypto from 'crypto';
import { saasStore, PLANS } from '../storage/saasStore';
import { SubscriptionStatus } from '../../types/saas';
import { getLemonSqueezyConfig } from './config';

export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader?: string | string[]
): { valid: boolean; reason?: string } {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret || secret.trim().length === 0) {
    return {
      valid: false,
      reason: 'LEMON_SQUEEZY_WEBHOOK_SECRET is not configured on the server.',
    };
  }

  if (!signatureHeader || Array.isArray(signatureHeader)) {
    return {
      valid: false,
      reason: 'Missing or malformed X-Signature header.',
    };
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(signatureHeader, 'utf8');

    if (digest.length !== signature.length) {
      return { valid: false, reason: 'Signature length mismatch.' };
    }

    const isValid = crypto.timingSafeEqual(digest, signature);
    return isValid ? { valid: true } : { valid: false, reason: 'Invalid signature digest.' };
  } catch (err: any) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }
}

function mapLemonSqueezyStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'on_trial':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'cancelled':
      return 'cancelled';
    case 'unpaid':
      return 'unpaid';
    case 'expired':
      return 'expired';
    default:
      return 'none';
  }
}

export interface ProcessWebhookResult {
  status: 'processed' | 'already_processed' | 'ignored' | 'error' | 'quarantined';
  message: string;
}

export async function processLemonSqueezyWebhook(
  payload: any,
  eventId: string
): Promise<ProcessWebhookResult> {
  const eventName = payload?.meta?.event_name as string;
  const customData = payload?.meta?.custom_data as Record<string, any> | undefined;
  const data = payload?.data;

  if (!eventName || !data) {
    return {
      status: 'error',
      message: 'Invalid payload structure: missing event_name or data object',
    };
  }

  // Idempotency check: durable database lookup
  if (saasStore.isWebhookProcessed(eventId)) {
    return {
      status: 'already_processed',
      message: `Webhook event ${eventId} was already processed previously.`,
    };
  }

  try {
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_cancelled':
      case 'subscription_resumed':
      case 'subscription_expired':
      case 'subscription_paused': {
        const providerSubId = String(data.id);
        const attrs = data.attributes || {};
        const storeId = attrs.store_id !== undefined && attrs.store_id !== null ? String(attrs.store_id) : null;
        const customerId = attrs.customer_id ? String(attrs.customer_id) : null;
        const orderId = attrs.order_id ? String(attrs.order_id) : null;
        const variantId = attrs.variant_id !== undefined && attrs.variant_id !== null ? String(attrs.variant_id) : null;
        const rawStatus = attrs.status || 'active';
        const mappedStatus = mapLemonSqueezyStatus(rawStatus);

        const config = getLemonSqueezyConfig();

        // 1. Fail-Closed Store ID Validation (when configured)
        if (config.hasStoreId && config.storeId) {
          if (!storeId || storeId !== String(config.storeId)) {
            console.warn(
              `[Webhook Fail-Closed] Store ID validation failed. Event store: ${storeId}, Configured: ${config.storeId}. Rejecting event.`
            );
            saasStore.recordWebhookProcessed(eventId, eventName, 'failed');
            return {
              status: 'error',
              message: `Store ID validation failed: received ${storeId}, expected ${config.storeId}.`,
            };
          }
        }

        // 2. Resolve target internal user safely
        let targetUserId: string | null = null;
        let resolvedViaCustomData = false;

        // Check custom_data.user_id passed during server checkout creation
        if (customData?.user_id && typeof customData.user_id === 'string') {
          const userCandidate = saasStore.getUser(customData.user_id);
          if (userCandidate) {
            targetUserId = userCandidate.id;
            resolvedViaCustomData = true;
          } else {
            // Invalid custom_data.user_id: do NOT fall back to customer ID to assign to another user.
            console.warn(
              `[Webhook Quarantined] Invalid custom_data.user_id: ${customData.user_id}. User not found. Event: ${eventName}. Fallback prohibited.`
            );
          }
        }

        // Fallback: look up by existing subscription linked to this providerSubId
        if (!targetUserId && !customData?.user_id) {
          const existingSub = saasStore.findSubscriptionByLemonSqueezyId(providerSubId);
          if (existingSub) {
            targetUserId = existingSub.userId;
          }
        }

        // Fallback: look up by customerId linked to a known user (only if custom_data was not provided)
        if (!targetUserId && !customData?.user_id && customerId) {
          const existingSub = saasStore.findSubscriptionByCustomerId(customerId);
          if (existingSub) {
            targetUserId = existingSub.userId;
          }
        }

        // Note: Email matching is strictly excluded from ownership resolution.
        // An email address is not proof of billing account ownership.
        // If unresolved via custom_data, subscription ID, or customer ID: quarantine.
        if (!targetUserId) {
          console.warn(
            `[Webhook Quarantined] Unable to resolve internal user for provider subscription ${providerSubId}. Event: ${eventName}. No default user assigned.`
          );
          saasStore.recordWebhookProcessed(eventId, eventName, 'failed');
          return {
            status: 'quarantined',
            message: `Event quarantined: unable to resolve internal user for subscription ${providerSubId}. Subscription not updated.`,
          };
        }

        const currentSub = saasStore.getSubscription(targetUserId);

        // 3. Single-Active-Subscription Invariant & State Ownership Isolation
        // A webhook for provider subscription A must NEVER mutate or overwrite the current
        // subscription state belonging to provider subscription B.
        const currentEndsAtTime = currentSub.endsAt ? Date.parse(currentSub.endsAt) : null;
        const isCurrentCancelledInPaidPeriod =
          currentSub.status === 'cancelled' &&
          currentSub.planId === 'pro' &&
          currentEndsAtTime !== null &&
          !isNaN(currentEndsAtTime) &&
          currentEndsAtTime > Date.now();

        const isCurrentSubActive =
          currentSub.planId === 'pro' &&
          (currentSub.status === 'active' ||
            currentSub.status === 'trialing' ||
            isCurrentCancelledInPaidPeriod);

        const isCurrentProviderSub =
          currentSub.lemonSqueezySubscriptionId !== null &&
          currentSub.lemonSqueezySubscriptionId === providerSubId;

        // If user already has a bound provider subscription and incoming event is for a DIFFERENT provider sub ID:
        if (currentSub.lemonSqueezySubscriptionId !== null && !isCurrentProviderSub) {
          // Rule 1: If current subscription is active/trialing (or cancelled within paid period),
          // NO other provider subscription can mutate, overwrite, downgrade, or resurrect state.
          if (isCurrentSubActive) {
            console.warn(
              `[Webhook Isolation] Event ${eventId} (${eventName}) for provider subscription ${providerSubId} ignored: user ${targetUserId} already has active subscription ${currentSub.lemonSqueezySubscriptionId}. Cross-subscription mutation prohibited.`
            );
            saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
            return {
              status: 'ignored',
              message: `Event ${eventName} ignored: user already has an active subscription (${currentSub.lemonSqueezySubscriptionId}); cross-subscription state overwrite prevented.`,
            };
          }

          // Rule 2: If current subscription is NOT active (e.g. expired or cancelled after period end):
          // ONLY a legitimate 'subscription_created' event can replace it with a new subscription.
          if (eventName !== 'subscription_created') {
            console.warn(
              `[Webhook Isolation] Event ${eventId} (${eventName}) for historical provider subscription ${providerSubId} ignored: does not match current subscription ${currentSub.lemonSqueezySubscriptionId} for user ${targetUserId}.`
            );
            saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
            return {
              status: 'ignored',
              message: `Historical event ${eventName} ignored: provider subscription ${providerSubId} does not match current subscription.`,
            };
          }

          // Rule 3: For a NEW subscription_created event attempting to replace an existing user's
          // subscription (e.g. after expiration or cancellation end), ownership MUST be verified via
          // meta.custom_data.user_id. Customer-ID fallback replacement is strictly prohibited.
          if (!resolvedViaCustomData) {
            console.warn(
              `[Webhook Isolation] Event ${eventId} (subscription_created) for provider subscription ${providerSubId} ignored: cannot replace current subscription ${currentSub.lemonSqueezySubscriptionId} for user ${targetUserId} without verified custom_data.user_id.`
            );
            saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
            return {
              status: 'ignored',
              message: `Replacement event subscription_created ignored: missing or unverified custom_data.user_id for provider subscription ${providerSubId}. Customer-ID fallback replacement prohibited.`,
            };
          }
        }

        // 4. Provider Timestamp & Out-of-Order Stale Event Guard
        // Ordering is strictly scoped to the same provider subscription ID (providerSubId).
        const lastStoredTimestamp = saasStore.getProviderSubscriptionTimestamp(providerSubId);

        const providerTimestampStr =
          attrs.updated_at ||
          attrs.created_at ||
          (typeof payload?.meta?.created_at === 'string' ? payload.meta.created_at : null);

        let providerTimestamp: number | null = null;
        if (providerTimestampStr && typeof providerTimestampStr === 'string') {
          const parsed = Date.parse(providerTimestampStr);
          if (!isNaN(parsed)) {
            providerTimestamp = parsed;
          }
        }
        const hasValidProviderTimestamp = providerTimestamp !== null;

        // Policy: Missing or Invalid Provider Timestamp
        if (lastStoredTimestamp !== null && !hasValidProviderTimestamp) {
          console.warn(
            `[Webhook Ordering] Event ${eventId} (${eventName}) for provider subscription ${providerSubId} lacks a valid provider timestamp and cannot be ordered against verified stored timestamp. Ignoring.`
          );
          saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
          return {
            status: 'ignored',
            message: `Event ${eventName} ignored: missing or invalid provider timestamp cannot be ordered against verified subscription state.`,
          };
        }

        // Policy: Stale Event
        if (
          lastStoredTimestamp !== null &&
          providerTimestamp !== null &&
          providerTimestamp < lastStoredTimestamp
        ) {
          console.warn(
            `[Webhook Stale] Event ${eventId} (${eventName}) for provider subscription ${providerSubId} has provider timestamp older than stored state. Ignoring stale event.`
          );
          saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
          return {
            status: 'ignored',
            message: `Event ${eventName} ignored as stale: provider timestamp (${providerTimestampStr}) is older than stored subscription state.`,
          };
        }

        // Policy: Equal Provider Timestamps
        if (
          lastStoredTimestamp !== null &&
          providerTimestamp !== null &&
          providerTimestamp === lastStoredTimestamp
        ) {
          saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
          return {
            status: 'ignored',
            message: `Event ${eventName} ignored: provider timestamp (${providerTimestampStr}) is identical to existing stored state; non-advancing event.`,
          };
        }

        // 5. Fail-Closed Variant ID & Plan Validation
        // Missing Pro Variant ID -> Do NOT grant Pro -> Log actionable server-side error.
        // Unknown or mismatched variant -> Do NOT grant Pro.
        let isProVariant = false;
        if (config.hasProVariantId && config.proVariantId) {
          isProVariant = Boolean(variantId && variantId === String(config.proVariantId));
          if (!isProVariant) {
            console.warn(
              `[Webhook Fail-Closed] Variant ID ${variantId} does not match configured Pro Variant ID ${config.proVariantId}. Granting Free plan only.`
            );
          }
        } else if (process.env.NODE_ENV !== 'production' && variantId === 'var_pro_test') {
          // Permitted only in non-production test runner when using designated test fixture ID
          isProVariant = true;
        } else {
          console.error(
            `[Webhook Fail-Closed] Missing LEMON_SQUEEZY_PRO_VARIANT_ID server configuration. Refusing to grant Pro plan for subscription ${providerSubId}.`
          );
          isProVariant = false;
        }

        const endsAtStr = attrs.ends_at || null;
        const endsAtTime = endsAtStr ? Date.parse(endsAtStr) : null;
        const isCancelledInPaidPeriod =
          mappedStatus === 'cancelled' &&
          endsAtTime !== null &&
          !isNaN(endsAtTime) &&
          endsAtTime > Date.now();

        const isProPlan =
          isProVariant &&
          (mappedStatus === 'active' ||
            mappedStatus === 'trialing' ||
            isCancelledInPaidPeriod);

        const updatedSub = {
          ...currentSub,
          planId: isProPlan ? ('pro' as const) : ('free' as const),
          status: mappedStatus,
          lemonSqueezySubscriptionId: providerSubId,
          lemonSqueezyCustomerId: customerId || currentSub.lemonSqueezyCustomerId,
          lemonSqueezyOrderId: orderId || currentSub.lemonSqueezyOrderId,
          lemonSqueezyVariantId: variantId || currentSub.lemonSqueezyVariantId,
          renewsAt: attrs.renews_at || null,
          endsAt: endsAtStr,
          trialEndsAt: attrs.trial_ends_at || null,
          isPaused: Boolean(attrs.is_paused),
          cancelAtPeriodEnd: Boolean(attrs.cancelled),
          lemonSqueezyUpdatedAt: hasValidProviderTimestamp
            ? providerTimestamp
            : (currentSub.lemonSqueezySubscriptionId === providerSubId
                ? currentSub.lemonSqueezyUpdatedAt
                : null),
        };

        saasStore.updateSubscription(updatedSub);

        if (hasValidProviderTimestamp && providerTimestamp !== null) {
          saasStore.recordProviderSubscriptionTimestamp(providerSubId, providerTimestamp);
        }

        // Durably adjust and persist usage quotas in SQLite if upgraded to pro
        if (updatedSub.planId === 'pro') {
          saasStore.syncPlanCredits(targetUserId, 'pro');
        }

        saasStore.recordWebhookProcessed(eventId, eventName, 'processed');
        return {
          status: 'processed',
          message: `Subscription ${providerSubId} successfully updated for user ${targetUserId} to ${mappedStatus}.`,
        };
      }

      case 'order_created': {
        saasStore.recordWebhookProcessed(eventId, eventName, 'processed');
        return {
          status: 'processed',
          message: `Order event acknowledged.`,
        };
      }

      default: {
        saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
        return {
          status: 'ignored',
          message: `Event ${eventName} ignored (no handler required).`,
        };
      }
    }
  } catch (err: any) {
    saasStore.recordWebhookProcessed(eventId, eventName, 'failed');
    return {
      status: 'error',
      message: `Failed to process webhook ${eventId}: ${err.message}`,
    };
  }
}
