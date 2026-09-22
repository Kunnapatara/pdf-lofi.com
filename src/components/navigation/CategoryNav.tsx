import React from 'react';
import { Layers, Eye, GitMerge, Scissors, Grid, Radio } from 'lucide-react';
import { ActiveTab } from '../../types/pdf';

interface CategoryNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  hasDocument: boolean;
  onOpenFocusModal: () => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  activeTab,
  onSelectTab,
  hasDocument,
  onOpenFocusModal,
}) => {
  const tabs = [
    { id: 'organize' as ActiveTab, label: 'Organize Pages', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'view' as ActiveTab, label: 'Viewer & Search', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'merge' as ActiveTab, label: 'Merge PDFs', icon: <GitMerge className="w-3.5 h-3.5" /> },
    { id: 'split' as ActiveTab, label: 'Split & Extract', icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'tools' as ActiveTab, label: 'All Tools', icon: <Grid className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-2">
      <div className="flex items-center justify-start gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Pills Row */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-200/50 rounded-full border border-stone-200/80 backdrop-blur-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
