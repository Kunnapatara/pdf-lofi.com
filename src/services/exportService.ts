/**
 * Export Service for PDF-LoFi.
 * Coordinates document file downloads and blob persistence.
 */
import { triggerLocalDownload, createPdfBlob, sanitizeFilename } from '../pdf/export/exportService';

export function exportDocumentToFile(bytes: Uint8Array, filename: string): void {
  triggerLocalDownload(bytes, filename);
}

export { triggerLocalDownload, createPdfBlob, sanitizeFilename };
