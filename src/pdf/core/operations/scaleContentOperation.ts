/**
 * Scale Page Content Operation for PDF-LoFi.
 * Standardizes/scales the visual content of PDF pages without altering nominal page dimensions.
 * Built on top of canonical pageGeometryPrimitive.
 */
import { PDFName } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import { calculateContentScale } from './pageGeometryPrimitive';
import { parsePageRange } from './rangeParser';

export interface ScaleContentOptions {
  scale: number; // e.g. 0.8 for 80%, 1.25 for 125%
  pageRange?: string;
  pageIndices?: number[];
}

/**
 * Executes proportional content scaling on targeted pages while strictly preserving nominal page dimensions.
 */
export async function executeScaleContent(
  data: Uint8Array,
  options: ScaleContentOptions
): Promise<OperationResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Scale Content processing.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  if (pageCount === 0) {
    throw new Error('PDF document must contain at least 1 page for Scale Content processing.');
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

  const scaleFactor = typeof options.scale === 'number' && !isNaN(options.scale)
    ? options.scale
    : 1.0;

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width, height } = page.getSize();
    const hasCropBox = page.node.has(PDFName.of('CropBox'));
    const cropBox = hasCropBox ? page.getCropBox() : null;
    const effW = cropBox ? cropBox.width : width;
    const effH = cropBox ? cropBox.height : height;
    const origX = cropBox ? cropBox.x : 0;
    const origY = cropBox ? cropBox.y : 0;

    const transform = calculateContentScale(effW, effH, scaleFactor, origX, origY);

    // Apply proportional scaling and centering transformations
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
