/**
 * SaaS Storage Layer (Server-Side)
 * Powered by Durable SQLite Database (ACID transactions, WAL mode, relational integrity)
 * Maintains Users, Plans, Subscriptions, Entitlements, Usage Ledgers, and Webhook Idempotency.
 * Document state remains strictly client-side.
 */
import {
  PlanDefinition,
  PlanId,
  SaaSUser,
  UserSubscription,
  UserUsage,
  PlanEntitlements,
  UsageEvent,
} from '../../types/saas';
import { SaaSDatabase } from './db';
import { AccountOwnershipManager } from '../auth/otp';
import { CANONICAL_OPERATION_COSTS, getCanonicalOperation } from './operationCosts';

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free Community',
    tagline: 'Private, in-browser PDF tools for everyday work',
    description:
      'Full access to the supported PDF toolkit for everyday use, with Free usage limits.',
    priceMonthly: 0,
    priceYearly: 0,
    billingInterval: 'monthly',
    lemonSqueezyVariantId: null,
    features: [
      'Unlimited client-side PDF viewing & reorganizing',
      'Local-first PDF merge & range split',
      'Page rotation, duplicate, delete & blank insert',
      'IndexedDB offline document recovery',
      'Designed for documents up to 25 MB',
      'Designed for documents up to 50 pages',
      'Merge up to 5 files',
    ],
    entitlements: {
      localProcessing: true,
      maxFileSizeMB: 25,
      maxPagesPerDoc: 50,
      batchMergeLimit: 5,
      advancedToolsAccess: false,
      cloudProcessingAllowed: false,
      aiIntelligenceAllowed: false,
      monthlyCredits: 10,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro Pass',
    badge: 'RECOMMENDED',
    tagline: 'For users who work with larger documents and heavier PDF usage',
    description: 'Higher-capacity document workflows and large file support with the same full PDF toolkit.',
    priceMonthly: 6,
    priceYearly: 60,
    billingInterval: 'monthly',
    get lemonSqueezyVariantId(): string | null {
      return (this as any)._variantId !== undefined
        ? (this as any)._variantId
        : (process.env.LEMON_SQUEEZY_PRO_VARIANT_ID || null);
    },
    set lemonSqueezyVariantId(val: string | null) {
      (this as any)._variantId = val;
    },
    get lemonSqueezyAnnualVariantId(): string | null {
      return (this as any)._annualVariantId !== undefined
        ? (this as any)._annualVariantId
        : (process.env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID || null);
    },
    set lemonSqueezyAnnualVariantId(val: string | null) {
      (this as any)._annualVariantId = val;
    },
    isPopular: true,
    features: [
      'Everything in Free Community tier',
      'Up to 500 MB per document',
      'Up to 1,000 pages per document',
      'Merge up to 50 files',
      'Monthly workflow allowance (250 credits)',
      'Priority support',
    ],
    entitlements: {
      localProcessing: true,
      maxFileSizeMB: 500,
      maxPagesPerDoc: 1000,
      batchMergeLimit: 50,
      advancedToolsAccess: true,
      cloudProcessingAllowed: false,
      aiIntelligenceAllowed: false,
      monthlyCredits: 250,
      prioritySupport: true,
    },
  },
};

export class SaaSStore {
  private dbInstance: SaaSDatabase;
  private ownershipManager: AccountOwnershipManager;
  private isTestMode: boolean = false;

  constructor(customDb?: SaaSDatabase) {
    this.dbInstance = customDb || new SaaSDatabase();
    this.ownershipManager = new AccountOwnershipManager(this.dbInstance);
  }

  getDatabase(): SaaSDatabase {
    return this.dbInstance;
  }

  setDatabase(db: SaaSDatabase): void {
    this.dbInstance = db;
    this.ownershipManager = new AccountOwnershipManager(this.dbInstance);
  }

  getOwnershipManager(): AccountOwnershipManager {
    return this.ownershipManager;
  }

  setTestMode(enabled: boolean): void {
    this.isTestMode = enabled;
  }

  snapshot(): void {
    this.dbInstance.snapshot();
  }

  restoreSnapshot(): void {
    this.dbInstance.restoreSnapshot();
  }

