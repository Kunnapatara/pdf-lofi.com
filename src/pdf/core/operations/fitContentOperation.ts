/**
 * Fit Content to Page Operation for PDF-LoFi.
 * Proportionally fits and centers existing page content into a standard or custom target page geometry.
 * Built on top of canonical pageGeometryPrimitive.
 */
import { PDFName } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import {
  StandardPaperSizeName,
  PageOrientation,
  resolvePageDimensions,
  calculateFitContentGeometry,
} from './pageGeometryPrimitive';
import { parsePageRange } from './rangeParser';

export type FitTargetSize = StandardPaperSizeName | 'custom' | 'a4' | 'letter' | 'legal';

export interface FitContentOptions {
  targetSize: FitTargetSize;
  orientation?: PageOrientation;
  customWidth?: number;
  customHeight?: number;
  pageRange?: string;
  pageIndices?: number[];
}

/**
 * Fits existing page content into a target page geometry with proportional scaling and centering.
 */
export async function executeFitContent(
  data: Uint8Array,
  options: FitContentOptions
): Promise<OperationResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Fit Content processing.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  if (pageCount === 0) {
    throw new Error('PDF document must contain at least 1 page for Fit Content processing.');
  }

  let targetIndices: number[];
  if (options.pageIndices && options.pageIndices.length > 0) {
    targetIndices = options.pageIndices.filter((idx) => idx >= 0 && idx < pageCount);
  } else if (options.pageRange && options.pageRange.trim().length > 0) {
    const parsed = parsePageRange(options.pageRange, pageCount);
    if (!parsed.valid) {
      throw new Error(`Invalid page range: ${parsed.error || 'Failed to parse page range'}`);
    }
    targetIndices = parsed.pageIndices;
  } else {
    targetIndices = pages.map((_, i) => i);
  }

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width: srcW, height: srcH } = page.getSize();
    const isCurrentLandscape = srcW > srcH;

    const effectiveOrientation =
      options.orientation === 'keep'
        ? isCurrentLandscape
          ? 'landscape'
          : 'portrait'
        : options.orientation || 'portrait';

    const resolvedTarget = resolvePageDimensions({
      paperSize: options.targetSize,
      orientation: effectiveOrientation,
      customWidth: options.customWidth,
      customHeight: options.customHeight,
    });

    const hasCropBox = page.node.has(PDFName.of('CropBox'));
    const cropBox = hasCropBox ? page.getCropBox() : null;
    const effW = cropBox ? cropBox.width : srcW;
    const effH = cropBox ? cropBox.height : srcH;
    const origX = cropBox ? cropBox.x : 0;
    const origY = cropBox ? cropBox.y : 0;

    const transform = calculateFitContentGeometry(
      effW,
      effH,
      resolvedTarget.width,
      resolvedTarget.height,
      origX,
      origY
    );

    // Update page size to the target geometry
    page.setSize(transform.targetWidth, transform.targetHeight);
    if (hasCropBox) {
      page.setCropBox(0, 0, transform.targetWidth, transform.targetHeight);
    }

    // Apply proportional aspect-ratio scale and centered offset
    if (Math.abs(transform.scale - 1) > 0.0001) {
      page.scaleContent(transform.scale, transform.scale);
    }
    if (Math.abs(transform.translateX) > 0.0001 || Math.abs(transform.translateY) > 0.0001) {
      page.translateContent(transform.translateX, transform.translateY);
    }
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount,
  };
}
