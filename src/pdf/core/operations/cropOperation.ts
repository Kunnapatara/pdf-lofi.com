/**
 * Crop Operation for PDF-LoFi.
 * Adjusts page cropBox and mediaBox within safe mathematical bounds.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface CropMargins {
  top: number; // in points
  bottom: number;
  left: number;
  right: number;
}

export async function executeCropPages(
  data: Uint8Array,
  margins: CropMargins,
  pageIndices?: number[] // undefined means all pages
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();

  const targetIndices =
    pageIndices && pageIndices.length > 0
      ? pageIndices.filter((i) => i >= 0 && i < pages.length)
      : pages.map((_, i) => i);

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width, height } = page.getSize();

    // Ensure margins do not exceed page dimensions
    const safeLeft = Math.max(0, Math.min(margins.left, width - 20));
    const safeRight = Math.max(0, Math.min(margins.right, width - safeLeft - 10));
    const safeBottom = Math.max(0, Math.min(margins.bottom, height - 20));
    const safeTop = Math.max(0, Math.min(margins.top, height - safeBottom - 10));

    const newX = safeLeft;
    const newY = safeBottom;
    const newWidth = Math.max(10, width - safeLeft - safeRight);
    const newHeight = Math.max(10, height - safeBottom - safeTop);

    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pages.length,
  };
}
