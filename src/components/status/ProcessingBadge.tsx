import React from 'react';
import { HardDrive, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ProcessingState } from '../../types/pdf';

interface ProcessingBadgeProps {
  state: ProcessingState;
  operationName?: string;
  errorMessage?: string;
  onClearError?: () => void;
}

export const ProcessingBadge: React.FC<ProcessingBadgeProps> = ({
  state,
  operationName,
  errorMessage,
  onClearError,
}) => {
  if (state === 'idle') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200/80">
        <HardDrive className="w-3.5 h-3.5 text-stone-500" />
        <span>LOCAL: Processing on this device</span>
      </div>
    );
  }

  if (state === 'processing' || state === 'loading') {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs animate-pulse">
        <RefreshCw className="w-3.5 h-3.5 text-orange-600 animate-spin" />
        <span>LOCAL: {operationName || 'Executing on this device...'}</span>
      </div>
    );
  }

  if (state === 'completed') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>✓ Completed locally — No document upload required</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="inline-flex items-center justify-between gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          <span>{errorMessage || 'Operation stopped. Original document preserved.'}</span>
        </div>
        {onClearError && (
          <button
            onClick={onClearError}
            className="ml-2 text-[10px] font-bold uppercase underline hover:text-red-950"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  return null;
};
