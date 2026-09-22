/**
 * Canonical Document Model for PDF-LoFi.
 * Manages document metadata, validation, and ID generation.
 */
import { LocalDocument, ProcessingState, ProcessingLocation } from '../../types/pdf';

export interface CreateDocumentOptions {
  name: string;
  data: Uint8Array;
  pageCount: number;
  id?: string;
}

export function createCanonicalDocument(options: CreateDocumentOptions): LocalDocument {
  const docId = options.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id: docId,
    name: options.name,
    size: options.data.byteLength,
    pageCount: options.pageCount,
    mimeType: 'application/pdf',
    processingState: 'idle' as ProcessingState,
    processingLocation: 'local' as ProcessingLocation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: options.data,
  };
}

/**
 * Validates that an ArrayBuffer / Uint8Array contains the '%PDF-' header
 */
export function isValidPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  // %PDF-
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d    // -
  );
}
