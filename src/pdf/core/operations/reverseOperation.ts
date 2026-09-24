/**
 * Reverse Pages Operation for PDF-LoFi.
 * Inverts the page sequence of a PDF document (e.g. 1 2 3 4 5 -> 5 4 3 2 1).
 * Preserves page content, dimensions, rotation, annotations, and document validity.
 */
import { loadPdfLibDoc } from '../../engines/pdfLibEngine';
import { executeReorderPages } from './reorderOperation';
import { OperationResult } from './rotateOperation';

export async function executeReversePages(data: Uint8Array): Promise<OperationResult> {
  const srcDoc = await loadPdfLibDoc(data);
  const total = srcDoc.getPageCount();

  if (total <= 1) {
    return {
      data,
      pageCount: total,
    };
  }

  // Generate reversed sequence [total - 1, total - 2, ..., 0]
  const reversedOrder = Array.from({ length: total }, (_, i) => total - 1 - i);
  return executeReorderPages(data, reversedOrder);
}
