/**
 * Client-side SaaS & Billing Service
 * Communicates with the server-side SaaS layer.
 * Enforces that entitlements and plan permissions originate from the server.
 */
import {
  BillingStateResponse,
  PlanDefinition,
  PlanEntitlements,
  PlanId,
  SaaSUser,
  UserSubscription,
  UserUsage,
  LemonSqueezyConfigStatus,
} from '../types/saas';

class SaaSService {
  private currentState: BillingStateResponse | null = null;
  private listeners: Set<(state: BillingStateResponse) => void> = new Set();
  private isFetching = false;

  constructor() {
    // Initial fetch from server
    if (typeof window !== 'undefined') {
      this.refreshState();
    }
  }

  subscribe(listener: (state: BillingStateResponse) => void): () => void {
    this.listeners.add(listener);
    if (this.currentState) {
      listener(this.currentState);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    if (!this.currentState) return;
    for (const listener of this.listeners) {
      try {
        listener(this.currentState);
      } catch (err) {
        console.error('Error in saas listener:', err);
      }
    }
  }

  getCachedState(): BillingStateResponse | null {
    return this.currentState;
  }

  async refreshState(): Promise<BillingStateResponse | null> {
    if (this.isFetching) return this.currentState;
    this.isFetching = true;

    try {
      const res = await fetch('/api/billing/state');
      if (!res.ok) {
        throw new Error(`Failed to fetch billing state: ${res.statusText}`);
      }
      const data: BillingStateResponse = await res.json();
      this.currentState = data;
      this.notify();
      return data;
    } catch (err) {
      console.warn('Could not fetch server billing state (dev offline or fallback):', err);
      return this.currentState;
    } finally {
      this.isFetching = false;
    }
  }

  async fetchPlans(): Promise<{ plans: PlanDefinition[]; lemonSqueezyConfig: LemonSqueezyConfigStatus }> {
    const res = await fetch('/api/plans');
    if (!res.ok) {
      throw new Error('Failed to load plans');
    }
    return res.json();
  }

  async createCheckout(
    planId: PlanId = 'pro'
  ): Promise<{ success: boolean; checkoutUrl?: string; isConfigured: boolean; error?: string; missingConfig?: string[] }> {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        redirectUrl: `${window.location.origin}/?view=account&checkout=success`,
      }),
    });

    const data = await res.json();
    return data;
  }

  async fetchCustomerPortalUrl(): Promise<{ success: boolean; portalUrl?: string; error?: string }> {
    const res = await fetch('/api/billing/portal');
    return res.json();
  }

  async recordUsage(
    operationType: string,
    description: string,
    creditsCost = 0
  ): Promise<{ success: boolean; usage?: UserUsage; error?: string }> {
    try {
      const res = await fetch('/api/usage/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationType, description, creditsCost }),
      });

      const data = await res.json();
      if (res.ok && data.usage && this.currentState) {
        this.currentState.usage = data.usage;
        this.notify();
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to record usage' };
    }
  }

  // Entitlement helper
  checkEntitlement<K extends keyof PlanEntitlements>(
    key: K,
    fallback: PlanEntitlements[K]
  ): PlanEntitlements[K] {
    if (this.currentState?.entitlements?.[key] !== undefined) {
      return this.currentState.entitlements[key];
    }
    return fallback;
  }
}

export const saasService = new SaaSService();
