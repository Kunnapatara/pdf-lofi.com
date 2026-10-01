/**
 * Insert Blank Page Operation for PDF-LoFi.
 * Appends or inserts a standard clean A4 page at target index.
 * Refactored in Sprint C2.2 to consume canonical pageGeometryPrimitive.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { STANDARD_PAGE_SIZES } from './pageGeometryPrimitive';
import { OperationResult } from './rotateOperation';

export async function executeInsertBlankPage(
  data: Uint8Array,
  targetIndex: number // 0-indexed, or totalPages to append
): Promise<OperationResult> {
  const srcDoc = await loadPdfLibDoc(data);
  const total = srcDoc.getPageCount();
  const clampedIndex = Math.max(0, Math.min(targetIndex, total));

  // Canonical A4 portrait dimensions from pageGeometryPrimitive
  const [a4Width, a4Height] = STANDARD_PAGE_SIZES.A4.portrait;
  srcDoc.insertPage(clampedIndex, [a4Width, a4Height]);

  const savedBytes = await savePdfLibDoc(srcDoc);
  return {
    data: savedBytes,
    pageCount: srcDoc.getPageCount(),
  };
}

