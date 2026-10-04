/**
 * Billing, Subscription, Entitlements & Usage API Routes
 * Server-authoritative state management.
 * - Identity derived EXCLUSIVELY from validated server sessions (requireAuth)
 * - Ignores all client-supplied user identifiers (x-user-id header, body.userId)
 * - Rejects client-supplied credit costs; strictly enforces canonical pricing
 * - Validates checkout redirect URLs against server-controlled origin (rejects external open redirects)
 * - Returns 401 Unauthorized when unauthenticated — NO silent fallback to default user
 */
import { Router, Response } from 'express';
import { saasStore, PLANS } from '../storage/saasStore';
import { getLemonSqueezyConfig } from '../lemonSqueezy/config';
import { createLemonSqueezyCheckout, getCustomerPortalUrl } from '../lemonSqueezy/client';
import { requireAuth, AuthenticatedRequest } from '../auth/session';
import { BillingStateResponse } from '../../types/saas';
import { getCanonicalOperation } from '../storage/operationCosts';

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
 * - Identity is strictly server-authoritative; any body.userId is discarded
 * - Operation cost is derived EXCLUSIVELY from canonical server definitions
 * - Client-supplied creditsCost is NEVER trusted
 * - Unknown operation types are rejected with 400 Bad Request
 * - Idempotency keys protect against duplicate charge on network retries
 */
billingRouter.post('/usage/record', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { operationType, description, idempotencyKey } = req.body || {};

  if (!operationType || typeof operationType !== 'string') {
    return res.status(400).json({
      error: 'MISSING_OPERATION_TYPE',
      message: 'operationType is required.',
    });
  }

  // 1. Authoritative lookup of canonical operation cost
  const canonical = getCanonicalOperation(operationType);
  if (!canonical) {
    return res.status(400).json({
      error: 'UNKNOWN_OPERATION_TYPE',
      message: `Operation "${operationType}" is not a recognized canonical PDF operation. Client cannot specify arbitrary or untracked operations.`,
    });
  }

  // 2. Atomically record usage in database using canonical cost
  const result = saasStore.recordUsage(
    user.id,
    canonical.type,
    description || canonical.description,
    canonical.cost,
    typeof idempotencyKey === 'string' ? idempotencyKey : undefined
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
    operation: canonical.type,
    creditsDeducted: canonical.cost,
    alreadyProcessed: Boolean(result.alreadyProcessed),
    usage: result.usage,
  });
});

/**
 * In-flight checkout mutex to prevent duplicate concurrent checkouts for the same user.
 * Scoped strictly per internal userId.
 */
const inFlightCheckouts = new Set<string>();

export function isCheckoutInFlight(userId: string): boolean {
  return inFlightCheckouts.has(userId);
}

/**
 * Validates and sanitizes a checkout redirect URL against server-controlled application origin.
 * Prevents arbitrary external open redirects.
 */
export function sanitizeCheckoutRedirectUrl(rawUrl?: string, reqHost?: string): string {
  const appUrlConfig = process.env.APP_URL?.trim();
  const baseAppUrl = appUrlConfig || (reqHost ? `http://${reqHost}` : '');
  const defaultRedirect = `${baseAppUrl}/?view=account&checkout=success`;

  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return defaultRedirect;
  }

  const trimmed = rawUrl.trim();

  // If path-only relative URL, safely append to baseAppUrl
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${baseAppUrl}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    // Disallow non-http/https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return defaultRedirect;
    }

    // If APP_URL is configured, enforce identical origin
    if (appUrlConfig) {
      const allowedOrigin = new URL(appUrlConfig).origin;
      if (parsed.origin === allowedOrigin) {
        return trimmed;
      }
    }

    // Enforce host match if reqHost provided
    if (reqHost && (parsed.host === reqHost || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return trimmed;
    }

    console.warn(`[Checkout Security] External redirect URL rejected: ${trimmed}. Falling back to default.`);
    return defaultRedirect;
  } catch {
    return defaultRedirect;
  }
}

/**
 * Process a checkout request with authoritative server-side single-subscription check,
 * per-user checkout concurrency locking, and sanitized redirect URL.
 */
export async function handleCheckoutRequest(
  userId: string,
  userEmail: string,
  userName: string,
  planId: string = 'pro',
  redirectUrl?: string,
  checkoutCreator: typeof createLemonSqueezyCheckout = createLemonSqueezyCheckout,
  reqHost?: string
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

  // Concurrency Guard: Enforce at most one in-flight checkout creation per user
  if (inFlightCheckouts.has(userId)) {
    return {
      status: 409,
      body: {
        success: false,
        error: 'A checkout creation is already in progress for this account. Please wait.',
      },
    };
  }

  // Sanitize redirect URL
  const safeRedirectUrl = sanitizeCheckoutRedirectUrl(redirectUrl, reqHost);

  inFlightCheckouts.add(userId);
  try {
    const result = await checkoutCreator({
      userId, // Strictly server-derived from authenticated session
      userEmail,
      userName,
      variantId: targetPlan.lemonSqueezyVariantId || undefined,
      redirectUrl: safeRedirectUrl,
    });

    return {
      status: 200,
      body: result,
    };
  } finally {
    inFlightCheckouts.delete(userId);
  }
}

/**
 * POST /api/billing/checkout
 * Create Lemon Squeezy Checkout for the authenticated user.
 * Target userId is locked to req.user.id.
 */
billingRouter.post('/checkout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { planId = 'pro', redirectUrl } = req.body || {};
  const reqHost = req.get('host');

  const result = await handleCheckoutRequest(
    user.id,
    user.email,
    user.name,
    planId,
    redirectUrl,
    createLemonSqueezyCheckout,
    reqHost
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
