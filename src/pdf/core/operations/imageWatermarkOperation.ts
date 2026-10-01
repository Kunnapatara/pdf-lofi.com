/**
 * Image Watermark Operation for PDF-LoFi.
 * ----------------------------------------------------------------------------
 * Overlays PNG or JPEG logos, graphics, and image watermarks across all or
 * selected PDF pages client-side using the shared visualOverlayPrimitive.
 *
 * Architecture:
 * - 100% Client-side local processing.
 * - Delegates all image decoding, MIME detection, embedding, coordinate calculations,
 *   scaling, rotation, and multi-page rendering directly to visualOverlayPrimitive.
 * - Embeds image resource once into PDFDocument, reusing the embedded PDFImage
 *   across all targeted pages without duplicate serialization.
 * ----------------------------------------------------------------------------
 */

import { OperationResult } from './rotateOperation';
import {
  executeVisualOverlay,
  VisualPlacementPreset,
} from './visualOverlayPrimitive';

export interface ImageWatermarkOptions {
  imageData: Uint8Array | string; // base64 DataURL or raw bytes
  mimeType?: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  opacity?: number; // 0.01 to 1.0 (default 0.25 for watermark subtlety)
  rotationDegrees?: number; // default 0 or 45
  positionPreset?: VisualPlacementPreset; // default 'center'
  x?: number;
  y?: number;
  targetPages?: number[]; // 0-indexed; if omitted or empty, applies to all pages
}

export async function executeImageWatermark(
  pdfData: Uint8Array,
  options: ImageWatermarkOptions
): Promise<OperationResult> {
  if (!pdfData || pdfData.byteLength === 0) {
    throw new Error('PDF document bytes are required for Image Watermark.');
  }

  if (!options.imageData) {
    throw new Error('Image data is required for Image Watermark.');
  }

  if (options.width <= 0 || options.height <= 0) {
    throw new Error('Image dimensions (width and height) must be greater than zero.');
  }

  // Watermark-specific defaults: subtle opacity (0.25) and centered placement
  const safeOpacity = Math.max(0.01, Math.min(1.0, options.opacity ?? 0.25));
  const safePreset: VisualPlacementPreset = options.positionPreset || 'center';

  return executeVisualOverlay(pdfData, {
    imageData: options.imageData,
    mimeType: options.mimeType,
    width: options.width,
    height: options.height,
    opacity: safeOpacity,
    rotationDegrees: options.rotationDegrees ?? 0,
    positionPreset: safePreset,
    x: options.x,
    y: options.y,
    targetPages: options.targetPages,
  });
}
