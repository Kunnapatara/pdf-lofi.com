import React, { useState, useEffect } from 'react';
import {
  Headphones,
  FileText,
  Upload,
  Sparkles,
  ShieldCheck,
  GitMerge,
  Scissors,
  Layers,
  Grid,
  CreditCard,
  User,
  Clock,
  WifiOff,
} from 'lucide-react';
import { LocalDocument, AppView } from '../../types/pdf';
import { useEntitlements } from '../../services/entitlementService';

interface HeaderProps {
  currentView: AppView;
  onNavigateView: (view: AppView) => void;
  currentDocument: LocalDocument | null;
  onOpenFocusModal: () => void;
  onLoadSample: () => void;
  onSelectFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isFocusActive?: boolean;
  recentCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigateView,
  currentDocument,
  onOpenFocusModal,
  onLoadSample,
  onSelectFile,
  isFocusActive = false,
  recentCount = 0,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { isPro } = useEntitlements();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Canonical Primary Navigation: Home, Tools Directory, Merge, Split, Organize, Pricing, Recent Files, Account
  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <span className="w-2 h-2 rounded-full bg-orange-500"></span> },
    { id: 'tools', label: 'Tools', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 'merge', label: 'Merge', icon: <GitMerge className="w-3.5 h-3.5" /> },
    { id: 'split', label: 'Split', icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'organize', label: 'Organize', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'pricing', label: 'Pricing', icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3">
      {/* Floating Island Banner matching QRxMENU visual hierarchy */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-6 transition-all space-y-4">
        {/* Top Row: Brand, Local Status, and Utility Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Column: Brand & Architecture Identity */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-orange-50 text-orange-600 border border-orange-200/80">
                <Sparkles className="w-3 h-3 text-orange-500" />
                Local-First PDF Workspace
              </span>

              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                title="Supported PDF operations run 100% on your device without server upload"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                LOCAL — Processing on this device
              </span>

              {!isOnline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
                  <WifiOff className="w-3 h-3 text-stone-500" />
                  OFFLINE READY
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <button
                onClick={() => onNavigateView('home')}
                className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight hover:text-orange-600 transition-colors text-left cursor-pointer"
              >
                PDF-LoFi
              </button>
              <span className="text-xs font-semibold text-stone-400">pdf-lofi.com</span>
            </div>

            <p className="text-xs text-stone-500">
              A local-first PDF tool platform. Supported operations run in your browser without cloud document uploads.
            </p>
          </div>

          {/* Right Column: Action Pills */}
          <div className="flex items-center flex-wrap gap-2 self-start md:self-center">
            {/* Work & Focus Audio Toggle */}
            <button
              onClick={onOpenFocusModal}
              id="btn-work-focus"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                isFocusActive
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs shadow-orange-500/20'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-orange-200 hover:bg-orange-50/50'
              }`}
              title="Work & Focus: Calm lo-fi background audio via official YouTube player"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Work & Focus</span>
              {isFocusActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5"></span>}
            </button>

            {/* Try Sample PDF button */}
            <button
              onClick={onLoadSample}
              id="btn-sample-pdf"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Try Sample PDF</span>
            </button>

            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={onSelectFile}
              id="file-upload-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              id="btn-open-pdf"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs shadow-orange-500/25 active:scale-95 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Open PDF</span>
            </button>
          </div>
        </div>

        {/* Second Row: Primary Tool Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-stone-100 scrollbar-none"
        >
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateView(item.id)}
                id={`nav-${item.id}`}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-stone-50/80 text-stone-700 hover:bg-stone-100 hover:text-stone-950 border border-stone-200/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Quick jump to Recent Files on Home if any stored */}
          {recentCount > 0 && (
            <button
              onClick={() => {
                onNavigateView('home');
                setTimeout(() => {
                  const el = document.getElementById('recent-documents-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              id="nav-recent-files"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-stone-50/80 text-stone-700 hover:bg-stone-100 hover:text-stone-950 border border-stone-200/60 transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span>Recent Files</span>
              <span className="px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                {recentCount}
              </span>
            </button>
          )}

          {/* If a document is loaded, show active Workspace tab */}
          {currentDocument && (
            <button
              onClick={() => onNavigateView('workspace')}
              id="nav-workspace"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ml-auto cursor-pointer ${
                currentView === 'workspace'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-50/80 text-stone-700 hover:bg-stone-100 border border-stone-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <Layers className="w-3.5 h-3.5" />
              <span>Active Workspace</span>
            </button>
          )}

          {/* Account & Billing Navigation Button */}
          <button
            onClick={() => onNavigateView('account')}
            id="nav-account"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              !currentDocument ? 'ml-auto' : ''
            } ${
              currentView === 'account'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-50/80 text-stone-700 hover:bg-stone-100 border border-stone-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                isPro
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-stone-200 text-stone-700'
              }`}
            >
              {isPro ? 'Pro' : 'Free'}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
