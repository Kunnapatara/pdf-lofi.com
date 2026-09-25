/**
 * Vector Redaction Operation for PDF-LoFi.
 * Draws opaque black vector boxes over sensitive regions and optionally
 * strips all identifying document metadata to prevent data leakage.
 */

import { rgb } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface RedactionBox {
  pageNumber: number; // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RedactionOptions {
  boxes: RedactionBox[];
  sanitizeMetadata?: boolean;
}

export async function applyRedaction(
  data: Uint8Array,
  options: RedactionOptions
): Promise<OperationResult> {
  if (options.boxes.length === 0) {
    throw new Error('At least one redaction box must be specified.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  const black = rgb(0, 0, 0);

  for (const box of options.boxes) {
    if (box.pageNumber < 1 || box.pageNumber > pages.length) continue;
    const page = pages[box.pageNumber - 1];

    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      color: black,
      opacity: 1.0,
    });
  }

  if (options.sanitizeMetadata ?? true) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('PDF-LoFi Local Redactor');
    pdfDoc.setCreator('PDF-LoFi');
  }

  const outputBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: outputBytes,
    pageCount: pages.length,
  };
}
