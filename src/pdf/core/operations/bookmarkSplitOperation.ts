/**
 * Split by Bookmark / Outline Operation for PDF-LoFi.
 * Inspects PDF outline bookmarks using PDF.js and splits document boundaries cleanly
 * using existing pdf-lib batch extraction primitives without rasterization.
 * 
 * Truthful boundary:
 * Splits a PDF into separate files based on its bookmarks and outline structure.
 * Local browser processing only.
 */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';

export interface ResolvedBookmark {
  id: string;
  title: string;
  level: number;
  pageIndex: number | null; // 0-based
  unresolvedReason?: string;
}

export interface BookmarkSplitRange {
  id: string;
  title: string;
  startPageIndex: number; // 0-based inclusive
  endPageIndex: number; // 0-based inclusive
  startPage: number; // 1-based
  endPage: number; // 1-based
  pageCount: number;
  outputName: string;
}

export interface InspectBookmarksResult {
  hasBookmarks: boolean;
  totalBookmarks: number;
  resolvedCount: number;
  unresolvedCount: number;
  bookmarks: ResolvedBookmark[];
  suggestedRanges: BookmarkSplitRange[];
}

export interface SplitByBookmarkOptions {
  selectedRangeIds?: string[];
  splitLevel?: 'top-level' | 'all';
  includePreamble?: boolean;
  outputPrefix?: string;
}

export interface SplitBookmarkPart {
  title: string;
  name: string;
  data: Uint8Array;
  pageCount: number;
  startPage: number;
  endPage: number;
}

export interface SplitByBookmarkResult {
  splits: SplitBookmarkPart[];
  totalParts: number;
  totalOriginalPages: number;
}

/**
 * Sanitizes outline titles into safe, deterministic filesystem filenames.
 */
export function sanitizeFilename(title: string): string {
  const clean = title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean.slice(0, 60) || 'chapter';
}

/**
 * Traverses PDF.js outline tree and resolves page destinations.
 */
