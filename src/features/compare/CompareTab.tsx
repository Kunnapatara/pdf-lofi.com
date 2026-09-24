import React, { useState } from 'react';
import {
  GitCompare,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import {
  comparePdfDocuments,
  DocumentComparisonResult,
  PageComparisonDiff,
} from '../../pdf/core/operations/compareOperation';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface CompareTabProps {
  document: LocalDocument;
}

export const CompareTab: React.FC<CompareTabProps> = ({ document }) => {
  const [docBFile, setDocBFile] = useState<{ name: string; data: Uint8Array } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<DocumentComparisonResult | null>(null);
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({});

  const handleSelectDocB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      setDocBFile({
        name: file.name,
        data: new Uint8Array(buffer),
      });
      setComparisonResult(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRunComparison = async () => {
    if (!document.data || !docBFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg('Extracting page text streams for client-side comparison...');

    try {
      const result = await comparePdfDocuments(
        document.data,
        docBFile.data,
        document.name,
        docBFile.name,
        (cur, total) => setProgressMsg(`Comparing text on page ${cur} of ${total}...`)
      );

      setComparisonResult(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExpand = (pageNum: number) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageNum]: !prev[pageNum],
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">Document Visual & Text Diff</h2>
        </div>

        <div className="text-xs font-mono text-stone-500">
          Client-Side In-Browser Comparison
        </div>
      </div>

      <ProcessingBadge
        state={isProcessing ? 'processing' : errorMsg ? 'error' : document.processingState}
        operationName={progressMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      {/* Document Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document A (Active) */}
        <div className="p-5 bg-white rounded-3xl border border-stone-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              Document A (Current Workspace)
            </span>
            <span className="text-xs font-mono text-stone-400">{document.pageCount} pages</span>
          </div>
          <h4 className="text-sm font-bold text-stone-900 truncate">{document.name}</h4>
          <p className="text-xs text-stone-500">The primary reference document already loaded.</p>
        </div>

        {/* Document B (Target) */}
        <div className="p-5 bg-white rounded-3xl border border-stone-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
              Document B (Target Version)
            </span>
            {docBFile && (
              <span className="text-xs font-mono text-stone-600 truncate max-w-[140px]">
                {docBFile.name}
              </span>
            )}
          </div>

          <label className="flex items-center justify-center p-3 border-2 border-dashed border-stone-300 rounded-2xl bg-stone-50 hover:bg-stone-100/70 cursor-pointer transition-all">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleSelectDocB}
              className="hidden"
            />
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
              <Upload className="w-4 h-4 text-orange-600" />
              <span>{docBFile ? 'Replace Document B' : 'Choose Document B to Compare'}</span>
            </div>
          </label>
        </div>
      </div>

      {/* Compare Action Button */}
      {docBFile && !comparisonResult && (
        <div className="text-center pt-2">
          <button
            onClick={handleRunComparison}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-md active:scale-95 transition-all"
          >
            <GitCompare className="w-4 h-4" />
            <span>Run Document Comparison</span>
          </button>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Banner */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">Comparison Summary</h3>
              <button
                onClick={handleRunComparison}
                disabled={isProcessing}
                className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
              >
                Re-run Comparison
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                <span className="text-[10px] text-stone-400 block font-semibold">Total Pages Evaluated</span>
                <span className="text-base font-bold text-stone-800">
                  {comparisonResult.totalComparedPages}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-semibold">Identical Pages</span>
                <span className="text-base font-bold text-emerald-800">
                  {comparisonResult.identicalPagesCount}
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100">
                <span className="text-[10px] text-amber-700 block font-semibold">Modified Pages</span>
                <span className="text-base font-bold text-amber-800">
                  {comparisonResult.modifiedPagesCount}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                <span className="text-[10px] text-stone-400 block font-semibold">Page Delta</span>
                <span className="text-base font-bold text-stone-800">
                  {comparisonResult.docBPageCount - comparisonResult.docAPageCount >= 0 ? '+' : ''}
                  {comparisonResult.docBPageCount - comparisonResult.docAPageCount}
                </span>
              </div>
            </div>
          </div>

          {/* Page by Page Diff List */}
          <div className="space-y-3">
            {comparisonResult.pageDiffs.map((diff) => {
              const isExpanded = expandedPages[diff.pageNumber];
              const isIdentical = diff.status === 'identical';

              return (
                <div
                  key={`diff-page-${diff.pageNumber}`}
                  className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden"
                >
                  <div
                    onClick={() => toggleExpand(diff.pageNumber)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50/70 transition-all select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-stone-800">Page {diff.pageNumber}</span>
                      {isIdentical ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Identical
                        </span>
                      ) : diff.status === 'modified' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Content Modified
                        </span>
                      ) : diff.status === 'added_in_b' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Added in Target
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Removed in Target
                        </span>
                      )}
                    </div>

                    <div className="text-stone-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-stone-50 border-t border-stone-100 space-y-3 text-xs">
                      {diff.diffLines && diff.diffLines.length > 0 ? (
                        <div className="p-3 bg-white rounded-xl border border-stone-200 font-mono space-y-1 max-h-60 overflow-y-auto">
                          {diff.diffLines.map((line, idx) => (
                            <div
                              key={idx}
                              className={`p-1 rounded ${
                                line.type === 'added'
                                  ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500 pl-2'
                                  : line.type === 'removed'
                                  ? 'bg-rose-50 text-rose-900 border-l-2 border-rose-500 pl-2 line-through opacity-70'
                                  : 'text-stone-600 pl-2'
                              }`}
                            >
                              <span className="font-bold mr-2 select-none">
                                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                              </span>
                              {line.text}
                            </div>
                          ))}
                        </div>
                      ) : isIdentical ? (
                        <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-500 font-mono text-[11px]">
                          Text contents match 100%. No textual alterations detected on this page.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="p-2 bg-white rounded-xl border border-stone-200">
                            <span className="font-bold block text-stone-400 mb-1">Doc A:</span>
                            {diff.docAText || '<No text / empty>'}
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-stone-200">
                            <span className="font-bold block text-stone-400 mb-1">Doc B:</span>
                            {diff.docBText || '<No text / empty>'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
