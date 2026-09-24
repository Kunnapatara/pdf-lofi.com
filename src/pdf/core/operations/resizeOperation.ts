/**
 * Resize / Standardize Page Dimensions Operation for PDF-LoFi.
 * Standardizes pages to A4, US Letter, US Legal, or custom dimensions.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export type StandardPageSize = 'a4' | 'letter' | 'legal' | 'custom';

export const STANDARD_SIZES: Record<Exclude<StandardPageSize, 'custom'>, { width: number; height: number; name: string }> = {
  a4: { width: 595.28, height: 841.89, name: 'A4 (210 × 297 mm)' },
  letter: { width: 612.0, height: 792.0, name: 'US Letter (8.5 × 11 in)' },
  legal: { width: 612.0, height: 1008.0, name: 'US Legal (8.5 × 14 in)' },
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

  let targetWidth = 595.28;
  let targetHeight = 841.89;

  if (options.preset !== 'custom' && STANDARD_SIZES[options.preset]) {
    targetWidth = STANDARD_SIZES[options.preset].width;
    targetHeight = STANDARD_SIZES[options.preset].height;
  } else if (options.customWidth && options.customHeight) {
    targetWidth = options.customWidth;
    targetHeight = options.customHeight;
  }

  const targetIndices =
    pageIndices && pageIndices.length > 0
      ? pageIndices.filter((i) => i >= 0 && i < pages.length)
      : pages.map((_, i) => i);

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width: currentW, height: currentH } = page.getSize();
    const isCurrentLandscape = currentW > currentH;

    let finalW = targetWidth;
    let finalH = targetHeight;

    if (options.orientation === 'landscape') {
      if (finalW < finalH) {
        [finalW, finalH] = [finalH, finalW];
      }
    } else if (options.orientation === 'portrait') {
      if (finalW > finalH) {
        [finalW, finalH] = [finalH, finalW];
      }
    } else if (options.orientation === 'keep' && isCurrentLandscape) {
      if (finalW < finalH) {
        [finalW, finalH] = [finalH, finalW];
      }
    }

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
