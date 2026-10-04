/**
 * Add Page Margins Operation for PDF-LoFi.
 * Creates requested margin space around existing page content.
 * Supports:
 * - 'shrink-content': Keeps nominal page dimensions, shrinks and centers content inside the margin box.
 * - 'expand-page': Preserves 100% content scale, expands outer page dimensions by requested margins.
 * Built on top of canonical pageGeometryPrimitive.
 */
import { PDFName } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import { calculateMarginGeometry } from './pageGeometryPrimitive';
import { parsePageRange } from './rangeParser';

export interface AddMarginsOptions {
  top: number;
  right: number;
  bottom: number;
  left: number;
  mode?: 'shrink-content' | 'expand-page';
  pageRange?: string;
  pageIndices?: number[];
}

/**
 * Executes Add Page Margins on targeted PDF pages.
 */
export async function executeAddMargins(
  data: Uint8Array,
  options: AddMarginsOptions
): Promise<OperationResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Add Margins processing.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  if (pageCount === 0) {
    throw new Error('PDF document must contain at least 1 page for Add Margins processing.');
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

  const mode = options.mode || 'shrink-content';

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width, height } = page.getSize();
    const hasCropBox = page.node.has(PDFName.of('CropBox'));
    const cropBox = hasCropBox ? page.getCropBox() : null;
    const effW = cropBox ? cropBox.width : width;
    const effH = cropBox ? cropBox.height : height;
    const origX = cropBox ? cropBox.x : 0;
    const origY = cropBox ? cropBox.y : 0;

    const transform = calculateMarginGeometry({
      pageWidth: effW,
      pageHeight: effH,
      top: options.top,
      right: options.right,
      bottom: options.bottom,
      left: options.left,
      mode,
      originX: origX,
      originY: origY,
    });

    // If expand-page mode, update page dimensions
    if (transform.targetWidth !== width || transform.targetHeight !== height) {
      page.setSize(transform.targetWidth, transform.targetHeight);
      if (hasCropBox) {
        page.setCropBox(0, 0, transform.targetWidth, transform.targetHeight);
      }
    }

    // Apply proportional scaling (if shrink-content)
    if (Math.abs(transform.scale - 1) > 0.0001) {
      page.scaleContent(transform.scale, transform.scale);
    }

    // Apply translation to position content within margins
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
