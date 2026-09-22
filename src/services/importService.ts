/**
 * Import Service for PDF-LoFi.
 * Handles reading browser File / Blob objects into canonical LocalDocument models.
 */
import { LocalDocument } from '../types/pdf';
import { createCanonicalDocument, isValidPdfHeader } from '../pdf/core/documentModel';
import { getDocumentPageCount } from '../pdf/rendering/renderService';

export async function importPdfFromFile(file: File): Promise<LocalDocument> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  if (!isValidPdfHeader(uint8)) {
    throw new Error(`File ${file.name} does not appear to be a valid PDF.`);
  }

  const pageCount = await getDocumentPageCount(uint8);

  return createCanonicalDocument({
    name: file.name,
    data: uint8,
    pageCount,
  });
}

export async function importPdfFromBytes(bytes: Uint8Array, name: string): Promise<LocalDocument> {
  if (!isValidPdfHeader(bytes)) {
    throw new Error(`The provided buffer does not contain a valid PDF.`);
  }

  const pageCount = await getDocumentPageCount(bytes);

  return createCanonicalDocument({
    name,
    data: bytes,
    pageCount,
  });
}
