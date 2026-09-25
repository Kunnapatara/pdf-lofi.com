import React from 'react';
import {
  Layers,
  Eye,
  GitMerge,
  Scissors,
  Grid,
  Stamp,
  FileText,
  Zap,
  Scan,
  FileCheck,
  GitCompare,
  Workflow,
  FileImage,
  Shield,
} from 'lucide-react';
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
}) => {
  const tabs = [
    { id: 'organize' as ActiveTab, label: 'Organize', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'edit' as ActiveTab, label: 'Edit & Markup', icon: <Stamp className="w-3.5 h-3.5" /> },
    { id: 'convert' as ActiveTab, label: 'Convert', icon: <FileImage className="w-3.5 h-3.5" /> },
    { id: 'security' as ActiveTab, label: 'Security', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'inspect' as ActiveTab, label: 'Inspect', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'optimize' as ActiveTab, label: 'Optimize', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'ocr' as ActiveTab, label: 'OCR', icon: <Scan className="w-3.5 h-3.5" /> },
    { id: 'forms' as ActiveTab, label: 'Forms', icon: <FileCheck className="w-3.5 h-3.5" /> },
    { id: 'compare' as ActiveTab, label: 'Compare', icon: <GitCompare className="w-3.5 h-3.5" /> },
    { id: 'workflows' as ActiveTab, label: 'Workflows', icon: <Workflow className="w-3.5 h-3.5" /> },
    { id: 'view' as ActiveTab, label: 'Viewer', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'merge' as ActiveTab, label: 'Merge', icon: <GitMerge className="w-3.5 h-3.5" /> },
    { id: 'split' as ActiveTab, label: 'Split', icon: <Scissors className="w-3.5 h-3.5" /> },
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
