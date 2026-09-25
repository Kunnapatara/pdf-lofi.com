import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Info,
  Layers,
  Sparkles,
  PenTool,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface SecurityTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
  onNavigateToEdit?: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  document,
  onUpdateDocumentData,
  onNavigateToEdit,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Redaction parameters
  const [targetPage, setTargetPage] = useState<number>(1);
  const [redactPreset, setRedactPreset] = useState<'header' | 'footer' | 'custom'>('header');
  const [customX, setCustomX] = useState<number>(50);
  const [customY, setCustomY] = useState<number>(500);
  const [customWidth, setCustomWidth] = useState<number>(300);
  const [customHeight, setCustomHeight] = useState<number>(40);
  const [sanitizeMetadata, setSanitizeMetadata] = useState<boolean>(true);

  const handleApplyRedaction = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Applying opaque vector blackout and sanitizing metadata...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      let box = {
        pageNumber: targetPage,
        x: customX,
        y: customY,
        width: customWidth,
        height: customHeight,
      };

      if (redactPreset === 'header') {
        // Redact standard top 72pt (1 inch)
        box = {
          pageNumber: targetPage,
          x: 36,
          y: 750,
          width: 520,
          height: 56,
        };
      } else if (redactPreset === 'footer') {
        // Redact bottom 72pt
        box = {
          pageNumber: targetPage,
          x: 36,
          y: 36,
          width: 520,
          height: 48,
        };
      }

      const updated = await documentService.applyRedaction(document, {
        boxes: [box],
        sanitizeMetadata,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Visual Blackout');
        setSuccessBanner(
          `Page ${targetPage} overlaid with opaque blackout vector box${
            sanitizeMetadata ? ' and document metadata purged' : ''
          }. (Notice: Underlying text streams remain extractable; see truth boundary).`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Visual blackout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (document.data) {
      triggerLocalDownload(document.data, document.name);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">Document Security & Visual Blackout</h2>
        </div>

        <button
          onClick={handleDownload}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs ml-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      <ProcessingBadge
        state={isProcessing ? 'processing' : errorMsg ? 'error' : document.processingState}
        operationName={processingMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Redaction Tool */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-stone-900" />
                <h3 className="text-sm font-bold text-stone-900">Visual Blackout Mask (Vector Overlay)</h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Local Available
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Overlay solid black opaque vector rectangles over sensitive visual areas and sanitize document metadata.
              </p>
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Security Notice:</strong> Visual blackout obscures rendering on screens and printouts. However, underlying PDF text streams and font glyphs are not stripped. If you require irreversible text destruction, see True Structural Redaction on the roadmap.
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-3 border-t border-stone-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Target Page</label>
                  <select
                    value={targetPage}
                    onChange={(e) => setTargetPage(parseInt(e.target.value))}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  >
                    {Array.from({ length: document.pageCount }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Page {p} of {document.pageCount}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Redaction Region</label>
                  <select
                    value={redactPreset}
                    onChange={(e) => setRedactPreset(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  >
                    <option value="header">Top Header (Banner / Memo details)</option>
                    <option value="footer">Bottom Footer (Page numbers / signatures)</option>
                    <option value="custom">Custom Coordinates (X, Y, W, H)</option>
                  </select>
                </div>
              </div>

              {redactPreset === 'custom' && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <div>
                    <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-1">X (pt)</label>
                    <input
                      type="number"
                      value={customX}
                      onChange={(e) => setCustomX(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-1">Y (pt)</label>
                    <input
                      type="number"
                      value={customY}
                      onChange={(e) => setCustomY(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-1">Width</label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseFloat(e.target.value) || 10)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-1">Height</label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseFloat(e.target.value) || 10)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sanitizeMetadata}
                    onChange={(e) => setSanitizeMetadata(e.target.checked)}
                    className="rounded accent-orange-500"
                  />
                  <span>Purge metadata (Title, Author, Subject, Keywords) during redaction</span>
                </label>
              </div>

              <button
                onClick={handleApplyRedaction}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Applying Blackout...' : 'Apply Visual Blackout & Sanitize Metadata'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Truthful Security Roadmap & Clarifications */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Security Truth Boundary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                    <span>True Structural Redaction</span>
                  </div>
                  <span className="text-[10px] font-bold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-full">
                    Roadmap (QPDF)
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Irreversible destruction of underlying text objects, font glyphs, and indirect stream tokens across pages requires low-level PDF parsing (QPDF/WASM). Visual Blackout obscures visible rendering but does not delete underlying stream objects.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <Lock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Password Protect & AES-256</span>
                  </div>
                  <span className="text-[10px] font-bold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-full">
                    Roadmap (QPDF)
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Cryptographic Standard Security Handler (AES-128/256) requires client-side WebAssembly QPDF. To maintain our strict local-first standard, we do not simulate encryption or upload documents.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <Unlock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Decrypt & Strip Permissions</span>
                  </div>
                  <span className="text-[10px] font-bold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-full">
                    Roadmap (QPDF)
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Removing owner passwords or permission flags requires low-level PDF dictionary reconstruction without re-encrypting object streams.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <PenTool className="w-3.5 h-3.5 text-stone-500" />
                    <span>Digital Signatures (PKCS#7)</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    Available in Edit
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Electronic visual signature image placement and stamping are fully supported in the <strong>Edit & Markup</strong> workspace. Cryptographic X.509 PKCS#7 signing is scheduled for a future release.
                </p>
                {onNavigateToEdit && (
                  <button
                    onClick={onNavigateToEdit}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 pt-1 block cursor-pointer"
                  >
                    Open Edit & Markup for Signature →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
