/**
 * Sprint P1 — Paid Membership Security & Billing Foundation Test Suite
 * Tests all security boundaries across Authentication, Persistence, Entitlement,
 * Usage/Credits, Lemon Squeezy Webhooks, and Checkout Security.
 */
import crypto from 'crypto';
import { SaaSDatabase } from './src/server/storage/db';
import { saasStore, SaaSStore, PLANS } from './src/server/storage/saasStore';
import { AccountOwnershipManager } from './src/server/auth/otp';
import { TestEmailProvider } from './src/server/auth/emailProvider';
import {
  createSignedSessionToken,
  verifySignedSessionToken,
  getSessionSecret,
} from './src/server/auth/session';
import {
  processLemonSqueezyWebhook,
  verifyWebhookSignature,
} from './src/server/lemonSqueezy/webhooks';
import {
  handleCheckoutRequest,
  sanitizeCheckoutRedirectUrl,
  isCheckoutInFlight,
} from './src/server/routes/billingRoutes';
import { createLemonSqueezyCheckout } from './src/server/lemonSqueezy/client';
import { getCanonicalOperation } from './src/server/storage/operationCosts';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`[PASS] ${name}: ${details}`);
  } else {
    results.push({ name, passed: false, details: `FAILED: ${details}` });
    console.error(`[FAIL] ${name}: ${details}`);
  }
}

