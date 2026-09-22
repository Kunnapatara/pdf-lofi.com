/**
 * Extract Operation for PDF-LoFi.
 * Extracts selected pages into a new independent PDF document.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export async function executeExtractPages(
  data: Uint8Array,
  pageIndicesToExtract: number[] // 0-indexed
): Promise<OperationResult> {
  if (pageIndicesToExtract.length === 0) {
    throw new Error('Please select at least one page to extract.');
  }

  const srcDoc = await loadPdfLibDoc(data);
  const newDoc = await createEmptyPdfDoc();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndicesToExtract);

  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  const savedBytes = await savePdfLibDoc(newDoc);
  return {
    data: savedBytes,
    pageCount: copiedPages.length,
  };
}
