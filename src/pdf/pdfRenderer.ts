/**
 * Local PDF Rendering & Search Engine Bridge for PDF-LoFi.
 * Delegates to PDF.js Engine Boundary & Rendering Services.
 * License: Apache-2.0
 */
import { getPdfjsDocument, clearPdfjsCache } from './engines/pdfjsEngine';
import { renderPageCanvas } from './rendering/renderService';
import { generatePageThumbnail } from './rendering/thumbnailService';
import { searchPdfInBrowser } from './rendering/textSearch';
import { SearchMatch } from '../types/pdf';

export interface DocumentMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  pageSize: { width: number; height: number };
}

export async function loadPdfDocument(data: Uint8Array, cacheKey?: string) {
  return getPdfjsDocument(data, cacheKey);
}

export function clearPdfCache(cacheKey?: string) {
  clearPdfjsCache(cacheKey);
}

export async function getPdfMetadata(data: Uint8Array): Promise<DocumentMetadata> {
  const pdfDoc = await getPdfjsDocument(data);
  const pageCount = pdfDoc.numPages;
  let title: string | undefined;
  let author: string | undefined;

  try {
    const meta = await pdfDoc.getMetadata();
    const info = meta.info as Record<string, unknown> | undefined;
    if (info) {
      if (typeof info.Title === 'string') title = info.Title;
      if (typeof info.Author === 'string') author = info.Author;
    }
  } catch {
    // Ignore metadata read errors
  }

  const firstPage = await pdfDoc.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1.0 });

  return {
    pageCount,
    title,
    author,
    pageSize: { width: viewport.width, height: viewport.height },
  };
}

export async function renderPageToCanvas(
  canvas: HTMLCanvasElement,
  data: Uint8Array,
  pageNumber: number,
  scale = 1.0,
  rotation = 0
): Promise<void> {
  return renderPageCanvas({
    canvas,
    data,
    pageNumber,
    scale,
    rotation,
  });
}

export async function renderPageThumbnail(
  data: Uint8Array,
  pageNumber: number,
  rotation = 0,
  maxDimension = 260
): Promise<string> {
  return generatePageThumbnail(data, pageNumber, rotation, maxDimension);
}

export async function searchPdfText(
  data: Uint8Array,
  query: string
): Promise<SearchMatch[]> {
  return searchPdfInBrowser(data, query);
}
