/**
 * Page Labels Operation for PDF-LoFi.
 * Manages semantic PDF /PageLabels structure in the document catalog number tree.
 * Compliant with ISO 32000-1 Section 12.4.2 (Page Labels).
 * 
 * Truthful boundary:
 * Adds semantic PDF page labels used by compatible PDF viewers for logical page
 * navigation and display. Does not draw visual text or alter rendered page streams.
 */
import { PDFName, PDFNumber, PDFHexString } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export type PageLabelStyle =
  | 'decimal'
  | 'roman-lower'
  | 'roman-upper'
  | 'alpha-lower'
  | 'alpha-upper'
  | 'none';

export interface PageLabelRange {
  startPageIndex: number; // 0-indexed page in document
  style?: PageLabelStyle; // 'decimal' (1, 2, 3), 'roman-lower' (i, ii), etc. Default 'decimal'
  prefix?: string; // Optional label prefix (e.g. "A-", "Appendix-")
  startNumber?: number; // Numbering value for first page in range. Default 1
}

export interface PageLabelsOptions {
  ranges: PageLabelRange[];
}

export interface PageLabelsResult extends OperationResult {
  appliedRangesCount: number;
}

/**
 * Converts integer to Roman numeral string.
 */
export function toRoman(num: number, upper = true): string {
  if (num <= 0) return String(num);
  const lookup: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let roman = '';
  let n = num;
  for (const [val, str] of lookup) {
    while (n >= val) {
      roman += str;
      n -= val;
    }
  }
  return upper ? roman : roman.toLowerCase();
}

/**
 * Converts integer to alphabetic label according to PDF spec (1=A, 26=Z, 27=AA, 28=BB...).
 */
export function toAlpha(num: number, upper = true): string {
  if (num <= 0) return String(num);
  const baseCode = upper ? 65 : 97;
  const charCode = baseCode + ((num - 1) % 26);
  const repeatCount = Math.floor((num - 1) / 26) + 1;
  return String.fromCharCode(charCode).repeat(repeatCount);
}

/**
 * Calculates deterministic label string for a given page index according to defined ranges.
 */
export function getLabelForPageIndex(pageIndex: number, sortedRanges: PageLabelRange[]): string {
  // Find applicable range (latest range where startPageIndex <= pageIndex)
  let activeRange: PageLabelRange = { startPageIndex: 0, style: 'decimal', startNumber: 1 };
  for (const r of sortedRanges) {
    if (r.startPageIndex <= pageIndex) {
      activeRange = r;
    } else {
      break;
    }
  }

  const offset = pageIndex - activeRange.startPageIndex;
  const numVal = (activeRange.startNumber !== undefined ? activeRange.startNumber : 1) + offset;
  const prefix = activeRange.prefix || '';

  const style = activeRange.style || 'decimal';
  let numStr = '';
  switch (style) {
    case 'decimal':
      numStr = String(numVal);
      break;
    case 'roman-lower':
      numStr = toRoman(numVal, false);
      break;
    case 'roman-upper':
      numStr = toRoman(numVal, true);
      break;
    case 'alpha-lower':
      numStr = toAlpha(numVal, false);
      break;
    case 'alpha-upper':
      numStr = toAlpha(numVal, true);
      break;
    case 'none':
      numStr = '';
      break;
  }

  return `${prefix}${numStr}`;
}

/**
 * Generates an array of logical label strings for previewing before committing.
 */
export function generatePageLabelsPreview(
  ranges: PageLabelRange[],
  totalPages: number
): string[] {
  if (totalPages <= 0) return [];
  const sorted = [...ranges].sort((a, b) => a.startPageIndex - b.startPageIndex);
  const preview: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    preview.push(getLabelForPageIndex(i, sorted));
  }
  return preview;
}

/**
 * Serializes semantic Page Labels into the PDF document catalog /PageLabels number tree.
 */
export async function executeSetPageLabels(
  data: Uint8Array,
  options: PageLabelsOptions
): Promise<PageLabelsResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Page Labels processing.');
  }

  if (!options.ranges || options.ranges.length === 0) {
    throw new Error('At least one Page Label range must be provided.');
  }

  const doc = await loadPdfLibDoc(data);
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  // Deduplicate and sort ranges by startPageIndex
  const rangeMap = new Map<number, PageLabelRange>();
  for (const r of options.ranges) {
    if (r.startPageIndex < 0 || r.startPageIndex >= totalPages) {
      throw new Error(
        `Start page index ${r.startPageIndex + 1} is out of bounds (document has ${totalPages} pages).`
      );
    }
    rangeMap.set(r.startPageIndex, r);
  }

  // Ensure there is a rule for page index 0 if not provided
  if (!rangeMap.has(0)) {
    rangeMap.set(0, { startPageIndex: 0, style: 'decimal', startNumber: 1 });
  }

  const sortedRanges = Array.from(rangeMap.values()).sort(
    (a, b) => a.startPageIndex - b.startPageIndex
  );

  const ctx = doc.context;
  const numsArray = ctx.obj([]);

  for (const range of sortedRanges) {
    const labelDict = ctx.obj({});
    labelDict.set(PDFName.of('Type'), PDFName.of('PageLabel'));

    const style = range.style || 'decimal';
    switch (style) {
      case 'decimal':
        labelDict.set(PDFName.of('S'), PDFName.of('D'));
        break;
      case 'roman-lower':
        labelDict.set(PDFName.of('S'), PDFName.of('r'));
        break;
      case 'roman-upper':
        labelDict.set(PDFName.of('S'), PDFName.of('R'));
        break;
      case 'alpha-lower':
        labelDict.set(PDFName.of('S'), PDFName.of('a'));
        break;
      case 'alpha-upper':
        labelDict.set(PDFName.of('S'), PDFName.of('A'));
        break;
      case 'none':
        // No /S entry
        break;
    }

    if (range.prefix && range.prefix.length > 0) {
      labelDict.set(PDFName.of('P'), PDFHexString.fromText(range.prefix));
    }

    if (range.startNumber !== undefined && range.startNumber !== 1) {
      const startNum = Math.max(1, Math.floor(range.startNumber));
      labelDict.set(PDFName.of('St'), PDFNumber.of(startNum));
    }

    numsArray.push(PDFNumber.of(range.startPageIndex));
    numsArray.push(labelDict);
  }

  const pageLabelsDict = ctx.obj({
    Nums: numsArray,
  });

  doc.catalog.set(PDFName.of('PageLabels'), pageLabelsDict);

  const savedBytes = await savePdfLibDoc(doc);
  return {
    data: savedBytes,
    pageCount: totalPages,
    appliedRangesCount: sortedRanges.length,
  };
}

/**
 * Removes the /PageLabels dictionary from the document catalog.
 */
export async function executeRemovePageLabels(data: Uint8Array): Promise<OperationResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required.');
  }
  const doc = await loadPdfLibDoc(data);
  doc.catalog.delete(PDFName.of('PageLabels'));
  const savedBytes = await savePdfLibDoc(doc);
  return {
    data: savedBytes,
    pageCount: doc.getPageCount(),
  };
}
