/**
 * Pricing View
 * Displays plans, server-defined entitlements, and Lemon Squeezy checkout trigger.
 * Truthful boundary: does not pretend payment succeeded if Lemon Squeezy is unconfigured.
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

interface PricingViewProps {
  onNavigateView: (view: AppView) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onNavigateView }) => {
  const { isPro, subscription } = useEntitlements();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [lemonConfig, setLemonConfig] = useState<LemonSqueezyConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<{
    title: string;
    description: string;
    missingKeys?: string[];
  } | null>(null);

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
      const res = await saasService.createCheckout(planId);

      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        // Truthful boundary: Lemon Squeezy not yet configured with live credentials
        setModalMessage({
          title: 'Lemon Squeezy Integration Boundary',
          description:
            res.error ||
            'To enable live subscription checkouts, provide your Lemon Squeezy API credentials in .env.',
          missingKeys: res.missingConfig || ['LEMON_SQUEEZY_API_KEY', 'LEMON_SQUEEZY_STORE_ID'],
        });
      }
    } catch (err: any) {
      setModalMessage({
        title: 'Checkout Request Failed',
        description: err?.message || 'Could not initiate checkout session.',
      });
    } finally {
      setCheckoutLoading(false);
    }
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
          <span className="text-stone-500 font-medium">Provider:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Lemon Squeezy {lemonConfig?.isConfigured ? 'Live' : 'Sandbox/Config'}
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
          Local-first operations are always free and unlimited. Support continuous development, extended file sizes, and unlock cloud/AI processing allowances with Pro.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-2">
        {plans.map((plan) => {
          const isCurrent = plan.id === (subscription?.planId || 'free');
          const isProPlan = plan.id === 'pro';

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

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-extrabold text-stone-900">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-xs font-semibold text-stone-500">
                    {plan.priceMonthly === 0 ? 'forever' : '/ month'}
                  </span>
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
                        <span>{isProPlan ? 'Upgrade with Lemon Squeezy' : 'Switch to Free'}</span>
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
                <td className="py-3 pr-4 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Local-first processing (Zero document uploads)
                </td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Unlimited</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Max file size limit</td>
                <td className="py-3 px-4">25 MB</td>
                <td className="py-3 px-4 font-bold text-stone-900">500 MB</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Pages per document</td>
                <td className="py-3 px-4">Up to 50 pages</td>
                <td className="py-3 px-4 font-bold text-stone-900">Up to 1,000 pages</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Batch Merge queue limit</td>
                <td className="py-3 px-4">5 files</td>
                <td className="py-3 px-4 font-bold text-stone-900">50 files</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Monthly compute credits allowance</td>
                <td className="py-3 px-4">10 credits</td>
                <td className="py-3 px-4 font-bold text-stone-900">250 credits</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Lossless high-res export</td>
                <td className="py-3 px-4">Standard</td>
                <td className="py-3 px-4 font-bold text-stone-900">High-fidelity</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Lemon Squeezy Integration Boundary Notice */}
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
    </div>
  );
};
