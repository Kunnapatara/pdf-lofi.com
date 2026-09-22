import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { ToolItem } from '../../types/pdf';

interface ToolCardProps {
  tool: ToolItem;
  onSelect: (tool: ToolItem) => void;
  iconNode?: React.ReactNode;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect, iconNode }) => {
  const isReady = tool.status === 'READY';

  return (
    <div
      onClick={() => isReady && onSelect(tool)}
      className={`group bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs transition-all flex flex-col justify-between overflow-hidden ${
        isReady
          ? 'hover:border-orange-300 hover:shadow-md cursor-pointer'
          : 'opacity-70 cursor-not-allowed bg-stone-50/40'
      }`}
    >
      {/* Top Banner / Thumbnail Area */}
      <div className="relative w-full h-32 rounded-xl bg-gradient-to-br from-stone-100 to-orange-50/40 border border-stone-100 flex items-center justify-center mb-3 overflow-hidden">
        {tool.badge && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                isReady
                  ? 'bg-orange-500 text-white'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {isReady && <Sparkles className="w-2.5 h-2.5" />}
              {tool.badge}
            </span>
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 z-10">
          {isReady ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/90 text-stone-700 border border-stone-200/60 shadow-2xs backdrop-blur-xs">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
              LOCAL
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-500 border border-stone-200/60 shadow-2xs">
              Coming soon
            </span>
          )}
        </div>

        <div
          className={`transition-transform duration-300 ${
            isReady
              ? 'text-orange-500 group-hover:scale-110'
              : 'text-stone-400'
          }`}
        >
          {iconNode}
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <h4
          className={`text-sm font-bold transition-colors ${
            isReady
              ? 'text-stone-900 group-hover:text-orange-600'
              : 'text-stone-700'
          }`}
        >
          {tool.name}
        </h4>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-auto">
        <div className="text-[11px] font-semibold text-stone-500">
          {isReady ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Ready in browser
            </span>
          ) : (
            <span className="text-stone-400">Coming soon</span>
          )}
        </div>

        {isReady ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(tool);
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 group-hover:shadow-xs group-hover:shadow-orange-500/30 transition-all active:scale-95 cursor-pointer"
          >
            <span>Open Tool</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-stone-400">
            Coming soon
          </span>
        )}
      </div>
    </div>
  );
};
