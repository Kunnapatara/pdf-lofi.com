export type PlanId = 'free' | 'pro';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'unpaid'
  | 'expired'
  | 'none';

export interface SaaSUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface PlanEntitlements {
  /** Local-first operations are always unlimited on all tiers */
  localProcessing: boolean;
  /** Maximum single PDF file size in Megabytes */
  maxFileSizeMB: number;
  /** Maximum pages per document before memory guard warnings */
  maxPagesPerDoc: number;
  /** Maximum number of files in a single merge operation */
  batchMergeLimit: number;
  /** Access to advanced PDF metadata, redaction, or lossless export */
  advancedToolsAccess: boolean;
  /** Future cloud conversion/OCR quota */
  cloudProcessingAllowed: boolean;
  /** Future AI document intelligence quota */
  aiIntelligenceAllowed: boolean;
  /** Monthly operations / credits allowance */
  monthlyCredits: number;
  /** Priority support tier */
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billingInterval: 'monthly' | 'yearly';
  lemonSqueezyVariantId: string | null;
  features: string[];
  entitlements: PlanEntitlements;
  isPopular?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  lemonSqueezySubscriptionId: string | null;
  lemonSqueezyCustomerId: string | null;
  lemonSqueezyOrderId: string | null;
  lemonSqueezyVariantId: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  isPaused: boolean;
  cancelAtPeriodEnd: boolean;
  createdAt: number;
  updatedAt: number;
  lemonSqueezyUpdatedAt?: number | null;
}

export interface UsageEvent {
  id: string;
  type: string;
  timestamp: number;
  credits: number;
  description: string;
}

export interface UserUsage {
  userId: string;
  period: string; // YYYY-MM
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  operationsCount: number;
  recentEvents: UsageEvent[];
}

export interface LemonSqueezyConfigStatus {
  isConfigured: boolean;
  hasApiKey: boolean;
  hasStoreId: boolean;
  hasWebhookSecret: boolean;
  hasProVariantId: boolean;
  storeId: string | null;
  proVariantId: string | null;
  mode: 'live' | 'test' | 'unconfigured';
}

export interface BillingStateResponse {
  user: SaaSUser;
  subscription: UserSubscription;
  plan: PlanDefinition;
  entitlements: PlanEntitlements;
  usage: UserUsage;
  lemonSqueezyConfig: LemonSqueezyConfigStatus;
}
