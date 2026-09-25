/**
 * Mozilla PDF.js Engine Boundary for PDF-LoFi.
 * Encapsulates PDF.js document loading, worker setup, and cache management.
 * License: Apache-2.0
 */
import * as pdfjsLib from 'pdfjs-dist';

// Ensure Uint8Array.prototype.toHex and Promise.try are defined across all execution runtimes
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function <T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}

if (typeof (Uint8Array.prototype as any).toHex !== 'function') {
  (Uint8Array.prototype as any).toHex = function (): string {
    return Array.from(this as Iterable<number>)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  };
}

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

export const getPdfjsDoc = getPdfjsDocument;

export async function extractTextFromPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const strings = textContent.items
    .filter((item: any) => 'str' in item)
    .map((item: any) => item.str);
  return strings.join(' ');
}

export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.5,
  rotation = 0
): Promise<void> {
  const page = await pdfDoc.getPage(pageNumber);
  const totalRotation = (page.rotate + rotation) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // @ts-expect-error PDF.js typing discrepancy
  await page.render({ canvasContext: ctx, viewport }).promise;
}

export { pdfjsLib };
