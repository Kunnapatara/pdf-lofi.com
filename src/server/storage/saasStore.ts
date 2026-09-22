/**
 * SaaS Storage Layer (Server-Side)
 * Maintains User, Plan, Subscription, Entitlement, and Usage state.
 * Includes idempotent webhook event deduplication.
 * Document state remains strictly client-side.
 */
import fs from 'fs';
import path from 'path';
import {
  PlanDefinition,
  PlanId,
  SaaSUser,
  UserSubscription,
  UserUsage,
  PlanEntitlements,
} from '../../types/saas';

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free Community',
    tagline: 'Private, in-browser PDF tools for everyday work',
    description: 'Zero document uploads. All supported operations run 100% locally on your device.',
    priceMonthly: 0,
    priceYearly: 0,
    billingInterval: 'monthly',
    lemonSqueezyVariantId: null,
    features: [
      'Unlimited client-side PDF viewing & reorganizing',
      'Local-first PDF merge & range split',
      'Page rotation, duplicate, delete & blank insert',
      'IndexedDB offline document recovery',
      'Max file size up to 25 MB',
      'Up to 50 pages per document',
      '10 monthly operations quota for future tools',
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
    tagline: 'For power users, large documents & upcoming pro tools',
    description: 'Higher limits, batch workflows, and future cloud/AI processing allowances.',
    priceMonthly: 12,
    priceYearly: 108,
    billingInterval: 'monthly',
    lemonSqueezyVariantId: process.env.LEMON_SQUEEZY_PRO_VARIANT_ID || null,
    isPopular: true,
    features: [
      'All Free tier capabilities included',
      'Extended file size up to 500 MB',
      'Unlimited pages per document (up to 1,000 pages)',
      'Batch merge up to 50 files simultaneously',
      'Advanced lossless export quality',
      '250 monthly compute credits for cloud & AI tools',
      'Priority customer & developer support',
    ],
    entitlements: {
      localProcessing: true,
      maxFileSizeMB: 500,
      maxPagesPerDoc: 1000,
      batchMergeLimit: 50,
      advancedToolsAccess: true,
      cloudProcessingAllowed: true,
      aiIntelligenceAllowed: true,
      monthlyCredits: 250,
      prioritySupport: true,
    },
  },
};

interface WebhookRecord {
  eventId: string;
  eventName: string;
  processedAt: number;
  status: 'processed' | 'ignored' | 'failed';
}

interface ServerStoreSchema {
  users: Record<string, SaaSUser>;
  subscriptions: Record<string, UserSubscription>;
  usage: Record<string, UserUsage>;
  webhookEvents: Record<string, WebhookRecord>;
}

