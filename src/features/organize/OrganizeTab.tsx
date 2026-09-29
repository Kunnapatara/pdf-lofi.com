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
  Layers,
  Upload,
  BookOpen,
  CheckCircle2,
  Bookmark,
  Hash,
} from 'lucide-react';
import { LocalDocument, DocumentPageInfo } from '../../types/pdf';
import { generatePageThumbnail } from '../../pdf/rendering/thumbnailService';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';
import { CropMargins } from '../../pdf/core/operations/cropOperation';
import { StandardPageSize } from '../../pdf/core/operations/resizeOperation';
import { NUpLayout } from '../../pdf/core/operations/nUpOperation';
import { SplitPart } from '../../pdf/core/operations/splitEveryNOperation';
import {
  PageLabelRange,
  PageLabelStyle,
  generatePageLabelsPreview,
} from '../../pdf/core/operations/pageLabelsOperation';
import {
  InspectBookmarksResult,
  SplitBookmarkPart,
} from '../../pdf/core/operations/bookmarkSplitOperation';

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

  // Modals for N-Up, Booklet, Assembly & Split Every N
  const [showNUpModal, setShowNUpModal] = useState(false);
  const [nUpLayout, setNUpLayout] = useState<NUpLayout>('2-up');
  const [nUpPaper, setNUpPaper] = useState<'A4' | 'Letter'>('A4');
  const [nUpOrientation, setNUpOrientation] = useState<'auto' | 'landscape' | 'portrait'>('auto');
  const [nUpMargin, setNUpMargin] = useState<number>(18);
  const [nUpSpacing, setNUpSpacing] = useState<number>(12);
  const [nUpPageOrder, setNUpPageOrder] = useState<'horizontal' | 'vertical'>('horizontal');

  const [showBookletModal, setShowBookletModal] = useState(false);
  const [bookletPaper, setBookletPaper] = useState<'A4' | 'Letter'>('A4');
  const [bookletSigSize, setBookletSigSize] = useState<'all' | 4 | 8 | 16>('all');
  const [bookletBinding, setBookletBinding] = useState<'left' | 'right'>('left');

  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [assemblyMode, setAssemblyMode] = useState<'collate' | 'uncollate' | 'alternate'>('collate');
  const [assemblyCopies, setAssemblyCopies] = useState<number>(2);
  const [assemblyDocB, setAssemblyDocB] = useState<{ name: string; data: Uint8Array; pageCount: number } | null>(null);
  const [assemblyReverseB, setAssemblyReverseB] = useState(false);

  const [showSplitEveryNModal, setShowSplitEveryNModal] = useState(false);
  const [splitEveryN, setSplitEveryN] = useState<number>(2);
  const [splitRange, setSplitRange] = useState<string>('');
  const [splitPrefix, setSplitPrefix] = useState<string>('');
  const [splitResults, setSplitResults] = useState<SplitPart[] | null>(null);

  // Modals for Page Labels & Split by Bookmark (Sprint 18)
  const [showPageLabelsModal, setShowPageLabelsModal] = useState(false);
  const [labelRanges, setLabelRanges] = useState<PageLabelRange[]>([
    { startPageIndex: 0, style: 'decimal', prefix: '', startNumber: 1 },
  ]);

  const [showBookmarkSplitModal, setShowBookmarkSplitModal] = useState(false);
  const [bookmarkInspection, setBookmarkInspection] = useState<InspectBookmarksResult | null>(null);
  const [isInspectingBookmarks, setIsInspectingBookmarks] = useState(false);
  const [selectedBookmarkRanges, setSelectedBookmarkRanges] = useState<string[]>([]);
  const [bookmarkSplitLevel, setBookmarkSplitLevel] = useState<'top-level' | 'all'>('top-level');
  const [bookmarkSplits, setBookmarkSplits] = useState<SplitBookmarkPart[] | null>(null);

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

  // Apply N-Up (2-up, 4-up, 6-up, or 8-up)
  const handleApplyNUp = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Generating ${nUpLayout} imposition on ${nUpPaper} sheet...`);
    setErrorMsg(null);
    setShowNUpModal(false);

    try {
      const updated = await documentService.nUpDocument(document, {
        layout: nUpLayout,
        paperSize: nUpPaper,
        orientation: nUpOrientation,
        margin: nUpMargin,
        spacing: nUpSpacing,
        pageOrder: nUpPageOrder,
      });
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, `N-Up (${nUpLayout})`);
        setSuccessNotice(`Successfully composited document into ${nUpLayout} layout (${updated.pageCount} sheets).`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'N-Up imposition failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Booklet Imposition
  const handleApplyBooklet = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Generating print-ready booklet imposition on ${bookletPaper}...`);
    setErrorMsg(null);
    setShowBookletModal(false);

    try {
      const { document: updated, result } = await documentService.bookletDocument(document, {
        paperSize: bookletPaper,
        signatureSize: bookletSigSize,
        bindingEdge: bookletBinding,
      });
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Booklet PDF');
        setSuccessNotice(
          `Successfully created booklet! ${result.sheetsCount} duplex sheets (${result.paddedPageCount} padded pages, ${result.signaturesCount} signature(s)).`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Booklet imposition failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Select Document B for Page Assembly (Alternate Mix)
  const handleAssemblyDocBSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const { loadPdfLibDoc } = await import('../../pdf/engines/pdfLibEngine');
      const loaded = await loadPdfLibDoc(uint8);
      setAssemblyDocB({
        name: file.name,
        data: uint8,
        pageCount: loaded.getPageCount(),
      });
    } catch (err) {
      setErrorMsg(`Could not read Document B: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Apply Page Assembly (Collate / Uncollate / Alternate Mix)
  const handleApplyAssembly = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setShowAssemblyModal(false);

    try {
      if (assemblyMode === 'alternate') {
        if (!assemblyDocB) {
          throw new Error('Please select a second document for Alternate Mix.');
        }
        setProcessingMsg('Interleaving Document A and Document B...');
        const result = await documentService.interleaveDocuments(
          document.data,
          assemblyDocB.data,
          { reverseB: assemblyReverseB }
        );
        await onUpdateDocumentData(result.data, result.pageCount, 'Page Assembly: Alternate Mix');
        setSuccessNotice(`Successfully assembled ${document.name} with ${assemblyDocB.name} (${result.pageCount} total pages).`);
        setAssemblyDocB(null);
      } else {
        const opName = assemblyMode === 'collate' ? 'Collate Sets' : 'Uncollate Sets';
        setProcessingMsg(`${opName}...`);
        const updated = await documentService.collateDocument(document, {
          mode: assemblyMode,
          copies: assemblyCopies,
        });
        if (updated.data) {
          await onUpdateDocumentData(updated.data, updated.pageCount, `Page Assembly: ${opName}`);
          setSuccessNotice(`Successfully reordered document using ${opName} (${assemblyCopies} sets).`);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Page assembly failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Split Every N Pages
  const handleApplySplitEveryN = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg(`Splitting document every ${splitEveryN} pages...`);
    setErrorMsg(null);

    try {
      const result = await documentService.splitEveryN(document, {
        pagesPerSplit: splitEveryN,
        pageRange: splitRange,
        outputPrefix: splitPrefix || document.name.replace(/\.pdf$/i, ''),
      });
      setSplitResults(result.splits);
      setSuccessNotice(`Successfully split document into ${result.totalParts} files!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Split Every N failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Page Labels
  const handleApplyPageLabels = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Applying semantic page labels...');
    setErrorMsg(null);

    try {
      const updated = await documentService.setPageLabels(document, labelRanges);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Set Page Labels');
        setSuccessNotice(`Page labels applied across ${updated.pageCount} pages!`);
        setShowPageLabelsModal(false);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply page labels');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePageLabels = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Removing semantic page labels...');
    setErrorMsg(null);

    try {
      const updated = await documentService.removePageLabels(document);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Remove Page Labels');
        setSuccessNotice('Page labels removed from document catalog.');
        setShowPageLabelsModal(false);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove page labels');
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect & Split by Bookmark
  const handleInspectBookmarks = async (level: 'top-level' | 'all' = bookmarkSplitLevel) => {
    if (!document.data) return;
    setIsInspectingBookmarks(true);
    setErrorMsg(null);
    try {
      const res = await documentService.inspectBookmarks(document, level);
      setBookmarkInspection(res);
      setSelectedBookmarkRanges(res.suggestedRanges.map((r) => r.id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to read bookmarks');
    } finally {
      setIsInspectingBookmarks(false);
    }
  };

  const handleOpenBookmarkSplitModal = () => {
    setBookmarkSplits(null);
    setShowBookmarkSplitModal(true);
    handleInspectBookmarks(bookmarkSplitLevel);
  };

  const handleApplySplitByBookmark = async () => {
    if (!document.data) return;
    if (selectedBookmarkRanges.length === 0) {
      setErrorMsg('Please select at least one bookmark section to split.');
      return;
    }
    setIsProcessing(true);
    setProcessingMsg('Splitting document by bookmarks...');
    setErrorMsg(null);

    try {
      const res = await documentService.splitByBookmark(document, {
        selectedRangeIds: selectedBookmarkRanges,
        splitLevel: bookmarkSplitLevel,
      });
      setBookmarkSplits(res.splits);
      setSuccessNotice(`Successfully split document into ${res.totalParts} bookmark chapters!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Split by Bookmark failed');
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

            <button
              onClick={() => setShowNUpModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Composite multiple pages onto one sheet (2, 4, 6, or 8-up)"
            >
              <Layers className="w-3.5 h-3.5 text-stone-600" />
              <span>N-Up</span>
            </button>

            <button
              onClick={() => setShowBookletModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Impose pages for folded booklet printing"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              <span>Booklet</span>
            </button>

            <button
              onClick={() => setShowAssemblyModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Collate, uncollate, or interleave documents"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-600" />
              <span>Assembly</span>
            </button>

            <button
              onClick={() => {
                setSplitResults(null);
                setShowSplitEveryNModal(true);
              }}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Split document into equal chunks of N pages"
            >
              <Scissors className="w-3.5 h-3.5 text-stone-600" />
              <span>Split Every N</span>
            </button>

            <button
              onClick={() => setShowPageLabelsModal(true)}
              disabled={isProcessing}
              id="btn-page-labels"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Configure semantic page labels and numbering scheme"
            >
              <Hash className="w-3.5 h-3.5 text-stone-600" />
              <span>Page Labels</span>
            </button>

            <button
              onClick={handleOpenBookmarkSplitModal}
              disabled={isProcessing}
              id="btn-split-by-bookmark"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
              title="Split document into separate files by bookmark and outline"
            >
              <Bookmark className="w-3.5 h-3.5 text-stone-600" />
              <span>Split by Bookmark</span>
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

      {/* N-Up Imposition Modal (2-Up, 4-Up, 6-Up, 8-Up) */}
      {showNUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">N-Up PDF Imposition</h3>
              </div>
              <button onClick={() => setShowNUpModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Arrange multiple source pages onto each output sheet with professional imposition controls while preserving vector content.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700">Imposition Grid Layout</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {(['2-up', '4-up', '6-up', '8-up'] as NUpLayout[]).map((lay) => (
                    <button
                      key={lay}
                      type="button"
                      onClick={() => setNUpLayout(lay)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        nUpLayout === lay
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {lay.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700">Paper Format</label>
                  <select
                    value={nUpPaper}
                    onChange={(e) => setNUpPaper(e.target.value as 'A4' | 'Letter')}
                    className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="Letter">US Letter (8.5 × 11 in)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700">Sheet Orientation</label>
                  <select
                    value={nUpOrientation}
                    onChange={(e) => setNUpOrientation(e.target.value as 'auto' | 'landscape' | 'portrait')}
                    className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="auto">Auto (Recommended)</option>
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700">Page Traversal Order</label>
                  <select
                    value={nUpPageOrder}
                    onChange={(e) => setNUpPageOrder(e.target.value as 'horizontal' | 'vertical')}
                    className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="horizontal">Horizontal (Left to Right)</option>
                    <option value="vertical">Vertical (Top to Bottom)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700">Margins & Spacing</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="72"
                      value={nUpMargin}
                      onChange={(e) => setNUpMargin(Math.max(0, parseInt(e.target.value) || 0))}
                      title="Margin (pt)"
                      className="w-1/2 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-center"
                    />
                    <span className="text-stone-400">/</span>
                    <input
                      type="number"
                      min="0"
                      max="72"
                      value={nUpSpacing}
                      onChange={(e) => setNUpSpacing(Math.max(0, parseInt(e.target.value) || 0))}
                      title="Spacing between pages (pt)"
                      className="w-1/2 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-[11px] text-stone-600">
                {document.pageCount} source pages will produce{' '}
                <strong>
                  {Math.ceil(
                    document.pageCount /
                      (nUpLayout === '2-up' ? 2 : nUpLayout === '4-up' ? 4 : nUpLayout === '6-up' ? 6 : 8)
                  )}{' '}
                  sheet(s)
                </strong>{' '}
                with {nUpLayout} layout.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setShowNUpModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyNUp}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              >
                Generate {nUpLayout}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booklet PDF Modal */}
      {showBookletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Booklet PDF Imposition</h3>
              </div>
              <button onClick={() => setShowBookletModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Arrange PDF pages into print-ready booklet signatures with automatic imposition, duplex layout, and blank-page padding.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700">Signature Size</label>
                  <select
                    value={bookletSigSize}
                    onChange={(e) =>
                      setBookletSigSize(e.target.value === 'all' ? 'all' : (parseInt(e.target.value) as 4 | 8 | 16))
                    }
                    className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="all">Single Signature (Saddle-Stitch All)</option>
                    <option value="4">4 Pages / Signature (1 Sheet)</option>
                    <option value="8">8 Pages / Signature (2 Sheets)</option>
                    <option value="16">16 Pages / Signature (4 Sheets)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700">Output Paper Format</label>
                  <select
                    value={bookletPaper}
                    onChange={(e) => setBookletPaper(e.target.value as 'A4' | 'Letter')}
                    className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="Letter">US Letter (8.5 × 11 in)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700">Binding Edge</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setBookletBinding('left')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      bookletBinding === 'left'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Left Edge (Standard LTR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookletBinding('right')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      bookletBinding === 'right'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Right Edge (RTL / Manga)
                  </button>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-[11px] text-stone-600 space-y-1">
                <div>
                  <strong>{document.pageCount} source pages</strong> will be padded with{' '}
                  <strong>{Math.ceil(document.pageCount / 4) * 4 - document.pageCount} blank page(s)</strong> to reach{' '}
                  <strong>{Math.ceil(document.pageCount / 4) * 4} total booklet pages</strong>.
                </div>
                <div className="text-stone-500">
                  Produces <strong>{Math.ceil(document.pageCount / 4)} duplex sheets</strong> (2 sides per sheet, 2 pages per side).
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setShowBookletModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBooklet}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              >
                Generate Booklet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Assembly Modal (Collate / Uncollate / Alternate Mix) */}
      {showAssemblyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Page Assembly</h3>
              </div>
              <button onClick={() => setShowAssemblyModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Reorder pages across source documents using collate, uncollate, and alternating assembly patterns.
            </p>

            <div className="flex rounded-xl bg-stone-100 p-1">
              {(['collate', 'uncollate', 'alternate'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAssemblyMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    assemblyMode === m ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {m === 'alternate' ? 'Alternate Mix' : `${m} Sets`}
                </button>
              ))}
            </div>

            {assemblyMode === 'alternate' ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-700">
                  <span className="font-bold">Document A:</span> {document.name} ({document.pageCount} pages)
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Select Document B</label>
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-stone-200 hover:border-orange-400 rounded-2xl cursor-pointer bg-stone-50/50 hover:bg-orange-50/20 transition-all">
                    <Upload className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-medium text-stone-600">
                      {assemblyDocB ? assemblyDocB.name : 'Choose Second PDF File...'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleAssemblyDocBSelect}
                      className="hidden"
                    />
                  </label>
                  {assemblyDocB && (
                    <p className="text-[11px] text-green-700 font-semibold mt-1">
                      ✓ Document B loaded: {assemblyDocB.pageCount} pages
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={assemblyReverseB}
                    onChange={(e) => setAssemblyReverseB(e.target.checked)}
                    className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="font-medium text-stone-700">
                    Reverse Document B (Duplex scanner back-sides)
                  </span>
                </label>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700">Number of Copied Sets</label>
                  <input
                    type="number"
                    min="2"
                    max={Math.max(2, document.pageCount)}
                    value={assemblyCopies}
                    onChange={(e) => setAssemblyCopies(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-[11px] text-stone-600">
                  {assemblyMode === 'collate' ? (
                    <span>
                      Reconstructs complete document sets from uncollated order (e.g. 1,1,2,2 → 1,2,1,2).
                      Each set will contain ~{Math.ceil(document.pageCount / assemblyCopies)} pages.
                    </span>
                  ) : (
                    <span>
                      Groups identical page positions together across {assemblyCopies} sets (e.g. 1,2,1,2 → 1,1,2,2).
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => {
                  setShowAssemblyModal(false);
                  setAssemblyDocB(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAssembly}
                disabled={isProcessing || (assemblyMode === 'alternate' && !assemblyDocB)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer disabled:opacity-50"
              >
                Apply Assembly
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Every N Pages Modal */}
      {showSplitEveryNModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Split Every N Pages</h3>
              </div>
              <button
                onClick={() => {
                  setShowSplitEveryNModal(false);
                  setSplitResults(null);
                }}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Split this PDF into evenly sized page groups with automatic output numbering and immediate download.
            </p>

            {!splitResults ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-stone-700">Pages per File (N)</label>
                    <input
                      type="number"
                      min="1"
                      max={document.pageCount}
                      value={splitEveryN}
                      onChange={(e) => setSplitEveryN(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-stone-700">Optional Page Range</label>
                    <input
                      type="text"
                      placeholder={`e.g. 1-${document.pageCount} or leave empty`}
                      value={splitRange}
                      onChange={(e) => setSplitRange(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-stone-700">Output Filename Prefix</label>
                  <input
                    type="text"
                    placeholder={document.name.replace(/\.pdf$/i, '')}
                    value={splitPrefix}
                    onChange={(e) => setSplitPrefix(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-[11px] text-stone-600">
                  Splitting {document.pageCount} pages into groups of {splitEveryN} will produce{' '}
                  <strong>{Math.ceil(document.pageCount / splitEveryN)} output file(s)</strong>.
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => setShowSplitEveryNModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplySplitEveryN}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                  >
                    Split Document
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">
                    Generated {splitResults.length} Files:
                  </span>
                  <button
                    onClick={() => {
                      splitResults.forEach((part) => {
                        triggerLocalDownload(part.data, part.name);
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All Parts</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {splitResults.map((part) => (
                    <div
                      key={part.partIndex}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-stone-900 truncate" title={part.name}>
                          {part.name}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Pages {part.startPage}–{part.endPage} ({part.pageCount} {part.pageCount === 1 ? 'page' : 'pages'})
                        </div>
                      </div>
                      <button
                        onClick={() => triggerLocalDownload(part.data, part.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 cursor-pointer shrink-0"
                      >
                        <Download className="w-3 h-3 text-stone-600" />
                        <span>Save</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => setSplitResults(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setShowSplitEveryNModal(false);
                      setSplitResults(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-900 text-white cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SPRINT 18 MODAL: PAGE LABELS */}
      {showPageLabelsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-xl p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Semantic Page Labels</h3>
                  <p className="text-xs text-stone-500">
                    Define PDF /PageLabels catalog numbering for logical navigation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPageLabelsModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Truth Boundary Callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Specification Notice: </span>
              Adds semantic PDF page labels used by compatible PDF viewers for logical page navigation and display. Does not draw visual text or alter rendered page streams.
            </div>

            {/* Ranges Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">Labeling Ranges</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextStart = Math.min(document.pageCount, (labelRanges[labelRanges.length - 1]?.startPageIndex || 0) + 2);
                    setLabelRanges([
                      ...labelRanges,
                      { startPageIndex: nextStart - 1, style: 'decimal', prefix: '', startNumber: 1 },
                    ]);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Range</span>
                </button>
              </div>

              <div className="space-y-3">
                {labelRanges.map((range, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700">
                        Section {idx + 1}
                      </span>
                      {labelRanges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLabelRanges(labelRanges.filter((_, i) => i !== idx))}
                          className="text-stone-400 hover:text-red-600 text-xs transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <label className="font-semibold text-stone-600 block mb-1">Start Page</label>
                        <input
                          type="number"
                          min={1}
                          max={document.pageCount}
                          value={range.startPageIndex + 1}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(document.pageCount, parseInt(e.target.value) || 1));
                            const updated = [...labelRanges];
                            updated[idx] = { ...updated[idx], startPageIndex: val - 1 };
                            setLabelRanges(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-stone-600 block mb-1">Style</label>
                        <select
                          value={range.style || 'decimal'}
                          onChange={(e) => {
                            const updated = [...labelRanges];
                            updated[idx] = { ...updated[idx], style: e.target.value as PageLabelStyle };
                            setLabelRanges(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white"
                        >
                          <option value="decimal">1, 2, 3 (Decimal)</option>
                          <option value="roman-lower">i, ii, iii (Roman Lower)</option>
                          <option value="roman-upper">I, II, III (Roman Upper)</option>
                          <option value="alpha-lower">a, b, c (Alpha Lower)</option>
                          <option value="alpha-upper">A, B, C (Alpha Upper)</option>
                          <option value="none">None (Prefix only)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-600 block mb-1">Prefix</label>
                        <input
                          type="text"
                          placeholder="e.g. A-, App-"
                          value={range.prefix || ''}
                          onChange={(e) => {
                            const updated = [...labelRanges];
                            updated[idx] = { ...updated[idx], prefix: e.target.value };
                            setLabelRanges(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-stone-600 block mb-1">Start No.</label>
                        <input
                          type="number"
                          min={1}
                          value={range.startNumber ?? 1}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            const updated = [...labelRanges];
                            updated[idx] = { ...updated[idx], startNumber: val };
                            setLabelRanges(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Preview (First 8 Pages)</label>
              <div className="p-3 bg-stone-100/80 rounded-2xl flex flex-wrap gap-2 text-xs font-mono">
                {generatePageLabelsPreview(labelRanges, Math.min(8, document.pageCount)).map((lbl, i) => (
                  <div key={i} className="px-2.5 py-1 bg-white rounded-lg border border-stone-200 shadow-2xs">
                    <span className="text-stone-400 mr-1.5">p.{i + 1} →</span>
                    <span className="font-bold text-stone-900">{lbl || '(blank)'}</span>
                  </div>
                ))}
                {document.pageCount > 8 && (
                  <div className="px-2.5 py-1 text-stone-400 self-center">
                    +{document.pageCount - 8} more
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleRemovePageLabels}
                disabled={isProcessing}
                className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
              >
                Clear Page Labels
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPageLabelsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPageLabels}
                  disabled={isProcessing}
                  id="btn-apply-page-labels"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Apply Page Labels
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPRINT 18 MODAL: SPLIT BY BOOKMARK */}
      {showBookmarkSplitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-xl p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Split by Bookmark</h3>
                  <p className="text-xs text-stone-500">
                    Extract document sections using existing outline bookmarks
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBookmarkSplitModal(false);
                  setBookmarkSplits(null);
                }}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Truth Boundary Callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Specification Notice: </span>
              Splits a PDF into separate files based on its bookmarks and outline structure. Local browser processing only.
            </div>

            {/* Inspecting state */}
            {isInspectingBookmarks && (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-stone-600">Scanning document outline bookmarks...</p>
              </div>
            )}

            {/* Not inspecting & No Bookmarks found */}
            {!isInspectingBookmarks && bookmarkInspection && !bookmarkInspection.hasBookmarks && (
              <div className="py-8 text-center space-y-3 bg-stone-50 rounded-2xl border border-stone-200 p-6">
                <div className="w-10 h-10 rounded-full bg-stone-200/70 flex items-center justify-center mx-auto text-stone-500">
                  <Bookmark className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-stone-800">No Bookmarks Found</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  This PDF does not contain digital bookmarks or an embedded outline. You can split by page intervals with <strong>Split Every N Pages</strong> or extract custom ranges using <strong>Split PDF</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBookmarkSplitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-200 text-stone-800 hover:bg-stone-300 transition-all cursor-pointer mt-2"
                >
                  Close
                </button>
              </div>
            )}

            {/* Bookmarks Found - Selection Mode */}
            {!isInspectingBookmarks && bookmarkInspection && bookmarkInspection.hasBookmarks && !bookmarkSplits && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-700">Outline Level:</span>
                    <select
                      value={bookmarkSplitLevel}
                      onChange={(e) => {
                        const lvl = e.target.value as 'top-level' | 'all';
                        setBookmarkSplitLevel(lvl);
                        handleInspectBookmarks(lvl);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white text-xs"
                    >
                      <option value="top-level">Top-Level Chapters Only</option>
                      <option value="all">All Outline Levels</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBookmarkRanges.length === bookmarkInspection.suggestedRanges.length) {
                        setSelectedBookmarkRanges([]);
                      } else {
                        setSelectedBookmarkRanges(bookmarkInspection.suggestedRanges.map((r) => r.id));
                      }
                    }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    {selectedBookmarkRanges.length === bookmarkInspection.suggestedRanges.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {bookmarkInspection.suggestedRanges.map((range) => {
                    const isSelected = selectedBookmarkRanges.includes(range.id);
                    return (
                      <div
                        key={range.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBookmarkRanges(selectedBookmarkRanges.filter((id) => id !== range.id));
                          } else {
                            setSelectedBookmarkRanges([...selectedBookmarkRanges, range.id]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-50/50 border-orange-300'
                            : 'bg-stone-50 border-stone-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                          <div className="truncate">
                            <span className="font-bold text-stone-900 block truncate">{range.title}</span>
                            <span className="text-[11px] text-stone-500">
                              Pages {range.startPage}–{range.endPage} ({range.pageCount} {range.pageCount === 1 ? 'page' : 'pages'})
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-stone-400 shrink-0 truncate max-w-[120px]">
                          {range.outputName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowBookmarkSplitModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplySplitByBookmark}
                    disabled={isProcessing || selectedBookmarkRanges.length === 0}
                    id="btn-apply-split-by-bookmark"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Split {selectedBookmarkRanges.length} {selectedBookmarkRanges.length === 1 ? 'Section' : 'Sections'}
                  </button>
                </div>
              </div>
            )}

            {/* Bookmarks Split Results */}
            {bookmarkSplits && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Generated {bookmarkSplits.length} Chapter Files</span>
                  </div>
                  <button
                    onClick={() => {
                      bookmarkSplits.forEach((p) => {
                        triggerLocalDownload(p.data, p.name);
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {bookmarkSplits.map((split, i) => (
                    <div
                      key={i}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-stone-900 truncate" title={split.name}>
                          {split.name}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {split.title} • Pages {split.startPage}–{split.endPage} ({split.pageCount} {split.pageCount === 1 ? 'page' : 'pages'})
                        </div>
                      </div>
                      <button
                        onClick={() => triggerLocalDownload(split.data, split.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 cursor-pointer shrink-0"
                      >
                        <Download className="w-3 h-3 text-stone-600" />
                        <span>Save</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => setBookmarkSplits(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setShowBookmarkSplitModal(false);
                      setBookmarkSplits(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-900 text-white cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
