/**
 * Canonical Page Model & Dimension Utilities for PDF-LoFi.
 * Standard dimensions are canonicalized in pageGeometryPrimitive.ts (Sprint C2.2).
 */
import { STANDARD_PAGE_SIZES } from './operations/pageGeometryPrimitive';

export interface PageDimension {
  width: number;
  height: number;
}

/**
 * Re-exported for backward compatibility, referencing the single canonical source of truth.
 */
export const STANDARD_A4: PageDimension = {
  width: STANDARD_PAGE_SIZES.A4.portrait[0],
  height: STANDARD_PAGE_SIZES.A4.portrait[1],
};


export interface CanonicalPage {
  pageIndex: number; // 0-indexed position
  pageNumber: number; // 1-indexed display number
  rotation: number; // Normalized to 0, 90, 180, 270
  dimensions: PageDimension;
  sourceDocId?: string;
  sourcePageIndex?: number;
}

/**
 * Normalizes any rotation angle into [0, 90, 180, 270] degrees.
 */
export function normalizeRotation(angle: number): number {
  const mod = ((angle % 360) + 360) % 360;
  // Snap to nearest 90-degree step
  return Math.round(mod / 90) * 90 % 360;
}
