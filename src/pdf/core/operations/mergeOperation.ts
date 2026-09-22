/**
 * Merge Operation for PDF-LoFi.
 * Combines multiple PDF documents in sequence.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export async function executeMergePdfs(
  pdfBytesList: Uint8Array[]
): Promise<OperationResult> {
  if (pdfBytesList.length < 2) {
    throw new Error('At least 2 PDF documents are required to perform a merge.');
  }

  const mergedDoc = await createEmptyPdfDoc();

  for (let i = 0; i < pdfBytesList.length; i++) {
    const bytes = pdfBytesList[i];
    try {
      const doc = await loadPdfLibDoc(bytes);
      const pageIndices = doc.getPageIndices();
      const copiedPages = await mergedDoc.copyPages(doc, pageIndices);
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    } catch (err) {
      throw new Error(
        `Failed to load document #${i + 1} for merge: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const savedBytes = await savePdfLibDoc(mergedDoc);
  return {
    data: savedBytes,
    pageCount: mergedDoc.getPageCount(),
  };
}
