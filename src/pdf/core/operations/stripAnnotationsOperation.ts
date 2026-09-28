/**
 * Strip Annotations Operation for PDF-LoFi.
 * Removes all standard /Annots dictionaries from page objects across the document.
 * Purges comments, sticky notes, vector markups, popups, and hyperlink annotations.
 *
 * Truth Boundary:
 * This operation removes PDF /Annot objects. It does not alter static page content
 * streams, burned-in text, or background images.
 */
import { PDFName, PDFArray } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface StripAnnotationsResult extends OperationResult {
  strippedCount: number;
}

export async function executeStripAnnotations(
  data: Uint8Array
): Promise<StripAnnotationsResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for annotation stripping.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  let strippedCount = 0;

  for (const page of pages) {
    if (page.node.has(PDFName.of('Annots'))) {
      try {
        const annotsArr = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
        if (annotsArr) {
          strippedCount += annotsArr.size();
        }
      } catch {
        // Fallback: increment count by at least 1 if array structure is non-standard
        strippedCount++;
      }
      page.node.delete(PDFName.of('Annots'));
    }
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
    strippedCount,
  };
}
