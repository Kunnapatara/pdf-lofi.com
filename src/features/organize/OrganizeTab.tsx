import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Plus,
  ArrowLeft,
  ArrowRight,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  Scissors,
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  Crop,
  Maximize2,
  FileX,
  X,
} from 'lucide-react';
import { LocalDocument, DocumentPageInfo } from '../../types/pdf';
import { generatePageThumbnail } from '../../pdf/rendering/thumbnailService';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';
import { CropMargins } from '../../pdf/core/operations/cropOperation';
import { StandardPageSize } from '../../pdf/core/operations/resizeOperation';

interface OrganizeTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
}

export const OrganizeTab: React.FC<OrganizeTabProps> = ({
  document,
  onUpdateDocumentData,
}) => {
  const [, setPages] = useState<DocumentPageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 0-indexed
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMsg, setProcessingMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);

  // Modals for Crop & Resize
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropMargins, setCropMargins] = useState<CropMargins>({ top: 36, bottom: 36, left: 36, right: 36 });

  const [showResizeModal, setShowResizeModal] = useState(false);
  const [resizePreset, setResizePreset] = useState<StandardPageSize>('a4');
  const [scaleContent, setScaleContent] = useState(true);

  // Initialize page metadata array
  useEffect(() => {
    if (!document.data) return;
    const initialPages: DocumentPageInfo[] = [];
    for (let i = 0; i < document.pageCount; i++) {
      initialPages.push({
        pageNumber: i + 1,
        originalPageNumber: i + 1,
        rotation: 0,
        width: 595,
        height: 842,
      });
    }
    setPages(initialPages);
    setSelectedPages([]);
  }, [document.id, document.pageCount, document.data]);

  // Render thumbnails on demand
  useEffect(() => {
    if (!document.data) return;
    let isCancelled = false;

    async function loadAllThumbnails() {
      if (!document.data) return;
      const newThumbs: Record<number, string> = {};
      for (let i = 1; i <= document.pageCount; i++) {
        try {
          const thumb = await generatePageThumbnail(document.data, i, 0, 220);
          if (isCancelled) return;
          newThumbs[i] = thumb;
        } catch (e) {
          console.warn(`Could not render thumb for page ${i}`, e);
        }
      }
      if (!isCancelled) {
        setThumbnails(newThumbs);
      }
    }

    loadAllThumbnails();
    return () => {
      isCancelled = true;
    };
  }, [document.data, document.pageCount]);

  // Operations using authoritative DocumentService
  const handleRotateSingle = async (pageIdx: number, delta: number) => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Rotating Page ${pageIdx + 1}`);
    setErrorMsg(null);
    try {
      const updated = await documentService.rotatePage(document, pageIdx, delta);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `Rotate Page ${pageIdx + 1}`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to rotate page');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicateSingle = async (pageIdx: number) => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Duplicating Page ${pageIdx + 1}`);
    setErrorMsg(null);
    try {
      const updated = await documentService.duplicatePage(document, pageIdx);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `Duplicate Page ${pageIdx + 1}`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to duplicate page');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingle = async (pageIdx: number) => {
    if (!document.data) return;
    if (document.pageCount <= 1) {
      setErrorMsg('A PDF must contain at least one page. Cannot delete the only remaining page.');
      return;
    }
    setIsProcessing(true);
    setProcessingMsg(`Deleting Page ${pageIdx + 1}`);
    setErrorMsg(null);
    try {
      const updated = await documentService.deletePages(document, [pageIdx]);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `Delete Page ${pageIdx + 1}`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete page');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInsertBlank = async (targetIndex: number) => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Inserting Blank Page');
    setErrorMsg(null);
    try {
      const updated = await documentService.insertBlankPage(document, targetIndex);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Insert Blank Page');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to insert blank page');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePage = async (fromIdx: number, toIdx: number) => {
    if (!document.data || fromIdx === toIdx) return;
    if (toIdx < 0 || toIdx >= document.pageCount) return;

    setIsProcessing(true);
    setProcessingMsg(`Moving Page ${fromIdx + 1} to position ${toIdx + 1}`);
    setErrorMsg(null);

    try {
      const order = Array.from({ length: document.pageCount }, (_, i) => i);
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);

      const updated = await documentService.reorderPages(document, order);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `Reorder Pages`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reorder pages');
    } finally {
      setIsProcessing(false);
    }
  };

  // Selection helpers
  const handleToggleSelectPage = (idx: number) => {
    setSelectedPages((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectAll = () => {
    if (selectedPages.length === document.pageCount) {
      setSelectedPages([]);
    } else {
      setSelectedPages(Array.from({ length: document.pageCount }, (_, i) => i));
    }
  };

  const handleSelectOdd = () => {
    const odds = Array.from({ length: document.pageCount }, (_, i) => i).filter((i) => i % 2 === 0);
    setSelectedPages(odds);
  };

  const handleSelectEven = () => {
    const evens = Array.from({ length: document.pageCount }, (_, i) => i).filter((i) => i % 2 === 1);
    setSelectedPages(evens);
  };

  const handleBatchDelete = async () => {
    if (selectedPages.length === 0 || !document.data) return;
    if (selectedPages.length >= document.pageCount) {
      setErrorMsg('Cannot delete all pages. At least one page must remain.');
      return;
    }
    setIsProcessing(true);
    setProcessingMsg(`Deleting ${selectedPages.length} selected pages`);
    setErrorMsg(null);
    try {
      const updated = await documentService.deletePages(document, selectedPages);
      setSelectedPages([]);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `Delete ${selectedPages.length} Pages`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete selected pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchExtract = async () => {
    if (selectedPages.length === 0 || !document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Extracting ${selectedPages.length} pages into new PDF`);
    setErrorMsg(null);
    try {
      const sorted = [...selectedPages].sort((a, b) => a - b);
      const result = await documentService.extractPages(document.data, sorted);
      const extractedName = `${document.name.replace(/\.pdf$/i, '')}_extracted_${sorted.length}pages.pdf`;
      triggerLocalDownload(result.data, extractedName);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to extract pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReversePages = async () => {
    if (!document.data || document.pageCount <= 1) return;
    setIsProcessing(true);
    setProcessingMsg('Reversing page sequence');
    setErrorMsg(null);
    try {
      const updated = await documentService.reversePages(document);
      setSelectedPages([]);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Reverse Pages');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reverse pages');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove Blank Pages
  const handleRemoveBlankPages = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Scanning document for blank pages...');
    setErrorMsg(null);
    setSuccessNotice(null);

    try {
      const { document: updated, removedCount } = await documentService.removeBlankPages(
        document,
        (cur, total) => setProcessingMsg(`Scanning page ${cur} of ${total} for blank content...`)
      );

      if (removedCount === 0) {
        setSuccessNotice('No blank pages detected. Document is already clean.');
      } else {
        setSuccessNotice(`Successfully detected and removed ${removedCount} blank ${removedCount === 1 ? 'page' : 'pages'}.`);
        if (updated.data) {
          await onUpdateDocumentData(updated.data, updated.pageCount, `Remove ${removedCount} Blank Pages`);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove blank pages');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Crop
  const handleApplyCrop = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Cropping pages...');
    setErrorMsg(null);
    try {
      const targetIndices = selectedPages.length > 0 ? selectedPages : undefined;
      const updated = await documentService.cropPages(document, cropMargins, targetIndices);
      setShowCropModal(false);
      if (updated.data) {
        await onUpdateDocumentData(
          updated.data,
          updated.pageCount,
          `Crop ${targetIndices ? targetIndices.length : 'All'} Pages`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to crop pages');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Resize
  const handleApplyResize = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Standardizing page dimensions to ${resizePreset.toUpperCase()}...`);
    setErrorMsg(null);
    try {
      const targetIndices = selectedPages.length > 0 ? selectedPages : undefined;
      const updated = await documentService.resizePages(
        document,
        { preset: resizePreset, scaleContent },
        targetIndices
      );
      setShowResizeModal(false);
      if (updated.data) {
        await onUpdateDocumentData(
          updated.data,
          updated.pageCount,
          `Resize Pages to ${resizePreset.toUpperCase()}`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resize pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCurrent = () => {
    if (document.data) {
      triggerLocalDownload(document.data, document.name);
    }
  };

  const handleDragStart = (e: React.DragEvent, pageIdx: number) => {
    setDraggedPageIndex(pageIdx);
    e.dataTransfer.setData('text/plain', pageIdx.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnPage = (e: React.DragEvent, dropTargetIdx: number) => {
    e.preventDefault();
    if (draggedPageIndex === null || draggedPageIndex === dropTargetIdx) return;
    handleMovePage(draggedPageIndex, dropTargetIdx);
    setDraggedPageIndex(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
      {/* Top Operations Action Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Selection Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleSelectAll}
              id="btn-select-all"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
            >
              {selectedPages.length === document.pageCount ? (
                <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-stone-500" />
              )}
              <span>{selectedPages.length === document.pageCount ? 'Deselect All' : 'Select All'}</span>
              {selectedPages.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                  {selectedPages.length}
                </span>
              )}
            </button>

            <button
              onClick={handleSelectOdd}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Select all odd pages (1, 3, 5...)"
            >
              Odd Pages
            </button>

            <button
              onClick={handleSelectEven}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Select all even pages (2, 4, 6...)"
            >
              Even Pages
            </button>

            <div className="h-4 w-px bg-stone-200 mx-1 hidden sm:block" />

            <button
              onClick={() => handleInsertBlank(document.pageCount)}
              disabled={isProcessing}
              id="btn-add-blank-page"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-stone-600" />
              <span>+ Blank</span>
            </button>

            <button
              onClick={handleReversePages}
              disabled={isProcessing || document.pageCount <= 1}
              id="btn-reverse-order"
              title="Invert page order (e.g. 1..N becomes N..1)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-600" />
              <span>Reverse</span>
            </button>

            <button
              onClick={handleRemoveBlankPages}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Scan and remove blank spacer pages in browser"
            >
              <FileX className="w-3.5 h-3.5 text-stone-600" />
              <span>Purge Blanks</span>
            </button>

            <button
              onClick={() => setShowCropModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Crop page margins"
            >
              <Crop className="w-3.5 h-3.5 text-stone-600" />
              <span>Crop</span>
            </button>

            <button
              onClick={() => setShowResizeModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Standardize page size to A4 or US Letter"
            >
              <Maximize2 className="w-3.5 h-3.5 text-stone-600" />
              <span>Resize</span>
            </button>
          </div>

          {/* Center / Batch Actions */}
          <div className="flex items-center gap-2">
            {selectedPages.length > 0 && (
              <>
                <button
                  onClick={handleBatchExtract}
                  disabled={isProcessing}
                  id="btn-batch-extract"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 transition-all cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-orange-600" />
                  <span>Extract ({selectedPages.length})</span>
                </button>

                <button
                  onClick={handleBatchDelete}
                  disabled={isProcessing}
                  id="btn-batch-delete"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete ({selectedPages.length})</span>
                </button>
              </>
            )}
          </div>

          {/* Right: Export Download */}
          <button
            onClick={handleDownloadCurrent}
            disabled={isProcessing}
            id="btn-organize-download"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs shadow-orange-500/20 active:scale-95 ml-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Processed PDF</span>
          </button>
        </div>

        {/* Notices */}
        {successNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <span>{successNotice}</span>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Processing State Badge */}
        <ProcessingBadge
          state={isProcessing ? 'processing' : errorMsg ? 'error' : document.processingState}
          operationName={processingMsg}
          errorMessage={errorMsg || undefined}
          onClearError={() => setErrorMsg(null)}
        />
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: document.pageCount }, (_, idx) => {
          const pageNum = idx + 1;
          const isSelected = selectedPages.includes(idx);
          const thumbUrl = thumbnails[pageNum];

          return (
            <div
              key={`${document.id}-page-${pageNum}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnPage(e, idx)}
              className={`group bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                isSelected
                  ? 'border-orange-500 ring-2 ring-orange-400/30'
                  : 'border-stone-200/90 hover:border-orange-300'
              }`}
            >
              {/* Card Top / Thumbnail area */}
              <div className="relative w-full aspect-[3/4] bg-stone-50 border-b border-stone-100 flex items-center justify-center p-3 overflow-hidden cursor-grab active:cursor-grabbing">
                {/* Pill Badge: Top Left */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white shadow-2xs">
                    <Sparkles className="w-2.5 h-2.5" />
                    Page {pageNum}
                  </span>
                </div>

                {/* Multi-select check icon: Top Right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelectPage(idx);
                  }}
                  className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-white/90 border border-stone-200/80 shadow-2xs hover:bg-white text-stone-700 transition-colors cursor-pointer"
                  title={isSelected ? 'Deselect' : 'Select'}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-orange-600" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400" />
                  )}
                </button>

                {/* Rendered Thumbnail */}
                <div className="w-full h-full rounded-lg bg-white shadow-xs border border-stone-200/60 overflow-hidden flex items-center justify-center">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Page ${pageNum}`}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <div className="text-xs font-mono text-stone-400">Loading...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body: Page Information */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Page {pageNum} of {document.pageCount}
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">
                    A4
                  </span>
                </div>

                {/* Rotation and cloning actions */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  <button
                    onClick={() => handleRotateSingle(idx, -90)}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-stone-50 hover:bg-orange-50 hover:text-orange-600 border border-stone-200 text-stone-600 transition-all flex items-center justify-center cursor-pointer"
                    title="Rotate 90° CCW"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRotateSingle(idx, 90)}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-stone-50 hover:bg-orange-50 hover:text-orange-600 border border-stone-200 text-stone-600 transition-all flex items-center justify-center cursor-pointer"
                    title="Rotate 90° CW"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDuplicateSingle(idx)}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-stone-50 hover:bg-orange-50 hover:text-orange-600 border border-stone-200 text-stone-600 transition-all flex items-center justify-center cursor-pointer"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteSingle(idx)}
                    disabled={isProcessing || document.pageCount <= 1}
                    className="p-1.5 rounded-lg bg-stone-50 hover:bg-red-50 hover:text-red-600 border border-stone-200 text-stone-600 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Move Controls: First, Prev, Next, Last */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleMovePage(idx, 0)}
                      disabled={idx === 0 || isProcessing}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-all cursor-pointer"
                      title="Move to Start"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMovePage(idx, idx - 1)}
                      disabled={idx === 0 || isProcessing}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-all cursor-pointer"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMovePage(idx, idx + 1)}
                      disabled={idx === document.pageCount - 1 || isProcessing}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-all cursor-pointer"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMovePage(idx, document.pageCount - 1)}
                      disabled={idx === document.pageCount - 1 || isProcessing}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-all cursor-pointer"
                      title="Move to End"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleSelectPage(idx)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crop Margins Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Crop Page Margins</h3>
              </div>
              <button onClick={() => setShowCropModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Set trim margins in points (72 pt = 1 inch). Applies to {selectedPages.length > 0 ? `${selectedPages.length} selected pages` : 'all pages'}.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700">Top Margin (pt)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={cropMargins.top}
                  onChange={(e) => setCropMargins({ ...cropMargins, top: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700">Bottom Margin (pt)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={cropMargins.bottom}
                  onChange={(e) => setCropMargins({ ...cropMargins, bottom: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700">Left Margin (pt)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={cropMargins.left}
                  onChange={(e) => setCropMargins({ ...cropMargins, left: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700">Right Margin (pt)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={cropMargins.right}
                  onChange={(e) => setCropMargins({ ...cropMargins, right: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setShowCropModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCrop}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resize / Standardize Modal */}
      {showResizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Standardize Page Size</h3>
              </div>
              <button onClick={() => setShowResizeModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Conform dimensions to standard international print formats. Applies to {selectedPages.length > 0 ? `${selectedPages.length} selected pages` : 'all pages'}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700">Target Standard Format</label>
                <select
                  value={resizePreset}
                  onChange={(e) => setResizePreset(e.target.value as StandardPageSize)}
                  className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <option value="a4">A4 (210 × 297 mm / 595 × 842 pt)</option>
                  <option value="letter">US Letter (8.5 × 11 in / 612 × 792 pt)</option>
                  <option value="legal">US Legal (8.5 × 14 in / 612 × 1008 pt)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={scaleContent}
                  onChange={(e) => setScaleContent(e.target.checked)}
                  className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="font-medium text-stone-700">Scale page contents to fit new dimensions</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setShowResizeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyResize}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              >
                Standardize Dimensions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