class SaaSStore {
  private dataFilePath: string;
  private state: ServerStoreSchema;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Ignore if directory already exists
      }
    }
    this.dataFilePath = path.join(dataDir, 'saas-store.json');
    this.state = this.loadState();
  }

  private loadState(): ServerStoreSchema {
    const defaultUser: SaaSUser = {
      id: 'usr_default_creator',
      email: 'creator@pdf-lofi.com',
      name: 'PDF Artisan',
      createdAt: Date.now() - 86400000 * 7,
    };

    const defaultSubscription: UserSubscription = {
      id: 'sub_default_free',
      userId: defaultUser.id,
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
      createdAt: Date.now() - 86400000 * 7,
      updatedAt: Date.now(),
    };

    const defaultUsage: UserUsage = {
      userId: defaultUser.id,
      period: new Date().toISOString().slice(0, 7),
      creditsTotal: PLANS.free.entitlements.monthlyCredits,
      creditsUsed: 1,
      creditsRemaining: PLANS.free.entitlements.monthlyCredits - 1,
      operationsCount: 3,
      recentEvents: [
        {
          id: 'evt_sample_1',
          type: 'pdf_operation_local',
          timestamp: Date.now() - 3600000 * 2,
          credits: 0,
          description: 'Local PDF Reorder & Rotate (Free unlimited)',
        },
      ],
    };

    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || { [defaultUser.id]: defaultUser },
          subscriptions: parsed.subscriptions || { [defaultUser.id]: defaultSubscription },
          usage: parsed.usage || { [defaultUser.id]: defaultUsage },
          webhookEvents: parsed.webhookEvents || {},
        };
      } catch (err) {
        console.warn('Failed to parse saas-store.json, resetting to defaults', err);
      }
    }

    const initialState: ServerStoreSchema = {
      users: { [defaultUser.id]: defaultUser },
      subscriptions: { [defaultUser.id]: defaultSubscription },
      usage: { [defaultUser.id]: defaultUsage },
      webhookEvents: {},
    };

    this.persist(initialState);
    return initialState;
  }

  private persist(data: ServerStoreSchema = this.state) {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write saas-store.json', err);
    }
  }

  // --- Users ---
  getUser(userId: string): SaaSUser | null {
    return this.state.users[userId] || null;
  }

  getDefaultUser(): SaaSUser {
    const firstUserId = Object.keys(this.state.users)[0];
    if (firstUserId && this.state.users[firstUserId]) {
      return this.state.users[firstUserId];
    }
    const fallback: SaaSUser = {
      id: 'usr_default_creator',
      email: 'creator@pdf-lofi.com',
      name: 'PDF Artisan',
      createdAt: Date.now(),
    };
    this.state.users[fallback.id] = fallback;
    this.persist();
    return fallback;
  }

  saveUser(user: SaaSUser): SaaSUser {
    this.state.users[user.id] = user;
    this.persist();
    return user;
  }

  // --- Subscriptions ---
  getSubscription(userId: string): UserSubscription {
    const existing = this.state.subscriptions[userId];
    if (existing) {
      return existing;
    }
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
    };
    this.state.subscriptions[userId] = freeSub;
    this.persist();
    return freeSub;
  }

  updateSubscription(subscription: UserSubscription): UserSubscription {
    subscription.updatedAt = Date.now();
    this.state.subscriptions[subscription.userId] = subscription;
    this.persist();
    return subscription;
  }

  findSubscriptionByLemonSqueezyId(lemonSqueezySubscriptionId: string): UserSubscription | null {
    const subs = Object.values(this.state.subscriptions);
    return subs.find((s) => s.lemonSqueezySubscriptionId === lemonSqueezySubscriptionId) || null;
  }

  findSubscriptionByCustomerId(customerId: string): UserSubscription | null {
    const subs = Object.values(this.state.subscriptions);
    return subs.find((s) => s.lemonSqueezyCustomerId === customerId) || null;
  }

  // --- Entitlements ---
  getEntitlements(userId: string): PlanEntitlements {
    const sub = this.getSubscription(userId);
    const plan = PLANS[sub.planId] || PLANS.free;

    // Check if subscription is in an active or trialing state
    const isActive = sub.status === 'active' || sub.status === 'trialing';
    if (!isActive && sub.planId !== 'free') {
      // Degrade to free entitlements if pro is past due/expired
      return PLANS.free.entitlements;
    }

    return plan.entitlements;
  }

  // --- Usage ---
  getUsage(userId: string): UserUsage {
    const period = new Date().toISOString().slice(0, 7);
    let usage = this.state.usage[userId];
    const sub = this.getSubscription(userId);
    const plan = PLANS[sub.planId] || PLANS.free;

    if (!usage || usage.period !== period) {
      usage = {
        userId,
        period,
        creditsTotal: plan.entitlements.monthlyCredits,
        creditsUsed: 0,
        creditsRemaining: plan.entitlements.monthlyCredits,
        operationsCount: 0,
        recentEvents: [],
      };
      this.state.usage[userId] = usage;
      this.persist();
    }
    return usage;
  }

  recordUsage(
    userId: string,
    operationType: string,
    description: string,
    creditsCost = 0
  ): { allowed: boolean; usage: UserUsage; error?: string } {
    const usage = this.getUsage(userId);
    if (creditsCost > 0 && usage.creditsRemaining < creditsCost) {
      return {
        allowed: false,
        usage,
        error: `Insufficient credits. Required: ${creditsCost}, Available: ${usage.creditsRemaining}. Upgrade to Pro for more credits.`,
      };
    }

    usage.creditsUsed += creditsCost;
    usage.creditsRemaining = Math.max(0, usage.creditsTotal - usage.creditsUsed);
    usage.operationsCount += 1;
    usage.recentEvents.unshift({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: operationType,
      timestamp: Date.now(),
      credits: creditsCost,
      description,
    });
    // Keep max 20 recent events
    if (usage.recentEvents.length > 20) {
      usage.recentEvents = usage.recentEvents.slice(0, 20);
    }

    this.state.usage[userId] = usage;
    this.persist();
    return { allowed: true, usage };
  }

  // --- Webhook Idempotency ---
  isWebhookProcessed(eventId: string): boolean {
    return !!this.state.webhookEvents[eventId];
  }

  recordWebhookProcessed(eventId: string, eventName: string, status: 'processed' | 'ignored' | 'failed') {
    this.state.webhookEvents[eventId] = {
      eventId,
      eventName,
      processedAt: Date.now(),
      status,
    };
    this.persist();
  }
}

export const saasStore = new SaaSStore();
