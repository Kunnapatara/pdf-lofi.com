/**
 * Split Every N Pages Operation for PDF-LoFi.
 * Divides a PDF document into evenly sized page groups with automatic output naming.
 * Supports restricting the operation to a specific page range while preserving original vector contents.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { parsePageRange } from './rangeParser';

export interface SplitEveryNOptions {
  pagesPerSplit: number; // N, must be >= 1
  pageRange?: string; // Optional range e.g. "1-20" or "all"
  outputPrefix?: string; // Output filename prefix
}

export interface SplitPart {
  partIndex: number; // 1-indexed: 1, 2, 3...
  name: string;
  data: Uint8Array;
  pageCount: number;
  startPage: number; // 1-indexed original page
  endPage: number; // 1-indexed original page
}

export interface SplitEveryNResult {
  splits: SplitPart[];
  totalParts: number;
  totalOriginalPages: number;
}

/**
 * Splits a PDF document into sequential groups of N pages.
 */
export async function executeSplitEveryNPdf(
  data: Uint8Array,
  options: SplitEveryNOptions
): Promise<SplitEveryNResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Split Every N processing.');
  }

  const n = Math.floor(options.pagesPerSplit);
  if (isNaN(n) || n < 1) {
    throw new Error('Pages per split must be a positive integer of at least 1.');
  }

  const srcDoc = await loadPdfLibDoc(data);
  const srcPageCount = srcDoc.getPageCount();

  if (srcPageCount === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  // Determine target pages (all or specific range)
  let targetIndices: number[];
  if (options.pageRange && options.pageRange.trim() !== '' && options.pageRange.trim().toLowerCase() !== 'all') {
    const parsed = parsePageRange(options.pageRange, srcPageCount);
    if (!parsed.valid || parsed.pageIndices.length === 0) {
      throw new Error(parsed.error || 'Invalid page range specified for Split Every N.');
    }
    targetIndices = parsed.pageIndices;
  } else {
    targetIndices = Array.from({ length: srcPageCount }, (_, i) => i);
  }

  // Chunk indices into groups of size N
  const chunks: number[][] = [];
  for (let i = 0; i < targetIndices.length; i += n) {
    chunks.push(targetIndices.slice(i, i + n));
  }

  const prefix = (options.outputPrefix || 'document').replace(/\.pdf$/i, '');
  const paddingLength = Math.max(2, String(chunks.length).length);

  const splits: SplitPart[] = [];

  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunk = chunks[cIdx];
    const partNum = cIdx + 1;
    const startPage = chunk[0] + 1;
    const endPage = chunk[chunk.length - 1] + 1;

    const outDoc = await createEmptyPdfDoc();
    const copiedPages = await outDoc.copyPages(srcDoc, chunk);
    copiedPages.forEach((p) => outDoc.addPage(p));

    const savedBytes = await savePdfLibDoc(outDoc);
    const paddedPartNum = String(partNum).padStart(paddingLength, '0');
    const rangeLabel = startPage === endPage ? `p${startPage}` : `p${startPage}-${endPage}`;
    const name = `${prefix}_part_${paddedPartNum}_${rangeLabel}.pdf`;

    splits.push({
      partIndex: partNum,
      name,
      data: savedBytes,
      pageCount: outDoc.getPageCount(),
      startPage,
      endPage,
    });
  }

  return {
    splits,
    totalParts: splits.length,
    totalOriginalPages: srcPageCount,
  };
}
