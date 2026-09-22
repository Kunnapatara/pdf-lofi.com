/**
 * Entitlement Service & React Hook
 * Clear abstraction layer between PLAN and FEATURE ACCESS.
 * Components check entitlements here rather than inspecting arbitrary plan names.
 */
import { useEffect, useState } from 'react';
import { saasService } from './saasService';
import { PlanEntitlements, BillingStateResponse } from '../types/saas';

const DEFAULT_ENTITLEMENTS: PlanEntitlements = {
  localProcessing: true,
  maxFileSizeMB: 25,
  maxPagesPerDoc: 50,
  batchMergeLimit: 5,
  advancedToolsAccess: false,
  cloudProcessingAllowed: false,
  aiIntelligenceAllowed: false,
  monthlyCredits: 10,
  prioritySupport: false,
};

export class EntitlementManager {
  static getEntitlements(): PlanEntitlements {
    return saasService.getCachedState()?.entitlements || DEFAULT_ENTITLEMENTS;
  }

  static canAccessLocalProcessing(): boolean {
    return true; // Local-first processing is always enabled
  }

  static canAccessAdvancedTools(): boolean {
    return this.getEntitlements().advancedToolsAccess;
  }

  static canAccessCloudProcessing(): boolean {
    return this.getEntitlements().cloudProcessingAllowed;
  }

  static canAccessAiIntelligence(): boolean {
    return this.getEntitlements().aiIntelligenceAllowed;
  }

  static getMaxFileSizeMB(): number {
    return this.getEntitlements().maxFileSizeMB;
  }

  static getMaxPagesPerDoc(): number {
    return this.getEntitlements().maxPagesPerDoc;
  }

  static getBatchMergeLimit(): number {
    return this.getEntitlements().batchMergeLimit;
  }

  static hasSufficientCredits(required = 1): boolean {
    const usage = saasService.getCachedState()?.usage;
    if (!usage) return true;
    return usage.creditsRemaining >= required;
  }

  static validateFileSize(sizeInBytes: number): { allowed: boolean; limitMB: number; error?: string } {
    const limitMB = this.getMaxFileSizeMB();
    const sizeMB = sizeInBytes / (1024 * 1024);
    if (sizeMB > limitMB) {
      return {
        allowed: false,
        limitMB,
        error: `File exceeds the ${limitMB} MB size limit for your current plan. Upgrade to Pro for up to 500 MB support.`,
      };
    }
    return { allowed: true, limitMB };
  }

  static validateMergeBatch(fileCount: number): { allowed: boolean; limit: number; error?: string } {
    const limit = this.getBatchMergeLimit();
    if (fileCount > limit) {
      return {
        allowed: false,
        limit,
        error: `You selected ${fileCount} files, but your current plan allows up to ${limit} files per merge. Upgrade to Pro for 50-file batches.`,
      };
    }
    return { allowed: true, limit };
  }
}

/**
 * React hook for components to subscribe to real-time entitlement and plan changes
 */
export function useEntitlements() {
  const [billingState, setBillingState] = useState<BillingStateResponse | null>(() =>
    saasService.getCachedState()
  );

  useEffect(() => {
    return saasService.subscribe((state) => {
      setBillingState(state);
    });
  }, []);

  const entitlements = billingState?.entitlements || DEFAULT_ENTITLEMENTS;
  const plan = billingState?.plan;
  const subscription = billingState?.subscription;
  const usage = billingState?.usage;
  const isPro = subscription?.planId === 'pro' && (subscription.status === 'active' || subscription.status === 'trialing');

  return {
    billingState,
    entitlements,
    plan,
    subscription,
    usage,
    isPro,
    canAccessAdvancedTools: entitlements.advancedToolsAccess,
    canAccessCloudProcessing: entitlements.cloudProcessingAllowed,
    canAccessAiIntelligence: entitlements.aiIntelligenceAllowed,
    maxFileSizeMB: entitlements.maxFileSizeMB,
    batchMergeLimit: entitlements.batchMergeLimit,
    maxPagesPerDoc: entitlements.maxPagesPerDoc,
    creditsRemaining: usage?.creditsRemaining ?? entitlements.monthlyCredits,
  };
}
