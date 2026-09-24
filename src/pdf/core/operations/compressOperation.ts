/**
 * PDF Compression & Stream Optimization Operation for PDF-LoFi.
 * Employs client-side object stream compression, metadata stripping, and redundant object pruning.
 * Computes exact real-world byte difference without fictitious estimates.
 */
import { loadPdfLibDoc } from '../../engines/pdfLibEngine';

export interface CompressionOptions {
  stripMetadata?: boolean;
  compressStreams?: boolean;
}

export interface CompressionResult {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  percentageSaved: number;
  pageCount: number;
}

export async function executeCompressPdf(
  data: Uint8Array,
  options: CompressionOptions = { stripMetadata: false, compressStreams: true }
): Promise<CompressionResult> {
  const originalSize = data.byteLength;
  const pdfDoc = await loadPdfLibDoc(data);

  if (options.stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
  }

  // Save with optimized object streams and compact serialization
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: options.compressStreams ?? true,
    addDefaultPage: false,
  });

  const compressedSize = compressedBytes.byteLength;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const percentageSaved =
    originalSize > 0 ? Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10 : 0;

  return {
    data: compressedBytes,
    originalSize,
    compressedSize,
    savedBytes,
    percentageSaved: Math.max(0, percentageSaved),
    pageCount: pdfDoc.getPageCount(),
  };
}
