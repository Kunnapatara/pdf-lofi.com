/**
 * Page Geometry & Imposition Shared Primitive for PDF-LoFi.
 * ----------------------------------------------------------------------------
 * Shared mechanics for canonical paper dimensions, orientation resolution,
 * aspect-ratio-preserving containment math, generic slot grid layout,
 * and safe Form XObject page embedding.
 *
 * Responsibilities:
 * - Centralizes canonical paper dimension constants (A4, Letter, Legal in points).
 * - Resolves target page dimensions given standard size names, orientation, or custom dimensions.
 * - Computes aspect-ratio containment scaling and centered coordinate offsets within bounding slots.
 * - Computes generic multi-slot grid dimensions and coordinate origins for imposition sheets.
 * - Provides a safe wrapper around pdf-lib's `embedPage` ensuring pages lacking `/Contents`
 *   receive a valid empty stream to prevent fatal runtime errors.
 *
 * Explicitly Excluded Responsibilities:
 * - NO document loading, saving, or persistence (IndexedDB).
 * - NO React / UI state, routing, or tool orchestration.
 * - NO rotation angle metadata manipulation (stays in rotateOperation).
 * - NO viewport CropBox margin manipulation (stays in cropOperation).
 * - NO in-place content stream vector scaling (stays in resizeOperation).
 * - NO N-Up page ordering or sequencing policies (stays in nUpOperation).
 * - NO Booklet saddle-stitch signature permutation or duplex logic (stays in bookletOperation).
 * ----------------------------------------------------------------------------
 */

import { PDFDocument, PDFPage, PDFName, PDFEmbeddedPage } from 'pdf-lib';

/**
 * Standard paper size names supported across PDF-LoFi geometry tools.
 */
export type StandardPaperSizeName = 'A4' | 'Letter' | 'Legal';

export interface PaperDimensions {
  portrait: [number, number]; // [width, height] in points
  landscape: [number, number]; // [width, height] in points
}

/**
 * Canonical standard paper dimensions in typographical points (72 points = 1 inch).
 * Exact values matching repository constants:
 * - A4: 210 × 297 mm = 595.28 × 841.89 pt
 * - Letter: 8.5 × 11 in = 612.0 × 792.0 pt
 * - Legal: 8.5 × 14 in = 612.0 × 1008.0 pt
 */
export const STANDARD_PAGE_SIZES: Record<StandardPaperSizeName, PaperDimensions> = {
  A4: {
    portrait: [595.28, 841.89],
    landscape: [841.89, 595.28],
  },
  Letter: {
    portrait: [612.0, 792.0],
    landscape: [792.0, 612.0],
  },
  Legal: {
    portrait: [612.0, 1008.0],
    landscape: [1008.0, 612.0],
  },
};

export type PageOrientation = 'portrait' | 'landscape' | 'auto' | 'keep';

export interface ResolvePageDimensionOptions {
  paperSize?: 'A4' | 'Letter' | 'Legal' | string;
  orientation?: PageOrientation;
  customWidth?: number;
  customHeight?: number;
  defaultPaperSize?: StandardPaperSizeName;
}

export interface ResolvedDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
}

/**
 * Resolves deterministic (width, height) in points based on standard preset or custom dimensions
 * with orientation normalization.
 */
