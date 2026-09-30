/**
 * Image & Signature Stamp Operation for PDF-LoFi.
 * Overlays PNG/JPEG images or hand-drawn signature stamps client-side.
 *
 * NOTE: Placed signatures are electronic signature images, not cryptographic digital certificates.
 * Refactored in Sprint C1 to leverage shared visualOverlayPrimitive mechanics.
 */
import { OperationResult } from './rotateOperation';
import {
  executeVisualOverlay,
  VisualPlacementPreset,
} from './visualOverlayPrimitive';

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
  return executeVisualOverlay(pdfData, {
    imageData: options.imageData,
    mimeType: options.mimeType,
    width: options.width,
    height: options.height,
    x: options.x,
    y: options.y,
    positionPreset: options.positionPreset as VisualPlacementPreset | undefined,
    pageIndex: options.pageIndex,
    opacity: options.opacity,
    rotationDegrees: options.rotationDegrees,
  });
}

