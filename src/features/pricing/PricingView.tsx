/**
 * Pricing View
 * Displays plans, server-defined entitlements, and Lemon Squeezy checkout trigger.
 * Truthful boundary: does not pretend payment is live or succeeded if unconfigured.
 * Provides direct access to commercial trust surfaces (Terms, Privacy, Refund, Support).
 */
import React, { useState, useEffect } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { saasService } from '../../services/saasService';
import { useEntitlements } from '../../services/entitlementService';
import { PlanDefinition, PlanId, LemonSqueezyConfigStatus } from '../../types/saas';
import { AppView } from '../../types/pdf';
import { TrustLegalModal, LegalTab } from '../../components/legal/TrustLegalModal';

interface PricingViewProps {
  onNavigateView: (view: AppView) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onNavigateView }) => {
  const { isPro, subscription } = useEntitlements();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [lemonConfig, setLemonConfig] = useState<LemonSqueezyConfigStatus | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<{
    title: string;
    description: string;
    missingKeys?: string[];
  } | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await saasService.fetchPlans();
        setPlans(data.plans);
        setLemonConfig(data.lemonSqueezyConfig);
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'free') {
      onNavigateView('home');
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await saasService.createCheckout(planId, billingInterval);

      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        // Truthful boundary: Lemon Squeezy credentials check
        const defaultMissing =
          billingInterval === 'yearly'
            ? [
                'LEMON_SQUEEZY_API_KEY',
                'LEMON_SQUEEZY_STORE_ID',
                'LEMON_SQUEEZY_WEBHOOK_SECRET',
                'LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID',
              ]
            : [
                'LEMON_SQUEEZY_API_KEY',
                'LEMON_SQUEEZY_STORE_ID',
                'LEMON_SQUEEZY_WEBHOOK_SECRET',
                'LEMON_SQUEEZY_PRO_VARIANT_ID',
              ];

        setModalMessage({
          title: 'Lemon Squeezy Integration Status',
          description:
            res.error ||
            'To enable live subscription checkouts, provide your Lemon Squeezy API credentials in your environment configuration.',
          missingKeys: res.missingConfig || defaultMissing,
        });
      }
    } catch (err: any) {
      setModalMessage({
        title: 'Checkout Request Failed',
        description: err?.message || 'Could not initiate checkout session. Please sign in or try again.',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Back button & header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigateView('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-500 font-medium">Merchant of Record:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Lemon Squeezy ({lemonConfig?.isConfigured ? 'Configured' : 'Setup Required'})
          </span>
        </div>
      </div>

      {/* Hero Headline */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200/80 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3 h-3" />
          Transparent SaaS Pricing
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          Simple, Fair Plans for PDF Artisans
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          Both plans include the complete client-side PDF toolkit. Upgrade to Pro when you need higher document size, page capacity, and batch limits.
        </p>
      </div>

      {/* Billing Interval Toggle (Monthly vs Annual) */}
      <div className="flex justify-center items-center pt-2">
        <div
          role="radiogroup"
          aria-label="Billing interval selection"
          className="inline-flex items-center p-1 bg-stone-100 rounded-2xl border border-stone-200 shadow-inner"
        >
          <button
            type="button"
            role="radio"
            aria-checked={billingInterval === 'monthly'}
            onClick={() => setBillingInterval('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingInterval === 'monthly'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={billingInterval === 'yearly'}
            onClick={() => setBillingInterval('yearly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingInterval === 'yearly'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Annual Billing
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-2">
        {plans.map((plan) => {
          const isCurrent = plan.id === (subscription?.planId || 'free');
          const isProPlan = plan.id === 'pro';

          const displayPrice = isProPlan
            ? billingInterval === 'yearly'
              ? plan.priceYearly
              : plan.priceMonthly
            : plan.priceMonthly;

          const displayInterval = isProPlan
            ? billingInterval === 'yearly'
              ? '/ year'
              : '/ month'
            : 'forever';

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border transition-all p-6 sm:p-8 flex flex-col justify-between ${
                isProPlan
                  ? 'bg-gradient-to-b from-orange-50/40 via-white to-white border-orange-300 shadow-md shadow-orange-500/5'
                  : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 right-6">
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-orange-500 text-white shadow-xs">
                    {plan.badge || 'POPULAR'}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{plan.name}</h3>
                  <p className="text-xs text-stone-500 mt-1">{plan.tagline}</p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-stone-900">
                      ${displayPrice}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      {displayInterval}
                    </span>
                  </div>
                  {isProPlan && (
                    <div className="text-[11px] font-medium text-stone-500 mt-0.5">
                      {billingInterval === 'yearly' ? '$60 billed annually' : '$6 billed monthly'}
                    </div>
                  )}
                </div>

                <p className="text-xs text-stone-600 border-t border-stone-100 pt-3">
                  {plan.description}
                </p>

                {/* Features list */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Included Entitlements
                  </div>
                  <ul className="space-y-2 text-xs text-stone-600">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-stone-100 text-stone-500 border border-stone-200 cursor-default"
                  >
                    Current Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={checkoutLoading}
                    className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                      isProPlan
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 active:scale-98'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {checkoutLoading && isProPlan ? (
                      <span>Connecting Lemon Squeezy...</span>
                    ) : (
                      <>
                        <span>
                          {isProPlan
                            ? billingInterval === 'yearly'
                              ? 'Upgrade to Pro Annual'
                              : 'Upgrade to Pro Monthly'
                            : 'Switch to Free'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature & Privacy Comparison Table */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 max-w-4xl mx-auto shadow-xs">
        <h3 className="text-base font-bold text-stone-900">Entitlement Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-stone-100 text-stone-500 font-medium">
                <th className="py-2.5 pr-4">Capability</th>
                <th className="py-2.5 px-4">Free Community</th>
                <th className="py-2.5 px-4 font-bold text-orange-600">Pro Pass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              <tr>
                <td className="py-3 pr-4 font-semibold flex items-start gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Full PDF toolkit access (view, merge, split, rotate, bates number, overlay, repair)</span>
                </td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold flex items-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Private local-first processing (files processed in browser without uploads)</span>
                </td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Document size capacity</td>
                <td className="py-3 px-4">Designed for up to 25 MB</td>
                <td className="py-3 px-4 font-bold text-stone-900">Designed for up to 500 MB</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Document page capacity</td>
                <td className="py-3 px-4">Designed for up to 50 pages</td>
                <td className="py-3 px-4 font-bold text-stone-900">Designed for up to 1,000 pages</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Batch merge capacity</td>
                <td className="py-3 px-4">Merge up to 5 files</td>
                <td className="py-3 px-4 font-bold text-stone-900">Merge up to 50 files</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Monthly workflow allowance</td>
                <td className="py-3 px-4">10 credits / month</td>
                <td className="py-3 px-4 font-bold text-stone-900">250 credits / month</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Priority support</td>
                <td className="py-3 px-4 text-stone-500">Standard support</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Commercial Trust & Legal Surface Footer */}
      <div className="border-t border-stone-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500 max-w-4xl mx-auto">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Local PDF tools process documents directly in your browser.</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => openLegal('privacy')}
            className="hover:text-stone-900 underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => openLegal('terms')}
            className="hover:text-stone-900 underline cursor-pointer"
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => openLegal('refund')}
            className="hover:text-stone-900 underline cursor-pointer"
          >
            Refund & Cancellation
          </button>
          <button
            type="button"
            onClick={() => openLegal('support')}
            className="hover:text-stone-900 underline cursor-pointer"
          >
            Support
          </button>
        </div>
      </div>

      {/* Modal: Lemon Squeezy Integration Status Notice */}
      {modalMessage && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900">{modalMessage.title}</h4>
                <p className="text-xs text-stone-500">Live payments integration status</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {modalMessage.description}
            </p>

            {modalMessage.missingKeys && modalMessage.missingKeys.length > 0 && (
              <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-stone-700">
                  Required Environment Configuration:
                </div>
                <ul className="text-[11px] font-mono text-stone-600 space-y-1">
                  {modalMessage.missingKeys.map((k) => (
                    <li key={k} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalMessage(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      <TrustLegalModal
        isOpen={legalModalOpen}
        initialTab={legalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
};
