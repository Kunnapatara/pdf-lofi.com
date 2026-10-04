/**
 * Commercial Trust & Legal Surface Modal
 * Production-ready Terms of Service, Privacy Policy, Refund Policy, and Support.
 * Strictly adheres to scoped privacy wording:
 * "Supported local PDF tools process your document directly in your browser. PDF files are not uploaded for these operations."
 */
import React, { useState } from 'react';
import { X, ShieldCheck, FileText, RefreshCw, Mail, ExternalLink, CheckCircle2 } from 'lucide-react';

export type LegalTab = 'privacy' | 'terms' | 'refund' | 'support';

interface TrustLegalModalProps {
  initialTab?: LegalTab;
  isOpen: boolean;
  onClose: () => void;
}

export const TrustLegalModal: React.FC<TrustLegalModalProps> = ({
  initialTab = 'privacy',
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Legal, Privacy & Billing Terms</h3>
              <p className="text-xs text-stone-500">PDF-LoFi SaaS Commercial Trust Surface</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-stone-100 text-xs overflow-x-auto">
          {[
            { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
            { id: 'terms', label: 'Terms of Service', icon: FileText },
            { id: 'refund', label: 'Refund & Cancellation', icon: RefreshCw },
            { id: 'support', label: 'Support & Contact', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as LegalTab)}
                className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-stone-700 space-y-4 leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-emerald-950 font-medium">
                <span className="font-bold">Core Processing Guarantee: </span>
                Supported local PDF tools process your document directly in your browser. PDF files are not uploaded for these operations.
              </div>

              <h4 className="text-sm font-bold text-stone-900">1. Information We Collect</h4>
              <p>
                When you create an account or subscribe to PDF-LoFi Pro, we collect your verified email address, optional account name, and server-side subscription identifier provided by our billing partner (Lemon Squeezy).
              </p>

              <h4 className="text-sm font-bold text-stone-900">2. Document Privacy & Processing</h4>
              <p>
                Your PDF files, document pages, bookmarks, and visual content remain inside your local browser memory and sandbox during supported operations. We do not transmit or store your document bytes on external servers for local processing tools.
              </p>

              <h4 className="text-sm font-bold text-stone-900">3. Authentication & Sessions</h4>
              <p>
                Sessions are authenticated via cryptographically signed tokens delivered over secure, HTTP-only cookies. Account ownership is verified via short-lived, single-use one-time codes (OTP) sent to your email address.
              </p>

              <h4 className="text-sm font-bold text-stone-900">4. Payment Processing</h4>
              <p>
                Payments are processed securely through Lemon Squeezy as our Merchant of Record. We never receive or store your raw payment card numbers or bank credentials.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-stone-900">1. Acceptance of Terms</h4>
              <p>
                By using PDF-LoFi or purchasing a Pro subscription, you agree to these Terms of Service. If you do not agree, do not access or use the service.
              </p>

              <h4 className="text-sm font-bold text-stone-900">2. Accounts & Ownership</h4>
              <p>
                You are responsible for maintaining ownership and control of the email address associated with your account. Accounts are non-transferable and may not be shared across organizations without authorization.
              </p>

              <h4 className="text-sm font-bold text-stone-900">3. Free vs. Pro Entitlements</h4>
              <p>
                Free Community users receive generous local-first PDF processing capacity (up to 25 MB per document, 50 pages, and 5 files per merge). Pro Pass subscribers receive higher document limits (up to 500 MB, 1,000 pages, and 50 merge files) and a monthly allowance of 250 processing credits.
              </p>

              <h4 className="text-sm font-bold text-stone-900">4. Acceptable Use</h4>
              <p>
                You agree not to use the service for unlawful purposes, reverse-engineer paid billing boundaries, or attempt unauthorized access to other user accounts.
              </p>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-stone-900">1. Subscription Billing & Auto-Renewal</h4>
              <p>
                Subscriptions automatically renew at the end of each billing cycle (monthly or yearly) unless cancelled prior to the renewal date.
              </p>

              <h4 className="text-sm font-bold text-stone-900">2. Cancellation Policy</h4>
              <p>
                You may cancel your subscription at any time directly through the Lemon Squeezy Customer Billing Portal accessible from your Account page. When cancelled, your Pro entitlements and credit balance remain fully active until the end of your prepaid billing period (`ends_at`).
              </p>

              <h4 className="text-sm font-bold text-stone-900">3. 14-Day Refund Guarantee</h4>
              <p>
                If you are unsatisfied with PDF-LoFi Pro for any reason within 14 days of your initial purchase or first renewal, contact our support team to request a full refund without hassle.
              </p>

              <h4 className="text-sm font-bold text-stone-900">4. Chargebacks</h4>
              <p>
                We encourage you to contact support before initiating a bank dispute so we can resolve any billing inquiries directly.
              </p>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-stone-900">Customer Support & Contacts</h4>
              <p>
                Have a question about your subscription, an active invoice, or local PDF processing? Our team is here to assist.
              </p>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-stone-900">Email Support:</span>
                  <a href="mailto:support@pdf-lofi.com" className="text-orange-600 underline font-mono">
                    support@pdf-lofi.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-stone-500" />
                  <span className="font-semibold text-stone-900">Merchant of Record:</span>
                  <span className="text-stone-600">Lemon Squeezy (orders@lemonsqueezy.com)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Last revised: October 2026</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
