/**
 * Insert Blank Page Operation for PDF-LoFi.
 * Appends or inserts a standard clean A4 page at target index.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { STANDARD_A4 } from '../pageModel';
import { OperationResult } from './rotateOperation';

export async function executeInsertBlankPage(
  data: Uint8Array,
  targetIndex: number // 0-indexed, or totalPages to append
): Promise<OperationResult> {
  const srcDoc = await loadPdfLibDoc(data);
  const total = srcDoc.getPageCount();
  const clampedIndex = Math.max(0, Math.min(targetIndex, total));

  // A4 size: 595.28 x 841.89 points
  srcDoc.insertPage(clampedIndex, [STANDARD_A4.width, STANDARD_A4.height]);

  const savedBytes = await savePdfLibDoc(srcDoc);
  return {
    data: savedBytes,
    pageCount: srcDoc.getPageCount(),
  };
}
