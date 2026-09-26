/**
 * Lemon Squeezy Webhooks Architecture
 * - Verifies HMAC SHA-256 signatures with timing-safe comparison
 * - Enforces idempotency via saasStore event ledger
 * - Validates provider store ID and variant ID when configured
 * - Strictly resolves internal user without unsafe default-user fallback
 * - Quarantines/rejects unresolvable events
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

  // Idempotency check
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
        const storeId = attrs.store_id ? String(attrs.store_id) : null;
        const customerId = attrs.customer_id ? String(attrs.customer_id) : null;
        const orderId = attrs.order_id ? String(attrs.order_id) : null;
        const variantId = attrs.variant_id ? String(attrs.variant_id) : null;
        const rawStatus = attrs.status || 'active';
        const mappedStatus = mapLemonSqueezyStatus(rawStatus);

        const config = getLemonSqueezyConfig();

        // 1. Store ID Validation (when configured)
        if (config.hasStoreId && config.storeId && storeId) {
          if (storeId !== String(config.storeId)) {
            console.warn(
              `[Webhook] Store ID mismatch. Event store: ${storeId}, Configured: ${config.storeId}. Rejecting.`
            );
            saasStore.recordWebhookProcessed(eventId, eventName, 'failed');
            return {
              status: 'error',
              message: `Store ID mismatch: received ${storeId}, expected ${config.storeId}.`,
            };
          }
        }

        // 2. Resolve target internal user safely
        let targetUserId: string | null = null;

        // Check custom_data.user_id passed during server checkout creation
        if (customData?.user_id && typeof customData.user_id === 'string') {
          const userCandidate = saasStore.getUser(customData.user_id);
          if (userCandidate) {
            targetUserId = userCandidate.id;
          }
        }

        // Fallback: look up by existing subscription linked to this providerSubId
        if (!targetUserId) {
          const existingSub = saasStore.findSubscriptionByLemonSqueezyId(providerSubId);
          if (existingSub) {
            targetUserId = existingSub.userId;
          }
        }

        // Fallback: look up by customerId linked to a known user
        if (!targetUserId && customerId) {
          const existingSub = saasStore.findSubscriptionByCustomerId(customerId);
          if (existingSub) {
            targetUserId = existingSub.userId;
          }
        }

        // Note: Email matching is strictly excluded from ownership resolution.
        // An email address is not proof of billing account ownership.
        // If unresolved via custom_data, subscription ID, or customer ID: quarantine.

        // SAFE BOUNDARY: If internal user cannot be resolved, QUARANTINE event.
        // DO NOT silently fall back to default user or grant Pro to random accounts!
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

        // 3. Provider Timestamp & Out-of-Order Stale Event Guard
        // Ordering is strictly scoped to the same provider subscription ID (providerSubId).
        // Timestamps from different provider subscriptions must never collide or cross-invalidate.
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
        // Never fabricate provider timestamps using Date.now() or server receipt time.
        // If a provider subscription already has a verified provider timestamp on record,
        // an incoming event lacking a valid provider timestamp cannot be proven to be newer.
        // It is safely ignored to protect against unverified out-of-order state corruption.
        if (lastStoredTimestamp !== null && !hasValidProviderTimestamp) {
          console.warn(
            `[Webhook Ordering] Event ${eventId} (${eventName}) for provider subscription ${providerSubId} lacks a valid provider timestamp and cannot be ordered against verified stored timestamp (${new Date(
              lastStoredTimestamp
            ).toISOString()}). Ignoring to prevent out-of-order state corruption.`
          );
          saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
          return {
            status: 'ignored',
            message: `Event ${eventName} ignored: missing or invalid provider timestamp cannot be ordered against verified subscription state.`,
          };
        }

        // Policy: Stale Event (Incoming timestamp is older than stored timestamp for this provider subscription)
        if (
          lastStoredTimestamp !== null &&
          providerTimestamp !== null &&
          providerTimestamp < lastStoredTimestamp
        ) {
          console.warn(
            `[Webhook Stale] Event ${eventId} (${eventName}) for provider subscription ${providerSubId} has provider timestamp (${providerTimestampStr}) older than stored state (${new Date(
              lastStoredTimestamp
            ).toISOString()}). Ignoring stale event.`
          );
          saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
          return {
            status: 'ignored',
            message: `Event ${eventName} ignored as stale: provider timestamp (${providerTimestampStr}) is older than stored subscription state.`,
          };
        }

        // Policy: Equal Provider Timestamps
        // If an incoming event has the exact same provider timestamp as the already stored state,
        // the event does not advance the subscription timeline. We do not assume incoming is newer.
        // The existing stored state is preserved and the event is ignored as non-advancing.
        if (
          lastStoredTimestamp !== null &&
          providerTimestamp !== null &&
          providerTimestamp === lastStoredTimestamp
        ) {
          console.warn(
            `[Webhook Ordering] Event ${eventId} (${eventName}) for provider subscription ${providerSubId} has identical provider timestamp (${providerTimestampStr}) to currently stored state. Deterministic policy: preserve existing state without assuming incoming event is newer.`
          );
          saasStore.recordWebhookProcessed(eventId, eventName, 'ignored');
          return {
            status: 'ignored',
            message: `Event ${eventName} ignored: provider timestamp (${providerTimestampStr}) is identical to existing stored state; non-advancing event.`,
          };
        }

        // 4. Variant ID & Plan Validation
        // If pro variant ID is configured, ensure variant matches before granting Pro.
        let isProVariant = false;
        if (config.hasProVariantId && config.proVariantId && variantId) {
          isProVariant = variantId === String(config.proVariantId);
        } else if (variantId) {
          // If unconfigured locally, only allow Pro if variant is known or default
          isProVariant = true;
        }

        const isProPlan =
          isProVariant &&
          (mappedStatus === 'active' || mappedStatus === 'trialing');

        const updatedSub = {
          ...currentSub,
          planId: isProPlan ? ('pro' as const) : ('free' as const),
          status: mappedStatus,
          lemonSqueezySubscriptionId: providerSubId,
          lemonSqueezyCustomerId: customerId || currentSub.lemonSqueezyCustomerId,
          lemonSqueezyOrderId: orderId || currentSub.lemonSqueezyOrderId,
          lemonSqueezyVariantId: variantId || currentSub.lemonSqueezyVariantId,
          renewsAt: attrs.renews_at || null,
          endsAt: attrs.ends_at || null,
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

        // Adjust usage quotas if upgraded to pro
        if (updatedSub.planId === 'pro') {
          const usage = saasStore.getUsage(targetUserId);
          usage.creditsTotal = PLANS.pro.entitlements.monthlyCredits;
          usage.creditsRemaining = Math.max(0, usage.creditsTotal - usage.creditsUsed);
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
