/**
 * Account View
 * Truthful account ownership, authentication states, active subscription status,
 * usage & credits ledger, billing portal access, and commercial trust surfaces.
 * Strictly avoids fake default identities (no PDF Artisan fallback).
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
  LogOut,
  Mail,
  KeyRound,
  Edit2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { saasService } from '../../services/saasService';
import { useEntitlements } from '../../services/entitlementService';
import { AppView } from '../../types/pdf';
import { TrustLegalModal, LegalTab } from '../../components/legal/TrustLegalModal';

interface AccountViewProps {
  onNavigateView: (view: AppView) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigateView }) => {
  const { billingState, plan, subscription, usage, isPro } = useEntitlements();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');

  // Authentication State
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [devCodeNotice, setDevCodeNotice] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCodeSent, setEditCodeSent] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    saasService.refreshState();
  }, []);

  const user = billingState?.user;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    setOtpLoading(true);
    setAuthError(null);
    setAuthNotice(null);
    setDevCodeNotice(null);
    try {
      const res = await saasService.requestOtp(authEmail);
      if (res.success) {
        setOtpSent(true);
        setAuthNotice(res.message);
        if (res.devCode) {
          setDevCodeNotice(`Development Test Code: ${res.devCode}`);
        }
      } else {
        setAuthError(res.error || res.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Network error requesting verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode || authCode.trim().length !== 6) {
      setAuthError('Please enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setAuthError(null);
    try {
      const res = await saasService.verifyOtp(authEmail, authCode.trim(), authName);
      if (res.success) {
        setOtpSent(false);
        setAuthCode('');
        setDevCodeNotice(null);
      } else {
        setAuthError(res.error || res.message || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Network error verifying code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogout = async () => {
    await saasService.logout();
    setIsEditingProfile(false);
  };

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

  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateView('pricing')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>View All Plans & Pricing</span>
          </button>
        </div>
      </div>

      {/* Explicit Unauthenticated State */}
      {!user ? (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-8 max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Sign in to PDF-LoFi</h2>
            <p className="text-xs text-stone-500">
              Access your paid Pro subscription or manage your account using secure email OTP.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authNotice}</span>
            </div>
          )}

          {devCodeNotice && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-mono">
              {devCodeNotice}
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Your Name or Studio"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-xs cursor-pointer"
              >
                {otpLoading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-stone-700">Enter 6-Digit Code</label>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[11px] text-orange-600 underline cursor-pointer"
                  >
                    Change email
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-center font-mono text-base tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-xs cursor-pointer"
              >
                {otpLoading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
            </form>
          )}

          <div className="border-t border-stone-100 pt-4 text-center text-[11px] text-stone-400">
            Local-first PDF tools remain fully usable without signing in.
          </div>
        </div>
      ) : (
        /* Authenticated User View */
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Identity Profile Card */}
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900 leading-snug">{user.name}</h2>
                      <p className="text-xs text-stone-500">{user.email}</p>
                    </div>
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

              <div className="pt-3 border-t border-stone-100">
                <button
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all cursor-pointer shadow-xs shadow-orange-500/20"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Upgrade to Pro ($12/mo)</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-stone-600">
                  {isPro
                    ? 'Your Pro Pass is active. High-capacity files up to 500 MB and 50-file merge are unlocked.'
                    : 'You are on the Free Community plan. Standard local-first PDF tools are unlimited up to 25 MB.'}
                </p>

                {portalNotice && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{portalNotice}</span>
                  </div>
                )}
              </div>

              {/* Subscription details */}
              <div className="border-t border-stone-100 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Billing Cycle</span>
                  <span className="text-stone-800 font-semibold">{plan?.billingInterval || 'Monthly'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Max File Size</span>
                  <span className="text-stone-800 font-semibold">{plan?.entitlements.maxFileSizeMB || 25} MB</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Max Merge Batch</span>
                  <span className="text-stone-800 font-semibold">{plan?.entitlements.batchMergeLimit || 5} Files</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Credits & Usage Ledger Card */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">Monthly Usage & Operation Credits</h3>
                <p className="text-xs text-stone-500">
                  Local-first viewing, rotation, and reorganization are always 0 credits.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                Period: {usage?.period || new Date().toISOString().slice(0, 7)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-600">Credits Balance</span>
                <span className="text-stone-900">
                  <strong>{usage?.creditsRemaining ?? 10}</strong> remaining of {usage?.creditsTotal ?? 10}
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    creditsPct > 85 ? 'bg-red-500' : creditsPct > 50 ? 'bg-amber-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${creditsPct}%` }}
                />
              </div>
            </div>

            {/* Recent Events Table */}
            <div className="space-y-2 border-t border-stone-100 pt-4">
              <div className="text-xs font-bold text-stone-700">Recent Operations Ledger</div>
              {usage?.recentEvents && usage.recentEvents.length > 0 ? (
                <div className="divide-y divide-stone-100 text-xs">
                  {usage.recentEvents.map((evt) => (
                    <div key={evt.id} className="py-2 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-stone-800">{evt.description}</div>
                        <div className="text-[10px] text-stone-400">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                          evt.credits > 0 ? 'bg-orange-50 text-orange-700' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {evt.credits > 0 ? `-${evt.credits} Credits` : 'Free (0 Credits)'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No operations recorded yet this billing period.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Commercial Trust & Legal Surface Footer */}
      <div className="border-t border-stone-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
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

      {/* Legal Modal */}
      <TrustLegalModal
        isOpen={legalModalOpen}
        initialTab={legalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
};
