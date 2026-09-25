/**
 * Rebuilt PDF-LoFi Home View
 * Replaces marketing hero with a serious, authentic local-first PDF tool platform entry point.
 *
 * Core Functional Capabilities:
 * 1. Product entry point (Local-first processing banner + quick dropzone)
 * 2. Primary tool discovery directory (Clean category filter + canonical tool cards)
 * 3. Clear explanation of local-first privacy (What stays local vs server-side)
 * 4. Direct routing layer into working tools (Merge, Split, Organize, Viewer)
 * 5. Transparent Free vs Pro product boundaries
 * 6. Quick access to in-browser recent documents (IndexedDB)
 */

import React, { useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowRight,
  HardDrive,
  Cloud,
  CheckCircle2,
  Lock,
  Search,
  ExternalLink,
} from 'lucide-react';
import { AppView, LocalDocument } from '../../types/pdf';
import { ToolCard } from '../../components/cards/ToolCard';
import {
  CANONICAL_TOOLS,
  CanonicalPdfTool,
  ToolCategory,
  AVAILABLE_TOOLS,
} from '../tools/toolsRegistry';
import { useEntitlements } from '../../services/entitlementService';

interface LandingViewProps {
  onOpenPdf: () => void;
  onTrySample: () => void;
  onOpenFocusModal?: () => void;
  onSelectTool: (view: AppView) => void;
  onDropFiles: (files: FileList) => void;
  recentDocuments?: LocalDocument[];
  onOpenRecentDocument?: (doc: LocalDocument) => void;
}

type HomeCategoryFilter = 'all' | 'available' | ToolCategory;

const CATEGORY_TABS: { id: HomeCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Tools' },
  { id: 'available', label: 'Available Now' },
  { id: 'organize', label: 'Organize' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'convert', label: 'Convert' },
  { id: 'edit', label: 'Edit' },
  { id: 'security', label: 'Security' },
];

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenPdf,
  onTrySample,
  onOpenFocusModal,
  onSelectTool,
  onDropFiles,
  recentDocuments = [],
  onOpenRecentDocument,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<HomeCategoryFilter>('available');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const { isPro, entitlements } = useEntitlements();

  // Filter tools based on search and category
  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CANONICAL_TOOLS.filter((tool) => {
      let matchesCategory = true;
      if (selectedCategory === 'all') {
        matchesCategory = true;
      } else if (selectedCategory === 'available') {
        matchesCategory = tool.status === 'available';
      } else {
        matchesCategory = tool.category === selectedCategory;
      }

      const matchesSearch =
        q === '' ||
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.keywords.some((kw) => kw.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  const handleToolClick = (tool: CanonicalPdfTool) => {
    if (tool.status !== 'available' || !tool.routeView) return;
    onSelectTool(tool.routeView);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-10">
      {/* 1. Utility Ingestion & Platform Banner */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/80">
              <Sparkles className="w-3 h-3 text-orange-500" />
              <span>A Local-First PDF Tool Platform</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Work with PDFs directly in your browser.
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Supported local PDF tools process your document directly in your browser. PDF files are not uploaded for these operations. Instant execution is powered by Web Workers and client-side binary engines.
            </p>
          </div>

          {/* Quick Platform Metrics / Trust Signals */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
              <div className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>In-Browser Processing</span>
              </div>
              <div className="text-[11px] text-stone-500">Supported PDF tools run locally</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
              <div className="text-xs font-bold text-stone-800 flex items-center justify-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-stone-500" />
                <span>No PDF File Uploads</span>
              </div>
              <div className="text-[11px] text-stone-500">Documents remain on this device</div>
            </div>
          </div>
        </div>

        {/* Ingestion Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          id="home-dropzone"
          className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
            isDragging
              ? 'border-orange-500 bg-orange-50/50 scale-[1.01]'
              : 'border-stone-300 bg-stone-50/50 hover:border-orange-300 hover:bg-stone-50'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-orange-600 flex items-center justify-center mb-3 shadow-xs">
            <Upload className="w-6 h-6" />
          </div>

          <h2 className="text-sm sm:text-base font-bold text-stone-900 mb-1">
            Drop PDF files to open workspace
          </h2>
          <p className="text-xs text-stone-500 mb-4 max-w-md">
            Open any PDF document to view, search, rotate, extract, or reorder pages in real-time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={onOpenPdf}
              id="btn-home-open-pdf"
              className="px-5 py-2 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-xs shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Open PDF</span>
            </button>

            <button
              onClick={onTrySample}
              id="btn-home-try-sample"
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Try Sample PDF</span>
            </button>

            {onOpenFocusModal && (
              <button
                onClick={onOpenFocusModal}
                id="btn-home-focus"
                className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:border-orange-200 hover:bg-orange-50/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Work & Focus Audio</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Tool Directory Hub & Filter Bar */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
              PDF Tool Directory
            </h2>
            <p className="text-xs text-stone-500">
              Browse ready client-side tools and planned offline modules.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="home-tool-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tools (e.g. merge, split, rotate)..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 border-b border-stone-200/70">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                id={`home-tab-${tab.id}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onSelect={handleToolClick}
              isProUser={isPro}
            />
          ))}
        </div>
      </section>

      {/* 3. Recent Documents (IndexedDB) */}
      {recentDocuments.length > 0 && onOpenRecentDocument && (
        <section
          id="recent-documents-section"
          className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" />
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Recent In-Browser Documents
              </h3>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">
              Stored locally on this device in IndexedDB
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentDocuments.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenRecentDocument(doc)}
                className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/50 hover:bg-white hover:border-orange-200 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="truncate">
                    <div
                      className="text-xs font-bold text-stone-900 group-hover:text-orange-600 truncate"
                      title={doc.name}
                    >
                      {doc.name}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {doc.pageCount} pages • {(doc.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Local-First Privacy & Trust Architecture Explanation */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            Clear Separation: Local Processing vs. Cloud Services
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Local Processing Side */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Processed Locally on Your Device
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>PDF Binary Bytes:</strong> Loaded and parsed directly in browser memory via pdf-lib and PDF.js.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Supported PDF Operations:</strong> Page rotations, merges, splits, and deletions execute locally in your browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Local Document & Cache State:</strong> Cached in browser IndexedDB on your device for fast session access.</span>
              </li>
            </ul>
          </div>

          {/* Server / Cloud Boundary Side */}
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-stone-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Managed on Server (No PDF Document Access)
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                <span><strong>Account & Authentication:</strong> Server-side user authentication and secure session tokens.</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                <span><strong>Subscription & Entitlements:</strong> Authoritative Lemon Squeezy tier checks and usage limits where applicable.</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                <span><strong>Document Privacy Boundary:</strong> Supported local PDF tools process your document directly in your browser. PDF files are not uploaded for these operations.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Free vs Pro Product Boundaries */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
              <span>Transparent Tier Boundaries</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Generous Free Tier for local work. Pro for high-capacity workflows.
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Standard local processing (Merge, Split, Organize, Rotate, Delete, Viewer) is designed for everyday documents up to 25 MB and 5-file merges. Pro is designed for higher-capacity documents up to 500 MB and merges of up to 50 files.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTool('pricing')}
              id="btn-home-pricing"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>View Plans & Pricing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
