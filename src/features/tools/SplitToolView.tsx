import React, { useState, useRef } from 'react';
import {
  Scissors,
  Upload,
  Download,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { generateSamplePdf } from '../../pdf/samplePdf';

interface SplitToolViewProps {
  document: LocalDocument | null;
  onSelectDocument: (uint8: Uint8Array, name: string) => Promise<void>;
  onOpenSplitInWorkspace: (data: Uint8Array, name: string, pageCount: number) => void;
  onBackToHome: () => void;
}

export const SplitToolView: React.FC<SplitToolViewProps> = ({
  document,
  onSelectDocument,
  onOpenSplitInWorkspace,
  onBackToHome,
}) => {
  const [rangeInput, setRangeInput] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedResult, setExtractedResult] = useState<{
    data: Uint8Array;
    pageCount: number;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = document ? document.pageCount : 0;

  // Parses ranges like "1-3, 5" into 0-indexed page indices
  const parsePageIndices = (input: string, maxPages: number): number[] => {
    if (maxPages === 0) return [];
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

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const buffer = await file.arrayBuffer();
      await onSelectDocument(new Uint8Array(buffer), file.name);
      setExtractedResult(null);
      setErrorMsg(null);
    } catch (err) {
      console.error('Error opening PDF for split:', err);
      setErrorMsg('Failed to open PDF file.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMsg('Please drop a PDF file.');
        return;
      }
      try {
        const buffer = await file.arrayBuffer();
        await onSelectDocument(new Uint8Array(buffer), file.name);
        setExtractedResult(null);
        setErrorMsg(null);
      } catch (err) {
        console.error('Error dropping PDF for split:', err);
        setErrorMsg('Failed to open PDF file.');
      }
    }
  };

  const handleLoadSample = async () => {
    try {
      const sampleBytes = await generateSamplePdf();
      await onSelectDocument(sampleBytes, 'Sample_Document.pdf');
      setExtractedResult(null);
      setErrorMsg(null);
    } catch (err) {
      console.error('Failed generating sample PDF:', err);
    }
  };

  const handleExtractRange = async () => {
    if (!document || !document.data) return;
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
        id="split-tool-file-input"
      />

      {/* Tool Header */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                  Split PDF
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  LOCAL
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Separate one or more pages into an independent document.
              </p>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors self-start sm:self-center cursor-pointer"
          >
            ← Back to All Tools
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-800 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Step 1: When no document is loaded */}
      {!document ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center transition-all shadow-xs flex flex-col items-center justify-center ${
            isDragging
              ? 'border-orange-500 bg-orange-50/40 scale-[1.01]'
              : 'border-stone-300 hover:border-orange-300'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-100/70 text-orange-600 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-stone-900 mb-1">
            Drop PDF file to split
          </h3>
          <p className="text-xs text-stone-500 mb-6 max-w-sm">
            Select a PDF document to extract pages. All operations run directly in your browser without uploading.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              id="btn-split-select-file"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs shadow-orange-500/25 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Select File</span>
            </button>

            <button
              onClick={handleLoadSample}
              id="btn-split-sample"
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-stone-500" />
              <span>Try Sample PDF</span>
            </button>
          </div>
        </div>
      ) : (
        /* Step 2: Configure Split Range */
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-6">
          {/* Active File Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 gap-3">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-stone-900 truncate" title={document.name}>
                  {document.name}
                </div>
                <div className="text-[11px] text-stone-500">
                  {document.pageCount} pages • {(document.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Change PDF</span>
            </button>
          </div>

          {/* Range Configuration */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              Pages to Extract
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="e.g. 1-3, 5"
                className="flex-1 px-4 py-2.5 rounded-2xl border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all bg-white"
              />

              <button
                onClick={handleExtractRange}
                disabled={isProcessing || parsedIndices.length === 0}
                id="btn-run-split"
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shadow-orange-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                <span>Extract {parsedIndices.length} {parsedIndices.length === 1 ? 'Page' : 'Pages'}</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-stone-400">Presets:</span>
              <button
                onClick={() => setRangeInput('1')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
              >
                First Page
              </button>
              {totalPages > 1 && (
                <>
                  <button
                    onClick={() => setRangeInput(`${totalPages}`)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                  >
                    Last Page ({totalPages})
                  </button>
                  <button
                    onClick={() => setRangeInput(`1-${Math.ceil(totalPages / 2)}`)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                  >
                    First Half (1-{Math.ceil(totalPages / 2)})
                  </button>
                  <button
                    onClick={() => setRangeInput(`1-${totalPages}`)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                  >
                    All Pages (1-{totalPages})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Processing State */}
      {isProcessing && (
        <div className="bg-white rounded-3xl border border-orange-200 p-6 shadow-xs text-center space-y-3 animate-in fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            LOCAL — Processing on this device
          </div>
          <h4 className="text-base font-bold text-stone-900">Extracting pages...</h4>
          <p className="text-xs text-stone-500">
            Generating isolated PDF pages locally without network upload.
          </p>
        </div>
      )}

      {/* Step 4: Result Card */}
      {extractedResult && !isProcessing && (
        <div className="bg-emerald-50/80 rounded-3xl border border-emerald-200/90 p-6 sm:p-7 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  ✓ Extracted PDF Ready
                </h3>
                <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                  {extractedResult.pageCount} pages extracted into {extractedResult.name}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Completed locally • Your PDF was not uploaded
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
              Ready
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-emerald-200/60">
            <button
              onClick={handleDownloadExtracted}
              id="btn-split-download"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Extracted PDF</span>
            </button>

            <button
              onClick={() =>
                onOpenSplitInWorkspace(
                  extractedResult.data,
                  extractedResult.name,
                  extractedResult.pageCount
                )
              }
              id="btn-split-open-workspace"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-emerald-900 hover:bg-emerald-100/50 border border-emerald-300 transition-all cursor-pointer"
            >
              <span>Open in Advanced Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setExtractedResult(null)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-emerald-800 hover:text-emerald-950 ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Extract different pages</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
