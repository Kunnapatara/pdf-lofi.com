/**
 * Rebuilt Tools Directory
 * Driven directly by the Canonical Tool Registry (/src/features/tools/toolsRegistry.ts).
 * Only real, implemented tools are marked as available.
 * Transparent category navigation, search, and local-first execution.
 */

import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, X } from 'lucide-react';
import { ActiveTab, AppView } from '../../types/pdf';
import { ToolCard } from '../../components/cards/ToolCard';
import {
  CANONICAL_TOOLS,
  CanonicalPdfTool,
  ToolCategory,
} from './toolsRegistry';
import { useEntitlements } from '../../services/entitlementService';

interface ToolsDirectoryProps {
  onSelectToolAction?: (actionTab: ActiveTab) => void;
  onNavigateView?: (view: AppView) => void;
  hasDocument: boolean;
  onOpenPdf: () => void;
}

type DirectoryCategoryFilter = 'all' | ToolCategory;

const CATEGORY_ITEMS: { id: DirectoryCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Tools' },
  { id: 'organize', label: 'Organize' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'convert', label: 'Convert' },
  { id: 'edit', label: 'Edit' },
  { id: 'security', label: 'Security' },
];

export const ToolsDirectory: React.FC<ToolsDirectoryProps> = ({
  onSelectToolAction,
  onNavigateView,
  hasDocument,
  onOpenPdf,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DirectoryCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'coming_soon'>('all');
  const { isPro } = useEntitlements();

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CANONICAL_TOOLS.filter((tool) => {
      // Category match
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;

      // Status match
      const matchesStatus = statusFilter === 'all' || tool.status === statusFilter;

      // Search query across name, description, category, and keywords
      const matchesSearch =
        q === '' ||
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.keywords.some((kw) => kw.toLowerCase().includes(q));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [selectedCategory, statusFilter, searchQuery]);

  const handleToolClick = (tool: CanonicalPdfTool) => {
    if (tool.status !== 'available') return;

    if (tool.workspaceTab && onSelectToolAction) {
      onSelectToolAction(tool.workspaceTab);
    }
    if (tool.routeView && onNavigateView) {
      onNavigateView(tool.routeView);
    }
  };

  const availableCount = CANONICAL_TOOLS.filter((t) => t.status === 'available').length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6 pb-12">
      {/* Directory Banner */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                PDF Tools Directory
              </h1>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full uppercase">
                {availableCount} Available
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
              Canonical directory of all in-browser PDF utilities. Supported operations execute on your device with local-first privacy.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="directory-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PDF tools (e.g. merge, split, rotate)..."
              className="w-full pl-9 pr-8 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 mt-5 border-t border-stone-100">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {CATEGORY_ITEMS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                id={`dir-cat-${cat.id}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status filter: All / Available / Roadmap */}
          <div className="flex items-center gap-1 self-start sm:self-center shrink-0 text-xs font-medium text-stone-500">
            <span className="text-[11px] text-stone-400 mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-orange-100 text-orange-800'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              All ({CANONICAL_TOOLS.length})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                statusFilter === 'available'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              onClick={() => setStatusFilter('coming_soon')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                statusFilter === 'coming_soon'
                  ? 'bg-stone-200 text-stone-800'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Roadmap ({CANONICAL_TOOLS.length - availableCount})
            </button>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center shadow-xs space-y-3">
          <p className="text-sm font-bold text-stone-800">No PDF tools match your query</p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search terms or selecting &ldquo;All Tools&rdquo; to explore available utilities.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-full text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
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
      )}

      {/* Local-First Transparency Note */}
      <div className="bg-stone-50/70 rounded-2xl border border-stone-200/70 p-4 text-xs text-stone-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Local Processing Policy:</strong> All available tools process PDF documents directly inside your browser sandbox. File bytes never leave your device.
          </span>
        </div>
        {!hasDocument && (
          <button
            onClick={onOpenPdf}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-stone-200 text-stone-800 hover:border-orange-300 hover:text-orange-600 transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            Open a PDF
          </button>
        )}
      </div>
    </div>
  );
};
