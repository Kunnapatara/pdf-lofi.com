import React from 'react';
import { ShieldCheck, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { CanonicalPdfTool, getToolIcon } from '../../features/tools/toolsRegistry';

interface ToolCardProps {
  tool: CanonicalPdfTool;
  onSelect: (tool: CanonicalPdfTool) => void;
  isProUser?: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect, isProUser = false }) => {
  const isAvailable = tool.status === 'available';
  const isProLocked = Boolean(tool.requiresPro && !isProUser);

  return (
    <div
      onClick={() => isAvailable && onSelect(tool)}
      id={`tool-card-${tool.id}`}
      className={`group bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs transition-all flex flex-col justify-between overflow-hidden relative ${
        isAvailable
          ? 'hover:border-orange-300 hover:shadow-md cursor-pointer'
          : 'opacity-75 bg-stone-50/50 border-dashed cursor-default'
      }`}
    >
      {/* Top Banner / Icon Area */}
      <div className="relative w-full h-28 rounded-xl bg-gradient-to-br from-stone-50 to-orange-50/30 border border-stone-100 flex items-center justify-center mb-3.5 overflow-hidden">
        {tool.badge && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs ${
                isAvailable
                  ? 'bg-orange-500 text-white'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {isAvailable && <Sparkles className="w-2.5 h-2.5" />}
              {tool.badge}
            </span>
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
          {tool.requiresPro && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
              <Lock className="w-2.5 h-2.5" />
              Pro
            </span>
          )}

          {isAvailable ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-stone-800 border border-stone-200 shadow-2xs">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
              Local
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-500 border border-stone-200">
              Coming soon
            </span>
          )}
        </div>

        <div
          className={`transition-transform duration-300 ${
            isAvailable
              ? 'text-orange-500 group-hover:scale-110'
              : 'text-stone-400'
          }`}
        >
          {getToolIcon(tool.id, 'w-8 h-8')}
        </div>
      </div>

      {/* Tool Info */}
      <div className="space-y-1 mb-4 flex-1">
        <div className="flex items-center justify-between gap-1">
          <h3
            className={`text-sm font-bold transition-colors ${
              isAvailable
                ? 'text-stone-900 group-hover:text-orange-600'
                : 'text-stone-700'
            }`}
          >
            {tool.name}
          </h3>
          <span className="text-[10px] uppercase font-mono font-medium text-stone-400">
            {tool.category}
          </span>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
          {tool.shortDescription}
        </p>
      </div>

      {/* Bottom Action Area */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-auto">
        <div className="text-[11px] font-semibold text-stone-500">
          {isAvailable ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Browser execution
            </span>
          ) : (
            <span className="text-stone-400">In roadmap</span>
          )}
        </div>

        {isAvailable ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(tool);
            }}
            id={`btn-open-tool-${tool.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 group-hover:shadow-xs group-hover:shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <span>Open Tool</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-stone-100 text-stone-400">
            Coming soon
          </span>
        )}
      </div>
    </div>
  );
};
