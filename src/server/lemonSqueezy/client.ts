/**
 * Lemon Squeezy API Client
 * Server-side communication with the Lemon Squeezy v1 REST API.
 * Follows patterns from lmsqueezy/nextjs-billing.
 */
import { getLemonSqueezyConfig } from './config';

const LEMON_SQUEEZY_API_BASE = 'https://api.lemonsqueezy.com/v1';

export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  userName?: string;
  variantId?: string;
  redirectUrl?: string;
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  isConfigured: boolean;
  error?: string;
  missingConfig?: string[];
}

export async function createLemonSqueezyCheckout(
  params: CreateCheckoutParams
): Promise<CheckoutResult> {
  const config = getLemonSqueezyConfig();

  if (!config.isConfigured) {
    const missing: string[] = [];
    if (!config.hasApiKey) missing.push('LEMON_SQUEEZY_API_KEY');
    if (!config.hasStoreId) missing.push('LEMON_SQUEEZY_STORE_ID');
    const targetVariant = params.variantId || config.proVariantId;
    if (!targetVariant) missing.push('LEMON_SQUEEZY_PRO_VARIANT_ID');

    return {
      success: false,
      isConfigured: false,
      missingConfig: missing,
      error: `Lemon Squeezy integration not configured. Missing: ${missing.join(', ')}.`,
    };
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY as string;
  const storeId = config.storeId as string;
  const variantId = params.variantId || config.proVariantId;

  if (!variantId) {
    return {
      success: false,
      isConfigured: true,
      error: 'No variant ID specified or configured for checkout.',
    };
  }

  try {
    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: params.userEmail,
            name: params.userName || undefined,
            custom: {
              user_id: params.userId,
            },
          },
          product_options: {
            redirect_url: params.redirectUrl || `${process.env.APP_URL || ''}/?view=account`,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(storeId),
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId),
            },
          },
        },
      },
    };

    const response = await fetch(`${LEMON_SQUEEZY_API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lemon Squeezy Checkout API error response:', errorText);
      return {
        success: false,
        isConfigured: true,
        error: `Lemon Squeezy checkout creation failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const checkoutUrl = data?.data?.attributes?.url;

    if (!checkoutUrl) {
      return {
        success: false,
        isConfigured: true,
        error: 'Invalid response from Lemon Squeezy: missing checkout URL',
      };
    }

    return {
      success: true,
      isConfigured: true,
      checkoutUrl,
    };
  } catch (err: any) {
    console.error('Failed to create Lemon Squeezy checkout:', err);
    return {
      success: false,
      isConfigured: true,
      error: err?.message || 'Network error communicating with Lemon Squeezy API',
    };
  }
}

export async function getCustomerPortalUrl(
  customerId: string
): Promise<{ success: boolean; portalUrl?: string; error?: string }> {
  const config = getLemonSqueezyConfig();
  if (!config.hasApiKey) {
    return {
      success: false,
      error: 'Lemon Squeezy API key not configured.',
    };
  }

  try {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY as string;
    const response = await fetch(`${LEMON_SQUEEZY_API_BASE}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Customer lookup failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const portalUrl = data?.data?.attributes?.urls?.customer_portal;

    if (!portalUrl) {
      return {
        success: false,
        error: 'No customer portal URL returned for this customer.',
      };
    }

    return {
      success: true,
      portalUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch customer portal URL',
    };
  }
}
