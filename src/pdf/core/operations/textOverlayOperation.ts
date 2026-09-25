/**
 * Free Text Overlay Operation for PDF-LoFi.
 * Draws custom text onto target pages at specified coordinates or presets.
 */

import { StandardFonts, rgb } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface TextOverlayOptions {
  text: string;
  targetPages: number[]; // 1-indexed
  position: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right' | 'custom';
  customX?: number; // points
  customY?: number; // points
  fontSize?: number;
  color?: { r: number; g: number; b: number };
  opacity?: number;
}

export async function applyTextOverlay(
  data: Uint8Array,
  options: TextOverlayOptions
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = options.fontSize || 14;
  const color = options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0.1, 0.1, 0.1);
  const opacity = options.opacity ?? 1.0;
  const margin = 36; // 0.5 in

  for (const pageNum of options.targetPages) {
    if (pageNum < 1 || pageNum > pages.length) continue;
    const page = pages[pageNum - 1];
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x = margin;
    let y = margin;

    switch (options.position) {
      case 'top-left':
        x = margin;
        y = height - margin - textHeight;
        break;
      case 'top-right':
        x = width - margin - textWidth;
        y = height - margin - textHeight;
        break;
      case 'center':
        x = (width - textWidth) / 2;
        y = (height - textHeight) / 2;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'bottom-right':
        x = width - margin - textWidth;
        y = margin;
        break;
      case 'custom':
        x = options.customX ?? margin;
        y = options.customY ?? margin;
        break;
    }

    page.drawText(options.text, {
      x,
      y,
      size: fontSize,
      font,
      color,
      opacity,
    });
  }

  const outputBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: outputBytes,
    pageCount: pages.length,
  };
}