  // --- Users ---
  getUser(userId: string): SaaSUser | null {
    if (!userId) return null;
    const row = this.dbInstance.db
      .prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
      .get(userId) as { id: string; email: string; name: string; created_at: number } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  }

  findUserByEmail(email: string): SaaSUser | null {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const row = this.dbInstance.db
      .prepare('SELECT id, email, name, created_at FROM users WHERE email = ?')
      .get(clean) as { id: string; email: string; name: string; created_at: number } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  }

  /**
   * @deprecated Strictly test-only fallback.
   * Prohibited in production mode.
   */
  getDefaultUser(): SaaSUser {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('getDefaultUser is strictly prohibited in production mode.');
    }

    const firstRow = this.dbInstance.db
      .prepare('SELECT id, email, name, created_at FROM users ORDER BY created_at ASC LIMIT 1')
      .get() as { id: string; email: string; name: string; created_at: number } | undefined;

    if (firstRow) {
      return {
        id: firstRow.id,
        email: firstRow.email,
        name: firstRow.name,
        createdAt: firstRow.created_at,
      };
    }

    const fallback: SaaSUser = {
      id: 'usr_default_creator',
      email: 'creator@pdf-lofi.com',
      name: 'PDF Artisan',
      createdAt: Date.now(),
    };
    return this.saveUser(fallback);
  }

  saveUser(user: SaaSUser): SaaSUser {
    const cleanEmail = user.email.trim().toLowerCase();
    const createdAt = user.createdAt || Date.now();
    this.dbInstance.db
      .prepare(
        `INSERT INTO users (id, email, name, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name`
      )
      .run(user.id, cleanEmail, user.name, createdAt);

    return {
      ...user,
      email: cleanEmail,
    };
  }

  // --- Subscriptions ---
  getSubscription(userId: string): UserSubscription {
    const row = this.dbInstance.db
      .prepare(
        `SELECT id, user_id, plan_id, status, lemon_squeezy_subscription_id,
                lemon_squeezy_customer_id, lemon_squeezy_order_id, lemon_squeezy_variant_id,
                renews_at, ends_at, trial_ends_at, is_paused, cancel_at_period_end,
                created_at, updated_at, lemon_squeezy_updated_at
         FROM subscriptions WHERE user_id = ?`
      )
      .get(userId) as any;

    if (row) {
      return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id as PlanId,
        status: row.status,
        lemonSqueezySubscriptionId: row.lemon_squeezy_subscription_id,
        lemonSqueezyCustomerId: row.lemon_squeezy_customer_id,
        lemonSqueezyOrderId: row.lemon_squeezy_order_id,
        lemonSqueezyVariantId: row.lemon_squeezy_variant_id,
        renewsAt: row.renews_at,
        endsAt: row.ends_at,
        trialEndsAt: row.trial_ends_at,
        isPaused: Boolean(row.is_paused),
        cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lemonSqueezyUpdatedAt: row.lemon_squeezy_updated_at,
      };
    }

    // Default free subscription
    const freeSub: UserSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      planId: 'free',
      status: 'active',
      lemonSqueezySubscriptionId: null,
      lemonSqueezyCustomerId: null,
      lemonSqueezyOrderId: null,
      lemonSqueezyVariantId: null,
      renewsAt: null,
      endsAt: null,
      trialEndsAt: null,
      isPaused: false,
      cancelAtPeriodEnd: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lemonSqueezyUpdatedAt: null,
    };

    // Ensure user exists before inserting subscription to respect foreign key constraint
    const userRow = this.dbInstance.db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(userId);
    if (!userRow) {
      this.dbInstance.db
        .prepare('INSERT OR IGNORE INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
        .run(userId, `${userId}@example.com`, 'User', Date.now());
    }

    this.dbInstance.db
      .prepare(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, status, lemon_squeezy_subscription_id,
          lemon_squeezy_customer_id, lemon_squeezy_order_id, lemon_squeezy_variant_id,
          renews_at, ends_at, trial_ends_at, is_paused, cancel_at_period_end,
          created_at, updated_at, lemon_squeezy_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        freeSub.id,
        freeSub.userId,
        freeSub.planId,
        freeSub.status,
        freeSub.lemonSqueezySubscriptionId,
        freeSub.lemonSqueezyCustomerId,
        freeSub.lemonSqueezyOrderId,
        freeSub.lemonSqueezyVariantId,
        freeSub.renewsAt,
        freeSub.endsAt,
        freeSub.trialEndsAt,
        freeSub.isPaused ? 1 : 0,
        freeSub.cancelAtPeriodEnd ? 1 : 0,
        freeSub.createdAt,
        freeSub.updatedAt,
        freeSub.lemonSqueezyUpdatedAt || null
      );

    return freeSub;
  }

  updateSubscription(subscription: UserSubscription): UserSubscription {
    const updatedAt = Date.now();
    const updated: UserSubscription = {
      ...subscription,
      updatedAt,
    };

    this.dbInstance.db
      .prepare(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, status, lemon_squeezy_subscription_id,
          lemon_squeezy_customer_id, lemon_squeezy_order_id, lemon_squeezy_variant_id,
          renews_at, ends_at, trial_ends_at, is_paused, cancel_at_period_end,
          created_at, updated_at, lemon_squeezy_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          plan_id = excluded.plan_id,
          status = excluded.status,
          lemon_squeezy_subscription_id = excluded.lemon_squeezy_subscription_id,
          lemon_squeezy_customer_id = excluded.lemon_squeezy_customer_id,
          lemon_squeezy_order_id = excluded.lemon_squeezy_order_id,
          lemon_squeezy_variant_id = excluded.lemon_squeezy_variant_id,
          renews_at = excluded.renews_at,
          ends_at = excluded.ends_at,
          trial_ends_at = excluded.trial_ends_at,
          is_paused = excluded.is_paused,
          cancel_at_period_end = excluded.cancel_at_period_end,
          updated_at = excluded.updated_at,
          lemon_squeezy_updated_at = excluded.lemon_squeezy_updated_at`
      )
      .run(
        updated.id,
        updated.userId,
        updated.planId,
        updated.status,
        updated.lemonSqueezySubscriptionId,
        updated.lemonSqueezyCustomerId,
        updated.lemonSqueezyOrderId,
        updated.lemonSqueezyVariantId,
        updated.renewsAt,
        updated.endsAt,
        updated.trialEndsAt,
        updated.isPaused ? 1 : 0,
        updated.cancelAtPeriodEnd ? 1 : 0,
        updated.createdAt,
        updated.updatedAt,
        updated.lemonSqueezyUpdatedAt || null
      );

    return updated;
  }

  findSubscriptionByLemonSqueezyId(lemonSqueezySubscriptionId: string): UserSubscription | null {
    if (!lemonSqueezySubscriptionId) return null;
    const row = this.dbInstance.db
      .prepare(
        `SELECT id, user_id, plan_id, status, lemon_squeezy_subscription_id,
                lemon_squeezy_customer_id, lemon_squeezy_order_id, lemon_squeezy_variant_id,
                renews_at, ends_at, trial_ends_at, is_paused, cancel_at_period_end,
                created_at, updated_at, lemon_squeezy_updated_at
         FROM subscriptions WHERE lemon_squeezy_subscription_id = ?`
      )
      .get(lemonSqueezySubscriptionId) as any;

    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id as PlanId,
      status: row.status,
      lemonSqueezySubscriptionId: row.lemon_squeezy_subscription_id,
      lemonSqueezyCustomerId: row.lemon_squeezy_customer_id,
      lemonSqueezyOrderId: row.lemon_squeezy_order_id,
      lemonSqueezyVariantId: row.lemon_squeezy_variant_id,
      renewsAt: row.renews_at,
      endsAt: row.ends_at,
      trialEndsAt: row.trial_ends_at,
      isPaused: Boolean(row.is_paused),
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lemonSqueezyUpdatedAt: row.lemon_squeezy_updated_at,
    };
  }

  findSubscriptionByCustomerId(customerId: string): UserSubscription | null {
    if (!customerId) return null;
    const row = this.dbInstance.db
      .prepare(
        `SELECT id, user_id, plan_id, status, lemon_squeezy_subscription_id,
                lemon_squeezy_customer_id, lemon_squeezy_order_id, lemon_squeezy_variant_id,
                renews_at, ends_at, trial_ends_at, is_paused, cancel_at_period_end,
                created_at, updated_at, lemon_squeezy_updated_at
         FROM subscriptions WHERE lemon_squeezy_customer_id = ?`
      )
      .get(customerId) as any;

    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id as PlanId,
      status: row.status,
      lemonSqueezySubscriptionId: row.lemon_squeezy_subscription_id,
      lemonSqueezyCustomerId: row.lemon_squeezy_customer_id,
      lemonSqueezyOrderId: row.lemon_squeezy_order_id,
      lemonSqueezyVariantId: row.lemon_squeezy_variant_id,
      renewsAt: row.renews_at,
      endsAt: row.ends_at,
      trialEndsAt: row.trial_ends_at,
      isPaused: Boolean(row.is_paused),
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lemonSqueezyUpdatedAt: row.lemon_squeezy_updated_at,
    };
  }

  // --- Entitlements ---
  getEntitlements(userId: string): PlanEntitlements {
    const sub = this.getSubscription(userId);
    const plan = PLANS[sub.planId] || PLANS.free;

    const endsAtTime = sub.endsAt ? Date.parse(sub.endsAt) : null;
    const isCancelledInPaidPeriod =
      sub.status === 'cancelled' &&
      sub.planId === 'pro' &&
      endsAtTime !== null &&
      !isNaN(endsAtTime) &&
      endsAtTime > Date.now();

    const isActive = sub.status === 'active' || sub.status === 'trialing' || isCancelledInPaidPeriod;
    if (!isActive && sub.planId !== 'free') {
      return PLANS.free.entitlements;
    }

    return plan.entitlements;
  }

  // --- Usage ---
  getUsage(userId: string): UserUsage {
    const period = new Date().toISOString().slice(0, 7);
    const sub = this.getSubscription(userId);
    const plan = PLANS[sub.planId] || PLANS.free;

    let row = this.dbInstance.db
      .prepare(
        `SELECT user_id, period, credits_total, credits_used, credits_remaining, operations_count
         FROM usage WHERE user_id = ? AND period = ?`
      )
      .get(userId, period) as any;

    if (!row) {
      this.dbInstance.db
        .prepare(
          `INSERT INTO usage (user_id, period, credits_total, credits_used, credits_remaining, operations_count)
           VALUES (?, ?, ?, 0, ?, 0)
           ON CONFLICT(user_id, period) DO NOTHING`
        )
        .run(userId, period, plan.entitlements.monthlyCredits, plan.entitlements.monthlyCredits);

      row = this.dbInstance.db
        .prepare(
          `SELECT user_id, period, credits_total, credits_used, credits_remaining, operations_count
           FROM usage WHERE user_id = ? AND period = ?`
        )
        .get(userId, period) as any;
    } else if (row.credits_total < plan.entitlements.monthlyCredits) {
      // Auto-reconcile upgrade: persist increased credit quota to database
      const added = plan.entitlements.monthlyCredits - row.credits_total;
      const newTotal = plan.entitlements.monthlyCredits;
      const newRemaining = row.credits_remaining + added;
      this.dbInstance.db
        .prepare(
          `UPDATE usage SET credits_total = ?, credits_remaining = ? WHERE user_id = ? AND period = ?`
        )
        .run(newTotal, newRemaining, userId, period);
      row.credits_total = newTotal;
      row.credits_remaining = newRemaining;
    }

    const eventRows = this.dbInstance.db
      .prepare(
        `SELECT id, operation_type, timestamp, credits_cost, description
         FROM usage_events
         WHERE user_id = ? AND period = ?
         ORDER BY timestamp DESC LIMIT 20`
      )
      .all(userId, period) as any[];

    const recentEvents: UsageEvent[] = (eventRows || []).map((e) => ({
      id: e.id,
      type: e.operation_type,
      timestamp: e.timestamp,
      credits: e.credits_cost,
      description: e.description,
    }));

    return {
      userId,
      period,
      creditsTotal: row ? row.credits_total : plan.entitlements.monthlyCredits,
      creditsUsed: row ? row.credits_used : 0,
      creditsRemaining: row ? row.credits_remaining : plan.entitlements.monthlyCredits,
      operationsCount: row ? row.operations_count : 0,
      recentEvents,
    };
  }

  /**
   * Durably writes plan credit quota to SQLite.
   * Guarantees that Pro upgrade / re-subscription credits survive database restart.
   */
  syncPlanCredits(userId: string, planId: PlanId): UserUsage {
    const period = new Date().toISOString().slice(0, 7);
    const plan = PLANS[planId] || PLANS.free;
    const targetCredits = plan.entitlements.monthlyCredits;

    const row = this.dbInstance.db
      .prepare(
        `SELECT user_id, period, credits_total, credits_used, credits_remaining, operations_count
         FROM usage WHERE user_id = ? AND period = ?`
      )
      .get(userId, period) as any;

    if (!row) {
      this.dbInstance.db
        .prepare(
          `INSERT INTO usage (user_id, period, credits_total, credits_used, credits_remaining, operations_count)
           VALUES (?, ?, ?, 0, ?, 0)
           ON CONFLICT(user_id, period) DO UPDATE SET
             credits_total = excluded.credits_total,
             credits_remaining = excluded.credits_remaining`
        )
        .run(userId, period, targetCredits, targetCredits);
    } else {
      let newTotal = targetCredits;
      let newRemaining = row.credits_remaining;
      if (targetCredits > row.credits_total) {
        const diff = targetCredits - row.credits_total;
        newRemaining += diff;
      } else if (targetCredits < row.credits_total) {
        newRemaining = Math.max(0, targetCredits - row.credits_used);
      }
      this.dbInstance.db
        .prepare(
          `UPDATE usage SET credits_total = ?, credits_remaining = ? WHERE user_id = ? AND period = ?`
        )
        .run(newTotal, newRemaining, userId, period);
    }

    return this.getUsage(userId);
  }

  /**
   * Authoritative server-side usage recording.
   * - Strict ACID transaction preventing concurrency race conditions
   * - Strictly enforces canonical operation costs from registry; rejects unknown/arbitrary operations
   * - Ignores caller-supplied credit overrides to prevent client-side manipulation
   * - Checks idempotency key to prevent duplicate deduction on retries
   * - Rejects when balance is insufficient (fail-closed)
   */
  recordUsage(
    userId: string,
    operationType: string,
    description: string,
    _callerCostOverride?: number,
    idempotencyKey?: string
  ): { allowed: boolean; usage: UserUsage; error?: string; alreadyProcessed?: boolean } {
    // 1. Authoritative canonical cost determination: only registered operations are permitted
    const canonical = getCanonicalOperation(operationType);
    if (!canonical) {
      return {
        allowed: false,
        usage: this.getUsage(userId),
        error: `Operation '${operationType}' is not recognized in the authoritative canonical operations registry.`,
      };
    }

    const resolvedCost = canonical.cost;
    if (typeof resolvedCost !== 'number' || isNaN(resolvedCost) || resolvedCost < 0) {
      return {
        allowed: false,
        usage: this.getUsage(userId),
        error: `Invalid cost configuration for operation '${operationType}'.`,
      };
    }

    const period = new Date().toISOString().slice(0, 7);

    // 2. Execute within an ACID transaction
    this.dbInstance.db.exec('BEGIN IMMEDIATE');
    try {
      // Check idempotency key if supplied
      if (idempotencyKey && idempotencyKey.trim().length > 0) {
        const existingEvent = this.dbInstance.db
          .prepare('SELECT id FROM usage_events WHERE user_id = ? AND idempotency_key = ?')
          .get(userId, idempotencyKey.trim());

        if (existingEvent) {
          this.dbInstance.db.exec('COMMIT');
          return {
            allowed: true,
            usage: this.getUsage(userId),
            alreadyProcessed: true,
          };
        }
      }

      // Ensure usage row exists for period
      const sub = this.getSubscription(userId);
      const plan = PLANS[sub.planId] || PLANS.free;

      let row = this.dbInstance.db
        .prepare(
          `SELECT credits_total, credits_used, credits_remaining, operations_count
           FROM usage WHERE user_id = ? AND period = ?`
        )
        .get(userId, period) as any;

      if (!row) {
        this.dbInstance.db
          .prepare(
            `INSERT INTO usage (user_id, period, credits_total, credits_used, credits_remaining, operations_count)
             VALUES (?, ?, ?, 0, ?, 0)`
          )
          .run(userId, period, plan.entitlements.monthlyCredits, plan.entitlements.monthlyCredits);

        row = {
          credits_total: plan.entitlements.monthlyCredits,
          credits_used: 0,
          credits_remaining: plan.entitlements.monthlyCredits,
          operations_count: 0,
        };
      }

      // Check balance
      if (resolvedCost > 0 && row.credits_remaining < resolvedCost) {
        this.dbInstance.db.exec('ROLLBACK');
        return {
          allowed: false,
          usage: this.getUsage(userId),
          error: `Insufficient credits. Required: ${resolvedCost}, Available: ${row.credits_remaining}. Upgrade to Pro for more credits.`,
        };
      }

      const newCreditsUsed = row.credits_used + resolvedCost;
      const newCreditsRemaining = Math.max(0, row.credits_total - newCreditsUsed);
      const newOperationsCount = row.operations_count + 1;

      // Update usage
      this.dbInstance.db
        .prepare(
          `UPDATE usage
           SET credits_used = ?, credits_remaining = ?, operations_count = ?
           WHERE user_id = ? AND period = ?`
        )
        .run(newCreditsUsed, newCreditsRemaining, newOperationsCount, userId, period);

      // Insert event into ledger
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.dbInstance.db
        .prepare(
          `INSERT INTO usage_events (
            id, user_id, period, operation_type, description, credits_cost, idempotency_key, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          eventId,
          userId,
          period,
          operationType,
          description || canonical?.description || 'PDF operation executed',
          resolvedCost,
          idempotencyKey || null,
          Date.now()
        );

      this.dbInstance.db.exec('COMMIT');
      return { allowed: true, usage: this.getUsage(userId) };
    } catch (err: any) {
      try {
        this.dbInstance.db.exec('ROLLBACK');
      } catch {
        // ignore
      }
      return {
        allowed: false,
        usage: this.getUsage(userId),
        error: `Database transaction error recording usage: ${err?.message || 'Transaction failed'}`,
      };
    }
  }

  // --- Webhook Idempotency ---
  isWebhookProcessed(eventId: string): boolean {
    if (!eventId) return false;
    const row = this.dbInstance.db
      .prepare('SELECT event_id FROM webhook_events WHERE event_id = ?')
      .get(eventId);
    return Boolean(row);
  }

  recordWebhookProcessed(eventId: string, eventName: string, status: 'processed' | 'ignored' | 'failed') {
    if (!eventId) return;
    this.dbInstance.db
      .prepare(
        `INSERT INTO webhook_events (event_id, event_name, processed_at, status)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(event_id) DO UPDATE SET status = excluded.status, processed_at = excluded.processed_at`
      )
      .run(eventId, eventName, Date.now(), status);
  }

  // --- Provider Subscription Ordering State ---
  getProviderSubscriptionTimestamp(providerSubId: string): number | null {
    if (!providerSubId) return null;
    const row = this.dbInstance.db
      .prepare('SELECT timestamp FROM provider_subscription_timestamps WHERE provider_sub_id = ?')
      .get(providerSubId) as { timestamp: number } | undefined;

    if (row && typeof row.timestamp === 'number' && !isNaN(row.timestamp)) {
      return row.timestamp;
    }

    const sub = this.findSubscriptionByLemonSqueezyId(providerSubId);
    if (sub && typeof sub.lemonSqueezyUpdatedAt === 'number' && !isNaN(sub.lemonSqueezyUpdatedAt)) {
      return sub.lemonSqueezyUpdatedAt;
    }

    return null;
  }

  recordProviderSubscriptionTimestamp(providerSubId: string, timestamp: number): void {
    if (!providerSubId || typeof timestamp !== 'number' || isNaN(timestamp)) return;
    this.dbInstance.db
      .prepare(
        `INSERT INTO provider_subscription_timestamps (provider_sub_id, timestamp)
         VALUES (?, ?)
         ON CONFLICT(provider_sub_id) DO UPDATE SET timestamp = excluded.timestamp`
      )
      .run(providerSubId, timestamp);
  }
}

export const saasStore = new SaaSStore();
