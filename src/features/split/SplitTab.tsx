import React, { useState } from 'react';
import { Scissors, Download, CheckCircle2 } from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface SplitTabProps {
  document: LocalDocument;
}

export const SplitTab: React.FC<SplitTabProps> = ({ document }) => {
  const [rangeInput, setRangeInput] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedResult, setExtractedResult] = useState<{
    data: Uint8Array;
    pageCount: number;
    name: string;
  } | null>(null);

  const totalPages = document.pageCount;

  // Parses ranges like "1-3, 5, 7-8" into sorted unique 0-indexed page indices
  const parsePageIndices = (input: string, maxPages: number): number[] => {
    const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
    const indices = new Set<number>();

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const low = Math.min(start, end);
          const high = Math.max(start, end);
          for (let i = low; i <= high; i++) {
            if (i >= 1 && i <= maxPages) {
              indices.add(i - 1);
            }
          }
        }
      } else {
        const single = parseInt(part, 10);
        if (!isNaN(single) && single >= 1 && single <= maxPages) {
          indices.add(single - 1);
        }
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  };

  const parsedIndices = parsePageIndices(rangeInput, totalPages);

  const handleExtractRange = async () => {
    if (!document.data) return;
    if (parsedIndices.length === 0) {
      setErrorMsg(`Please specify valid page numbers within range 1 to ${totalPages}.`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const result = await documentService.extractPages(document.data, parsedIndices);
      const cleanDocName = document.name.replace(/\.pdf$/i, '');
      const outName = `${cleanDocName}_pages_${rangeInput.replace(/\s+/g, '')}.pdf`;

      setExtractedResult({
        data: result.data,
        pageCount: result.pageCount,
        name: outName,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadExtracted = () => {
    if (extractedResult) {
      triggerLocalDownload(extractedResult.data, extractedResult.name);
    }
  };

  const handleSetPreset = (preset: string) => {
    setRangeInput(preset);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Split & Extract Pages</h2>
            <p className="text-xs text-stone-500">
              Extract selected pages or custom ranges into a brand new PDF locally on your device.
            </p>
          </div>
        </div>

        <ProcessingBadge
          state={isProcessing ? 'processing' : errorMsg ? 'error' : extractedResult ? 'completed' : 'idle'}
          operationName="Extracting pages locally"
          errorMessage={errorMsg || undefined}
          onClearError={() => setErrorMsg(null)}
        />
      </div>

      {/* Range Input Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-800 uppercase tracking-wide">
            Pages to Extract (1 to {totalPages})
          </label>
          <input
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            placeholder="e.g. 1-3, 5"
            className="w-full px-4 py-3 rounded-2xl border border-stone-200 font-mono text-sm focus:outline-orange-500 bg-stone-50/50"
          />
          <p className="text-[11px] text-stone-500">
            Use comma-separated numbers or hyphenated ranges. Example: <code className="bg-stone-100 px-1 py-0.5 rounded">1-2, 4</code>
          </p>
        </div>

        {/* Quick Range Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-stone-400">Presets:</span>
          <button
            onClick={() => handleSetPreset('1')}
            className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-all cursor-pointer"
          >
            First Page (p.1)
          </button>
          {totalPages >= 2 && (
            <button
              onClick={() => handleSetPreset(String(totalPages))}
              className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-all cursor-pointer"
            >
              Last Page (p.{totalPages})
            </button>
          )}
          {totalPages >= 3 && (
            <button
              onClick={() => handleSetPreset(`1-${Math.ceil(totalPages / 2)}`)}
              className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-all cursor-pointer"
            >
              First Half (1-{Math.ceil(totalPages / 2)})
            </button>
          )}
          {totalPages >= 2 && (
            <button
              onClick={() => handleSetPreset(`1-${totalPages}`)}
              className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-all cursor-pointer"
            >
              All Pages (1-{totalPages})
            </button>
          )}
        </div>

        {/* Live Preview of Selected Pages */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
          <div className="text-xs font-bold text-stone-700">
            Preview: {parsedIndices.length} {parsedIndices.length === 1 ? 'page' : 'pages'} will be extracted
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parsedIndices.map((idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md text-xs font-mono font-bold bg-orange-100 text-orange-800 border border-orange-200"
              >
                Page {idx + 1}
              </span>
            ))}
            {parsedIndices.length === 0 && (
              <span className="text-xs text-stone-400 italic">No valid pages selected</span>
            )}
          </div>
        </div>

        {/* Extract CTA */}
        <div className="flex items-center justify-end pt-3 border-t border-stone-100">
          <button
            onClick={handleExtractRange}
            disabled={parsedIndices.length === 0 || isProcessing}
            id="btn-run-extract"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            <span>Extract {parsedIndices.length} Pages Locally</span>
          </button>
        </div>
      </div>

      {/* Success Result Card */}
      {extractedResult && (
        <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Extracted PDF Ready</h3>
                <p className="text-xs text-emerald-700">
                  {extractedResult.name} ({extractedResult.pageCount} pages) was generated in-browser.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
              100% On-Device
            </span>
          </div>

          <div className="pt-2">
            <button
              onClick={handleDownloadExtracted}
              id="btn-download-extracted"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Extracted PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
