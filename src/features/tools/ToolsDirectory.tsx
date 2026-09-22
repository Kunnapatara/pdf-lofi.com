import React, { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { ToolItem, ActiveTab, AppView } from '../../types/pdf';
import { ToolCard } from '../../components/cards/ToolCard';
import { ALL_TOOLS } from './toolsData';

interface ToolsDirectoryProps {
  onSelectToolAction?: (actionTab: ActiveTab) => void;
  onNavigateView?: (view: AppView) => void;
  hasDocument: boolean;
  onOpenPdf: () => void;
}

type DirectoryFilter =
  | 'all'
  | 'workflows'
  | 'organize'
  | 'optimize'
  | 'convert'
  | 'edit'
  | 'security'
  | 'intelligence';

const CATEGORIES: { id: DirectoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'organize', label: 'Organize' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'convert', label: 'Convert' },
  { id: 'edit', label: 'Edit' },
  { id: 'security', label: 'Security' },
  { id: 'intelligence', label: 'Intelligence' },
];

export const ToolsDirectory: React.FC<ToolsDirectoryProps> = ({
  onSelectToolAction,
  onNavigateView,
  hasDocument,
  onOpenPdf,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DirectoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTools = useMemo(() => {
    return ALL_TOOLS.filter((tool) => {
      let matchesCategory = true;
      if (selectedCategory === 'all') {
        matchesCategory = true;
      } else if (selectedCategory === 'workflows') {
        matchesCategory = ['merge-pdf', 'split-pdf', 'organize-pdf', 'viewer-search'].includes(
          tool.id
        );
      } else {
        matchesCategory = tool.category === selectedCategory;
      }

      const matchesSearch =
        searchQuery.trim() === '' ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleToolClick = (tool: ToolItem) => {
    if (tool.status !== 'READY') {
      if (tool.viewKey && onNavigateView) {
        onNavigateView(tool.viewKey);
      }
      return;
    }

    if (tool.viewKey && onNavigateView) {
      onNavigateView(tool.viewKey);
      return;
    }

    if (tool.actionKey && onSelectToolAction) {
      onSelectToolAction(tool.actionKey);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Directory Banner */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                All PDF Tools
              </h2>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full uppercase">
                Directory
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Select any tool to begin. Supported operations run directly on your device without server upload.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a tool..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>
        </div>

        {/* Category Filter Order: All | Workflows | Organize | Optimize | Convert | Edit | Security | Intelligence */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-5 mt-5 border-t border-stone-100 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
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
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center shadow-xs space-y-2">
          <p className="text-sm font-bold text-stone-700">No tools match your filter</p>
          <p className="text-xs text-stone-400">Try searching with a different keyword or category.</p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="mt-3 px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              iconNode={tool.icon}
              onSelect={handleToolClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
