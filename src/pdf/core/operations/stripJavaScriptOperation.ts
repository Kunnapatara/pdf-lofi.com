/**
 * Strip JavaScript & Executable Actions Operation for PDF-LoFi.
 * Removes supported script triggers and automated action dictionaries from PDF documents:
 * - Document Catalog /Names -> /JavaScript name tree
 * - Document Catalog /OpenAction trigger
 * - Document Catalog /AA (Additional Actions)
 * - Page-level /AA (Additional Actions)
 * - Form Field /AA (Calculation, Validation, Format, Keystroke script triggers)
 *
 * Truth & Security Boundary:
 * Sanitization is bounded strictly to standard PDF catalog and object-level action dictionaries.
 * It does not parse or guarantee removal of proprietary binary exploits embedded within
 * raw stream data or digital signature payloads.
 */
import { PDFName, PDFDict } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface StripJavaScriptResult extends OperationResult {
  sanitizedCount: number;
  details: string[];
}

export async function executeStripJavaScript(
  data: Uint8Array
): Promise<StripJavaScriptResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for script sanitization.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const details: string[] = [];
  let sanitizedCount = 0;

  const catalog = pdfDoc.catalog;

  // 1. Catalog /OpenAction (Automatic action triggered on document opening)
  if (catalog.has(PDFName.of('OpenAction'))) {
    catalog.delete(PDFName.of('OpenAction'));
    sanitizedCount++;
    details.push('Removed document catalog /OpenAction trigger');
  }

  // 2. Catalog /AA (Additional Actions on document open, close, print, save)
  if (catalog.has(PDFName.of('AA'))) {
    catalog.delete(PDFName.of('AA'));
    sanitizedCount++;
    details.push('Removed document catalog /AA (Additional Actions) dictionary');
  }

  // 3. Catalog /Names -> /JavaScript name tree
  if (catalog.has(PDFName.of('Names'))) {
    try {
      const namesDict = catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
      if (namesDict && namesDict.has(PDFName.of('JavaScript'))) {
        namesDict.delete(PDFName.of('JavaScript'));
        sanitizedCount++;
        details.push('Removed document catalog /Names/JavaScript name tree');
      }
    } catch {
      // Safe fallback if Names dictionary structure is non-standard
    }
  }

  // 4. Page-level /AA (Additional Actions on page open / close)
  const pages = pdfDoc.getPages();
  pages.forEach((page, idx) => {
    if (page.node.has(PDFName.of('AA'))) {
      page.node.delete(PDFName.of('AA'));
      sanitizedCount++;
      details.push(`Removed page /AA trigger from Page ${idx + 1}`);
    }
  });

  // 5. Form Field /AA (Keystroke, Format, Validate, Calculate script triggers)
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    for (const field of fields) {
      const fieldDict = (field as any).acroField?.dict;
      if (fieldDict && fieldDict.has(PDFName.of('AA'))) {
        fieldDict.delete(PDFName.of('AA'));
        sanitizedCount++;
        details.push(`Removed form action /AA from field "${field.getName()}"`);
      }
      if (fieldDict && fieldDict.has(PDFName.of('A'))) {
        try {
          const actionDict = fieldDict.lookupMaybe(PDFName.of('A'), PDFDict);
          if (actionDict && actionDict.has(PDFName.of('S'))) {
            const sName = actionDict.get(PDFName.of('S'));
            if (sName?.toString().includes('JavaScript')) {
              fieldDict.delete(PDFName.of('A'));
              sanitizedCount++;
              details.push(`Removed JavaScript /A action from field "${field.getName()}"`);
            }
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // If document has no form or AcroForm parsing fails, proceed safely
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
    sanitizedCount,
    details,
  };
}