export function resolvePageDimensions(options: ResolvePageDimensionOptions = {}): ResolvedDimensions {
  const {
    paperSize = 'A4',
    orientation = 'portrait',
    customWidth,
    customHeight,
    defaultPaperSize = 'A4',
  } = options;

  let baseWidth: number;
  let baseHeight: number;

  const normalizedKey = (
    paperSize.toUpperCase() === 'LETTER'
      ? 'Letter'
      : paperSize.toUpperCase() === 'LEGAL'
      ? 'Legal'
      : 'A4'
  ) as StandardPaperSizeName;

  if (paperSize.toLowerCase() === 'custom' && customWidth && customHeight) {
    baseWidth = customWidth;
    baseHeight = customHeight;
  } else if (STANDARD_PAGE_SIZES[normalizedKey]) {
    [baseWidth, baseHeight] = STANDARD_PAGE_SIZES[normalizedKey].portrait;
  } else {
    [baseWidth, baseHeight] = STANDARD_PAGE_SIZES[defaultPaperSize].portrait;
  }

  let finalWidth = baseWidth;
  let finalHeight = baseHeight;

  if (orientation === 'landscape') {
    if (finalWidth < finalHeight) {
      [finalWidth, finalHeight] = [finalHeight, finalWidth];
    }
  } else if (orientation === 'portrait') {
    if (finalWidth > finalHeight) {
      [finalWidth, finalHeight] = [finalHeight, finalWidth];
    }
  }

  return {
    width: finalWidth,
    height: finalHeight,
    isLandscape: finalWidth > finalHeight,
  };
}

export interface AspectFitOptions {
  srcWidth: number;
  srcHeight: number;
  targetWidth: number;
  targetHeight: number;
  maxScale?: number;
}

export interface AspectFitResult {
  scale: number;
  width: number;
  height: number;
  x: number; // Centered horizontal offset in target space
  y: number; // Centered vertical offset in target space
}

/**
 * Calculates aspect-ratio-preserving containment scaling and centered coordinate offsets.
 */
export function calculateAspectFit(options: AspectFitOptions): AspectFitResult {
  const { srcWidth, srcHeight, targetWidth, targetHeight, maxScale } = options;

  if (srcWidth <= 0 || srcHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return { scale: 1, width: 0, height: 0, x: 0, y: 0 };
  }

  let scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
  if (maxScale !== undefined) {
    scale = Math.min(scale, maxScale);
  }

  const width = srcWidth * scale;
  const height = srcHeight * scale;
  const x = (targetWidth - width) / 2;
  const y = (targetHeight - height) / 2;

  return { scale, width, height, x, y };
}

export interface SlotGridOptions {
  sheetWidth: number;
  sheetHeight: number;
  cols: number;
  rows: number;
  margin?: number;
  spacing?: number;
}

export interface SlotGridDimensions {
  slotWidth: number;
  slotHeight: number;
  getSlotCoordinates: (col: number, row: number) => { slotX: number; slotY: number };
}

/**
 * Computes slot bounds and coordinate placement for multi-page grid sheets (N-Up / Imposition).
 */
export function calculateSlotGrid(options: SlotGridOptions): SlotGridDimensions {
  const { sheetWidth, sheetHeight, cols, rows, margin = 0, spacing = 0 } = options;
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);
  const safeMargin = Math.max(0, margin);
  const safeSpacing = Math.max(0, spacing);

  const slotWidth = (sheetWidth - 2 * safeMargin - (safeCols - 1) * safeSpacing) / safeCols;
  const slotHeight = (sheetHeight - 2 * safeMargin - (safeRows - 1) * safeSpacing) / safeRows;

  const getSlotCoordinates = (col: number, row: number) => {
    const slotX = safeMargin + col * (slotWidth + safeSpacing);
    // In PDF coordinate space, (0,0) is bottom-left; top row (row 0) has highest y coordinate
    const slotY = safeMargin + (safeRows - 1 - row) * (slotHeight + safeSpacing);
    return { slotX, slotY };
  };

  return {
    slotWidth,
    slotHeight,
    getSlotCoordinates,
  };
}

/**
 * Safely embeds a source PDFPage into a target PDFDocument as a Form XObject.
 * Normalizes blank pages that lack a `/Contents` dictionary entry to prevent
 * pdf-lib from throwing runtime MissingPageContentsEmbeddingError exceptions.
 */
export async function safeEmbedPage(
  targetDoc: PDFDocument,
  sourcePage: PDFPage
): Promise<PDFEmbeddedPage> {
  if (!sourcePage.node.has(PDFName.of('Contents'))) {
    sourcePage.drawText('', { x: 0, y: 0, size: 0.1 });
  }
  return targetDoc.embedPage(sourcePage);
}
