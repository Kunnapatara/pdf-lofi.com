/**
 * Billing, Subscription, Entitlements & Usage API Routes
 * Server-authoritative state management.
 * - Identity derived EXCLUSIVELY from validated server sessions (requireAuth)
 * - Ignores all client-supplied user identifiers (x-user-id header, body.userId)
 * - Returns 401 Unauthorized when unauthenticated — NO silent fallback to default user
 */
import { Router, Response } from 'express';
import { saasStore, PLANS } from '../storage/saasStore';
import { getLemonSqueezyConfig } from '../lemonSqueezy/config';
import { createLemonSqueezyCheckout, getCustomerPortalUrl } from '../lemonSqueezy/client';
import { requireAuth, AuthenticatedRequest } from '../auth/session';
import { BillingStateResponse } from '../../types/saas';

export const billingRouter = Router();

// Public plan catalog (no authentication required)
billingRouter.get('/plans', (_req, res) => {
  res.json({
    plans: Object.values(PLANS),
    lemonSqueezyConfig: getLemonSqueezyConfig(),
  });
});

// Integration status check (public)
billingRouter.get('/status', (_req, res) => {
  const config = getLemonSqueezyConfig();
  res.json({ config });
});

// --------------------------------------------------------------------------
// PROTECTED ROUTES: Strictly require valid, signed session authentication
// --------------------------------------------------------------------------

/**
 * GET /api/billing/state
 * Aggregated state snapshot for authenticated user
 */
billingRouter.get('/state', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const subscription = saasStore.getSubscription(user.id);
  const plan = PLANS[subscription.planId] || PLANS.free;
  const entitlements = saasStore.getEntitlements(user.id);
  const usage = saasStore.getUsage(user.id);
  const lemonSqueezyConfig = getLemonSqueezyConfig();

  const response: BillingStateResponse = {
    user,
    subscription,
    plan,
    entitlements,
    usage,
    lemonSqueezyConfig,
  };

  res.json(response);
});

/**
 * GET /api/billing/subscription or /api/subscription
 * Authenticated user's active subscription
 */
billingRouter.get('/subscription', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const subscription = saasStore.getSubscription(user.id);
  const plan = PLANS[subscription.planId] || PLANS.free;

  res.json({
    subscription,
    plan,
  });
});

/**
 * GET /api/billing/entitlements or /api/entitlements
 * Authenticated user's active entitlements
 */
billingRouter.get('/entitlements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const entitlements = saasStore.getEntitlements(user.id);
  res.json({ entitlements });
});

/**
 * GET /api/billing/usage or /api/usage
 * Authenticated user's usage and credits
 */
billingRouter.get('/usage', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const usage = saasStore.getUsage(user.id);
  res.json({ usage });
});

/**
 * POST /api/billing/usage/record or /api/usage/record
 * Record operation usage for the authenticated user.
 * Identity is strictly server-authoritative; any body.userId is discarded.
 */
billingRouter.post('/usage/record', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { operationType, description, creditsCost } = req.body || {};

  const result = saasStore.recordUsage(
    user.id,
    operationType || 'pdf_operation',
    description || 'PDF operation executed',
    typeof creditsCost === 'number' ? creditsCost : 0
  );

  if (!result.allowed) {
    return res.status(402).json({
      error: 'PAYMENT_REQUIRED',
      message: result.error,
      usage: result.usage,
    });
  }

  res.json({
    success: true,
    usage: result.usage,
  });
});

/**
 * Process a checkout request with authoritative server-side single-subscription check.
 * Blocks duplicate active/trialing/cancelled-in-period Pro subscriptions.
 */
export async function handleCheckoutRequest(
  userId: string,
  userEmail: string,
  userName: string,
  planId: string = 'pro',
  redirectUrl?: string
): Promise<{ status: number; body: any }> {
  const targetPlan = PLANS[planId as 'free' | 'pro'];
  if (!targetPlan || targetPlan.id === 'free') {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Free plan does not require a payment checkout.',
      },
    };
  }

  // Authoritative server-side single-subscription check
  const currentSub = saasStore.getSubscription(userId);
  const endsAtTime = currentSub.endsAt ? Date.parse(currentSub.endsAt) : null;
  const isCancelledInPaidPeriod =
    currentSub.status === 'cancelled' &&
    currentSub.planId === 'pro' &&
    endsAtTime !== null &&
    !isNaN(endsAtTime) &&
    endsAtTime > Date.now();

  const isAlreadyActive =
    currentSub.planId === 'pro' &&
    (currentSub.status === 'active' ||
      currentSub.status === 'trialing' ||
      isCancelledInPaidPeriod);

  if (isAlreadyActive) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'An active Pro subscription already exists. Manage your subscription from billing.',
      },
    };
  }

  const result = await createLemonSqueezyCheckout({
    userId, // Strictly server-derived from authenticated session
    userEmail,
    userName,
    variantId: targetPlan.lemonSqueezyVariantId || undefined,
    redirectUrl,
  });

  return {
    status: 200,
    body: result,
  };
}

/**
 * POST /api/billing/checkout
 * Create Lemon Squeezy Checkout for the authenticated user.
 * Target userId is locked to req.user.id.
 */
billingRouter.post('/checkout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { planId = 'pro', redirectUrl } = req.body || {};

  const result = await handleCheckoutRequest(
    user.id,
    user.email,
    user.name,
    planId,
    redirectUrl
  );

  res.status(result.status).json(result.body);
});

/**
 * GET /api/billing/portal
 * Get Lemon Squeezy Customer Billing Portal for the authenticated user.
 * Customer ID lookup is strictly bound to req.user.id.
 */
billingRouter.get('/portal', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sub = saasStore.getSubscription(user.id);

  if (!sub.lemonSqueezyCustomerId) {
    return res.status(400).json({
      success: false,
      error: 'No Lemon Squeezy customer record associated with this account.',
    });
  }

  const result = await getCustomerPortalUrl(sub.lemonSqueezyCustomerId);
  res.json(result);
});
