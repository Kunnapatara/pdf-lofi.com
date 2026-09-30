/**
 * Visual & Image Overlay Shared Primitive for PDF-LoFi.
 * ----------------------------------------------------------------------------
 * Shared mechanics for client-side raster image embedding, coordinate positioning,
 * scaling, rotation, opacity, and page targeting.
 *
 * Responsibilities:
 * - Normalizes image data (Uint8Array binary bytes or base64 DataURL).
 * - Detects image format (PNG magic header [0x89, 0x50, 0x4E, 0x47] or JPEG [0xFF, 0xD8, 0xFF]).
 * - Embeds image into PDFDocument safely.
 * - Calculates preset or custom placement coordinates within page bounds.
 * - Draws image on specified single or multiple target pages.
 *
 * Non-Responsibilities:
 * - UI state or React hooks.
 * - Business semantics or tool catalog routing.
 * - Document persistence or IndexedDB storage.
 * - File download triggering.
 * ----------------------------------------------------------------------------
 */

import { PDFDocument, PDFImage, degrees } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export type VisualPlacementPreset =
  | 'center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'custom';

export interface VisualPlacementOptions {
  width: number;
  height: number;
  x?: number;
  y?: number;
  positionPreset?: VisualPlacementPreset;
  margin?: number; // default 50pt
  opacity?: number; // 0.01 to 1.0 (default 1.0)
  rotationDegrees?: number; // default 0
}

export interface VisualOverlayOptions extends VisualPlacementOptions {
  imageData: Uint8Array | string; // binary bytes or base64 DataURL
  mimeType?: 'image/png' | 'image/jpeg';
  targetPages?: number[]; // 0-indexed; if omitted or empty, applies to pageIndex or all
  pageIndex?: number; // 0-indexed fallback for single-page operations
}

/**
 * Normalizes image input from either a Uint8Array or base64 dataURL string.
 */
export function normalizeImageBytes(input: Uint8Array | string): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (typeof input === 'string') {
    const base64Part = input.includes(',') ? input.split(',')[1] : input;
    const binaryStr = atob(base64Part.trim());
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Unsupported image data format. Expected Uint8Array or base64 string.');
}

/**
 * Detects image MIME type from binary magic numbers, with optional fallback.
 */
export function detectImageMimeType(
  bytes: Uint8Array,
  fallbackMime: 'image/png' | 'image/jpeg' = 'image/png'
): 'image/png' | 'image/jpeg' {
  if (bytes.length >= 4) {
    // PNG magic header: 0x89 0x50 0x4E 0x47 (.PNG)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png';
    }
    // JPEG magic header: 0xFF 0xD8 0xFF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
  }
  return fallbackMime;
}

/**
 * Embeds a PNG or JPEG image into a PDFDocument instance once for reuse across multiple pages.
 */
export async function embedVisualImage(
  pdfDoc: PDFDocument,
  imageData: Uint8Array | string,
  preferredMime?: 'image/png' | 'image/jpeg'
): Promise<PDFImage> {
  const bytes = normalizeImageBytes(imageData);
  const detectedMime = preferredMime || detectImageMimeType(bytes, 'image/png');

  if (detectedMime === 'image/jpeg') {
    return pdfDoc.embedJpg(bytes);
  }
  return pdfDoc.embedPng(bytes);
}

/**
 * Calculates absolute (x, y) coordinates for placement within bounding page dimensions.
 */
export function calculateVisualPlacement(
  pageWidth: number,
  pageHeight: number,
  elementWidth: number,
  elementHeight: number,
  preset: VisualPlacementPreset = 'custom',
  customX: number = 50,
  customY: number = 50,
  margin: number = 50
): { x: number; y: number } {
  if (preset === 'custom') {
    return { x: customX, y: customY };
  }

  switch (preset) {
    case 'center':
      return {
        x: Math.max(0, (pageWidth - elementWidth) / 2),
        y: Math.max(0, (pageHeight - elementHeight) / 2),
      };
    case 'bottom-right':
      return {
        x: Math.max(0, pageWidth - elementWidth - margin),
        y: margin,
      };
    case 'bottom-left':
      return {
        x: margin,
        y: margin,
      };
    case 'top-right':
      return {
        x: Math.max(0, pageWidth - elementWidth - margin),
        y: Math.max(0, pageHeight - elementHeight - margin),
      };
    case 'top-left':
      return {
        x: margin,
        y: Math.max(0, pageHeight - elementHeight - margin),
      };
    default:
      return { x: customX, y: customY };
  }
}

/**
 * Draws an embedded PDFImage onto specified pages of a PDFDocument.
 */
export function renderVisualOverlayOnPages(
  pdfDoc: PDFDocument,
  embeddedImage: PDFImage,
  options: VisualPlacementOptions & { targetPages: number[] }
): void {
  const pages = pdfDoc.getPages();
  const total = pages.length;
  if (total === 0) return;

  const opacity = Math.max(0.01, Math.min(1.0, options.opacity ?? 1.0));
  const rotation = degrees(options.rotationDegrees ?? 0);
  const margin = options.margin ?? 50;

  for (const pageIdx of options.targetPages) {
    if (pageIdx < 0 || pageIdx >= total) continue;
    const page = pages[pageIdx];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const { x, y } = calculateVisualPlacement(
      pageWidth,
      pageHeight,
      options.width,
      options.height,
      options.positionPreset ?? 'custom',
      options.x ?? 50,
      options.y ?? 50,
      margin
    );

    page.drawImage(embeddedImage, {
      x,
      y,
      width: options.width,
      height: options.height,
      opacity,
      rotate: rotation,
    });
  }
}

/**
 * Executes a full Visual/Image overlay operation across a PDF document.
 */
export async function executeVisualOverlay(
  pdfBytes: Uint8Array,
  options: VisualOverlayOptions
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(pdfBytes);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  if (total === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  // Embed image once
  const embeddedImage = await embedVisualImage(pdfDoc, options.imageData, options.mimeType);

  // Determine target pages
  let targetPages: number[];
  if (options.targetPages && options.targetPages.length > 0) {
    targetPages = options.targetPages.filter((idx) => idx >= 0 && idx < total);
  } else if (options.pageIndex !== undefined) {
    const singleIdx = Math.max(0, Math.min(options.pageIndex, total - 1));
    targetPages = [singleIdx];
  } else {
    targetPages = Array.from({ length: total }, (_, i) => i);
  }

  renderVisualOverlayOnPages(pdfDoc, embeddedImage, {
    ...options,
    targetPages,
  });

  const outputBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: outputBytes,
    pageCount: total,
  };
}
