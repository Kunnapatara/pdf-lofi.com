/**
 * Bates Numbering Operation for PDF-LoFi.
 * Overlays sequential Bates-style identifiers onto selected PDF pages.
 * 
 * Truthful boundary:
 * Adds sequential Bates-style identifiers to selected PDF pages as a document-numbering utility.
 * Does not provide tamper-proofing, cryptographic signing, or legal chain-of-custody certification.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export type BatesPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface BatesNumberOptions {
  prefix?: string; // e.g. "CASE-" or "DOC-"
  startNumber?: number; // e.g. 1
  padding?: number; // e.g. 6 -> "000001"
  suffix?: string; // optional suffix e.g. "-CONF"
  position?: BatesPosition; // header/footer position
  fontSize?: number; // default 10
  fontFamily?: 'Helvetica' | 'Courier'; // default 'Courier'
  margin?: number; // distance in pt from page edge (default 36)
  selectedPages?: number[]; // 0-indexed; if omitted, all pages
}

export interface BatesNumberResult extends OperationResult {
  numberedPagesCount: number;
  firstBatesLabel: string;
  lastBatesLabel: string;
}

/**
 * Formats a Bates number string given numeric value, prefix, padding, and suffix.
 */
export function formatBatesNumber(
  num: number,
  prefix = '',
  padding = 6,
  suffix = ''
): string {
  const safePadding = Math.min(12, Math.max(1, Math.floor(padding)));
  const padded = String(num).padStart(safePadding, '0');
  return `${prefix}${padded}${suffix}`;
}

/**
 * Overlays Bates identifiers on target pages.
 */
export async function executeAddBatesNumbering(
  data: Uint8Array,
  options: BatesNumberOptions = {}
): Promise<BatesNumberResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Bates numbering.');
  }

  const {
    prefix = '',
    startNumber = 1,
    padding = 6,
    suffix = '',
    position = 'bottom-right',
    fontSize = 10,
    fontFamily = 'Courier',
    margin = 36,
    selectedPages,
  } = options;

  if (startNumber < 0) {
    throw new Error('Starting number cannot be negative.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  const font = await pdfDoc.embedFont(
    fontFamily === 'Courier' ? StandardFonts.Courier : StandardFonts.Helvetica
  );

  const targetSet = selectedPages && selectedPages.length > 0 ? new Set(selectedPages) : null;

  let numberedCount = 0;
  let firstLabel = '';
  let lastLabel = '';

  for (let i = 0; i < total; i++) {
    if (targetSet && !targetSet.has(i)) {
      continue;
    }

    const currentNum = startNumber + numberedCount;
    const text = formatBatesNumber(currentNum, prefix, padding, suffix);

    if (numberedCount === 0) {
      firstLabel = text;
    }
    lastLabel = text;
    numberedCount++;

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x = margin;
    let y = margin;

    switch (position) {
      case 'top-left':
        x = margin;
        y = height - margin - textHeight;
        break;
      case 'top-center':
        x = Math.max(margin, (width - textWidth) / 2);
        y = height - margin - textHeight;
        break;
      case 'top-right':
        x = Math.max(margin, width - margin - textWidth);
        y = height - margin - textHeight;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'bottom-center':
        x = Math.max(margin, (width - textWidth) / 2);
        y = margin;
        break;
      case 'bottom-right':
        x = Math.max(margin, width - margin - textWidth);
        y = margin;
        break;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: total,
    numberedPagesCount: numberedCount,
    firstBatesLabel: firstLabel,
    lastBatesLabel: lastLabel,
  };
}
