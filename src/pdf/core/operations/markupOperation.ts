/**
 * Vector Markup Operation for PDF-LoFi.
 * Supports Highlight (translucent overlay), Underline, Box Outline, and Strike-through.
 */

import { rgb } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export type MarkupType = 'highlight' | 'underline' | 'box' | 'strike';

export interface MarkupOptions {
  type: MarkupType;
  targetPages: number[]; // 1-indexed
  rect: { x: number; y: number; width: number; height: number }; // points
  color?: { r: number; g: number; b: number };
  opacity?: number;
}

export async function applyMarkup(
  data: Uint8Array,
  options: MarkupOptions
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();

  const color = options.color
    ? rgb(options.color.r, options.color.g, options.color.b)
    : options.type === 'highlight'
    ? rgb(1.0, 0.9, 0.2) // Yellow
    : options.type === 'underline'
    ? rgb(0.1, 0.4, 0.9) // Blue
    : options.type === 'strike'
    ? rgb(0.85, 0.2, 0.2) // Red
    : rgb(0.2, 0.6, 0.2); // Green

  const opacity = options.opacity ?? (options.type === 'highlight' ? 0.35 : 0.85);

  for (const pageNum of options.targetPages) {
    if (pageNum < 1 || pageNum > pages.length) continue;
    const page = pages[pageNum - 1];

    if (options.type === 'highlight') {
      page.drawRectangle({
        x: options.rect.x,
        y: options.rect.y,
        width: options.rect.width,
        height: options.rect.height,
        color,
        opacity,
      });
    } else if (options.type === 'underline') {
      page.drawRectangle({
        x: options.rect.x,
        y: options.rect.y,
        width: options.rect.width,
        height: 2, // 2pt thickness bar
        color,
        opacity,
      });
    } else if (options.type === 'strike') {
      page.drawRectangle({
        x: options.rect.x,
        y: options.rect.y + options.rect.height / 2,
        width: options.rect.width,
        height: 1.5,
        color,
        opacity,
      });
    } else if (options.type === 'box') {
      page.drawRectangle({
        x: options.rect.x,
        y: options.rect.y,
        width: options.rect.width,
        height: options.rect.height,
        borderColor: color,
        borderWidth: 2,
        opacity,
      });
    }
  }

  const outputBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: outputBytes,
    pageCount: pages.length,
  };
}
