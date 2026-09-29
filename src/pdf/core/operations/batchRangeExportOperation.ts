/**
 * Page Range Batch Export Operation for PDF-LoFi.
 * Exports multiple user-defined page ranges/selections into separate PDF files in one operation.
 *
 * Truthful boundary:
 * - Operates entirely in the browser using pdf-lib copyPages.
 * - Reuses canonical parsePageRange for strict range validation.
 * - Zero server upload. Does not rasterize pages.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { parsePageRange } from './rangeParser';

export interface BatchRangeExportOptions {
  rangesInput: string; // e.g. "1-3, 7-9, 15, 20-25" or newline-separated
  outputPrefix?: string; // Optional custom filename prefix, defaults to 'document'
}

export interface BatchExportPart {
  partIndex: number; // 1-indexed: 1, 2, 3...
  rangeExpression: string; // e.g. "1-3", "7-9", "15"
  name: string; // e.g. "document-pages-1-3.pdf" or "document-page-15.pdf"
  data: Uint8Array;
  pageCount: number;
  pageNumbers: number[]; // 1-indexed page numbers
}

export interface BatchRangeExportResult {
  exports: BatchExportPart[];
  totalFiles: number;
  totalExportedPages: number;
  totalOriginalPages: number;
}

export interface ParsedRangeItem {
  rawToken: string;
  normalizedRange: string;
  pageIndices: number[]; // 0-indexed for pdf-lib
  pageNumbers: number[]; // 1-indexed for display
  pageCount: number;
}

export interface BatchRangeParseResult {
  valid: boolean;
  ranges: ParsedRangeItem[];
  totalFiles: number;
  totalExportedPages: number;
  error?: string;
}

/**
 * Splits input string by commas, newlines, or semicolons into individual range tokens.
 */
export function splitRangeTokens(input: string): string[] {
  return input
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parses and validates all range tokens against the total page count of the document.
 * Uses canonical parsePageRange from rangeParser.ts for each token.
 */
export function parseBatchRanges(input: string, totalPages: number): BatchRangeParseResult {
  if (totalPages <= 0) {
    return {
      valid: false,
      ranges: [],
      totalFiles: 0,
      totalExportedPages: 0,
      error: 'Document has no pages.',
    };
  }

  const tokens = splitRangeTokens(input);
  if (tokens.length === 0) {
    return {
      valid: false,
      ranges: [],
      totalFiles: 0,
      totalExportedPages: 0,
      error: 'Please enter at least one page range (e.g. 1-3, 7-9, 15).',
    };
  }

  const ranges: ParsedRangeItem[] = [];
  let totalExportedPages = 0;

  for (const token of tokens) {
    const parseRes = parsePageRange(token, totalPages);
    if (!parseRes.valid || parseRes.pageIndices.length === 0) {
      return {
        valid: false,
        ranges: [],
        totalFiles: 0,
        totalExportedPages: 0,
        error: parseRes.error || `Invalid page range: "${token}".`,
      };
    }

    // Normalized range label e.g. "1-3" or "15"
    let normalized = token.replace(/\s+/g, '');
    if (parseRes.pageNumbers.length === 1) {
      normalized = String(parseRes.pageNumbers[0]);
    } else if (
      parseRes.pageNumbers.length > 1 &&
      parseRes.pageNumbers[parseRes.pageNumbers.length - 1] - parseRes.pageNumbers[0] ===
        parseRes.pageNumbers.length - 1
    ) {
      // Contiguous range
      normalized = `${parseRes.pageNumbers[0]}-${parseRes.pageNumbers[parseRes.pageNumbers.length - 1]}`;
    }

    ranges.push({
      rawToken: token,
      normalizedRange: normalized,
      pageIndices: parseRes.pageIndices,
      pageNumbers: parseRes.pageNumbers,
      pageCount: parseRes.pageCount,
    });

    totalExportedPages += parseRes.pageCount;
  }

  return {
    valid: true,
    ranges,
    totalFiles: ranges.length,
    totalExportedPages,
  };
}

/**
 * Builds a deterministic, sanitized filename for an exported range part.
 * Form: <prefix>-page-<N>.pdf (for 1 page) or <prefix>-pages-<N-M>.pdf (for multiple pages)
 */
export function buildBatchExportFilename(
  prefix: string,
  rangeItem: ParsedRangeItem
): string {
  const cleanPrefix = (prefix || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim() || 'document';

  const sanitizedRange = rangeItem.normalizedRange.replace(/[/\\?%*:|"<>]/g, '_');
  const unit = rangeItem.pageCount === 1 ? 'page' : 'pages';
  return `${cleanPrefix}-${unit}-${sanitizedRange}.pdf`;
}

/**
 * Executes Page Range Batch Export.
 * Loads the source PDF once, extracts each specified page range into an independent PDFDocument,
 * and saves each output part.
 */
export async function executeBatchRangeExport(
  data: Uint8Array,
  options: BatchRangeExportOptions
): Promise<BatchRangeExportResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Page Range Batch Export.');
  }

  const srcDoc = await loadPdfLibDoc(data);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  const parseResult = parseBatchRanges(options.rangesInput, totalPages);
  if (!parseResult.valid || parseResult.ranges.length === 0) {
    throw new Error(parseResult.error || 'Invalid page ranges entered.');
  }

  const prefix = options.outputPrefix || 'document';
  const exports: BatchExportPart[] = [];

  for (let idx = 0; idx < parseResult.ranges.length; idx++) {
    const rangeItem = parseResult.ranges[idx];
    const partNum = idx + 1;

    // Create an independent output PDF document
    const outDoc = await createEmptyPdfDoc();
    const copiedPages = await outDoc.copyPages(srcDoc, rangeItem.pageIndices);
    copiedPages.forEach((p) => outDoc.addPage(p));

    const savedBytes = await savePdfLibDoc(outDoc);
    const filename = buildBatchExportFilename(prefix, rangeItem);

    exports.push({
      partIndex: partNum,
      rangeExpression: rangeItem.normalizedRange,
      name: filename,
      data: savedBytes,
      pageCount: outDoc.getPageCount(),
      pageNumbers: rangeItem.pageNumbers,
    });
  }

  return {
    exports,
    totalFiles: exports.length,
    totalExportedPages: parseResult.totalExportedPages,
    totalOriginalPages: totalPages,
  };
}
