/**
 * Stamp Operation for PDF-LoFi.
 * Overlays boxed stamps (APPROVED, DRAFT, CONFIDENTIAL, etc.) with customizable colors and metadata.
 */
import { rgb, StandardFonts, degrees } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export type PredefinedStampType = 'APPROVED' | 'DRAFT' | 'CONFIDENTIAL' | 'REVIEWED' | 'FINAL' | 'CUSTOM';

export interface StampOptions {
  type: PredefinedStampType;
  customText?: string;
  colorHex?: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  includeDate?: boolean;
  position?: 'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  pageIndices?: number[];
}

const STAMP_COLORS: Record<PredefinedStampType, string> = {
  APPROVED: '#16A34A', // Green
  DRAFT: '#D97706',    // Amber
  CONFIDENTIAL: '#DC2626', // Red
  REVIEWED: '#2563EB', // Blue
  FINAL: '#7C3AED',    // Purple
  CUSTOM: '#DC2626',
};

function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0.8 : r, isNaN(g) ? 0.1 : g, isNaN(b) ? 0.1 : b);
}

export async function executeAddStamp(
  data: Uint8Array,
  options: StampOptions
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const dateFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const text = (options.type === 'CUSTOM' ? options.customText || 'STAMP' : options.type).toUpperCase();
  const color = hexToRgb(options.colorHex || STAMP_COLORS[options.type] || '#DC2626');
  const fontSize = options.fontSize || 28;
  const opacity = options.opacity !== undefined ? options.opacity : 0.85;
  const rotationDegrees = options.rotation !== undefined ? options.rotation : -20;
  const includeDate = options.includeDate ?? true;
  const dateText = includeDate ? new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  const targetIndices =
    options.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices.filter((i) => i >= 0 && i < pages.length)
      : pages.map((_, i) => i);

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);
  const dateHeight = dateText ? dateFont.heightAtSize(10) : 0;
  const boxPaddingX = 14;
  const boxPaddingY = 8;
  const boxWidth = textWidth + boxPaddingX * 2;
  const boxHeight = textHeight + (dateText ? dateHeight + 8 : 0) + boxPaddingY * 2;

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    let posX = (pageWidth - boxWidth) / 2;
    let posY = (pageHeight - boxHeight) / 2;

    switch (options.position) {
      case 'top-left':
        posX = 40;
        posY = pageHeight - boxHeight - 40;
        break;
      case 'top-right':
        posX = pageWidth - boxWidth - 40;
        posY = pageHeight - boxHeight - 40;
        break;
      case 'bottom-left':
        posX = 40;
        posY = 40;
        break;
      case 'bottom-right':
        posX = pageWidth - boxWidth - 40;
        posY = 40;
        break;
      case 'center':
      default:
        posX = (pageWidth - boxWidth) / 2;
        posY = (pageHeight - boxHeight) / 2;
        break;
    }

    // Draw Stamp Border & Text
    page.pushOperators();

    // Draw Rectangle Border
    page.drawRectangle({
      x: posX,
      y: posY,
      width: boxWidth,
      height: boxHeight,
      borderColor: color,
      borderWidth: 2.5,
      opacity,
      rotate: degrees(rotationDegrees),
    });

    // Draw Primary Stamp Text
    page.drawText(text, {
      x: posX + boxPaddingX,
      y: posY + boxPaddingY + (dateText ? dateHeight + 4 : 0),
      size: fontSize,
      font,
      color,
      opacity,
      rotate: degrees(rotationDegrees),
    });

    // Draw Date if enabled
    if (dateText) {
      const dateWidth = dateFont.widthOfTextAtSize(dateText, 10);
      page.drawText(dateText, {
        x: posX + (boxWidth - dateWidth) / 2,
        y: posY + boxPaddingY,
        size: 10,
        font: dateFont,
        color,
        opacity,
        rotate: degrees(rotationDegrees),
      });
    }
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pages.length,
  };
}
