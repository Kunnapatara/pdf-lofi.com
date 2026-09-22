/**
 * pdf-lib Engine Boundary for PDF-LoFi.
 * Encapsulates all direct pdf-lib PDFDocument instances and low-level mutations.
 * License: MIT
 */
import { degrees, PDFDocument } from 'pdf-lib';

export async function createEmptyPdfDoc(): Promise<PDFDocument> {
  return await PDFDocument.create();
}

export async function loadPdfLibDoc(data: Uint8Array): Promise<PDFDocument> {
  return await PDFDocument.load(data, { ignoreEncryption: true });
}

export async function savePdfLibDoc(doc: PDFDocument): Promise<Uint8Array> {
  return await doc.save();
}

export { degrees, PDFDocument };
