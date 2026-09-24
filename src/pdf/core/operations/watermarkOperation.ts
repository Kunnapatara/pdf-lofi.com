/**
 * Text Watermark Operation for PDF-LoFi.
 * Overlays client-side text watermarks with custom opacity and rotation angle.
 * License: MIT
 */
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { OperationResult } from './rotateOperation';

export type WatermarkPosition = 'center' | 'top' | 'bottom' | 'diagonal';

export interface WatermarkOptions {
  text: string;
  opacity?: number; // 0.05 to 1.0, default 0.22
  rotationAngle?: number; // degrees, default 45
  fontSize?: number; // default 48
  position?: WatermarkPosition;
  color?: { r: number; g: number; b: number };
  selectedPages?: number[]; // 0-indexed; applies to all if omitted
}

export async function executeAddTextWatermark(
  data: Uint8Array,
  options: WatermarkOptions
): Promise<OperationResult> {
  const {
    text,
    opacity = 0.22,
    rotationAngle = 45,
    fontSize = 48,
    position = 'diagonal',
    color = { r: 0.35, g: 0.35, b: 0.35 },
    selectedPages,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error('Watermark text cannot be empty.');
  }

  const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const total = pdfDoc.getPageCount();

  const targetSet = selectedPages && selectedPages.length > 0 ? new Set(selectedPages) : null;
  const effectiveAngle = position === 'diagonal' ? (rotationAngle || 45) : rotationAngle;

  for (let i = 0; i < total; i++) {
    if (targetSet && !targetSet.has(i)) {
      continue;
    }

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Calculate optical center
    let targetCenterX = width / 2;
    let targetCenterY = height / 2;

    if (position === 'top') {
      targetCenterY = height * 0.8;
    } else if (position === 'bottom') {
      targetCenterY = height * 0.2;
    }

    // Mathematical rotation origin offset compensation
    const rad = (effectiveAngle * Math.PI) / 180;
    const deltaX = (textWidth / 2) * Math.cos(rad) - (textHeight / 2) * Math.sin(rad);
    const deltaY = (textWidth / 2) * Math.sin(rad) + (textHeight / 2) * Math.cos(rad);

    const x = targetCenterX - deltaX;
    const y = targetCenterY - deltaY;

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity: Math.max(0.01, Math.min(1.0, opacity)),
      rotate: degrees(effectiveAngle),
    });
  }

  const savedBytes = await pdfDoc.save();
  return {
    data: savedBytes,
    pageCount: total,
  };
}
