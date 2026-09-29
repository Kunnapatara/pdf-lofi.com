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
  FileText,
  Highlighter,
  PanelTop,
  CalendarDays,
  Palette,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';
import { PageNumberPosition } from '../../pdf/core/operations/pageNumberOperation';
import { WatermarkPosition } from '../../pdf/core/operations/watermarkOperation';
import { parsePageRange } from '../../pdf/core/operations/rangeParser';
import { PredefinedStampType } from '../../pdf/core/operations/stampOperation';
import { BatesPosition, formatBatesNumber } from '../../pdf/core/operations/batesNumberOperation';
import { StandardTextPosition, SupportedFontFamily, expandDynamicTokens, formatLocalIsoDate } from '../../pdf/core/operations/textPrimitive';
import { DateFormat, TimeFormat, StampMode, buildStampText } from '../../pdf/core/operations/dateTimeStampOperation';

export type EditSubTool =
  | 'page-numbers'
  | 'bates-numbering'
  | 'header-footer'
  | 'date-time-stamp'
  | 'page-background'
  | 'watermark'
  | 'stamps'
  | 'signature'
  | 'image'
  | 'text-overlay'
  | 'markup';

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

  // --- Bates Numbering Settings (Sprint 18) ---
  const [batesPrefix, setBatesPrefix] = useState<string>('BATES-');
  const [batesStartNumber, setBatesStartNumber] = useState<number>(1);
  const [batesPadding, setBatesPadding] = useState<number>(6);
  const [batesSuffix, setBatesSuffix] = useState<string>('');
  const [batesPosition, setBatesPosition] = useState<BatesPosition>('bottom-right');
  const [batesFontFamily, setBatesFontFamily] = useState<'Courier' | 'Helvetica'>('Courier');
  const [batesFontSize, setBatesFontSize] = useState<number>(10);
  const [batesMargin, setBatesMargin] = useState<number>(36);
  const [batesScope, setBatesScope] = useState<'all' | 'custom'>('all');
  const [batesCustomRange, setBatesCustomRange] = useState<string>('1');

  // --- Header & Footer Settings (Sprint 19) ---
  const [enableHeader, setEnableHeader] = useState<boolean>(true);
  const [headerLeft, setHeaderLeft] = useState<string>('');
  const [headerCenter, setHeaderCenter] = useState<string>('Document Header');
  const [headerRight, setHeaderRight] = useState<string>('{date}');
  const [enableFooter, setEnableFooter] = useState<boolean>(true);
  const [footerLeft, setFooterLeft] = useState<string>('Confidential');
  const [footerCenter, setFooterCenter] = useState<string>('Page {page} of {total}');
  const [footerRight, setFooterRight] = useState<string>('');
  const [hfFontFamily, setHfFontFamily] = useState<SupportedFontFamily>('Helvetica');
  const [hfFontSize, setHfFontSize] = useState<number>(9);
  const [hfColorHex, setHfColorHex] = useState<string>('#1E293B');
  const [hfOpacity, setHfOpacity] = useState<number>(1.0);
  const [hfTopBottomMargin, setHfTopBottomMargin] = useState<number>(36);
  const [hfLeftRightMargin, setHfLeftRightMargin] = useState<number>(36);
  const [hfScope, setHfScope] = useState<'all' | 'custom'>('all');
  const [hfCustomRange, setHfCustomRange] = useState<string>('1');

  // --- Date & Time Stamp Settings (Sprint 19) ---
  const [dtMode, setDtMode] = useState<StampMode>('current-date-time');
  const [dtDateFormat, setDtDateFormat] = useState<DateFormat>('YYYY-MM-DD');
  const [dtTimeFormat, setDtTimeFormat] = useState<TimeFormat>('24_MIN');
  const [dtCustomDate, setDtCustomDate] = useState<string>(() => formatLocalIsoDate());
  const [dtCustomTime, setDtCustomTime] = useState<string>('12:00');
  const [dtPrefix, setDtPrefix] = useState<string>('Stamped: ');
  const [dtSuffix, setDtSuffix] = useState<string>('');
  const [dtPosition, setDtPosition] = useState<StandardTextPosition>('top-right');
  const [dtFontFamily, setDtFontFamily] = useState<SupportedFontFamily>('Helvetica');
  const [dtFontSize, setDtFontSize] = useState<number>(10);
  const [dtColorHex, setDtColorHex] = useState<string>('#1E293B');
  const [dtOpacity, setDtOpacity] = useState<number>(1.0);
  const [dtMargin, setDtMargin] = useState<number>(36);
  const [dtScope, setDtScope] = useState<'all' | 'custom'>('all');
  const [dtCustomRange, setDtCustomRange] = useState<string>('1');

  // --- Page Background Settings (Sprint 19) ---
  const [bgColorHex, setBgColorHex] = useState<string>('#FAF8F5');
  const [bgOpacity, setBgOpacity] = useState<number>(1.0);
  const [bgScope, setBgScope] = useState<'all' | 'custom'>('all');
  const [bgCustomRange, setBgCustomRange] = useState<string>('1');

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

  // --- Text Overlay Settings ---
  const [overlayText, setOverlayText] = useState<string>('Notice: Confidential Document');
  const [textFontSize, setTextFontSize] = useState<number>(14);
  const [textPosition, setTextPosition] = useState<'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right' | 'custom'>('top-left');
  const [textTargetPage, setTextTargetPage] = useState<number>(1);
  const [textColorHex, setTextColorHex] = useState<string>('#1E293B');

  // --- Markup Settings ---
  const [markupType, setMarkupType] = useState<'highlight' | 'underline' | 'box' | 'strike'>('highlight');
  const [markupTargetPage, setMarkupTargetPage] = useState<number>(1);
  const [markupPreset, setMarkupPreset] = useState<'header' | 'title' | 'body' | 'custom'>('title');

  const rangeValidation = parsePageRange(watermarkCustomRange, document.pageCount);

  // Apply Text Overlay
  const handleApplyTextOverlay = async () => {
    if (!document.data || !overlayText.trim()) return;
    setIsProcessing(true);
    setProcessingMsg('Adding text overlay locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const r = parseInt(textColorHex.slice(1, 3), 16) / 255 || 0.1;
      const g = parseInt(textColorHex.slice(3, 5), 16) / 255 || 0.1;
      const b = parseInt(textColorHex.slice(5, 7), 16) / 255 || 0.1;

      const updated = await documentService.applyTextOverlay(document, {
        text: overlayText,
        targetPages: [textTargetPage],
        position: textPosition,
        fontSize: textFontSize,
        color: { r, g, b },
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Text Overlay');
        setSuccessBanner(`Text overlay added to Page ${textTargetPage}.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply text overlay');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Markup
  const handleApplyMarkup = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Applying vector markup...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      let rect = { x: 50, y: 700, width: 495, height: 24 };
      if (markupPreset === 'header') {
        rect = { x: 36, y: 740, width: 520, height: 30 };
      } else if (markupPreset === 'body') {
        rect = { x: 50, y: 600, width: 495, height: 60 };
      }

      const updated = await documentService.applyMarkup(document, {
        type: markupType,
        targetPages: [markupTargetPage],
        rect,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `Markup (${markupType})`);
        setSuccessBanner(`${markupType.toUpperCase()} markup applied to Page ${markupTargetPage}.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply markup');
    } finally {
      setIsProcessing(false);
    }
  };

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

  // Apply Bates Numbering (Sprint 18)
  const handleApplyBatesNumbering = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Adding sequential Bates numbering...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      let selectedPages: number[] | undefined;
      if (batesScope === 'custom') {
        const parsed = parsePageRange(batesCustomRange, document.pageCount);
        if (!parsed.valid || parsed.pageIndices.length === 0) {
          setErrorMsg(parsed.error || 'Invalid page range');
          setIsProcessing(false);
          return;
        }
        selectedPages = parsed.pageIndices;
      }

      const { document: updated, result } = await documentService.addBatesNumbering(document, {
        prefix: batesPrefix,
        startNumber: batesStartNumber,
        padding: batesPadding,
        suffix: batesSuffix,
        position: batesPosition,
        fontFamily: batesFontFamily,
        fontSize: batesFontSize,
        margin: batesMargin,
        selectedPages,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Bates Numbering');
        setSuccessBanner(`Bates numbering applied (${result.firstBatesLabel} – ${result.lastBatesLabel}) across ${result.numberedPagesCount} pages.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply Bates numbering');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Header & Footer (Sprint 19)
  const handleApplyHeaderFooter = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Applying headers and footers locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      let selectedPages: number[] | undefined;
      if (hfScope === 'custom') {
        const parsed = parsePageRange(hfCustomRange, document.pageCount);
        if (!parsed.valid || parsed.pageIndices.length === 0) {
          setErrorMsg(parsed.error || 'Invalid page range for Header & Footer');
          setIsProcessing(false);
          return;
        }
        selectedPages = parsed.pageIndices;
      }

      const { document: updated, result } = await documentService.addHeaderFooter(document, {
        enableHeader,
        headerLeft,
        headerCenter,
        headerRight,
        enableFooter,
        footerLeft,
        footerCenter,
        footerRight,
        fontFamily: hfFontFamily,
        fontSize: hfFontSize,
        textColorHex: hfColorHex,
        opacity: hfOpacity,
        topBottomMargin: hfTopBottomMargin,
        leftRightMargin: hfLeftRightMargin,
        selectedPages,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Header & Footer');
        setSuccessBanner(`Header & Footer applied across ${result.modifiedPagesCount} pages.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply Header & Footer');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Date & Time Stamp (Sprint 19)
  const handleApplyDateTimeStamp = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Applying date & time stamp locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      let selectedPages: number[] | undefined;
      if (dtScope === 'custom') {
        const parsed = parsePageRange(dtCustomRange, document.pageCount);
        if (!parsed.valid || parsed.pageIndices.length === 0) {
          setErrorMsg(parsed.error || 'Invalid page range for Date & Time Stamp');
          setIsProcessing(false);
          return;
        }
        selectedPages = parsed.pageIndices;
      }

      const { document: updated, result } = await documentService.addDateTimeStamp(document, {
        mode: dtMode,
        dateFormat: dtDateFormat,
        timeFormat: dtTimeFormat,
        customDate: dtCustomDate,
        customTime: dtCustomTime,
        prefix: dtPrefix,
        suffix: dtSuffix,
        position: dtPosition,
        fontFamily: dtFontFamily,
        fontSize: dtFontSize,
        textColorHex: dtColorHex,
        opacity: dtOpacity,
        margin: dtMargin,
        selectedPages,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Date & Time Stamp');
        setSuccessBanner(`Date & Time Stamp ("${result.stampedText}") applied across ${result.stampedPagesCount} pages.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply Date & Time Stamp');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Page Background (Sprint 19)
  const handleApplyPageBackground = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Applying page background underlay locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      let selectedPages: number[] | undefined;
      if (bgScope === 'custom') {
        const parsed = parsePageRange(bgCustomRange, document.pageCount);
        if (!parsed.valid || parsed.pageIndices.length === 0) {
          setErrorMsg(parsed.error || 'Invalid page range for Page Background');
          setIsProcessing(false);
          return;
        }
        selectedPages = parsed.pageIndices;
      }

      const { document: updated, result } = await documentService.addPageBackground(document, {
        colorHex: bgColorHex,
        opacity: bgOpacity,
        selectedPages,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Page Background');
        setSuccessBanner(`Page Background (${result.appliedColorHex}) applied across ${result.coloredPagesCount} pages.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply Page Background');
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
            onClick={() => setActiveSubTool('bates-numbering')}
            id="tab-edit-bates-numbering"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'bates-numbering'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-orange-500" />
            <span>Bates Numbering</span>
          </button>

          <button
            onClick={() => setActiveSubTool('header-footer')}
            id="tab-edit-header-footer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'header-footer'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PanelTop className="w-3.5 h-3.5 text-orange-500" />
            <span>Header & Footer</span>
          </button>

          <button
            onClick={() => setActiveSubTool('date-time-stamp')}
            id="tab-edit-date-time-stamp"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'date-time-stamp'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
            <span>Date & Time Stamp</span>
          </button>

          <button
            onClick={() => setActiveSubTool('page-background')}
            id="tab-edit-page-background"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'page-background'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-orange-500" />
            <span>Page Background</span>
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

          <button
            onClick={() => setActiveSubTool('text-overlay')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'text-overlay'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text Overlay</span>
          </button>

          <button
            onClick={() => setActiveSubTool('markup')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'markup'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Markup</span>
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

      {/* SUB-TOOL: BATES NUMBERING (Sprint 18) */}
      {activeSubTool === 'bates-numbering' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Bates Numbering</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Add sequential Bates-style identifiers with custom prefix, zero-padding, and position.
              </p>
            </div>

            {/* Truth Boundary Callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Specification Notice: </span>
              Adds sequential Bates-style identifiers to selected PDF pages as a document-numbering utility. Does not provide tamper-proofing, cryptographic signing, or legal chain-of-custody certification.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. BATES-, CASE-, CONF-"
                  value={batesPrefix}
                  onChange={(e) => setBatesPrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Suffix (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. -CONF, -CONFIDENTIAL"
                  value={batesSuffix}
                  onChange={(e) => setBatesSuffix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Start Number</label>
                <input
                  type="number"
                  min="0"
                  value={batesStartNumber}
                  onChange={(e) => setBatesStartNumber(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Zero Padding (Digits)</label>
                <select
                  value={batesPadding}
                  onChange={(e) => setBatesPadding(parseInt(e.target.value, 10) || 6)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                >
                  <option value="3">3 digits (001)</option>
                  <option value="4">4 digits (0001)</option>
                  <option value="5">5 digits (00001)</option>
                  <option value="6">6 digits (000001)</option>
                  <option value="8">8 digits (00000001)</option>
                  <option value="10">10 digits (0000000001)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Font Style</label>
                <select
                  value={batesFontFamily}
                  onChange={(e) => setBatesFontFamily(e.target.value as 'Courier' | 'Helvetica')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="Courier">Courier (Monospace)</option>
                  <option value="Helvetica">Helvetica (Sans-Serif)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Position</label>
                <select
                  value={batesPosition}
                  onChange={(e) => setBatesPosition(e.target.value as BatesPosition)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="bottom-right">Bottom Right (Standard)</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Target Pages</label>
                <select
                  value={batesScope}
                  onChange={(e) => setBatesScope(e.target.value as 'all' | 'custom')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="all">All Pages (1–{document.pageCount})</option>
                  <option value="custom">Custom Page Range</option>
                </select>
              </div>
            </div>

            {batesScope === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Custom Range (e.g. 1-5, 8, 11-13)</label>
                <input
                  type="text"
                  value={batesCustomRange}
                  onChange={(e) => setBatesCustomRange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                  placeholder="e.g. 1-10"
                />
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyBatesNumbering}
                disabled={isProcessing}
                id="btn-apply-bates-numbering"
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all cursor-pointer"
              >
                Apply Bates Numbering
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Stamp Preview</h4>
              <p className="text-xs text-stone-500 mt-1">Simulated page stamp presentation:</p>

              <div className="mt-6 mx-auto w-52 h-72 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between">
                {/* Header position preview */}
                <div className="flex justify-between items-start text-[9px] font-mono text-stone-400">
                  <div className={batesPosition === 'top-left' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded' : 'opacity-0'}>
                    {formatBatesNumber(batesStartNumber, batesPrefix, batesPadding, batesSuffix)}
                  </div>
                  <div className={batesPosition === 'top-center' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded' : 'opacity-0'}>
                    {formatBatesNumber(batesStartNumber, batesPrefix, batesPadding, batesSuffix)}
                  </div>
                  <div className={batesPosition === 'top-right' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded' : 'opacity-0'}>
                    {formatBatesNumber(batesStartNumber, batesPrefix, batesPadding, batesSuffix)}
                  </div>
                </div>

                {/* Dummy page content */}
                <div className="space-y-2 opacity-25 px-2 my-auto">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-4/5"></div>
                </div>

                {/* Footer position preview */}
                <div className="flex justify-between items-end text-[9px] font-mono text-stone-400">
                  <div className={batesPosition === 'bottom-left' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded' : 'opacity-0'}>
                    {formatBatesNumber(batesStartNumber, batesPrefix, batesPadding, batesSuffix)}
                  </div>
                  <div className={batesPosition === 'bottom-center' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded' : 'opacity-0'}>
                    {formatBatesNumber(batesStartNumber, batesPrefix, batesPadding, batesSuffix)}
                  </div>
                  <div className={batesPosition === 'bottom-right' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded' : 'opacity-0'}>
                    {formatBatesNumber(batesStartNumber, batesPrefix, batesPadding, batesSuffix)}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-xl border border-stone-200 text-center space-y-1">
                <div className="text-[11px] text-stone-500 font-medium">Bates Sequence:</div>
                <div className="font-mono text-xs font-bold text-stone-900">
                  {formatBatesNumber(batesStartNumber, batesPrefix, batesPadding, batesSuffix)}
                  <span className="text-stone-400 mx-1.5">→</span>
                  {formatBatesNumber(batesStartNumber + document.pageCount - 1, batesPrefix, batesPadding, batesSuffix)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TOOL: HEADER & FOOTER (Sprint 19) */}
      {activeSubTool === 'header-footer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Header & Footer</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Add customizable running headers and footers with dynamic page numbers and date tokens.
              </p>
            </div>

            {/* Truth Boundary Callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Specification Notice: </span>
              Supported local PDF tools process your document directly in your browser. PDF files are not uploaded for these operations.
            </div>

            {/* Header Configuration */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableHeader}
                    onChange={(e) => setEnableHeader(e.target.checked)}
                    className="rounded text-orange-500 focus:ring-orange-400"
                  />
                  <span>Running Header</span>
                </label>
                <span className="text-[10px] text-stone-400 font-medium">Top Margin</span>
              </div>

              {enableHeader && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600 block">Header Left</label>
                    <input
                      type="text"
                      placeholder="e.g. Company Name"
                      value={headerLeft}
                      onChange={(e) => setHeaderLeft(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600 block">Header Center</label>
                    <input
                      type="text"
                      placeholder="e.g. Document Title"
                      value={headerCenter}
                      onChange={(e) => setHeaderCenter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600 block">Header Right</label>
                    <input
                      type="text"
                      placeholder="e.g. {date}"
                      value={headerRight}
                      onChange={(e) => setHeaderRight(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Configuration */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFooter}
                    onChange={(e) => setEnableFooter(e.target.checked)}
                    className="rounded text-orange-500 focus:ring-orange-400"
                  />
                  <span>Running Footer</span>
                </label>
                <span className="text-[10px] text-stone-400 font-medium">Bottom Margin</span>
              </div>

              {enableFooter && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600 block">Footer Left</label>
                    <input
                      type="text"
                      placeholder="e.g. Confidential"
                      value={footerLeft}
                      onChange={(e) => setFooterLeft(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600 block">Footer Center</label>
                    <input
                      type="text"
                      placeholder="e.g. Page {page} of {total}"
                      value={footerCenter}
                      onChange={(e) => setFooterCenter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600 block">Footer Right</label>
                    <input
                      type="text"
                      placeholder="e.g. Internal Use"
                      value={footerRight}
                      onChange={(e) => setFooterRight(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Tokens Guide */}
            <div className="p-3 bg-stone-100/70 border border-stone-200/60 rounded-xl text-[11px] text-stone-600 space-y-1">
              <span className="font-bold text-stone-800">Dynamic Tokens: </span>
              Use <code className="bg-white px-1 py-0.5 rounded border border-stone-300 text-orange-600 font-mono">{"{page}"}</code> for current page,{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-stone-300 text-orange-600 font-mono">{"{total}"}</code> for total pages, and{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-stone-300 text-orange-600 font-mono">{"{date}"}</code> for current date.
            </div>

            {/* Typography & Margins */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Font</label>
                <select
                  value={hfFontFamily}
                  onChange={(e) => setHfFontFamily(e.target.value as SupportedFontFamily)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="HelveticaBold">Helvetica Bold</option>
                  <option value="Courier">Courier</option>
                  <option value="TimesRoman">Times Roman</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Size (pt)</label>
                <input
                  type="number"
                  min="6"
                  max="24"
                  value={hfFontSize}
                  onChange={(e) => setHfFontSize(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Top/Bottom Margin</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={hfTopBottomMargin}
                  onChange={(e) => setHfTopBottomMargin(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Color Hex</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={hfColorHex}
                    onChange={(e) => setHfColorHex(e.target.value)}
                    className="w-8 h-8 rounded border border-stone-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={hfColorHex}
                    onChange={(e) => setHfColorHex(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Scope / Page Range */}
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <label className="text-xs font-bold text-stone-700 block">Target Pages</label>
              <div className="flex gap-4 items-center">
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="hfScope"
                    value="all"
                    checked={hfScope === 'all'}
                    onChange={() => setHfScope('all')}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span>All Pages ({document.pageCount})</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="hfScope"
                    value="custom"
                    checked={hfScope === 'custom'}
                    onChange={() => setHfScope('custom')}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span>Custom Range</span>
                </label>
              </div>

              {hfScope === 'custom' && (
                <div className="space-y-1 pt-1">
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5, 8-10"
                    value={hfCustomRange}
                    onChange={(e) => setHfCustomRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                  />
                  <p className="text-[11px] text-stone-500">
                    {parsePageRange(hfCustomRange, document.pageCount).displaySummary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyHeaderFooter}
                disabled={isProcessing}
                id="btn-apply-header-footer"
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all cursor-pointer"
              >
                Apply Header & Footer
              </button>
            </div>
          </div>

          {/* Header & Footer Live Preview */}
          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Page Header & Footer Preview</h4>
              <p className="text-xs text-stone-500 mt-1">Simulated Page 1 of {document.pageCount}:</p>

              <div className="mt-6 mx-auto w-52 h-72 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between overflow-hidden">
                {/* Header preview row */}
                {enableHeader ? (
                  <div className="flex justify-between items-start text-[8px] font-sans text-stone-700 border-b border-stone-100 pb-1 w-full gap-1">
                    <span className="truncate max-w-[30%] text-left font-medium">
                      {expandDynamicTokens(headerLeft, { page: 1, total: document.pageCount, date: formatLocalIsoDate() })}
                    </span>
                    <span className="truncate max-w-[40%] text-center font-bold">
                      {expandDynamicTokens(headerCenter, { page: 1, total: document.pageCount, date: formatLocalIsoDate() })}
                    </span>
                    <span className="truncate max-w-[30%] text-right font-medium">
                      {expandDynamicTokens(headerRight, { page: 1, total: document.pageCount, date: formatLocalIsoDate() })}
                    </span>
                  </div>
                ) : (
                  <div className="text-[8px] text-stone-300 italic text-center">[Header Disabled]</div>
                )}

                {/* Dummy body text */}
                <div className="space-y-2 opacity-25 px-2 my-auto">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-4/5"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-2/3"></div>
                </div>

                {/* Footer preview row */}
                {enableFooter ? (
                  <div className="flex justify-between items-end text-[8px] font-sans text-stone-700 border-t border-stone-100 pt-1 w-full gap-1">
                    <span className="truncate max-w-[30%] text-left font-medium">
                      {expandDynamicTokens(footerLeft, { page: 1, total: document.pageCount, date: formatLocalIsoDate() })}
                    </span>
                    <span className="truncate max-w-[40%] text-center font-bold">
                      {expandDynamicTokens(footerCenter, { page: 1, total: document.pageCount, date: formatLocalIsoDate() })}
                    </span>
                    <span className="truncate max-w-[30%] text-right font-medium">
                      {expandDynamicTokens(footerRight, { page: 1, total: document.pageCount, date: formatLocalIsoDate() })}
                    </span>
                  </div>
                ) : (
                  <div className="text-[8px] text-stone-300 italic text-center">[Footer Disabled]</div>
                )}
              </div>

              <div className="mt-4 p-3 bg-white rounded-xl border border-stone-200 text-center space-y-1">
                <div className="text-[11px] text-stone-500 font-medium">Target Scope:</div>
                <div className="font-mono text-xs font-bold text-stone-900">
                  {hfScope === 'all' ? `All ${document.pageCount} Pages` : `${parsePageRange(hfCustomRange, document.pageCount).pageCount} Selected Pages`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TOOL: DATE & TIME STAMP (Sprint 19) */}
      {activeSubTool === 'date-time-stamp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Date & Time Stamp</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Place deterministic date and timestamp text markings onto selected document pages.
              </p>
            </div>

            {/* Truth Boundary Callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Specification Notice: </span>
              Supported local PDF tools process your document directly in your browser. The timestamp is captured at execution time and rendered permanently as static vector text.
            </div>

            {/* Mode & Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Stamp Mode</label>
                <select
                  value={dtMode}
                  onChange={(e) => setDtMode(e.target.value as StampMode)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-medium"
                >
                  <option value="current-date">Current Date</option>
                  <option value="current-date-time">Current Date & Time</option>
                  <option value="custom-date">Custom Date</option>
                  <option value="custom-date-time">Custom Date & Time</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Date Format</label>
                <select
                  value={dtDateFormat}
                  onChange={(e) => setDtDateFormat(e.target.value as DateFormat)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-09-29)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (09/29/2026)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (29/09/2026)</option>
                  <option value="MONTH_DD_YYYY">Month DD, YYYY (Sep 29, 2026)</option>
                </select>
              </div>
            </div>

            {/* Time Format if applicable */}
            {(dtMode === 'current-date-time' || dtMode === 'custom-date-time') && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Time Format</label>
                <select
                  value={dtTimeFormat}
                  onChange={(e) => setDtTimeFormat(e.target.value as TimeFormat)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                >
                  <option value="24_MIN">24-Hour (HH:mm) e.g. 14:30</option>
                  <option value="24_SEC">24-Hour with Seconds (HH:mm:ss) e.g. 14:30:45</option>
                  <option value="12_MIN">12-Hour AM/PM (hh:mm A) e.g. 02:30 PM</option>
                  <option value="12_SEC">12-Hour with Seconds (hh:mm:ss A) e.g. 02:30:45 PM</option>
                </select>
              </div>
            )}

            {/* Custom Date/Time Inputs */}
            {(dtMode === 'custom-date' || dtMode === 'custom-date-time') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-200/70">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block">Custom Date</label>
                  <input
                    type="date"
                    value={dtCustomDate}
                    onChange={(e) => setDtCustomDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-mono"
                  />
                </div>
                {dtMode === 'custom-date-time' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block">Custom Time</label>
                    <input
                      type="time"
                      value={dtCustomTime}
                      onChange={(e) => setDtCustomTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Prefix & Suffix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Prefix Label</label>
                <input
                  type="text"
                  placeholder="e.g. Stamped: or Received: "
                  value={dtPrefix}
                  onChange={(e) => setDtPrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Suffix Label</label>
                <input
                  type="text"
                  placeholder="e.g.  - Verified"
                  value={dtSuffix}
                  onChange={(e) => setDtSuffix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>
            </div>

            {/* Placement & Typography */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Position</label>
                <select
                  value={dtPosition}
                  onChange={(e) => setDtPosition(e.target.value as StandardTextPosition)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="top-right">Top Right</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-left">Top Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Font</label>
                <select
                  value={dtFontFamily}
                  onChange={(e) => setDtFontFamily(e.target.value as SupportedFontFamily)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="HelveticaBold">Helvetica Bold</option>
                  <option value="Courier">Courier</option>
                  <option value="TimesRoman">Times Roman</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Size (pt)</label>
                <input
                  type="number"
                  min="6"
                  max="28"
                  value={dtFontSize}
                  onChange={(e) => setDtFontSize(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>
            </div>

            {/* Scope / Page Range */}
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <label className="text-xs font-bold text-stone-700 block">Target Pages</label>
              <div className="flex gap-4 items-center">
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="dtScope"
                    value="all"
                    checked={dtScope === 'all'}
                    onChange={() => setDtScope('all')}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span>All Pages ({document.pageCount})</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="dtScope"
                    value="custom"
                    checked={dtScope === 'custom'}
                    onChange={() => setDtScope('custom')}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span>Custom Range</span>
                </label>
              </div>

              {dtScope === 'custom' && (
                <div className="space-y-1 pt-1">
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5, 8-10"
                    value={dtCustomRange}
                    onChange={(e) => setDtCustomRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                  />
                  <p className="text-[11px] text-stone-500">
                    {parsePageRange(dtCustomRange, document.pageCount).displaySummary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyDateTimeStamp}
                disabled={isProcessing}
                id="btn-apply-date-time-stamp"
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all cursor-pointer"
              >
                Apply Date & Time Stamp
              </button>
            </div>
          </div>

          {/* Date & Time Stamp Live Preview */}
          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Stamp Preview</h4>
              <p className="text-xs text-stone-500 mt-1">Rendered timestamp simulation:</p>

              <div className="mt-6 mx-auto w-52 h-72 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between overflow-hidden">
                {/* Header position preview */}
                <div className="flex justify-between items-start text-[8px] font-mono text-stone-400">
                  <div className={dtPosition === 'top-left' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded truncate max-w-[90%]' : 'opacity-0'}>
                    {buildStampText({ mode: dtMode, dateFormat: dtDateFormat, timeFormat: dtTimeFormat, customDate: dtCustomDate, customTime: dtCustomTime, prefix: dtPrefix, suffix: dtSuffix })}
                  </div>
                  <div className={dtPosition === 'top-center' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded truncate max-w-[90%]' : 'opacity-0'}>
                    {buildStampText({ mode: dtMode, dateFormat: dtDateFormat, timeFormat: dtTimeFormat, customDate: dtCustomDate, customTime: dtCustomTime, prefix: dtPrefix, suffix: dtSuffix })}
                  </div>
                  <div className={dtPosition === 'top-right' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded truncate max-w-[90%]' : 'opacity-0'}>
                    {buildStampText({ mode: dtMode, dateFormat: dtDateFormat, timeFormat: dtTimeFormat, customDate: dtCustomDate, customTime: dtCustomTime, prefix: dtPrefix, suffix: dtSuffix })}
                  </div>
                </div>

                {/* Dummy body text */}
                <div className="space-y-2 opacity-25 px-2 my-auto">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-4/5"></div>
                </div>

                {/* Footer position preview */}
                <div className="flex justify-between items-end text-[8px] font-mono text-stone-400">
                  <div className={dtPosition === 'bottom-left' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded truncate max-w-[90%]' : 'opacity-0'}>
                    {buildStampText({ mode: dtMode, dateFormat: dtDateFormat, timeFormat: dtTimeFormat, customDate: dtCustomDate, customTime: dtCustomTime, prefix: dtPrefix, suffix: dtSuffix })}
                  </div>
                  <div className={dtPosition === 'bottom-center' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded truncate max-w-[90%]' : 'opacity-0'}>
                    {buildStampText({ mode: dtMode, dateFormat: dtDateFormat, timeFormat: dtTimeFormat, customDate: dtCustomDate, customTime: dtCustomTime, prefix: dtPrefix, suffix: dtSuffix })}
                  </div>
                  <div className={dtPosition === 'bottom-right' ? 'font-bold text-orange-600 bg-orange-50 px-1 rounded truncate max-w-[90%]' : 'opacity-0'}>
                    {buildStampText({ mode: dtMode, dateFormat: dtDateFormat, timeFormat: dtTimeFormat, customDate: dtCustomDate, customTime: dtCustomTime, prefix: dtPrefix, suffix: dtSuffix })}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-xl border border-stone-200 text-center space-y-1">
                <div className="text-[11px] text-stone-500 font-medium">Rendered Text:</div>
                <div className="font-mono text-xs font-bold text-stone-900 break-all">
                  {buildStampText({ mode: dtMode, dateFormat: dtDateFormat, timeFormat: dtTimeFormat, customDate: dtCustomDate, customTime: dtCustomTime, prefix: dtPrefix, suffix: dtSuffix })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TOOL: PAGE BACKGROUND (Sprint 19) */}
      {activeSubTool === 'page-background' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Page Background</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Add a solid color underlay behind existing PDF page content with vector-level transparency.
              </p>
            </div>

            {/* Truth Boundary Callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Specification Notice: </span>
              Supported local PDF tools process your document directly in your browser. PDF files are not uploaded for these operations. Page Background uses PDF-level vector underlays without rasterizing your document, preserving searchability and text clarity.
            </div>

            {/* Color Swatches */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 block">Preset Background Swatches</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Soft Ivory', hex: '#FAF8F5' },
                  { label: 'Pale Cream', hex: '#FFFDF0' },
                  { label: 'Warm Amber', hex: '#FEF3C7' },
                  { label: 'Light Gray', hex: '#F3F4F6' },
                  { label: 'Pale Sky', hex: '#EFF6FF' },
                  { label: 'Mint Light', hex: '#ECFDF5' },
                  { label: 'Lavender', hex: '#F5F3FF' },
                  { label: 'Rose Tint', hex: '#FFF1F2' },
                ].map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setBgColorHex(swatch.hex)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                      bgColorHex.toLowerCase() === swatch.hex.toLowerCase()
                        ? 'border-orange-500 bg-orange-50/40 text-stone-900 font-bold shadow-2xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-stone-300 shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="truncate">{swatch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color & Opacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Custom Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColorHex}
                    onChange={(e) => setBgColorHex(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={bgColorHex}
                    onChange={(e) => setBgColorHex(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-700 block">Opacity</label>
                  <span className="text-xs text-stone-500 font-mono">{Math.round(bgOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            {/* Scope / Page Range */}
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <label className="text-xs font-bold text-stone-700 block">Target Pages</label>
              <div className="flex gap-4 items-center">
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="bgScope"
                    value="all"
                    checked={bgScope === 'all'}
                    onChange={() => setBgScope('all')}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span>All Pages ({document.pageCount})</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="bgScope"
                    value="custom"
                    checked={bgScope === 'custom'}
                    onChange={() => setBgScope('custom')}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span>Custom Range</span>
                </label>
              </div>

              {bgScope === 'custom' && (
                <div className="space-y-1 pt-1">
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5, 8-10"
                    value={bgCustomRange}
                    onChange={(e) => setBgCustomRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                  />
                  <p className="text-[11px] text-stone-500">
                    {parsePageRange(bgCustomRange, document.pageCount).displaySummary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyPageBackground}
                disabled={isProcessing}
                id="btn-apply-page-background"
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all cursor-pointer"
              >
                Apply Page Background
              </button>
            </div>
          </div>

          {/* Page Background Live Preview */}
          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Background Underlay Preview</h4>
              <p className="text-xs text-stone-500 mt-1">Vector underlay simulated behind page content:</p>

              <div
                className="mt-6 mx-auto w-52 h-72 rounded-lg shadow-sm border border-stone-300 relative p-4 flex flex-col justify-between overflow-hidden transition-colors"
                style={{ backgroundColor: bgColorHex, opacity: Math.max(0.2, bgOpacity) }}
              >
                {/* Simulated original vector text remaining crisp above underlay */}
                <div className="space-y-2 opacity-80 my-auto">
                  <div className="text-[10px] font-bold text-stone-900 border-b border-stone-300 pb-1">Sample Page Header</div>
                  <div className="h-2 bg-stone-800 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-700 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-700 rounded-sm w-5/6"></div>
                  <div className="h-1.5 bg-stone-700 rounded-sm w-4/5"></div>
                  <div className="h-1.5 bg-stone-700 rounded-sm w-2/3"></div>
                  <div className="text-[8px] text-stone-600 pt-2 italic">Vector content remains preserved above background.</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-xl border border-stone-200 text-center space-y-1">
                <div className="text-[11px] text-stone-500 font-medium">Underlay Specification:</div>
                <div className="font-mono text-xs font-bold text-stone-900">
                  {bgColorHex} • {Math.round(bgOpacity * 100)}% Opacity
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Sub-tool 6: Text Overlay */}
      {activeSubTool === 'text-overlay' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900">Custom Text Overlay</h3>
            <p className="text-xs text-stone-500">
              Draw crisp vector typography directly onto document pages without rasterization.
            </p>

            <div className="space-y-1.5 pt-2 border-t border-stone-100">
              <label className="text-xs font-bold text-stone-700 block">Text Content</label>
              <textarea
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="Enter text to overlay..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Target Page</label>
                <input
                  type="number"
                  min="1"
                  max={document.pageCount}
                  value={textTargetPage}
                  onChange={(e) => setTextTargetPage(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Font Size (pt)</label>
                <input
                  type="number"
                  min="8"
                  max="72"
                  value={textFontSize}
                  onChange={(e) => setTextFontSize(parseInt(e.target.value, 10) || 14)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Position</label>
                <select
                  value={textPosition}
                  onChange={(e) => setTextPosition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="center">Center</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyTextOverlay}
                disabled={isProcessing || !overlayText.trim()}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
              >
                Apply Text Overlay
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Placement Preview</h4>
              <div className="mt-6 mx-auto w-48 h-64 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-between overflow-hidden">
                <div className="space-y-2 opacity-20 pt-2">
                  <div className="h-2 bg-stone-400 rounded-sm w-3/4"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-300 rounded-sm w-5/6"></div>
                </div>

                <div
                  className={`p-1.5 border border-dashed border-orange-400 rounded bg-orange-50/80 text-[10px] font-bold text-stone-800 truncate max-w-[140px] ${
                    textPosition === 'top-right'
                      ? 'self-end'
                      : textPosition === 'top-left'
                      ? 'self-start'
                      : textPosition === 'bottom-right'
                      ? 'self-end mt-auto'
                      : textPosition === 'bottom-left'
                      ? 'self-start mt-auto'
                      : 'self-center my-auto'
                  }`}
                >
                  {overlayText.substring(0, 20)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tool 7: Visual Markup Overlay */}
      {activeSubTool === 'markup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900">Visual Markup Overlay</h3>
            <p className="text-xs text-stone-500">
              Add visual highlight stripes, underline rules, or outline boxes directly to page streams (visual vector overlay; not PDF /Annot objects).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Markup Style</label>
                <select
                  value={markupType}
                  onChange={(e) => setMarkupType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="highlight">Highlight (Translucent Yellow)</option>
                  <option value="underline">Underline Rule (Blue)</option>
                  <option value="box">Bounding Box (Green)</option>
                  <option value="strike">Strike-Through (Red)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Target Page</label>
                <input
                  type="number"
                  min="1"
                  max={document.pageCount}
                  value={markupTargetPage}
                  onChange={(e) => setMarkupTargetPage(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">Region Preset</label>
                <select
                  value={markupPreset}
                  onChange={(e) => setMarkupPreset(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                >
                  <option value="title">Document Title Region</option>
                  <option value="header">Top Header Region</option>
                  <option value="body">Body Section</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Processed locally in browser.</span>
              <button
                onClick={handleApplyMarkup}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
              >
                Apply Markup
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-stone-100 rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Markup Sample</h4>
              <div className="mt-6 mx-auto w-48 h-64 bg-white rounded-lg shadow-sm border border-stone-300 relative p-3 flex flex-col justify-start gap-4 overflow-hidden">
                <div className="space-y-2 pt-2">
                  <div
                    className={`h-4 rounded-xs ${
                      markupType === 'highlight'
                        ? 'bg-amber-300/60'
                        : markupType === 'underline'
                        ? 'border-b-2 border-blue-500 bg-transparent'
                        : markupType === 'box'
                        ? 'border-2 border-emerald-500 bg-transparent'
                        : 'border-b-2 border-red-500 bg-transparent'
                    } w-3/4 flex items-center px-1 text-[8px] font-bold text-stone-700`}
                  >
                    Sample Marked Line
                  </div>
                  <div className="h-1.5 bg-stone-200 rounded-sm w-full"></div>
                  <div className="h-1.5 bg-stone-200 rounded-sm w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
