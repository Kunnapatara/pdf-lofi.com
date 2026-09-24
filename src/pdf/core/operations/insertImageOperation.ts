/**
 * Image & Signature Stamp Operation for PDF-LoFi.
 * Overlays PNG/JPEG images or hand-drawn signature stamps client-side.
 *
 * NOTE: Placed signatures are electronic signature images, not cryptographic digital certificates.
 */
import { degrees } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface InsertImageOptions {
  imageData: Uint8Array | string; // binary bytes or dataURL
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  x?: number; // relative to page
  y?: number;
  positionPreset?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';
  pageIndex: number; // 0-indexed target page
  opacity?: number;
  rotationDegrees?: number;
}

export async function executeInsertImage(
  pdfData: Uint8Array,
  options: InsertImageOptions
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(pdfData);
  const pages = pdfDoc.getPages();

  const targetIdx = Math.max(0, Math.min(options.pageIndex, pages.length - 1));
  const page = pages[targetIdx];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Parse image bytes if dataURL was passed
  let imageBytes: Uint8Array;
  if (typeof options.imageData === 'string') {
    const base64Part = options.imageData.split(',')[1] || options.imageData;
    const binaryStr = atob(base64Part);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    imageBytes = bytes;
  } else {
    imageBytes = options.imageData;
  }

  // Embed PNG or JPEG
  const embeddedImage =
    options.mimeType === 'image/png'
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

  let targetX = options.x ?? 50;
  let targetY = options.y ?? 50;

  if (options.positionPreset && options.positionPreset !== 'custom') {
    switch (options.positionPreset) {
      case 'center':
        targetX = (pageWidth - options.width) / 2;
        targetY = (pageHeight - options.height) / 2;
        break;
      case 'bottom-right':
        targetX = pageWidth - options.width - 50;
        targetY = 50;
        break;
      case 'bottom-left':
        targetX = 50;
        targetY = 50;
        break;
      case 'top-right':
        targetX = pageWidth - options.width - 50;
        targetY = pageHeight - options.height - 50;
        break;
      case 'top-left':
        targetX = 50;
        targetY = pageHeight - options.height - 50;
        break;
    }
  }

  page.drawImage(embeddedImage, {
    x: targetX,
    y: targetY,
    width: options.width,
    height: options.height,
    opacity: options.opacity ?? 1.0,
    rotate: degrees(options.rotationDegrees ?? 0),
  });

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pages.length,
  };
}
