/**
 * Page Numbers Operation for PDF-LoFi.
 * In-browser sequential header/footer page numbering using pdf-lib.
 * License: MIT
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { OperationResult } from './rotateOperation';

export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PageNumberOptions {
  startNumber?: number;
  prefix?: string;
  suffix?: string;
  position?: PageNumberPosition;
  fontSize?: number;
  margin?: number;
  selectedPages?: number[]; // 0-indexed; if omitted or empty, applies to all pages
}

export async function executeAddPageNumbers(
  data: Uint8Array,
  options: PageNumberOptions = {}
): Promise<OperationResult> {
  const {
    startNumber = 1,
    prefix = '',
    suffix = '',
    position = 'bottom-center',
    fontSize = 10,
    margin = 36,
    selectedPages,
  } = options;

  const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const total = pdfDoc.getPageCount();

  const targetSet = selectedPages && selectedPages.length > 0 ? new Set(selectedPages) : null;

  for (let i = 0; i < total; i++) {
    if (targetSet && !targetSet.has(i)) {
      continue;
    }

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    const currentNum = startNumber + i;
    // Replace {total} placeholder if present
    const formattedSuffix = suffix.replace(/\{total\}/gi, String(total + startNumber - 1));
    const text = `${prefix}${currentNum}${formattedSuffix}`;

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
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  const savedBytes = await pdfDoc.save();
  return {
    data: savedBytes,
    pageCount: total,
  };
}
