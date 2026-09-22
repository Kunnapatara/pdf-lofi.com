import React, { useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AppView, ToolCategory, LocalDocument, ToolItem } from '../../types/pdf';
import { ToolCard } from '../../components/cards/ToolCard';
import { ALL_TOOLS } from '../tools/toolsData';

interface LandingViewProps {
  onOpenPdf: () => void;
  onTrySample: () => void;
  onOpenFocusModal?: () => void;
  onSelectTool: (view: AppView) => void;
  onDropFiles: (files: FileList) => void;
  recentDocuments?: LocalDocument[];
  onOpenRecentDocument?: (doc: LocalDocument) => void;
}

type FilterCategory = 'all' | 'workflows' | 'organize' | 'optimize' | 'convert' | 'edit' | 'security' | 'intelligence';

const CATEGORY_PILLS: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'organize', label: 'Organize' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'convert', label: 'Convert' },
  { id: 'edit', label: 'Edit' },
  { id: 'security', label: 'Security' },
  { id: 'intelligence', label: 'Intelligence' },
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
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [isDragging, setIsDragging] = useState(false);

  const displayedTools = useMemo(() => {
    if (selectedCategory === 'all') {
      return ALL_TOOLS;
    }
    if (selectedCategory === 'workflows') {
      // High-priority ready workflows
      return ALL_TOOLS.filter((t) =>
        ['merge-pdf', 'split-pdf', 'organize-pdf', 'viewer-search'].includes(t.id)
      );
    }
    return ALL_TOOLS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

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

  const handleToolSelect = (tool: ToolItem) => {
    if (tool.viewKey) {
      onSelectTool(tool.viewKey);
    } else if (tool.actionKey) {
      if (tool.actionKey === 'merge') onSelectTool('merge');
      else if (tool.actionKey === 'split') onSelectTool('split');
      else if (tool.actionKey === 'organize') onSelectTool('organize');
      else if (tool.actionKey === 'view') onSelectTool('viewer');
      else onSelectTool('tools');
    } else {
      onSelectTool('tools');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-10">
      {/* Hero Section (Section 4 & 40) */}
      <section className="text-center space-y-4 pt-4 pb-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/80 shadow-2xs">
          <Sparkles className="w-3 h-3 text-orange-500" />
          <span>Local-First Architecture • In-Browser Processing</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight max-w-3xl mx-auto leading-tight">
          Everything you need to work with PDFs.
        </h1>

        <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Work with PDFs directly in your browser. Supported PDF operations run on your device without uploading your PDF for processing.
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`max-w-2xl mx-auto mt-4 p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all bg-white shadow-xs flex flex-col items-center justify-center text-center ${
            isDragging
              ? 'border-orange-500 bg-orange-50/40 scale-[1.01]'
              : 'border-stone-300 hover:border-orange-300'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-100/70 text-orange-600 flex items-center justify-center mb-3.5 shadow-xs">
            <Upload className="w-7 h-7" />
          </div>

          <h2 className="text-base sm:text-lg font-bold text-stone-900 mb-1">
            Drop your PDF files here
          </h2>
          <p className="text-xs text-stone-500 mb-5 max-w-md">
            Supports single or multiple PDF documents. Files are processed directly in your browser.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onOpenFocusModal && (
              <button
                onClick={onOpenFocusModal}
                id="btn-landing-focus"
                className="px-5 py-2.5 rounded-full text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:border-orange-200 hover:bg-orange-50/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Work & Focus</span>
              </button>
            )}

            <button
              onClick={onTrySample}
              id="btn-landing-sample"
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Try Sample PDF</span>
            </button>

            <button
              onClick={onOpenPdf}
              id="btn-landing-open"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-xs shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Open PDF</span>
            </button>
          </div>
        </div>
      </section>

      {/* Category Filter Pills (Section 4 & 40) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
            All PDF Tools
          </h2>
          <span className="text-xs text-stone-400 font-medium">
            Showing {displayedTools.length} {displayedTools.length === 1 ? 'tool' : 'tools'}
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-stone-200/70">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {CATEGORY_PILLS.map((pill) => {
              const isSelected = selectedCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setSelectedCategory(pill.id)}
                  id={`pill-cat-${pill.id}`}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80 hover:text-stone-900'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tool Cards Grid (Section 4 & 11) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              iconNode={tool.icon}
              onSelect={handleToolSelect}
            />
          ))}
        </div>
      </section>

      {/* Recent Documents Drawer (if documents exist) */}
      {recentDocuments.length > 0 && onOpenRecentDocument && (
        <section className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" />
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Recent In-Browser Documents
              </h3>
            </div>
            <span className="text-[11px] text-stone-400">Stored in device IndexedDB</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentDocuments.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenRecentDocument(doc)}
                className="p-3 rounded-2xl border border-stone-200/80 bg-stone-50/50 hover:bg-white hover:border-orange-200 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-bold text-stone-900 group-hover:text-orange-600 truncate" title={doc.name}>
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

      {/* Architecture Advantage Card (Section 13 & 14) */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Same PDF work. Different architecture.
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              LOCAL — Processing on this device
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
              Mainstream PDF utilities upload your documents to remote cloud servers. PDF-LoFi executes supported operations directly in your browser sandbox using compiled client-side engines.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
              <div className="text-xs font-bold text-emerald-700">100% In-Browser</div>
              <div className="text-[11px] text-stone-500">Zero cloud uploads</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
              <div className="text-xs font-bold text-stone-800">No Account</div>
              <div className="text-[11px] text-stone-500">Instant access</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
