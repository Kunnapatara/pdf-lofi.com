import React, { useState } from 'react';
import {
  FileImage,
  FileText,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Maximize2,
  HardDrive,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import {
  convertPdfToImages,
  convertImagesToPdf,
  convertPdfToTxt,
  RenderedPageImage,
  ImageInputItem,
} from '../../pdf/core/operations/conversionOperation';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

export type ConversionSubTool = 'pdf-to-image' | 'images-to-pdf' | 'pdf-to-txt';

interface ConversionTabProps {
  document?: LocalDocument | null;
  onOpenGeneratedPdf?: (data: Uint8Array, name: string, pageCount: number) => void;
  initialSubTool?: ConversionSubTool;
}

export const ConversionTab: React.FC<ConversionTabProps> = ({
  document,
  onOpenGeneratedPdf,
  initialSubTool = 'pdf-to-image',
}) => {
  const [activeSubTool, setActiveSubTool] = useState<ConversionSubTool>(initialSubTool);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // --- PDF to Image State ---
  const [imgFormat, setImgFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [imgScale, setImgScale] = useState<number>(1.5);
  const [imgQuality, setImgQuality] = useState<number>(0.92);
  const [renderedImages, setRenderedImages] = useState<RenderedPageImage[]>([]);

  // --- Images to PDF State ---
  const [inputImages, setInputImages] = useState<ImageInputItem[]>([]);
  const [imgPageSize, setImgPageSize] = useState<'fit' | 'a4' | 'letter'>('fit');
  const [imgMargin, setImgMargin] = useState<number>(0);

  // --- PDF to TXT State ---
  const [extractedTxt, setExtractedTxt] = useState<string>('');
  const [includeMarkers, setIncludeMarkers] = useState<boolean>(true);
  const [copiedTxt, setCopiedTxt] = useState(false);

  // Execute PDF -> Images
  const handleRenderPdfToImages = async () => {
    if (!document?.data) {
      setErrorMsg('Please select or open a PDF document first.');
      return;
    }
    setIsProcessing(true);
    setProcessingMsg(`Rendering PDF pages to ${imgFormat.toUpperCase()} client-side...`);
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const results = await convertPdfToImages(document.data, {
        format: imgFormat,
        scale: imgScale,
        quality: imgQuality,
        onProgress: (cur, tot) => setProcessingMsg(`Rendering page ${cur} of ${tot}...`),
      });
      setRenderedImages(results);
      setSuccessBanner(`Successfully converted ${results.length} pages to ${imgFormat.toUpperCase()}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to convert PDF pages to images');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingleImage = (img: RenderedPageImage) => {
    const ext = img.format === 'jpeg' ? 'jpg' : img.format;
    const baseName = (document?.name || 'document').replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_page_${img.pageNumber}.${ext}`;

    const link = window.document.createElement('a');
    link.href = img.dataUrl;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleDownloadAllImages = () => {
    for (const img of renderedImages) {
      handleDownloadSingleImage(img);
    }
  };

  // Execute Images -> PDF
  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        setInputImages((prev) => [
          ...prev,
          {
            data: new Uint8Array(buffer),
            mimeType: file.type || 'image/png',
            name: file.name,
          },
        ]);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    setInputImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImage = (from: number, to: number) => {
    if (to < 0 || to >= inputImages.length) return;
    setInputImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const handleCreatePdfFromImages = async () => {
    if (inputImages.length === 0) {
      setErrorMsg('Please select at least one image.');
      return;
    }

    setIsProcessing(true);
    setProcessingMsg('Assembling images into PDF document locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const result = await convertImagesToPdf(inputImages, {
        pageSize: imgPageSize,
        margin: imgMargin,
      });

      setSuccessBanner(`Created ${result.pageCount}-page PDF successfully.`);
      triggerLocalDownload(result.data, 'images_converted.pdf');

      if (onOpenGeneratedPdf) {
        onOpenGeneratedPdf(result.data, 'images_converted.pdf', result.pageCount);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate PDF from images');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute PDF -> TXT
  const handleExtractTxt = async () => {
    if (!document?.data) {
      setErrorMsg('Please select or open a PDF document first.');
      return;
    }

    setIsProcessing(true);
    setProcessingMsg('Extracting text streams client-side...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const txt = await convertPdfToTxt(document.data, {
        includePageMarkers: includeMarkers,
        onProgress: (cur, tot) => setProcessingMsg(`Extracting text from page ${cur} of ${tot}...`),
      });
      setExtractedTxt(txt);
      setSuccessBanner('Text extracted successfully.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to extract text from PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyTxt = () => {
    navigator.clipboard.writeText(extractedTxt);
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  const handleDownloadTxt = () => {
    const baseName = (document?.name || 'document').replace(/\.[^/.]+$/, '');
    const blob = new Blob([extractedTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${baseName}_extracted.txt`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileImage className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">Document Conversion Engine</h2>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTool('pdf-to-image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'pdf-to-image'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            PDF → Images
          </button>
          <button
            onClick={() => setActiveSubTool('images-to-pdf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'images-to-pdf'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Images → PDF
          </button>
          <button
            onClick={() => setActiveSubTool('pdf-to-txt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTool === 'pdf-to-txt'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            PDF → Plaintext
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      <ProcessingBadge
        state={isProcessing ? 'processing' : errorMsg ? 'error' : 'idle'}
        operationName={processingMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      {/* Sub-tool 1: PDF to Images (PNG, JPG, WebP) */}
      {activeSubTool === 'pdf-to-image' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Rasterize PDF to Images</h3>
                <p className="text-xs text-stone-500">
                  Render PDF vector pages onto HTML Canvas client-side and export crisp images.
                </p>
              </div>

              <button
                onClick={handleRenderPdfToImages}
                disabled={isProcessing || !document?.data}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Rendering...' : 'Convert Pages to Images'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-stone-100">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Target Format</label>
                <select
                  value={imgFormat}
                  onChange={(e) => setImgFormat(e.target.value as any)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                >
                  <option value="png">PNG (Lossless with transparency)</option>
                  <option value="jpeg">JPG (Standard photography/print)</option>
                  <option value="webp">WebP (Modern high-compression web)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Resolution / Scale</label>
                <select
                  value={imgScale}
                  onChange={(e) => setImgScale(parseFloat(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                >
                  <option value="1">1.0x (Standard Web - 72 DPI)</option>
                  <option value="1.5">1.5x (Crisp Screen - 108 DPI)</option>
                  <option value="2">2.0x (High Density / Print - 144 DPI)</option>
                </select>
              </div>

              {imgFormat !== 'png' && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Quality ({Math.round(imgQuality * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.4"
                    max="1.0"
                    step="0.05"
                    value={imgQuality}
                    onChange={(e) => setImgQuality(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-orange-500"
                  />
                </div>
              )}
            </div>
          </div>

          {renderedImages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  {renderedImages.length} Converted Pages Ready
                </span>
                <button
                  onClick={handleDownloadAllImages}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All Images</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {renderedImages.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="bg-white rounded-2xl border border-stone-200 p-3 space-y-2 shadow-xs"
                  >
                    <div className="aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center border border-stone-200/50">
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-stone-800">Page {img.pageNumber}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {img.width} × {img.height}px
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownloadSingleImage(img)}
                      className="w-full py-1.5 rounded-lg text-xs font-bold bg-stone-100 hover:bg-orange-50 hover:text-orange-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download {img.format.toUpperCase()}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tool 2: Images to PDF */}
      {activeSubTool === 'images-to-pdf' && (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Assemble Images into PDF</h3>
              <p className="text-xs text-stone-500">
                Embed PNG or JPG photos directly into vector PDF pages with custom layout.
              </p>
            </div>

            <button
              onClick={handleCreatePdfFromImages}
              disabled={isProcessing || inputImages.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Generating PDF...' : `Generate PDF (${inputImages.length} images)`}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-stone-100">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Page Dimensions</label>
              <select
                value={imgPageSize}
                onChange={(e) => setImgPageSize(e.target.value as any)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-200 bg-stone-50"
              >
                <option value="fit">Match Original Image Aspect & Dimensions</option>
                <option value="a4">Standard A4 (Fit with margins)</option>
                <option value="letter">US Letter (Fit with margins)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Margins (points)</label>
              <select
                value={imgMargin}
                onChange={(e) => setImgMargin(parseInt(e.target.value))}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-200 bg-stone-50"
              >
                <option value="0">Zero Margin (Full Bleed)</option>
                <option value="18">0.25 inch (18 pt)</option>
                <option value="36">0.50 inch (36 pt)</option>
                <option value="72">1.00 inch (72 pt)</option>
              </select>
            </div>
          </div>

          {/* Upload Area */}
          <div className="p-6 border-2 border-dashed border-stone-200 rounded-2xl text-center space-y-3 bg-stone-50/50">
            <ImageIcon className="w-8 h-8 text-stone-400 mx-auto" />
            <div className="text-xs font-semibold text-stone-700">
              Drag and drop PNG or JPG images here, or browse files
            </div>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 transition-all cursor-pointer shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Select Images</span>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleAddImages}
                className="hidden"
              />
            </label>
          </div>

          {/* Image List */}
          {inputImages.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-700">Image Sequence:</span>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                {inputImages.map((img, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-mono font-bold text-stone-400">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-stone-800">{img.name || `Image_${idx + 1}`}</span>
                      <span className="text-[10px] font-mono text-stone-400 uppercase">
                        {(img.data.byteLength / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveImage(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveImage(idx, idx + 1)}
                        disabled={idx === inputImages.length - 1}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 rounded text-red-400 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tool 3: PDF to Plaintext (.txt) */}
      {activeSubTool === 'pdf-to-txt' && (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Extract Plaintext (.txt)</h3>
              <p className="text-xs text-stone-500">
                Extract all searchable text streams from document pages into structured plain text.
              </p>
            </div>

            <button
              onClick={handleExtractTxt}
              disabled={isProcessing || !document?.data}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Extracting...' : 'Extract Full Text'}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMarkers}
                onChange={(e) => setIncludeMarkers(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span>Include page headers (e.g. --- Page 1 ---)</span>
            </label>
          </div>

          {extractedTxt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700">
                  Extracted Content ({extractedTxt.split(/\s+/).filter(Boolean).length} words)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTxt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedTxt ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              <textarea
                value={extractedTxt}
                onChange={(e) => setExtractedTxt(e.target.value)}
                rows={12}
                className="w-full text-xs font-mono p-4 rounded-2xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
