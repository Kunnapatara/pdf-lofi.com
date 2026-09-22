/**
 * Rotate Operation for PDF-LoFi.
 * Rotates single or multiple pages in 90° increments.
 */
import { loadPdfLibDoc, savePdfLibDoc, degrees } from '../../engines/pdfLibEngine';

export interface OperationResult {
  data: Uint8Array;
  pageCount: number;
}

export async function executeRotatePage(
  data: Uint8Array,
  pageIndex: number, // 0-indexed
  deltaDegrees: number
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();

  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(`Invalid page index ${pageIndex}`);
  }

  const page = pages[pageIndex];
  const currentRotation = page.getRotation().angle;
  const newRotation = (currentRotation + deltaDegrees + 360) % 360;
  page.setRotation(degrees(newRotation));

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pages.length,
  };
}

export async function executeRotateMultiplePages(
  data: Uint8Array,
  pageIndices: number[], // 0-indexed
  deltaDegrees: number
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();

  for (const idx of pageIndices) {
    if (idx >= 0 && idx < pages.length) {
      const page = pages[idx];
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + deltaDegrees + 360) % 360;
      page.setRotation(degrees(newRotation));
    }
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pages.length,
  };
}
