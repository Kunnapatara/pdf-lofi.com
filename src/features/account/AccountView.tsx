/**
 * Account View
 * Provides user identity, active subscription status, usage & credits ledger,
 * billing portal access, and truthful Lemon Squeezy integration status.
 */
import React, { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  Zap,
  Clock,
  ShieldCheck,
  ExternalLink,
  ChevronLeft,
  AlertCircle,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { saasService } from '../../services/saasService';
import { useEntitlements } from '../../services/entitlementService';
import { AppView } from '../../types/pdf';

interface AccountViewProps {
  onNavigateView: (view: AppView) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigateView }) => {
  const { billingState, plan, subscription, usage, isPro, entitlements } = useEntitlements();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  useEffect(() => {
    saasService.refreshState();
  }, []);

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true);
    setPortalNotice(null);
    try {
      const res = await saasService.fetchCustomerPortalUrl();
      if (res.success && res.portalUrl) {
        window.open(res.portalUrl, '_blank');
      } else {
        setPortalNotice(
          res.error ||
            'No Lemon Squeezy customer billing portal found. A customer portal is generated upon active checkout.'
        );
      }
    } catch (err: any) {
      setPortalNotice(err?.message || 'Failed to connect to billing portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  const user = billingState?.user || {
    id: 'usr_default_creator',
    name: 'PDF Artisan',
    email: 'creator@pdf-lofi.com',
    createdAt: Date.now(),
  };

  const lsConfig = billingState?.lemonSqueezyConfig;
  const creditsPct = usage
    ? Math.min(100, Math.round((usage.creditsUsed / Math.max(1, usage.creditsTotal)) * 100))
    : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigateView('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>

        <button
          onClick={() => onNavigateView('pricing')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>View All Plans & Pricing</span>
        </button>
      </div>

      {/* Main Grid: User Profile & Subscription Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Identity Profile Card */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-snug">{user.name}</h2>
              <p className="text-xs text-stone-500">{user.email}</p>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Account ID:</span>
              <span className="font-mono text-stone-800 font-semibold">{user.id}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Member Since:</span>
              <span className="text-stone-800 font-semibold">
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Document Privacy:</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Local-Only
              </span>
            </div>
          </div>
        </div>

        {/* Current Plan & Subscription Card */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Current Subscription
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-extrabold text-stone-900">{plan?.name || 'Free Community'}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
                      isPro
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {subscription?.status || 'active'}
                  </span>
                </div>
              </div>

              {isPro ? (
                <button
                  onClick={handleOpenBillingPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-all cursor-pointer shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{portalLoading ? 'Connecting...' : 'Lemon Squeezy Portal'}</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </button>
              ) : (
                <button
                  onClick={() => onNavigateView('pricing')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs shadow-orange-500/20 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Upgrade to Pro Pass</span>
                </button>
              )}
            </div>

            <p className="text-xs text-stone-600">
              {plan?.description ||
                'Unlimited client-side document processing with zero uploads to remote servers.'}
            </p>

            {portalNotice && (
              <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 p-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{portalNotice}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-100 text-xs">
            <div>
              <span className="text-stone-400 block text-[11px]">Max File Size</span>
              <span className="font-bold text-stone-800">{entitlements.maxFileSizeMB} MB</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Batch Merge</span>
              <span className="font-bold text-stone-800">{entitlements.batchMergeLimit} Files</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Max Pages/Doc</span>
              <span className="font-bold text-stone-800">{entitlements.maxPagesPerDoc} Pgs</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Renewal Date</span>
              <span className="font-bold text-stone-800">
                {subscription?.renewsAt
                  ? new Date(subscription.renewsAt).toLocaleDateString()
                  : 'N/A (Free)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage & Operations Meter */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-bold text-stone-900">Monthly Usage & Allowance</h3>
          </div>
          <span className="text-xs font-mono text-stone-500">Period: {usage?.period || 'Current'}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-stone-600 font-medium">
              Credits used: <strong className="text-stone-900">{usage?.creditsUsed || 0}</strong> /{' '}
              {usage?.creditsTotal || entitlements.monthlyCredits}
            </span>
            <span className="font-bold text-orange-600">
              {usage?.creditsRemaining || entitlements.monthlyCredits} Remaining
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${creditsPct}%` }}
            ></div>
          </div>
        </div>

        {/* Recent Events Ledger */}
        <div className="pt-2">
          <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
            Recent Activity Log
          </h4>
          <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden text-xs">
            {usage && usage.recentEvents.length > 0 ? (
              usage.recentEvents.map((evt) => (
                <div key={evt.id} className="p-3 flex items-center justify-between bg-stone-50/50">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-stone-800 block">{evt.description}</span>
                    <span className="text-[10px] text-stone-400">
                      {new Date(evt.timestamp).toLocaleTimeString()} • {evt.type}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-stone-600">
                    {evt.credits > 0 ? `-${evt.credits} credits` : '0 credits (Free)'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-stone-400">No recent operations logged yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Provider & Lemon Squeezy Architecture Status */}
      <div className="bg-stone-50 rounded-3xl border border-stone-200/80 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-bold text-stone-900">Lemon Squeezy Integration Boundary</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold ${
              lsConfig?.isConfigured
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                lsConfig?.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
            {lsConfig?.isConfigured ? 'CONNECTED (LIVE)' : 'CONFIG READY / CREDENTIALS PENDING'}
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          The SaaS billing layer uses the verified <strong>lmsqueezy/nextjs-billing</strong> architectural pattern. Secrets are strictly isolated server-side.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-2xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">API Key</span>
            <span className="font-semibold text-stone-800">
              {lsConfig?.hasApiKey ? 'Configured (Server)' : 'Not Set in .env'}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">Store ID</span>
            <span className="font-semibold text-stone-800">
              {lsConfig?.hasStoreId ? lsConfig.storeId : 'Not Set in .env'}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">Webhook Secret</span>
            <span className="font-semibold text-stone-800">
              {lsConfig?.hasWebhookSecret ? 'Configured (HMAC)' : 'Pending Secret'}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">Webhook Endpoint</span>
            <span className="font-mono text-[11px] text-stone-800 truncate block">
              /api/webhooks/lemonsqueezy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
