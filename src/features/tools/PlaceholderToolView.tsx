import React from 'react';
import { ShieldCheck, Sparkles, ArrowLeft, GitMerge, Scissors, Layers, Search } from 'lucide-react';
import { AppView } from '../../types/pdf';

interface PlaceholderToolViewProps {
  toolName: string;
  description: string;
  iconNode: React.ReactNode;
  onNavigateView: (view: AppView) => void;
}

export const PlaceholderToolView: React.FC<PlaceholderToolViewProps> = ({
  toolName,
  description,
  iconNode,
  onNavigateView,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Tool Header */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              {iconNode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                  {toolName}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateView('tools')}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors self-start sm:self-center cursor-pointer"
          >
            ← Back to All Tools
          </button>
        </div>
      </div>

      {/* Honest Local-First Roadmap Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-8 sm:p-10 shadow-xs text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7 text-emerald-600" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase text-orange-700 bg-orange-50 border border-orange-200">
            <Sparkles className="w-3 h-3 text-orange-500" />
            In Active Development • Sprint 2
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            Client-Side {toolName} Coming Soon
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            PDF-LoFi is committed to local-first privacy. We are currently implementing in-browser compiled routines for this tool so your files never need to be uploaded to an external server.
          </p>
        </div>

        {/* Alternatives ready right now */}
        <div className="pt-4 border-t border-stone-100 max-w-lg mx-auto">
          <div className="text-xs font-bold text-stone-700 mb-3">
            Available In-Browser Tools You Can Use Today:
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => onNavigateView('merge')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-stone-200 transition-all cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5 text-orange-600" />
              <span>Merge PDF</span>
            </button>
            <button
              onClick={() => onNavigateView('split')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-stone-200 transition-all cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5 text-orange-600" />
              <span>Split PDF</span>
            </button>
            <button
              onClick={() => onNavigateView('organize')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-stone-200 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span>Organize Pages</span>
            </button>
            <button
              onClick={() => onNavigateView('viewer')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-stone-200 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-orange-600" />
              <span>Viewer & Search</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
