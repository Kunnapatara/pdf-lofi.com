/**
 * Lemon Squeezy Configuration & Environment Boundary
 * Server-side only: ensures credentials are never exposed to the client.
 */
import { LemonSqueezyConfigStatus } from '../../types/saas';

export function getLemonSqueezyConfig(): LemonSqueezyConfigStatus {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const proVariantId = process.env.LEMON_SQUEEZY_PRO_VARIANT_ID;

  const hasApiKey = Boolean(apiKey && apiKey.trim().length > 0 && !apiKey.includes('YOUR_'));
  const hasStoreId = Boolean(storeId && storeId.trim().length > 0 && !storeId.includes('YOUR_'));
  const hasWebhookSecret = Boolean(webhookSecret && webhookSecret.trim().length > 0);
  const hasProVariantId = Boolean(proVariantId && proVariantId.trim().length > 0);

  const isConfigured = hasApiKey && hasStoreId;

  return {
    isConfigured,
    hasApiKey,
    hasStoreId,
    hasWebhookSecret,
    hasProVariantId,
    storeId: hasStoreId ? (storeId as string) : null,
    proVariantId: hasProVariantId ? (proVariantId as string) : null,
    mode: isConfigured ? 'live' : 'unconfigured',
  };
}

export function assertLemonSqueezyConfigured() {
  const config = getLemonSqueezyConfig();
  if (!config.isConfigured) {
    const missing: string[] = [];
    if (!config.hasApiKey) missing.push('LEMON_SQUEEZY_API_KEY');
    if (!config.hasStoreId) missing.push('LEMON_SQUEEZY_STORE_ID');
    if (!config.hasProVariantId) missing.push('LEMON_SQUEEZY_PRO_VARIANT_ID');
    throw new Error(
      `Lemon Squeezy integration boundary: Missing required environment variables: ${missing.join(
        ', '
      )}. Please provide these credentials in your environment/.env file to activate live payments.`
    );
  }
}
