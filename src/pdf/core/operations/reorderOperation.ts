/**
 * Reorder Operation for PDF-LoFi.
 * Re-assembles PDF pages according to new index sequence.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export async function executeReorderPages(
  data: Uint8Array,
  newOrder: number[]
): Promise<OperationResult> {
  const srcDoc = await loadPdfLibDoc(data);
  const total = srcDoc.getPageCount();

  if (newOrder.length !== total) {
    throw new Error('New page order must include all existing pages.');
  }

  const newDoc = await createEmptyPdfDoc();
  const copiedPages = await newDoc.copyPages(srcDoc, newOrder);

  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  const savedBytes = await savePdfLibDoc(newDoc);
  return {
    data: savedBytes,
    pageCount: total,
  };
}
