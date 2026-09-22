/**
 * Mozilla PDF.js Engine Boundary for PDF-LoFi.
 * Encapsulates PDF.js document loading, worker setup, and cache management.
 * License: Apache-2.0
 */
import * as pdfjsLib from 'pdfjs-dist';

// Worker configuration
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js workerSrc initialization notice:', e);
  }
}

// In-memory document proxy cache to prevent repeated reparsing
const docProxyCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

export async function getPdfjsDocument(data: Uint8Array, cacheKey?: string): Promise<pdfjsLib.PDFDocumentProxy> {
  if (cacheKey && docProxyCache.has(cacheKey)) {
    return docProxyCache.get(cacheKey)!;
  }

  // Clone buffer to avoid detached ArrayBuffer exceptions when transferred
  const copy = data.slice().buffer;
  const loadingTask = pdfjsLib.getDocument({ data: copy });
  const proxy = await loadingTask.promise;

  if (cacheKey) {
    docProxyCache.set(cacheKey, proxy);
  }
  return proxy;
}

export function clearPdfjsCache(cacheKey?: string): void {
  if (cacheKey) {
    docProxyCache.delete(cacheKey);
  } else {
    docProxyCache.clear();
  }
}

export { pdfjsLib };