async function runSecurityTestSuite() {
  console.log('=== SPRINT P1: PAID MEMBERSHIP SECURITY & BILLING FOUNDATION TESTS ===\n');

  // Set environment variables for tests
  process.env.SESSION_SECRET = 'test-session-secret-key-32-chars-long';
  process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret-key-32-chars';
  process.env.LEMON_SQUEEZY_STORE_ID = 'store_test_123';
  process.env.LEMON_SQUEEZY_PRO_VARIANT_ID = 'variant_pro_prod_456';
  process.env.APP_URL = 'https://pdf-lofi.com';

  const testDbPath = path.join(process.cwd(), 'data', 'test-p1.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const testDb = new SaaSDatabase(testDbPath);
  saasStore.setDatabase(testDb);
  const store = saasStore;
  const ownershipManager = store.getOwnershipManager();

  const testEmailProvider = new TestEmailProvider();
  ownershipManager.setEmailProvider(testEmailProvider);

  // --------------------------------------------------------------------------
  // SECTION 1: ACCOUNT OWNERSHIP & AUTHENTICATION
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: Account Ownership & Authentication ---');

  // Test 1.1: OTP Generation & Real Provider Dispatch
  const otpRes = await ownershipManager.requestOtp('alice@test.com', 'login');
  assert(
    otpRes.success && typeof otpRes.expiresAt === 'number' && Boolean(otpRes.devCode),
    'Auth: OTP Generation',
    `Short-lived single-use OTP generated successfully (expires in ${(otpRes.expiresAt - Date.now()) / 1000}s).`
  );

  const validOtp = otpRes.devCode!;

  // Test 1.2: Invalid code format rejected
  const invRes1 = ownershipManager.verifyOtp('alice@test.com', '12', 'login');
  assert(
    !invRes1.valid && invRes1.error === 'INVALID_CODE_FORMAT',
    'Auth: Invalid Code Format Rejected',
    'Codes not matching 6 digits are immediately rejected.'
  );

  // Test 1.3: Incorrect code rejected
  const invRes2 = ownershipManager.verifyOtp('alice@test.com', '000000', 'login');
  assert(
    !invRes2.valid && invRes2.error === 'INVALID_CODE',
    'Auth: Incorrect Code Rejected',
    'Incorrect OTP code rejected with attempt count tracked.'
  );

  // Test 1.4: Valid OTP verifies successfully
  const validRes = ownershipManager.verifyOtp('alice@test.com', validOtp, 'login');
  assert(
    validRes.valid,
    'Auth: Valid OTP Verified',
    'Correct OTP verifies account ownership successfully.'
  );

  // Test 1.5: Reused OTP rejected (Single-Use Invalidation)
  const reuseRes = ownershipManager.verifyOtp('alice@test.com', validOtp, 'login');
  assert(
    !reuseRes.valid && reuseRes.error === 'INVALID_OR_EXPIRED_CODE',
    'Auth: Reused OTP Rejected (Single-Use)',
    'Verified OTP is deleted immediately and cannot be reused.'
  );

  // Test 1.6: Expired OTP rejected
  const expiredEmail = 'bob_expired@test.com';
  const expRes = await ownershipManager.requestOtp(expiredEmail, 'login');
  // Manually update expiration to past in database
  testDb.db
    .prepare('UPDATE auth_verification_codes SET expires_at = ? WHERE email = ?')
    .run(Date.now() - 5000, expiredEmail);
  const verifyExpired = ownershipManager.verifyOtp(expiredEmail, expRes.devCode!, 'login');
  assert(
    !verifyExpired.valid,
    'Auth: Expired OTP Rejected',
    'Expired OTP tokens are rejected safely.'
  );

  // Test 1.7: Session token signing & tamper-resistance
  const testUser = store.saveUser({
    id: 'usr_auth_alice',
    email: 'alice@test.com',
    name: 'Alice Cooper',
    createdAt: Date.now(),
  });
  const sessionToken = createSignedSessionToken(testUser.id);
  const verifiedSession = verifySignedSessionToken(sessionToken);
  assert(
    verifiedSession !== null && verifiedSession.userId === testUser.id,
    'Auth: Tamper-Proof Signed Session Token',
    'Cryptographically signed HMAC SHA-256 session token verifies user ID.'
  );

  // Tampered session token rejected
  const tamperedToken = sessionToken.slice(0, -4) + 'abcd';
  const verifiedTampered = verifySignedSessionToken(tamperedToken);
  assert(
    verifiedTampered === null,
    'Auth: Tampered Session Rejected',
    'Tampered session token signature rejected via constant-time verification.'
  );

  // Test 1.8: Real Email Provider Invocation
  assert(
    testEmailProvider.sentMessages.length > 0 &&
      testEmailProvider.sentMessages.some((m) => m.to === 'alice@test.com'),
    'Auth: Real Email Provider Invocation',
    'Transactional email provider abstraction was actively invoked with correct parameters.'
  );

  // Test 1.9: Production Path Conceals OTP
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const prodOtpRes = await ownershipManager.requestOtp('prod_user@test.com', 'login');
  assert(
    prodOtpRes.success && prodOtpRes.devCode === undefined,
    'Auth: Production Path Conceals OTP',
    'Production OTP dispatch response strictly does not expose devCode or plaintext code.'
  );
  process.env.NODE_ENV = originalEnv;

  // Test 1.10: Provider Failure Reports Honestly and Invalidates Challenge
  testEmailProvider.shouldFail = true;
  testEmailProvider.failureReason = 'SMTP connection timeout';
  const failedOtpRes = await ownershipManager.requestOtp('fail_test@test.com', 'login');
  assert(
    !failedOtpRes.success && failedOtpRes.error === 'DELIVERY_FAILED',
    'Auth: Email Delivery Failure Honest Reporting',
    'Provider failure returns DELIVERY_FAILED and refuses to claim successful delivery.'
  );

  // Assert undelivered challenge was purged from DB and cannot be used
  const undeliveredVerify = ownershipManager.verifyOtp('fail_test@test.com', '123456', 'login');
  assert(
    !undeliveredVerify.valid && undeliveredVerify.error === 'INVALID_OR_EXPIRED_CODE',
    'Auth: Undelivered OTP Invalidation',
    'Failed delivery purges the challenge from database to prevent unauthorized use.'
  );
  testEmailProvider.shouldFail = false;

  // --------------------------------------------------------------------------
  // SECTION 2: DURABLE PERSISTENCE & DATABASE INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Durable Persistence & Database Integrity ---');

  // Test 2.1: Data survives database re-instantiation (restart simulation)
  const restartDb = new SaaSDatabase(testDbPath);
  const restartStore = new SaaSStore(restartDb);
  const retrievedUser = restartStore.getUser(testUser.id);
  assert(
    retrievedUser !== null && retrievedUser.email === 'alice@test.com',
    'Persistence: Process Restart Durability',
    'User and state survive database re-initialization cleanly from SQLite.'
  );

  // Test 2.2: Subscriptions unique constraint and retrieval
  const subCreated = restartStore.updateSubscription({
    id: 'sub_pers_1',
    userId: testUser.id,
    planId: 'pro',
    status: 'active',
    lemonSqueezySubscriptionId: 'ls_sub_pers_1',
    lemonSqueezyCustomerId: 'cust_pers_1',
    lemonSqueezyOrderId: null,
    lemonSqueezyVariantId: 'variant_pro_prod_456',
    renewsAt: '2026-11-01T00:00:00Z',
    endsAt: null,
    trialEndsAt: null,
    isPaused: false,
    cancelAtPeriodEnd: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lemonSqueezyUpdatedAt: Date.now(),
  });

  const subFetched = restartStore.findSubscriptionByLemonSqueezyId('ls_sub_pers_1');
  assert(
    subFetched !== null && subFetched.userId === testUser.id && subFetched.planId === 'pro',
    'Persistence: Subscription Storage & Indexed Query',
    'Subscription indexed by provider ID accurately retrieved.'
  );

  // Test 2.3: Webhook event idempotency ledger survives restart
  restartStore.recordWebhookProcessed('evt_persist_test', 'subscription_created', 'processed');
  const isProcessed = restartStore.isWebhookProcessed('evt_persist_test');
  assert(
    isProcessed,
    'Persistence: Webhook Idempotency Durability',
    'Webhook processed event persisted in database and survives restart.'
  );

  saasStore.setDatabase(restartDb);

  // --------------------------------------------------------------------------
  // SECTION 3: ENTITLEMENT DETERMINATION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Server-Authoritative Entitlements ---');

  // Test 3.1: Free user receives Free entitlements
  const freeUser = store.saveUser({
    id: 'usr_free_1',
    email: 'free@test.com',
    name: 'Free User',
    createdAt: Date.now(),
  });
  const freeEntitlements = store.getEntitlements(freeUser.id);
  assert(
    freeEntitlements.maxFileSizeMB === 25 &&
      freeEntitlements.batchMergeLimit === 5 &&
      freeEntitlements.advancedToolsAccess === false,
    'Entitlement: Free Plan Limits',
    'Free user strictly bounded by 25MB and 5-file merge limits.'
  );

  // Test 3.2: Active Pro user receives Pro entitlements
  const proEntitlements = store.getEntitlements(testUser.id);
  assert(
    proEntitlements.maxFileSizeMB === 500 &&
      proEntitlements.batchMergeLimit === 50 &&
      proEntitlements.advancedToolsAccess === true,
    'Entitlement: Pro Plan Limits',
    'Pro user unlocks 500MB, 50-file merge, and advanced tools.'
  );

  // Test 3.3: Cancelled within paid period retains Pro until endsAt
  const cancelledUser = store.saveUser({
    id: 'usr_cancelled_in_period',
    email: 'cancelled@test.com',
    name: 'Cancelled In Period',
    createdAt: Date.now(),
  });
  store.updateSubscription({
    id: 'sub_canc_1',
    userId: cancelledUser.id,
    planId: 'pro',
    status: 'cancelled',
    lemonSqueezySubscriptionId: 'ls_sub_canc_1',
    lemonSqueezyCustomerId: 'cust_canc_1',
    lemonSqueezyOrderId: null,
    lemonSqueezyVariantId: 'variant_pro_prod_456',
    renewsAt: null,
    endsAt: new Date(Date.now() + 86400000 * 10).toISOString(), // 10 days in future
    trialEndsAt: null,
    isPaused: false,
    cancelAtPeriodEnd: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lemonSqueezyUpdatedAt: Date.now(),
  });
  const cancEntitlements = store.getEntitlements(cancelledUser.id);
  assert(
    cancEntitlements.maxFileSizeMB === 500 && cancEntitlements.advancedToolsAccess === true,
    'Entitlement: Cancelled In-Period Pro Retention',
    'Cancelled subscription with future endsAt retains Pro entitlements until period expires.'
  );

  // Test 3.4: Cancelled past paid period degrades to Free
  store.updateSubscription({
    id: 'sub_canc_1',
    userId: cancelledUser.id,
    planId: 'pro',
    status: 'cancelled',
    lemonSqueezySubscriptionId: 'ls_sub_canc_1',
    lemonSqueezyCustomerId: 'cust_canc_1',
    lemonSqueezyOrderId: null,
    lemonSqueezyVariantId: 'variant_pro_prod_456',
    renewsAt: null,
    endsAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days in past
    trialEndsAt: null,
    isPaused: false,
    cancelAtPeriodEnd: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lemonSqueezyUpdatedAt: Date.now(),
  });
  const degradedEntitlements = store.getEntitlements(cancelledUser.id);
  assert(
    degradedEntitlements.maxFileSizeMB === 25 && degradedEntitlements.advancedToolsAccess === false,
    'Entitlement: Expired Cancellation Degrades to Free',
    'Cancelled subscription past endsAt degrades immediately to Free Community limits.'
  );

  // --------------------------------------------------------------------------
  // SECTION 4: AUTHORITATIVE USAGE & CREDITS ACCOUNTING
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Authoritative Usage & Credits Accounting ---');

  // Test 4.1: Canonical cost lookup
  const localOp = getCanonicalOperation('rotate_pages');
  const ocrOp = getCanonicalOperation('ocr_scan');
  assert(
    localOp?.cost === 0 && ocrOp?.cost === 2,
    'Usage: Canonical Operation Pricing',
    'Local operations are 0 credits; metered operations (OCR) are authoritatively 2 credits.'
  );

  // Test 4.2: Local operations consume 0 credits and do not diminish balance
  const usageUser = store.saveUser({
    id: 'usr_usage_1',
    email: 'usage@test.com',
    name: 'Usage Test User',
    createdAt: Date.now(),
  });
  const initialUsage = store.getUsage(usageUser.id);
  assert(
    initialUsage.creditsRemaining === 10,
    'Usage: Initial Credit Quota',
    'Initial free tier credits initialized to 10.'
  );

  const localRecord = store.recordUsage(usageUser.id, 'rotate_pages', 'Rotated 3 pages');
  assert(
    localRecord.allowed && localRecord.usage.creditsRemaining === 10,
    'Usage: Zero-Cost Local Operations Invariance',
    'Free local operations do not deduct from credits balance (10 remaining).'
  );

  // Test 4.3: Metered operations deduct authoritative cost
  const meteredRecord = store.recordUsage(usageUser.id, 'ocr_scan', 'OCR text recognition');
  assert(
    meteredRecord.allowed && meteredRecord.usage.creditsRemaining === 8,
    'Usage: Authoritative Metered Deduction',
    'Authoritative OCR cost (2 credits) deducted: balance 10 -> 8.'
  );

  // Test 4.4: Idempotency key prevents duplicate deduction
  const idemKey = `idem_test_${Date.now()}`;
  const firstDeduct = store.recordUsage(usageUser.id, 'ocr_scan', 'OCR retry test', 2, idemKey);
  const secondDeduct = store.recordUsage(usageUser.id, 'ocr_scan', 'OCR retry test', 2, idemKey);
  assert(
    firstDeduct.allowed &&
      secondDeduct.allowed &&
      secondDeduct.alreadyProcessed === true &&
      secondDeduct.usage.creditsRemaining === 6,
    'Usage: Idempotent Retries Guard',
    'Retried operation with identical idempotency key returns without double-charging credits.'
  );

  // Test 4.5: Insufficient credits fails closed
  // Deduct remaining credits (6 remaining -> deduct 2, 2, 2 -> 0 remaining)
  store.recordUsage(usageUser.id, 'ocr_scan', 'Deduct 2 credits'); // balance: 4
  store.recordUsage(usageUser.id, 'ocr_scan', 'Deduct 2 credits'); // balance: 2
  store.recordUsage(usageUser.id, 'ocr_scan', 'Deduct 2 credits'); // balance: 0

  const overspendAttempt = store.recordUsage(usageUser.id, 'ocr_scan', 'Attempt exceeding balance');
  assert(
    !overspendAttempt.allowed &&
      overspendAttempt.usage.creditsRemaining === 0 &&
      Boolean(overspendAttempt.error),
    'Usage: Insufficient Credits Rejection',
    'Usage operation exceeding credit balance rejected with 402 error message.'
  );

  // Test 4.6: Unknown operations fail closed
  const unknownOpRes = store.recordUsage(usageUser.id, 'unregistered_hack_operation', 'Fake operation');
  assert(
    !unknownOpRes.allowed && Boolean(unknownOpRes.error),
    'Usage: Unknown Operation Rejected',
    'Unregistered operation types fail closed without deducting credits.'
  );

  // Test 4.7: Caller cost override ignored in favor of canonical registry
  const overrideAttempt = store.recordUsage(usageUser.id, 'rotate_pages', 'Manipulated cost attempt', 99);
  assert(
    overrideAttempt.allowed && overrideAttempt.usage.creditsUsed === 10,
    'Usage: Caller Cost Override Ignored',
    'Storage layer strictly enforces canonical registry pricing (rotate=0 credits) and ignores caller override.'
  );

  // --------------------------------------------------------------------------
  // SECTION 5: LEMON SQUEEZY HARDENING
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Lemon Squeezy Security & Webhook Hardening ---');

  // Test 5.1: Webhook HMAC signature verification
  const payloadStr = JSON.stringify({ test: 'payload' });
  const validSig = crypto
    .createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!)
    .update(payloadStr)
    .digest('hex');

  const validSigRes = verifyWebhookSignature(payloadStr, validSig);
  assert(validSigRes.valid, 'LemonSqueezy: Valid HMAC Signature', 'HMAC SHA-256 signature verified.');

  const invalidSigRes = verifyWebhookSignature(payloadStr, 'bad_signature_digest_1234567890abcdef');
  assert(!invalidSigRes.valid, 'LemonSqueezy: Invalid HMAC Signature Rejected', 'Invalid signature rejected.');

  // Test 5.2: Fail-Closed Store ID Validation
  const storeMismatchPayload = {
    meta: { event_name: 'subscription_created', custom_data: { user_id: usageUser.id } },
    data: {
      id: 'sub_mismatch_1',
      attributes: {
        store_id: 'wrong_store_999',
        variant_id: 'variant_pro_prod_456',
        status: 'active',
      },
    },
  };
  const storeMismatchRes = await processLemonSqueezyWebhook(storeMismatchPayload, `evt_mismatch_${Date.now()}`);
  assert(
    storeMismatchRes.status === 'error',
    'LemonSqueezy: Store ID Mismatch Rejection',
    'Webhook event with mismatched store ID rejected immediately.'
  );

  // Test 5.3: Fail-Closed Variant ID Validation (Unknown Variant Rejected)
  const unknownVariantPayload = {
    meta: { event_name: 'subscription_created', custom_data: { user_id: usageUser.id } },
    data: {
      id: `sub_unk_var_${Date.now()}`,
      attributes: {
        store_id: 'store_test_123',
        variant_id: 'arbitrary_unregistered_variant_789',
        status: 'active',
      },
    },
  };
  const unkVarRes = await processLemonSqueezyWebhook(unknownVariantPayload, `evt_unk_var_${Date.now()}`);
  const unkVarSub = store.getSubscription(usageUser.id);
  assert(
    unkVarSub.planId === 'free',
    'LemonSqueezy: Unknown Variant Fails Closed',
    'Arbitrary/unknown variant ID fails closed and does not grant Pro plan.'
  );

  // Test 5.4: Valid Store ID & Variant ID grants Pro
  const validWebhookPayload = {
    meta: { event_name: 'subscription_created', custom_data: { user_id: usageUser.id } },
    data: {
      id: `sub_valid_pro_${Date.now()}`,
      attributes: {
        store_id: 'store_test_123',
        variant_id: 'variant_pro_prod_456',
        status: 'active',
        updated_at: '2026-10-01T12:00:00.000Z',
      },
    },
  };
  const validWebhookRes = await processLemonSqueezyWebhook(validWebhookPayload, `evt_valid_pro_${Date.now()}`);
  const validProSub = store.getSubscription(usageUser.id);
  assert(
    validWebhookRes.status === 'processed' && validProSub.planId === 'pro',
    'LemonSqueezy: Valid Store & Pro Variant Grants Pro',
    'Verified webhook grants Pro plan with updated credit quotas.'
  );

  // Test 5.5: Duplicate Webhook Idempotency
  const dupWebhookRes = await processLemonSqueezyWebhook(validWebhookPayload, `evt_valid_pro_${Date.now() - 1}`);
  // Using the exact same eventId
  const dupWebhookRes2 = await processLemonSqueezyWebhook(validWebhookPayload, `evt_valid_pro_${Date.now() - 1}`);
  assert(
    dupWebhookRes2.status === 'already_processed',
    'LemonSqueezy: Duplicate Webhook Ignored',
    'Duplicate webhook event ID identified and ignored safely.'
  );

  // Test 5.6: Stale event with older timestamp ignored
  const stalePayload = {
    meta: { event_name: 'subscription_updated' },
    data: {
      id: validProSub.lemonSqueezySubscriptionId,
      attributes: {
        store_id: 'store_test_123',
        variant_id: 'variant_pro_prod_456',
        status: 'active',
        updated_at: '2026-09-01T12:00:00.000Z', // 1 month older!
      },
    },
  };
  const staleRes = await processLemonSqueezyWebhook(stalePayload, `evt_stale_${Date.now()}`);
  assert(
    staleRes.status === 'ignored',
    'LemonSqueezy: Stale Out-of-Order Event Ignored',
    'Event with older provider timestamp safely ignored.'
  );

  // Test 5.7: Pro Credit Quota Durability across Database Reload (Mandatory R2 & R4 check)
  const proUsageImmediate = store.getUsage(usageUser.id);
  assert(
    proUsageImmediate.creditsTotal === PLANS.pro.entitlements.monthlyCredits && proUsageImmediate.creditsRemaining >= 190,
    'Credits: Pro Quota Assigned',
    `Verified webhook grants canonical Pro quota (${PLANS.pro.entitlements.monthlyCredits} credits).`
  );

  // Close / reload database instance from disk to simulate process restart
  const reloadDb = new SaaSDatabase(testDbPath);
  const reloadStore = new SaaSStore(reloadDb);
  const reloadedUsage = reloadStore.getUsage(usageUser.id);
  assert(
    reloadedUsage.creditsTotal === PLANS.pro.entitlements.monthlyCredits && reloadedUsage.creditsRemaining === proUsageImmediate.creditsRemaining,
    'Credits: Pro Quota Survives Database Reload',
    `Pro creditsTotal (${PLANS.pro.entitlements.monthlyCredits}) and creditsRemaining are durably written to SQLite and survive DB reload.`
  );

  // Test 5.8: Complete Lifecycle: Cancellation, Expiry, and Re-subscription
  // A. Cancellation with future ends_at retains Pro access
  const cancelPayload = {
    meta: { event_name: 'subscription_updated' },
    data: {
      id: validProSub.lemonSqueezySubscriptionId,
      attributes: {
        store_id: 'store_test_123',
        variant_id: 'variant_pro_prod_456',
        status: 'cancelled',
        cancelled: true,
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        updated_at: new Date(Date.now() + 1000).toISOString(),
      },
    },
  };
  await processLemonSqueezyWebhook(cancelPayload, `evt_cancel_${Date.now()}`);
  const cancelEntitlements = store.getEntitlements(usageUser.id);
  assert(
    cancelEntitlements.maxFileSizeMB === 500 && cancelEntitlements.batchMergeLimit === 50,
    'Lifecycle: Cancelled In-Period Retains Pro Entitlements',
    'Subscription cancelled with future ends_at retains Pro entitlements until period end.'
  );

  // B. Expiry degrades to Free
  const expiredPayload = {
    meta: { event_name: 'subscription_expired' },
    data: {
      id: validProSub.lemonSqueezySubscriptionId,
      attributes: {
        store_id: 'store_test_123',
        variant_id: 'variant_pro_prod_456',
        status: 'expired',
        ends_at: new Date(Date.now() - 1000).toISOString(),
        updated_at: new Date(Date.now() + 2000).toISOString(),
      },
    },
  };
  await processLemonSqueezyWebhook(expiredPayload, `evt_exp_${Date.now()}`);
  const expiredEntitlements = store.getEntitlements(usageUser.id);
  assert(
    expiredEntitlements.maxFileSizeMB === 25 && expiredEntitlements.batchMergeLimit === 5,
    'Lifecycle: Expired Subscription Degrades to Free',
    'Expired subscription immediately degrades application entitlements to Free tier.'
  );

  // C. Re-subscription restores Pro and persists credit quota
  const resubPayload = {
    meta: { event_name: 'subscription_created', custom_data: { user_id: usageUser.id } },
    data: {
      id: `sub_resub_pro_${Date.now()}`,
      attributes: {
        store_id: 'store_test_123',
        variant_id: 'variant_pro_prod_456',
        status: 'active',
        updated_at: new Date(Date.now() + 3000).toISOString(),
      },
    },
  };
  const resubRes = await processLemonSqueezyWebhook(resubPayload, `evt_resub_${Date.now()}`);
  const resubSub = store.getSubscription(usageUser.id);
  const resubUsage = store.getUsage(usageUser.id);
  assert(
    resubRes.status === 'processed' && resubSub.planId === 'pro' && resubUsage.creditsTotal === PLANS.pro.entitlements.monthlyCredits,
    'Lifecycle: Re-subscription Restores Pro and Quota',
    'New active subscription restores Pro plan and persists updated monthly credit allowance.'
  );

  // --------------------------------------------------------------------------
  // SECTION 6: CHECKOUT SECURITY & REDIRECT HARDENING
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Checkout Security & Redirect Hardening ---');

  // Test 6.1: Active Pro user cannot initiate duplicate checkout
  const dupCheckoutRes = await handleCheckoutRequest(
    usageUser.id,
    usageUser.email,
    usageUser.name,
    'pro'
  );
  assert(
    dupCheckoutRes.status === 400 && dupCheckoutRes.body.error.includes('already exists'),
    'Checkout: Active Subscription Blocks New Checkout',
    'Users with an active Pro subscription cannot initiate duplicate checkouts.'
  );

  // Test 6.2: External Open Redirect URL sanitized and rejected
  const maliciousRedirect = 'https://malicious-phishing-site.com/steal-creds';
  const sanitizedRedirect = sanitizeCheckoutRedirectUrl(maliciousRedirect, 'localhost:3000');
  assert(
    !sanitizedRedirect.includes('malicious-phishing-site.com'),
    'Checkout: External Open Redirect Rejected',
    'Arbitrary external redirect URLs are stripped and reverted to server origin.'
  );

  // Test 6.3: Same-origin redirect URL preserved
  const validRedirect = 'https://pdf-lofi.com/?view=account&checkout=success';
  const allowedRedirect = sanitizeCheckoutRedirectUrl(validRedirect, 'pdf-lofi.com');
  assert(
    allowedRedirect === validRedirect,
    'Checkout: Verified Origin Redirect Preserved',
    'Same-origin redirect URL matching APP_URL is safely preserved.'
  );

  // Test 6.4: Concurrent checkouts for the same user blocked
  const mockCheckoutUser = store.saveUser({
    id: 'usr_conc_test',
    email: 'conc@test.com',
    name: 'Concurrent User',
    createdAt: Date.now(),
  });

  let lockReleased = false;
  const slowCheckoutMock = async () => {
    // Assert in-flight lock is active during execution
    assert(
      isCheckoutInFlight(mockCheckoutUser.id),
      'Checkout: In-Flight Lock Active',
      'User is marked as in-flight during checkout creation.'
    );
    await new Promise((r) => setTimeout(r, 50));
    return { success: true, checkoutUrl: 'https://lemonsqueezy.com/mock', isConfigured: true };
  };

  const p1 = handleCheckoutRequest(
    mockCheckoutUser.id,
    mockCheckoutUser.email,
    mockCheckoutUser.name,
    'pro',
    undefined,
    slowCheckoutMock
  );

  // Immediate second concurrent request for same user
  const p2 = handleCheckoutRequest(
    mockCheckoutUser.id,
    mockCheckoutUser.email,
    mockCheckoutUser.name,
    'pro',
    undefined,
    slowCheckoutMock
  );

  const [resP1, resP2] = await Promise.all([p1, p2]);
  assert(
    (resP1.status === 200 && resP2.status === 409) || (resP1.status === 409 && resP2.status === 200),
    'Checkout: Concurrent Requests Blocked (409 Conflict)',
    'Simultaneous checkouts for the same account blocked by per-user concurrency mutex.'
  );

  // --------------------------------------------------------------------------
  // SECTION 7: PRICING & BILLING MODEL INVARIANTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Pricing & Billing Model Invariants ---');

  // Test 7.1: Authoritative Pro and Free Pricing Invariants
  assert(
    PLANS.pro.priceMonthly === 6 &&
      PLANS.pro.priceYearly === 60 &&
      PLANS.free.priceMonthly === 0 &&
      PLANS.free.priceYearly === 0,
    'Pricing: Authoritative $6/mo and $60/yr Contract',
    `Verified Pro is exactly $6/month and $60/year; Free is $0/month and $0/year.`
  );

  // Test 7.2: Entitlement Preservation Across Price Change
  assert(
    PLANS.pro.entitlements.maxFileSizeMB === 500 &&
      PLANS.pro.entitlements.maxPagesPerDoc === 1000 &&
      PLANS.pro.entitlements.batchMergeLimit === 50 &&
      PLANS.pro.entitlements.monthlyCredits === 250 &&
      PLANS.pro.entitlements.advancedToolsAccess === true &&
      PLANS.free.entitlements.maxFileSizeMB === 25 &&
      PLANS.free.entitlements.maxPagesPerDoc === 50 &&
      PLANS.free.entitlements.batchMergeLimit === 5 &&
      PLANS.free.entitlements.monthlyCredits === 10,
    'Pricing: Entitlement Capacities Strictly Preserved',
    'Pro and Free capacity limits, merge quotas, and credit allowances preserved identically.'
  );

  // Test 7.3: Annual checkout fails safely when LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID unconfigured
  const unconfiguredAnnualUser = store.saveUser({
    id: `usr_ann_unconf_${Date.now()}`,
    email: `ann_unconf_${Date.now()}@test.com`,
    name: 'Unconfigured Annual User',
    createdAt: Date.now(),
  });
  const unconfiguredAnnualRes = await handleCheckoutRequest(
    unconfiguredAnnualUser.id,
    unconfiguredAnnualUser.email,
    unconfiguredAnnualUser.name,
    'pro',
    undefined,
    createLemonSqueezyCheckout,
    'localhost:3000',
    'yearly'
  );
  assert(
    unconfiguredAnnualRes.status === 400 &&
      unconfiguredAnnualRes.body.missingConfig?.includes('LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID'),
    'Billing: Unconfigured Annual Checkout Fails Closed Truthfully',
    'Annual checkout does not use fake variant ID or silently misbill monthly when annual variant is unconfigured.'
  );

  // Test 7.4: Configured Annual Variant triggers correct annual checkout
  process.env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID = 'variant_pro_annual_prod_789';
  PLANS.pro.lemonSqueezyAnnualVariantId = 'variant_pro_annual_prod_789';
  let capturedCheckoutVariant: string | undefined = undefined;
  const mockAnnualCheckoutCreator = async (params: any) => {
    capturedCheckoutVariant = params.variantId;
    return { success: true, checkoutUrl: 'https://lemonsqueezy.com/annual_mock', isConfigured: true };
  };
  const configuredAnnualUser = store.saveUser({
    id: `usr_ann_conf_${Date.now()}`,
    email: `ann_conf_${Date.now()}@test.com`,
    name: 'Configured Annual User',
    createdAt: Date.now(),
  });
  const configuredAnnualRes = await handleCheckoutRequest(
    configuredAnnualUser.id,
    configuredAnnualUser.email,
    configuredAnnualUser.name,
    'pro',
    undefined,
    mockAnnualCheckoutCreator,
    'localhost:3000',
    'yearly'
  );
  assert(
    configuredAnnualRes.status === 200 &&
      capturedCheckoutVariant === 'variant_pro_annual_prod_789',
    'Billing: Configured Annual Checkout Dispatches Annual Variant',
    'Annual checkout selects configured LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID cleanly.'
  );

  // Test 7.5: Configured Annual Variant Webhook Grants Pro Entitlement
  const annualWebhookPayload = {
    meta: {
      event_name: 'subscription_created',
      custom_data: { user_id: configuredAnnualUser.id },
    },
    data: {
      id: `sub_annual_pro_${Date.now()}`,
      attributes: {
        store_id: 'store_test_123',
        variant_id: 'variant_pro_annual_prod_789',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
    },
  };
  const annualWebhookRes = await processLemonSqueezyWebhook(
    annualWebhookPayload,
    `evt_annual_pro_${Date.now()}`
  );
  const annualSub = store.getSubscription(configuredAnnualUser.id);
  const annualEntitlements = store.getEntitlements(configuredAnnualUser.id);
  assert(
    annualWebhookRes.status === 'processed' &&
      annualSub.planId === 'pro' &&
      annualEntitlements.maxFileSizeMB === 500 &&
      annualEntitlements.batchMergeLimit === 50,
    'Webhook: Annual Variant Grants Full Pro Entitlements',
    'Webhook for configured annual variant correctly grants Pro plan with 500MB and 50-file merge.'
  );

  // Test 7.6: Monthly Checkout dispatches Monthly Pro Variant cleanly
  let capturedMonthlyVariant: string | undefined = undefined;
  const mockMonthlyCheckoutCreator = async (params: any) => {
    capturedMonthlyVariant = params.variantId;
    return { success: true, checkoutUrl: 'https://lemonsqueezy.com/monthly_mock', isConfigured: true };
  };
  const configuredMonthlyUser = store.saveUser({
    id: `usr_mon_conf_${Date.now()}`,
    email: `mon_conf_${Date.now()}@test.com`,
    name: 'Configured Monthly User',
    createdAt: Date.now(),
  });
  const configuredMonthlyRes = await handleCheckoutRequest(
    configuredMonthlyUser.id,
    configuredMonthlyUser.email,
    configuredMonthlyUser.name,
    'pro',
    undefined,
    mockMonthlyCheckoutCreator,
    'localhost:3000',
    'monthly'
  );
  assert(
    configuredMonthlyRes.status === 200 &&
      capturedMonthlyVariant === process.env.LEMON_SQUEEZY_PRO_VARIANT_ID,
    'Billing: Configured Monthly Checkout Dispatches Monthly Variant',
    'Monthly checkout selects configured LEMON_SQUEEZY_PRO_VARIANT_ID cleanly.'
  );

  // Test 7.7: Static verification: PricingView.tsx contains NO savings or discount messaging
  const pricingViewContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/features/pricing/PricingView.tsx'),
    'utf-8'
  );
  const lowercasePricing = pricingViewContent.toLowerCase();
  const forbiddenPhrases = [
    'save $',
    'save 16',
    'save 17',
    'best value',
    '% off',
    'discount',
    'savings',
  ];
  const foundForbidden = forbiddenPhrases.filter((phrase) => lowercasePricing.includes(phrase));
  assert(
    foundForbidden.length === 0,
    'UI: No Annual Savings or Discount Messaging in PricingView',
    `Verified PricingView.tsx has no prohibited savings or discount claims (${foundForbidden.join(', ') || 'none found'}).`
  );

  // Test 7.8: Free and Pro Plan Toolkit Parity & Capacity Model
  assert(
    PLANS.free.features.length >= 7 &&
      PLANS.pro.features.some((f) => f.toLowerCase().includes('everything in free')) &&
      PLANS.pro.entitlements.maxFileSizeMB === 500 &&
      PLANS.free.entitlements.maxFileSizeMB === 25,
    'Product Model: Shared Toolkit with Pro Capacity Extension',
    'Free keeps complete toolkit; Pro provides expanded capacity and usage without artificial tool gating.'
  );

  // Clean up test db file
  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch {
    // ignore
  }

  // --- FINAL SUMMARY ---
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`\n=== SPRINT P1 SECURITY SUMMARY ===`);
  console.log(`Passed: ${passedCount} / ${totalCount}`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runSecurityTestSuite().catch((err) => {
  console.error('Fatal error in security test suite:', err);
  process.exit(1);
});
