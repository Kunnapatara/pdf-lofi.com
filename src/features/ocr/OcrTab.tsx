import React, { useState } from 'react';
import {
  Scan,
  Copy,
  Download,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Globe,
  X,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import {
  runOcrOnPdfPages,
  embedOcrTextLayer,
  SUPPORTED_OCR_LANGUAGES,
  OcrDocumentResult,
} from '../../pdf/engines/ocrEngine';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface OcrTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
}

export const OcrTab: React.FC<OcrTabProps> = ({
  document,
  onUpdateDocumentData,
}) => {
  const [selectedLang, setSelectedLang] = useState('eng');
  const [pageScope, setPageScope] = useState<'all' | 'first' | 'custom'>('all');
  const [customRangeInput, setCustomRangeInput] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrDocumentResult | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleRunOcr = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessBanner(null);
    setProgressMsg('Initializing client-side OCR engine...');

    try {
      let targetIndices: number[] = [];
      if (pageScope === 'all') {
        targetIndices = Array.from({ length: document.pageCount }, (_, i) => i);
      } else if (pageScope === 'first') {
        targetIndices = [0];
      } else {
        const parts = customRangeInput.split(',').map((p) => p.trim());
        for (const p of parts) {
          const num = parseInt(p, 10);
          if (!isNaN(num) && num >= 1 && num <= document.pageCount) {
            targetIndices.push(num - 1);
          }
        }
      }

      if (targetIndices.length === 0) {
        throw new Error('Please select at least one valid page to scan');
      }

      const result = await runOcrOnPdfPages(
        document.data,
        targetIndices,
        selectedLang,
        (current, total, status) => {
          setProgressMsg(status);
        }
      );

      setOcrResult(result);
      setSuccessBanner(
        `OCR complete! Recognized text across ${result.pages.length} pages (Avg Confidence: ${result.averageConfidence}%).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'OCR failed to process');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    if (!ocrResult?.fullText) return;
    try {
      await navigator.clipboard.writeText(ocrResult.fullText);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    if (!ocrResult?.fullText) return;
    const blob = new Blob([ocrResult.fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.name.replace(/\.pdf$/i, '')}_ocr_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEmbedTextLayer = async () => {
    if (!document.data || !ocrResult) return;
    setIsProcessing(true);
    setProgressMsg('Embedding searchable text layer into PDF...');
    setErrorMsg(null);
    try {
      const searchableBytes = await embedOcrTextLayer(document.data, ocrResult.pages);
      await onUpdateDocumentData(searchableBytes, document.pageCount, 'Embed Searchable OCR Layer');
      setSuccessBanner('Searchable text layer successfully embedded into the PDF.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to embed text layer');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">OCR & Document Text Recognition</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
            Client-Side Tesseract Engine
          </span>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ProcessingBadge
        state={isProcessing ? 'processing' : errorMsg ? 'error' : document.processingState}
        operationName={progressMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="text-base font-bold text-stone-900">Recognition Configuration</h3>
            <p className="text-xs text-stone-500 mt-1">
              Extract raw text or make scanned documents fully searchable and selectable in browser.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-stone-500" />
                <span>Primary Document Language</span>
              </label>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              >
                {SUPPORTED_OCR_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1.5">Page Selection</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={pageScope === 'all'}
                    onChange={() => setPageScope('all')}
                    className="accent-orange-500"
                  />
                  <span>All Pages ({document.pageCount})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={pageScope === 'first'}
                    onChange={() => setPageScope('first')}
                    className="accent-orange-500"
                  />
                  <span>First Page Only (Quick Test)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={pageScope === 'custom'}
                    onChange={() => setPageScope('custom')}
                    className="accent-orange-500"
                  />
                  <span>Custom Page Numbers (e.g. 1, 2)</span>
                </label>
              </div>

              {pageScope === 'custom' && (
                <input
                  type="text"
                  value={customRangeInput}
                  onChange={(e) => setCustomRangeInput(e.target.value)}
                  placeholder="e.g. 1, 2, 4"
                  className="w-full mt-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-stone-400">Zero data leaves device.</span>
            <button
              onClick={handleRunOcr}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              Start OCR Recognition
            </button>
          </div>
        </div>

        {/* Right: Results / Extracted Text Viewer */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Extracted Text Buffer</h3>
              </div>

              {ocrResult && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedNotice ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download TXT</span>
                  </button>
                </div>
              )}
            </div>

            {ocrResult ? (
              <div className="mt-3 space-y-3">
                <textarea
                  readOnly
                  value={ocrResult.fullText}
                  className="w-full h-80 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono leading-relaxed resize-none focus:outline-none text-stone-800"
                />

                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Pages Scanned: {ocrResult.pages.length}</span>
                  <span className="font-semibold text-emerald-700">
                    Average Confidence: {ocrResult.averageConfidence}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <Scan className="w-12 h-12 text-stone-200 mb-3" />
                <p className="text-xs font-medium">No OCR data generated yet.</p>
                <p className="text-[11px] text-stone-400 mt-1 max-w-sm">
                  Click &quot;Start OCR Recognition&quot; to initialize Tesseract in your browser and extract text from this document.
                </p>
              </div>
            )}
          </div>

          {ocrResult && (
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Embed text layer to make this PDF selectable and searchable.
              </span>
              <button
                onClick={handleEmbedTextLayer}
                disabled={isProcessing}
                className="px-4 py-2 rounded-full text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white cursor-pointer"
              >
                Embed Searchable PDF Layer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
