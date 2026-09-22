/**
 * Billing, Subscription, Entitlements & Usage API Routes
 * Server-authoritative state management. Client cannot manipulate plan or entitlements directly.
 */
import { Router } from 'express';
import { saasStore, PLANS } from '../storage/saasStore';
import { getLemonSqueezyConfig } from '../lemonSqueezy/config';
import { createLemonSqueezyCheckout, getCustomerPortalUrl } from '../lemonSqueezy/client';
import { BillingStateResponse } from '../../types/saas';

export const billingRouter = Router();

// Helper to extract authenticated user
function getAuthenticatedUser(req: any) {
  const userId = (req.headers['x-user-id'] as string) || saasStore.getDefaultUser().id;
  return saasStore.getUser(userId) || saasStore.getDefaultUser();
}

// Full state snapshot for Account/Pricing/Header views
billingRouter.get('/state', (req, res) => {
  const user = getAuthenticatedUser(req);
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

// List all plans and their specifications
billingRouter.get('/plans', (req, res) => {
  res.json({
    plans: Object.values(PLANS),
    lemonSqueezyConfig: getLemonSqueezyConfig(),
  });
});

// Current user's subscription
billingRouter.get('/subscription', (req, res) => {
  const user = getAuthenticatedUser(req);
  const subscription = saasStore.getSubscription(user.id);
  const plan = PLANS[subscription.planId] || PLANS.free;

  res.json({
    subscription,
    plan,
  });
});

// Entitlement check endpoint
billingRouter.get('/entitlements', (req, res) => {
  const user = getAuthenticatedUser(req);
  const entitlements = saasStore.getEntitlements(user.id);
  res.json({ entitlements });
});

// Usage and credits
billingRouter.get('/usage', (req, res) => {
  const user = getAuthenticatedUser(req);
  const usage = saasStore.getUsage(user.id);
  res.json({ usage });
});

// Record operation usage / meter event
billingRouter.post('/usage/record', (req, res) => {
  const user = getAuthenticatedUser(req);
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

// Create Lemon Squeezy Checkout
billingRouter.post('/checkout', async (req, res) => {
  const user = getAuthenticatedUser(req);
  const { planId = 'pro', redirectUrl } = req.body || {};

  const targetPlan = PLANS[planId as 'free' | 'pro'];
  if (!targetPlan || targetPlan.id === 'free') {
    return res.status(400).json({
      success: false,
      error: 'Free plan does not require a payment checkout.',
    });
  }

  const result = await createLemonSqueezyCheckout({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    variantId: targetPlan.lemonSqueezyVariantId || undefined,
    redirectUrl,
  });

  res.json(result);
});

// Get Lemon Squeezy Customer Billing Portal
billingRouter.get('/portal', async (req, res) => {
  const user = getAuthenticatedUser(req);
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

// Check integration status
billingRouter.get('/status', (req, res) => {
  const config = getLemonSqueezyConfig();
  res.json({ config });
});
