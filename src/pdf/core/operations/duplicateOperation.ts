/**
 * Duplicate Operation for PDF-LoFi.
 * Clones a page and inserts it adjacent to the original.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export async function executeDuplicatePage(
  data: Uint8Array,
  pageIndex: number // 0-indexed
): Promise<OperationResult> {
  const srcDoc = await loadPdfLibDoc(data);
  const total = srcDoc.getPageCount();

  if (pageIndex < 0 || pageIndex >= total) {
    throw new Error(`Page index ${pageIndex} out of bounds.`);
  }

  const [copiedPage] = await srcDoc.copyPages(srcDoc, [pageIndex]);
  srcDoc.insertPage(pageIndex + 1, copiedPage);

  const savedBytes = await savePdfLibDoc(srcDoc);
  return {
    data: savedBytes,
    pageCount: srcDoc.getPageCount(),
  };
}
