import React, { useState, useRef } from 'react';
import {
  Hash,
  Stamp,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  PenTool,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Upload,
  X,
  Layers,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';
import { PageNumberPosition } from '../../pdf/core/operations/pageNumberOperation';
import { WatermarkPosition } from '../../pdf/core/operations/watermarkOperation';
import { parsePageRange } from '../../pdf/core/operations/rangeParser';
import { PredefinedStampType } from '../../pdf/core/operations/stampOperation';

export type EditSubTool = 'page-numbers' | 'watermark' | 'stamps' | 'signature' | 'image';

interface EditTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
  initialSubTool?: EditSubTool;
}

export const EditTab: React.FC<EditTabProps> = ({
  document,
  onUpdateDocumentData,
  initialSubTool = 'page-numbers',
}) => {
  const [activeSubTool, setActiveSubTool] = useState<EditSubTool>(initialSubTool);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('Applying modifications...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // --- Page Number Settings ---
  const [startNumber, setStartNumber] = useState<number>(1);
  const [prefix, setPrefix] = useState<string>('Page ');
  const [suffix, setSuffix] = useState<string>(' of {total}');
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
  const [fontSize, setFontSize] = useState<number>(10);
  const [margin, setMargin] = useState<number>(36);

  // --- Watermark Settings ---
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.22);
  const [watermarkAngle, setWatermarkAngle] = useState<number>(45);
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(48);
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('diagonal');
  const [watermarkScope, setWatermarkScope] = useState<'all' | 'custom'>('all');
  const [watermarkCustomRange, setWatermarkCustomRange] = useState<string>('1');
  const [watermarkColor, setWatermarkColor] = useState<{ r: number; g: number; b: number; label: string }>({
    r: 0.35,
    g: 0.35,
    b: 0.35,
    label: 'Charcoal',
  });

  // --- Stamp Settings ---
  const [stampType, setStampType] = useState<PredefinedStampType>('APPROVED');
  const [customStampText, setCustomStampText] = useState<string>('VERIFIED');
  const [stampColorHex, setStampColorHex] = useState<string>('#16A34A');
  const [stampPosition, setStampPosition] = useState<'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [stampIncludeDate, setStampIncludeDate] = useState<boolean>(true);

  // --- Signature Settings ---
  const [sigSource, setSigSource] = useState<'draw' | 'upload'>('draw');
  const [sigImageData, setSigImageData] = useState<string | null>(null);
  const [sigTargetPage, setSigTargetPage] = useState<number>(1);
  const [sigPosition, setSigPosition] = useState<'bottom-right' | 'bottom-left' | 'center'>('bottom-right');
  const [isDrawing, setIsDrawing] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- Image Overlay Settings ---
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [overlayTargetPage, setOverlayTargetPage] = useState<number>(1);
  const [overlayWidth, setOverlayWidth] = useState<number>(150);
  const [overlayHeight, setOverlayHeight] = useState<number>(60);
  const [overlayPosition, setOverlayPosition] = useState<'top-left' | 'top-right' | 'center' | 'bottom-right'>('top-right');

  const rangeValidation = parsePageRange(watermarkCustomRange, document.pageCount);

  // Apply Page Numbers
  const handleApplyPageNumbers = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Adding sequential page numbers locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const updated = await documentService.addPageNumbers(document, {
        startNumber,
        prefix,
        suffix,
        position,
        fontSize,
        margin,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Add Page Numbers');
        setSuccessBanner(`Page numbers applied across ${updated.pageCount} pages.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply page numbers');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Watermark
  const handleApplyWatermark = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Embedding text watermark locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      let pageIndices: number[] | undefined;
      if (watermarkScope === 'custom') {
        if (!rangeValidation.valid || rangeValidation.pageIndices.length === 0) {
          setErrorMsg(rangeValidation.error || 'Invalid page range');
          setIsProcessing(false);
          return;
        }
        pageIndices = rangeValidation.pageIndices;
      }

      const updated = await documentService.addWatermark(document, {
        text: watermarkText,
        opacity: watermarkOpacity,
        fontSize: watermarkFontSize,
        rotationAngle: watermarkPosition === 'diagonal' ? watermarkAngle : 0,
        position: watermarkPosition,
        selectedPages: pageIndices,
        color: { r: watermarkColor.r, g: watermarkColor.g, b: watermarkColor.b },
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Add Watermark');
        setSuccessBanner(`Watermark "${watermarkText}" applied.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply watermark');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Stamp
  const handleApplyStamp = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Applying ${stampType} stamp locally...`);
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const updated = await documentService.addStamp(document, {
        type: stampType,
        customText: stampType === 'CUSTOM' ? customStampText : undefined,
        colorHex: stampColorHex,
        position: stampPosition,
        includeDate: stampIncludeDate,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `Add Stamp ${stampType}`);
        setSuccessBanner(`Stamp ${stampType} placed successfully.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to place stamp');
    } finally {
      setIsProcessing(false);
    }
  };

  // Signature Canvas Helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = sigCanvasRef.current;
    if (canvas) {
      setSigImageData(canvas.toDataURL('image/png'));
    }
  };

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSigImageData(null);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSigImageData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Apply Signature Image
  const handleApplySignature = async () => {
    if (!document.data || !sigImageData) return;
    setIsProcessing(true);
    setProcessingMsg('Embedding electronic signature image...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const updated = await documentService.insertImage(document, {
        imageData: sigImageData,
        mimeType: 'image/png',
        width: 140,
        height: 60,
        positionPreset: sigPosition,
        pageIndex: Math.max(0, sigTargetPage - 1),
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Add Signature Image');
        setSuccessBanner(`Electronic signature image placed on Page ${sigTargetPage}.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to place signature image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Image Overlay
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOverlayImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyImageOverlay = async () => {
    if (!document.data || !overlayImage) return;
    setIsProcessing(true);
    setProcessingMsg('Embedding image overlay...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const isPng = overlayImage.startsWith('data:image/png');
      const updated = await documentService.insertImage(document, {
        imageData: overlayImage,
        mimeType: isPng ? 'image/png' : 'image/jpeg',
        width: overlayWidth,
        height: overlayHeight,
        positionPreset: overlayPosition,
        pageIndex: Math.max(0, overlayTargetPage - 1),
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Insert Image');
        setSuccessBanner(`Image overlay embedded on Page ${overlayTargetPage}.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to insert image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCurrent = () => {
    if (document.data) {
      triggerLocalDownload(document.data, document.name);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
      {/* Sub-tool Switcher Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Sub-tool Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveSubTool('page-numbers')}
            id="tab-edit-page-numbers"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'page-numbers'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Page Numbers</span>
          </button>

          <button
            onClick={() => setActiveSubTool('watermark')}
            id="tab-edit-watermark"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'watermark'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>Watermark</span>
          </button>

          <button
            onClick={() => setActiveSubTool('stamps')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'stamps'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Stamps</span>
          </button>

          <button
            onClick={() => setActiveSubTool('signature')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'signature'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Signature Image</span>
          </button>

          <button
            onClick={() => setActiveSubTool('image')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'image'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Insert Image</span>
          </button>
        </div>

        {/* Export Download */}
        <button
          onClick={handleDownloadCurrent}
          disabled={isProcessing}
          id="btn-edit-download"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs shadow-orange-500/20 active:scale-95 ml-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Processed PDF</span>
        </button>
      </div>

      {/* Success Notification */}
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

      {/* Processing Badge */}
      <ProcessingBadge
        state={isProcessing ? 'processing' : errorMsg ? 'error' : document.processingState}
        operationName={processingMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      {/* SUB-TOOL: PAGE NUMBERS */}
      {activeSubTool === 'page-numbers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Sequential Page Numbers</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Calculate and stamp formatted page numbers across your document client-side.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Suffix</label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as PageNumberPosition)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Start Number</label>
                <input
                  type="number"
                  min="1"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyPageNumbers}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
              >
                Apply Page Numbers
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Preview Format</h4>
              <div className="mt-6 mx-auto w-48 h-64 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between">
                <div className="space-y-2 opacity-30 pt-2">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                </div>
                <div className="text-[10px] text-center font-mono font-bold text-stone-700">
                  {prefix}{startNumber}{suffix.replace('{total}', String(document.pageCount))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TOOL: WATERMARK */}
      {activeSubTool === 'watermark' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Document Watermark</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Embed high-clarity diagonal or horizontal text watermarks across pages.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">Watermark Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white uppercase font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Opacity ({Math.round(watermarkOpacity * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.05}
                  max={0.8}
                  step={0.05}
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Font Size ({watermarkFontSize}pt)
                </label>
                <input
                  type="range"
                  min={18}
                  max={80}
                  step={2}
                  value={watermarkFontSize}
                  onChange={(e) => setWatermarkFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-bold text-stone-700 block">Scope</label>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={watermarkScope === 'all'}
                    onChange={() => setWatermarkScope('all')}
                    className="accent-orange-500"
                  />
                  <span>All Pages</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={watermarkScope === 'custom'}
                    onChange={() => setWatermarkScope('custom')}
                    className="accent-orange-500"
                  />
                  <span>Custom Range</span>
                </label>
              </div>

              {watermarkScope === 'custom' && (
                <input
                  type="text"
                  value={watermarkCustomRange}
                  onChange={(e) => setWatermarkCustomRange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white mt-1"
                />
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyWatermark}
                disabled={isProcessing || !watermarkText.trim()}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
              >
                Apply Watermark
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Watermark Preview</h4>
              <div className="mt-6 mx-auto w-48 h-64 bg-white rounded-lg shadow-sm border border-stone-300 relative overflow-hidden flex items-center justify-center p-3 select-none">
                <div className="space-y-2 opacity-20 absolute inset-3 pointer-events-none">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                </div>
                <span
                  className="font-black tracking-widest text-center whitespace-nowrap transform -rotate-45"
                  style={{
                    opacity: watermarkOpacity,
                    fontSize: `${Math.min(22, watermarkFontSize / 2.5)}px`,
                    color: `rgb(${watermarkColor.r * 255}, ${watermarkColor.g * 255}, ${watermarkColor.b * 255})`,
                  }}
                >
                  {watermarkText || 'SAMPLE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TOOL: STAMPS */}
      {activeSubTool === 'stamps' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Predefined & Custom Stamps</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Overlay boxed office stamps with custom status labels and automatic timestamps.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">Stamp Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'FINAL', 'CUSTOM'] as PredefinedStampType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setStampType(t);
                      if (t === 'APPROVED') setStampColorHex('#16A34A');
                      if (t === 'DRAFT') setStampColorHex('#D97706');
                      if (t === 'CONFIDENTIAL') setStampColorHex('#DC2626');
                      if (t === 'REVIEWED') setStampColorHex('#2563EB');
                      if (t === 'FINAL') setStampColorHex('#7C3AED');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      stampType === t
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-200'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {stampType === 'CUSTOM' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Custom Stamp Text</label>
                <input
                  type="text"
                  value={customStampText}
                  onChange={(e) => setCustomStampText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white uppercase font-bold"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Stamp Position</label>
                <select
                  value={stampPosition}
                  onChange={(e) => setStampPosition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="center">Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Border & Text Color</label>
                <input
                  type="color"
                  value={stampColorHex}
                  onChange={(e) => setStampColorHex(e.target.value)}
                  className="w-full h-9 rounded-xl border border-stone-300 cursor-pointer p-1"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={stampIncludeDate}
                onChange={(e) => setStampIncludeDate(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500"
              />
              <span className="text-xs font-semibold text-stone-700">Include Current Date Stamp</span>
            </label>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyStamp}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
              >
                Apply Stamp
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Stamp Preview</h4>
              <div className="mt-6 mx-auto w-48 h-64 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between overflow-hidden">
                <div className="space-y-2 opacity-20 pt-2">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                </div>

                <div
                  className="p-2 border-2 border-dashed rounded-lg inline-block text-center transform -rotate-12 self-center my-auto"
                  style={{ borderColor: stampColorHex, color: stampColorHex }}
                >
                  <div className="font-extrabold text-sm tracking-wider uppercase">
                    {stampType === 'CUSTOM' ? customStampText || 'CUSTOM' : stampType}
                  </div>
                  {stampIncludeDate && (
                    <div className="text-[9px] font-mono mt-0.5 opacity-80">
                      {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TOOL: SIGNATURE IMAGE */}
      {activeSubTool === 'signature' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">Electronic Signature Image</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Image Overlay
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Draw or upload an electronic signature image to place onto your document pages.
              </p>
              <div className="mt-2 p-2 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600">
                <strong>Notice:</strong> This stamps an electronic signature image directly onto the page canvas. It is not a cryptographic digital certificate.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSigSource('draw')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  sigSource === 'draw'
                    ? 'border-orange-500 bg-orange-50 text-orange-900'
                    : 'border-stone-200 bg-stone-50 text-stone-600'
                }`}
              >
                Draw Signature
              </button>
              <button
                onClick={() => setSigSource('upload')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  sigSource === 'upload'
                    ? 'border-orange-500 bg-orange-50 text-orange-900'
                    : 'border-stone-200 bg-stone-50 text-stone-600'
                }`}
              >
                Upload PNG/JPG
              </button>
            </div>

            {sigSource === 'draw' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 block">Sign Below using Cursor or Touch</label>
                <div className="relative border-2 border-dashed border-stone-300 rounded-2xl bg-stone-50 overflow-hidden">
                  <canvas
                    ref={sigCanvasRef}
                    width={400}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-40 cursor-crosshair"
                  />
                  <button
                    onClick={clearSigCanvas}
                    className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-white/90 border border-stone-200 text-[10px] font-bold text-stone-600 hover:bg-white cursor-pointer"
                  >
                    Clear Canvas
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 block">Select Signature Image File</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleSignatureUpload}
                  className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Target Page</label>
                <input
                  type="number"
                  min="1"
                  max={document.pageCount}
                  value={sigTargetPage}
                  onChange={(e) => setSigTargetPage(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Position on Page</label>
                <select
                  value={sigPosition}
                  onChange={(e) => setSigPosition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="center">Center</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplySignature}
                disabled={isProcessing || !sigImageData}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
              >
                Place Signature Image
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Placement Simulation</h4>
              <div className="mt-6 mx-auto w-48 h-64 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between overflow-hidden">
                <div className="space-y-2 opacity-20 pt-2">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                </div>

                <div
                  className={`p-1 border border-stone-300 rounded bg-white/80 max-w-[100px] ${
                    sigPosition === 'bottom-right'
                      ? 'self-end'
                      : sigPosition === 'bottom-left'
                      ? 'self-start'
                      : 'self-center'
                  }`}
                >
                  {sigImageData ? (
                    <img src={sigImageData} alt="Signature Preview" className="h-8 object-contain" />
                  ) : (
                    <div className="text-[9px] text-stone-400 text-center font-mono py-1">Signature</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TOOL: INSERT IMAGE */}
      {activeSubTool === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Insert Image / Logo Overlay</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Place company logos, graphics, or diagrams onto any PDF page locally.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 block">Select Image (PNG or JPEG)</label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageUpload}
                className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Target Page</label>
                <input
                  type="number"
                  min="1"
                  max={document.pageCount}
                  value={overlayTargetPage}
                  onChange={(e) => setOverlayTargetPage(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Width (pt)</label>
                <input
                  type="number"
                  min="20"
                  max="600"
                  value={overlayWidth}
                  onChange={(e) => setOverlayWidth(parseInt(e.target.value, 10) || 150)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Height (pt)</label>
                <input
                  type="number"
                  min="20"
                  max="600"
                  value={overlayHeight}
                  onChange={(e) => setOverlayHeight(parseInt(e.target.value, 10) || 60)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">Position Preset</label>
              <select
                value={overlayPosition}
                onChange={(e) => setOverlayPosition(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
              >
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
                <option value="center">Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyImageOverlay}
                disabled={isProcessing || !overlayImage}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
              >
                Insert Image
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Image Preview</h4>
              <div className="mt-6 mx-auto w-48 h-64 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between overflow-hidden">
                <div className="space-y-2 opacity-20 pt-2">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                </div>

                <div
                  className={`p-1 border border-stone-300 rounded bg-white max-w-[120px] ${
                    overlayPosition === 'top-right'
                      ? 'self-end'
                      : overlayPosition === 'top-left'
                      ? 'self-start'
                      : overlayPosition === 'bottom-right'
                      ? 'self-end mt-auto'
                      : 'self-center my-auto'
                  }`}
                >
                  {overlayImage ? (
                    <img src={overlayImage} alt="Logo preview" className="max-h-12 object-contain" />
                  ) : (
                    <div className="text-[9px] text-stone-400 text-center font-mono py-2">Image Preview</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
