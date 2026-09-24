import React, { useState } from 'react';
import {
  Zap,
  Shield,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileCheck,
  Minimize2,
  Wrench,
  X,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';
import { CompressionResult } from '../../pdf/core/operations/compressOperation';

interface OptimizeTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
}

export const OptimizeTab: React.FC<OptimizeTabProps> = ({
  document,
  onUpdateDocumentData,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Settings
  const [stripMetadata, setStripMetadata] = useState(true);
  const [compressStreams, setCompressStreams] = useState(true);

  // Result state
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRunCompression = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Compressing object streams and optimizing PDF structure...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const { compressionResult: res } = await documentService.compressDocument(document, {
        stripMetadata,
        compressStreams,
      });

      setCompressionResult(res);
      setSuccessBanner(
        `Optimized! Size reduced by ${res.percentageSaved}% (saved ${formatBytes(res.savedBytes)}).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Compression failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyToWorkspace = async () => {
    if (!compressionResult) return;
    await onUpdateDocumentData(
      compressionResult.data,
      compressionResult.pageCount,
      'Compress PDF Streams'
    );
    setSuccessBanner('Compressed version committed to active workspace.');
  };

  const handleDownloadCompressed = () => {
    if (!compressionResult) return;
    const cleanName = `${document.name.replace(/\.pdf$/i, '')}_compressed.pdf`;
    triggerLocalDownload(compressionResult.data, cleanName);
  };

  // Structural Repair Operation
  const handleRepairDocument = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Rebuilding cross-reference tables and indirect object trees...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      // Re-save with clean cross-references through documentService
      const { compressionResult: res } = await documentService.compressDocument(document, {
        stripMetadata: false,
        compressStreams: true,
      });

      await onUpdateDocumentData(res.data, res.pageCount, 'Repair PDF Structure');
      setSuccessBanner('Reconstructed cross-reference tables and normalized document tree.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF repair failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">Optimization & Security</h2>
        </div>

        <div className="text-xs font-mono text-stone-500">
          Current Size: <span className="font-bold text-stone-800">{formatBytes(document.size)}</span>
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
        operationName={processingMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Compression Controls */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Minimize2 className="w-4 h-4 text-orange-600" />
              <h3 className="text-base font-bold text-stone-900">In-Browser Stream Compression</h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Rewrites indirect objects into compact Flate-compressed object streams and strips unneeded metadata.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-all">
              <input
                type="checkbox"
                checked={compressStreams}
                onChange={(e) => setCompressStreams(e.target.checked)}
                className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="font-bold text-stone-800 block">Object Streams (Flate Compression)</span>
                <span className="text-[11px] text-stone-500">
                  Groups structural PDF objects into compressed streams to save substantial bytes.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-all">
              <input
                type="checkbox"
                checked={stripMetadata}
                onChange={(e) => setStripMetadata(e.target.checked)}
                className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="font-bold text-stone-800 block">Strip Redundant Metadata</span>
                <span className="text-[11px] text-stone-500">
                  Erases unused XML schemas, editing application tags, and author logs.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-stone-400">100% private, client-side only.</span>
            <button
              onClick={handleRunCompression}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Compress Document</span>
            </button>
          </div>

          {/* Results Card */}
          {compressionResult && (
            <div className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800">Optimization Analysis</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {compressionResult.percentageSaved}% Saved
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">Original</span>
                  <span className="font-bold text-stone-700">{formatBytes(compressionResult.originalSize)}</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">Compressed</span>
                  <span className="font-bold text-emerald-600">{formatBytes(compressionResult.compressedSize)}</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">Net Difference</span>
                  <span className="font-bold text-stone-800">-{formatBytes(compressionResult.savedBytes)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleApplyToWorkspace}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white cursor-pointer transition-all"
                >
                  Apply to Workspace
                </button>
                <button
                  onClick={handleDownloadCompressed}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Structural Repair & Integrity */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Structural Repair & Sanitization</h3>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Repairs corrupted cross-reference tables and fixes orphaned indirect object pointers.
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Structural Integrity Boundary</span>
              </div>
              <p>
                This operation reconstructs the internal PDF document catalog and serializes clean cross-reference streams.
                It fixes damaged header offsets and dangling pointers, but cannot restore physically erased pixel or text content.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">Cross-reference mode</span>
                <span className="font-mono text-stone-800">XREF Stream Table</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">Trailer Catalog</span>
                <span className="font-mono text-emerald-600">Normalized</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100">
            <button
              onClick={handleRepairDocument}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white cursor-pointer flex items-center justify-center gap-2"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Rebuild & Repair Structure</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
