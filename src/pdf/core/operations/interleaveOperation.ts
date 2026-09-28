/**
 * Interleave / Alternate Mix Operation for PDF-LoFi.
 * Combines two PDF documents in alternating page sequence (A1, B1, A2, B2, ...).
 * Supports duplex scan workflows with optional reverse ordering for Document B.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface InterleaveOptions {
  /** If true, pages of Document B are inserted in reverse order (e.g. for back-side duplex scans). */
  reverseB?: boolean;
}

/**
 * Interleaves pages of two PDF documents into a single document.
 * Handles unequal page counts deterministically by appending remaining pages at the end.
 */
export async function executeInterleavePdfs(
  pdfABytes: Uint8Array,
  pdfBBytes: Uint8Array,
  options?: InterleaveOptions
): Promise<OperationResult> {
  if (!pdfABytes || pdfABytes.length === 0) {
    throw new Error('Document A is required to perform an interleave.');
  }
  if (!pdfBBytes || pdfBBytes.length === 0) {
    throw new Error('Document B is required to perform an interleave.');
  }

  let docA;
  let docB;

  try {
    docA = await loadPdfLibDoc(pdfABytes);
  } catch (err) {
    throw new Error(`Failed to load Document A for interleave: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    docB = await loadPdfLibDoc(pdfBBytes);
  } catch (err) {
    throw new Error(`Failed to load Document B for interleave: ${err instanceof Error ? err.message : String(err)}`);
  }

  const aCount = docA.getPageCount();
  const bCount = docB.getPageCount();

  if (aCount === 0) {
    throw new Error('Document A must contain at least 1 page.');
  }
  if (bCount === 0) {
    throw new Error('Document B must contain at least 1 page.');
  }

  const outDoc = await createEmptyPdfDoc();

  const aIndices = Array.from({ length: aCount }, (_, i) => i);
  const bIndices = Array.from({ length: bCount }, (_, i) => i);
  if (options?.reverseB) {
    bIndices.reverse();
  }

  // Copy all needed pages in batch for performance
  const copiedAPages = await outDoc.copyPages(docA, aIndices);
  const copiedBPages = await outDoc.copyPages(docB, bIndices);

  const maxCount = Math.max(aCount, bCount);
  for (let k = 0; k < maxCount; k++) {
    if (k < aCount) {
      outDoc.addPage(copiedAPages[k]);
    }
    if (k < bCount) {
      outDoc.addPage(copiedBPages[k]);
    }
  }

  const savedBytes = await savePdfLibDoc(outDoc);
  return {
    data: savedBytes,
    pageCount: outDoc.getPageCount(),
  };
}