export async function inspectPdfBookmarks(
  data: Uint8Array,
  splitLevel: 'top-level' | 'all' = 'top-level'
): Promise<InspectBookmarksResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required to inspect bookmarks.');
  }

  const loadingTask = pdfjsLib.getDocument({ data: data.slice().buffer });
  const pdfjsDoc = await loadingTask.promise;
  const totalPages = pdfjsDoc.numPages;

  let rawOutline: any[] | null = null;
  try {
    rawOutline = await pdfjsDoc.getOutline();
  } catch (err) {
    console.warn('Could not read outline from PDF:', err);
  }

  if (!rawOutline || rawOutline.length === 0) {
    return {
      hasBookmarks: false,
      totalBookmarks: 0,
      resolvedCount: 0,
      unresolvedCount: 0,
      bookmarks: [],
      suggestedRanges: [],
    };
  }

  const bookmarks: ResolvedBookmark[] = [];
  let itemCounter = 0;

  async function traverse(items: any[], level: number) {
    for (const item of items) {
      itemCounter++;
      const id = `bm_${itemCounter}`;
      const title = (item.title || `Section ${itemCounter}`).trim();

      if (splitLevel === 'top-level' && level > 0) {
        continue;
      }

      let pageIndex: number | null = null;
      let reason: string | undefined;

      try {
        let dest = item.dest;
        if (typeof dest === 'string') {
          dest = await pdfjsDoc.getDestination(dest);
        }

        if (Array.isArray(dest) && dest.length > 0) {
          const pIdx = await pdfjsDoc.getPageIndex(dest[0]);
          if (typeof pIdx === 'number' && pIdx >= 0 && pIdx < totalPages) {
            pageIndex = pIdx;
          } else {
            reason = 'Destination points outside document page range';
          }
        } else {
          reason = 'Destination format not resolvable to page';
        }
      } catch (e: any) {
        reason = e?.message || 'Failed resolving destination';
      }

      bookmarks.push({
        id,
        title,
        level,
        pageIndex,
        unresolvedReason: reason,
      });

      if (item.items && item.items.length > 0 && splitLevel === 'all') {
        await traverse(item.items, level + 1);
      }
    }
  }

  await traverse(rawOutline, 0);

  const resolved = bookmarks.filter((b) => b.pageIndex !== null);
  const unresolved = bookmarks.filter((b) => b.pageIndex === null);

  // Group and sort by pageIndex
  // If multiple bookmarks point to the same page, keep the first one
  const uniquePageBookmarks: ResolvedBookmark[] = [];
  const seenPages = new Set<number>();

  // Sort ascending by pageIndex
  const sortedResolved = [...resolved].sort((a, b) => a.pageIndex! - b.pageIndex!);

  for (const b of sortedResolved) {
    if (!seenPages.has(b.pageIndex!)) {
      seenPages.add(b.pageIndex!);
      uniquePageBookmarks.push(b);
    }
  }

  // Construct suggested cut ranges
  const suggestedRanges: BookmarkSplitRange[] = [];
  let partNumber = 1;

  // Check if first bookmark starts after page 0 (e.g. Cover / Front Matter)
  if (uniquePageBookmarks.length > 0 && uniquePageBookmarks[0].pageIndex! > 0) {
    const endP = uniquePageBookmarks[0].pageIndex! - 1;
    suggestedRanges.push({
      id: 'preamble_part',
      title: 'Front Matter',
      startPageIndex: 0,
      endPageIndex: endP,
      startPage: 1,
      endPage: endP + 1,
      pageCount: endP + 1,
      outputName: `${String(partNumber).padStart(2, '0')}-Front-Matter.pdf`,
    });
    partNumber++;
  }

  for (let i = 0; i < uniquePageBookmarks.length; i++) {
    const bm = uniquePageBookmarks[i];
    const startP = bm.pageIndex!;
    const endP =
      i + 1 < uniquePageBookmarks.length
        ? uniquePageBookmarks[i + 1].pageIndex! - 1
        : totalPages - 1;

    if (startP <= endP) {
      suggestedRanges.push({
        id: bm.id,
        title: bm.title,
        startPageIndex: startP,
        endPageIndex: endP,
        startPage: startP + 1,
        endPage: endP + 1,
        pageCount: endP - startP + 1,
        outputName: `${String(partNumber).padStart(2, '0')}-${sanitizeFilename(bm.title)}.pdf`,
      });
      partNumber++;
    }
  }

  return {
    hasBookmarks: bookmarks.length > 0,
    totalBookmarks: bookmarks.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
    bookmarks,
    suggestedRanges,
  };
}

/**
 * Splits document according to resolved bookmarks.
 */
export async function executeSplitByBookmark(
  data: Uint8Array,
  options?: SplitByBookmarkOptions
): Promise<SplitByBookmarkResult> {
  const inspection = await inspectPdfBookmarks(data, options?.splitLevel || 'top-level');

  if (!inspection.hasBookmarks || inspection.suggestedRanges.length === 0) {
    throw new Error('No usable bookmarks were found in this PDF.');
  }

  const selectedIds = options?.selectedRangeIds ? new Set(options.selectedRangeIds) : null;
  const targetRanges = inspection.suggestedRanges.filter(
    (r) => !selectedIds || selectedIds.has(r.id)
  );

  if (targetRanges.length === 0) {
    throw new Error('No bookmark ranges selected for splitting.');
  }

  const srcDoc = await loadPdfLibDoc(data);
  const splits: SplitBookmarkPart[] = [];

  for (const range of targetRanges) {
    const pageIndices: number[] = [];
    for (let p = range.startPageIndex; p <= range.endPageIndex; p++) {
      pageIndices.push(p);
    }

    const outDoc = await createEmptyPdfDoc();
    const copiedPages = await outDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => outDoc.addPage(page));

    const savedBytes = await savePdfLibDoc(outDoc);
    splits.push({
      title: range.title,
      name: range.outputName,
      data: savedBytes,
      pageCount: outDoc.getPageCount(),
      startPage: range.startPage,
      endPage: range.endPage,
    });
  }

  return {
    splits,
    totalParts: splits.length,
    totalOriginalPages: srcDoc.getPageCount(),
  };
}
