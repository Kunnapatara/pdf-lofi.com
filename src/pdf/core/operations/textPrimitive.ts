/**
 * Shared Text & Layout Primitives for PDF-LoFi.
 * Standardizes coordinates, font resolution, hex color parsing, and token expansion
 * across Page Numbers, Bates Numbering, Header & Footer, Date & Time Stamp, and future tools.
 */
import { PDFDocument, StandardFonts, PDFFont, rgb, RGB } from 'pdf-lib';

export type StandardTextPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type SupportedFontFamily = 'Helvetica' | 'HelveticaBold' | 'Courier' | 'CourierBold' | 'TimesRoman' | 'TimesRomanBold';

/**
 * Resolves standard fonts in pdf-lib safely.
 */
export async function resolveStandardFont(
  pdfDoc: PDFDocument,
  family: SupportedFontFamily = 'Helvetica'
): Promise<PDFFont> {
  switch (family) {
    case 'HelveticaBold':
      return pdfDoc.embedFont(StandardFonts.HelveticaBold);
    case 'Courier':
      return pdfDoc.embedFont(StandardFonts.Courier);
    case 'CourierBold':
      return pdfDoc.embedFont(StandardFonts.CourierBold);
    case 'TimesRoman':
      return pdfDoc.embedFont(StandardFonts.TimesRoman);
    case 'TimesRomanBold':
      return pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    case 'Helvetica':
    default:
      return pdfDoc.embedFont(StandardFonts.Helvetica);
  }
}

/**
 * Parses hex color string (e.g. #1E293B, #000, 333333) into pdf-lib RGB color.
 */
export function parseHexColor(hex: string, defaultColor: RGB = rgb(0.1, 0.1, 0.1)): RGB {
  if (!hex) return defaultColor;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return defaultColor;
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return defaultColor;
  }
  return rgb(r, g, b);
}

/**
 * Calculates (x, y) coordinates for text placement within bounding page dimensions.
 */
export function calculateTextCoordinates(
  position: StandardTextPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
  marginX: number,
  marginY: number = marginX
): { x: number; y: number } {
  let x = marginX;
  let y = marginY;

  switch (position) {
    case 'top-left':
      x = marginX;
      y = pageHeight - marginY - textHeight;
      break;
    case 'top-center':
      x = Math.max(marginX, (pageWidth - textWidth) / 2);
      y = pageHeight - marginY - textHeight;
      break;
    case 'top-right':
      x = Math.max(marginX, pageWidth - marginX - textWidth);
      y = pageHeight - marginY - textHeight;
      break;
    case 'bottom-left':
      x = marginX;
      y = marginY;
      break;
    case 'bottom-center':
      x = Math.max(marginX, (pageWidth - textWidth) / 2);
      y = marginY;
      break;
    case 'bottom-right':
      x = Math.max(marginX, pageWidth - marginX - textWidth);
      y = marginY;
      break;
  }

  return { x, y };
}

export interface DynamicTokenContext {
  page: number; // 1-based current page
  total: number; // total document pages
  date?: string; // formatted date string
}

/**
 * Replaces dynamic tokens {page}, {total}, {date} deterministically.
 */
export function expandDynamicTokens(text: string, context: DynamicTokenContext): string {
  if (!text) return '';
  return text
    .replace(/\{page\}/gi, String(context.page))
    .replace(/\{total\}/gi, String(context.total))
    .replace(/\{date\}/gi, context.date || '');
}
