/**
 * Client-side SaaS & Billing Service
 * Communicates with the server-side SaaS layer.
 * - Manages server-authoritative authenticated session initialization
 * - Automatically credentials API requests with cookies/credentials: 'include'
 * - Enforces that entitlements and plan permissions originate from the server
 * - Handles OTP request & verification flows for account ownership
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
  private sessionInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initSessionAndLoad();
    }
  }

  /**
   * Initializes or restores the authenticated session with the server,
   * then fetches the authoritative billing state.
   */
  async initSessionAndLoad(): Promise<void> {
    try {
      const initRes = await fetch('/api/auth/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (initRes.ok) {
        this.sessionInitialized = true;
      }
    } catch (err) {
      console.warn('Session initialization notice (offline/local):', err);
    }
    await this.refreshState();
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
      const res = await fetch('/api/billing/state', {
        credentials: 'include',
      });

      if (res.status === 401) {
        // Unauthenticated visitor
        this.currentState = null;
        return null;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch billing state: ${res.statusText}`);
      }
      const data: BillingStateResponse = await res.json();
      this.currentState = data;
      this.notify();
      return data;
    } catch (err) {
      console.warn('Could not fetch server billing state:', err);
      return this.currentState;
    } finally {
      this.isFetching = false;
    }
  }

  async fetchPlans(): Promise<{ plans: PlanDefinition[]; lemonSqueezyConfig: LemonSqueezyConfigStatus }> {
    const res = await fetch('/api/plans', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to load plans');
    }
    return res.json();
  }

  async requestOtp(
    email: string,
    purpose: 'login' | 'email_change' = 'login'
  ): Promise<{ success: boolean; message: string; expiresAt?: number; devCode?: string; error?: string }> {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, purpose }),
    });

    const data = await res.json();
    return data;
  }

  async verifyOtp(
    email: string,
    code: string,
    name?: string
  ): Promise<{ success: boolean; user?: SaaSUser; error?: string; message?: string }> {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, code, name }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      this.sessionInitialized = true;
      await this.refreshState();
    }
    return data;
  }

  async updateProfile(
    name?: string,
    email?: string,
    verificationCode?: string
  ): Promise<{ success: boolean; user?: SaaSUser; error?: string; message?: string }> {
    const res = await fetch('/api/auth/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, verificationCode }),
    });

    const data = await res.json();
    if (res.ok) {
      await this.refreshState();
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      this.currentState = null;
      this.sessionInitialized = false;
      await this.refreshState();
    }
  }

  async createCheckout(
    planId: PlanId = 'pro',
    billingInterval: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{ success: boolean; checkoutUrl?: string; isConfigured: boolean; error?: string; missingConfig?: string[] }> {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        planId,
        billingInterval,
        redirectUrl: `${window.location.origin}/?view=account&checkout=success`,
      }),
    });

    const data = await res.json();
    return data;
  }

  async fetchCustomerPortalUrl(): Promise<{ success: boolean; portalUrl?: string; error?: string }> {
    const res = await fetch('/api/billing/portal', { credentials: 'include' });
    return res.json();
  }

  async recordUsage(
    operationType: string,
    description: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; usage?: UserUsage; error?: string }> {
    try {
      const res = await fetch('/api/usage/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          operationType,
          description,
          idempotencyKey: idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.usage && this.currentState) {
        this.currentState.usage = data.usage;
        this.notify();
      }
      return {
        success: res.ok,
        usage: data.usage,
        error: data.message || data.error,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error recording usage',
      };
    }
  }
}

export const saasService = new SaaSService();
