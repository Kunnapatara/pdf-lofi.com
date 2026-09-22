/**
 * Lemon Squeezy Webhooks Architecture
 * - Verifies HMAC SHA-256 signatures with timing-safe comparison
 * - Enforces idempotency via saasStore event ledger
 * - Handles subscription lifecycle events without duplicating records
 * - Separates provider IDs from internal IDs
 */
import crypto from 'crypto';
import { saasStore, PLANS } from '../storage/saasStore';
import { SubscriptionStatus } from '../../types/saas';

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
  status: 'processed' | 'already_processed' | 'ignored' | 'error';
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
        const customerId = attrs.customer_id ? String(attrs.customer_id) : null;
        const orderId = attrs.order_id ? String(attrs.order_id) : null;
        const variantId = attrs.variant_id ? String(attrs.variant_id) : null;
        const rawStatus = attrs.status || 'active';
        const mappedStatus = mapLemonSqueezyStatus(rawStatus);

        // Resolve userId: prefer custom_data.user_id passed during checkout
        let targetUserId = customData?.user_id as string | undefined;

        // Fallback: look up by existing subscription with this providerSubId
        if (!targetUserId) {
          const existing = saasStore.findSubscriptionByLemonSqueezyId(providerSubId);
          if (existing) {
            targetUserId = existing.userId;
          }
        }

        // Fallback: look up by customerId
        if (!targetUserId && customerId) {
          const existing = saasStore.findSubscriptionByCustomerId(customerId);
          if (existing) {
            targetUserId = existing.userId;
          }
        }

        // Fallback: default user for single-tenant / local development
        if (!targetUserId) {
          targetUserId = saasStore.getDefaultUser().id;
        }

        const currentSub = saasStore.getSubscription(targetUserId);

        // Check plan mapping: if variant corresponds to Pro or status is active
        const isPro =
          (variantId && variantId === process.env.LEMON_SQUEEZY_PRO_VARIANT_ID) ||
          mappedStatus === 'active' ||
          mappedStatus === 'trialing';

        const updatedSub = {
          ...currentSub,
          planId: isPro && mappedStatus !== 'expired' && mappedStatus !== 'unpaid' ? ('pro' as const) : ('free' as const),
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
        };

        saasStore.updateSubscription(updatedSub);

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
        // One-time order or initial invoice
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
