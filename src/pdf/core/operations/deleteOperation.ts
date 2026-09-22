/**
 * Delete Operation for PDF-LoFi.
 * Safely removes specified pages while ensuring at least one page remains.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export async function executeDeletePages(
  data: Uint8Array,
  pageIndicesToDelete: number[] // 0-indexed
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const totalPages = pdfDoc.getPageCount();

  if (pageIndicesToDelete.length >= totalPages) {
    throw new Error('Cannot delete all pages from document. A PDF must contain at least one page.');
  }

  // Delete in descending order to avoid index shifting
  const sortedIndices = [...new Set(pageIndicesToDelete)].sort((a, b) => b - a);

  for (const idx of sortedIndices) {
    if (idx >= 0 && idx < pdfDoc.getPageCount()) {
      pdfDoc.removePage(idx);
    }
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
  };
}
