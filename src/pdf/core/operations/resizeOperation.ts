/**
 * Resize / Standardize Page Dimensions Operation for PDF-LoFi.
 * Standardizes pages to A4, US Letter, US Legal, or custom dimensions.
 * Refactored in Sprint C2.2 to consume canonical pageGeometryPrimitive.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import {
  STANDARD_PAGE_SIZES,
  resolvePageDimensions,
} from './pageGeometryPrimitive';

export type StandardPageSize = 'a4' | 'letter' | 'legal' | 'custom';

/**
 * Standard page size metadata mapping, referencing the single canonical source of truth.
 * Retained for backward compatibility with UI components.
 */
export const STANDARD_SIZES: Record<
  Exclude<StandardPageSize, 'custom'>,
  { width: number; height: number; name: string }
> = {
  a4: {
    width: STANDARD_PAGE_SIZES.A4.portrait[0],
    height: STANDARD_PAGE_SIZES.A4.portrait[1],
    name: 'A4 (210 × 297 mm)',
  },
  letter: {
    width: STANDARD_PAGE_SIZES.Letter.portrait[0],
    height: STANDARD_PAGE_SIZES.Letter.portrait[1],
    name: 'US Letter (8.5 × 11 in)',
  },
  legal: {
    width: STANDARD_PAGE_SIZES.Legal.portrait[0],
    height: STANDARD_PAGE_SIZES.Legal.portrait[1],
    name: 'US Legal (8.5 × 14 in)',
  },
};

export interface ResizeOptions {
  preset: StandardPageSize;
  customWidth?: number;
  customHeight?: number;
  orientation?: 'portrait' | 'landscape' | 'keep';
  scaleContent?: boolean;
}

export async function executeResizePages(
  data: Uint8Array,
  options: ResizeOptions,
  pageIndices?: number[]
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();

  const targetIndices =
    pageIndices && pageIndices.length > 0
      ? pageIndices.filter((i) => i >= 0 && i < pages.length)
      : pages.map((_, i) => i);

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width: currentW, height: currentH } = page.getSize();
    const isCurrentLandscape = currentW > currentH;

    // Per-page orientation resolution: 'keep' preserves orientation of each individual page
    const effectiveOrientation =
      options.orientation === 'keep'
        ? isCurrentLandscape
          ? 'landscape'
          : 'portrait'
        : options.orientation || 'portrait';

    const resolved = resolvePageDimensions({
      paperSize: options.preset,
      orientation: effectiveOrientation,
      customWidth: options.customWidth,
      customHeight: options.customHeight,
    });

    const finalW = resolved.width;
    const finalH = resolved.height;

    if (options.scaleContent) {
      const scaleX = finalW / currentW;
      const scaleY = finalH / currentH;
      page.scale(scaleX, scaleY);
    }
    page.setSize(finalW, finalH);
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pages.length,
  };
}

