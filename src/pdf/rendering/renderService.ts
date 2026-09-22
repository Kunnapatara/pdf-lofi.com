/**
 * PDF Canvas Rendering Service for PDF-LoFi.
 * Renders pages using the Mozilla PDF.js engine boundary.
 */
import { getPdfjsDocument } from '../engines/pdfjsEngine';

export interface RenderCanvasOptions {
  canvas: HTMLCanvasElement;
  data: Uint8Array;
  pageNumber: number; // 1-indexed
  scale?: number;
  rotation?: number; // additional view rotation in degrees
}

export async function renderPageCanvas({
  canvas,
  data,
  pageNumber,
  scale = 1.0,
  rotation = 0,
}: RenderCanvasOptions): Promise<void> {
  const pdfDoc = await getPdfjsDocument(data);
  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
    throw new Error(`Page number ${pageNumber} out of range [1, ${pdfDoc.numPages}]`);
  }

  const page = await pdfDoc.getPage(pageNumber);
  const totalRotation = (page.rotate + rotation) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  // High-DPI screen support
  const outputScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not acquire 2D rendering context for canvas');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  const renderContext = {
    canvasContext: ctx,
    viewport,
    transform,
  };

  // @ts-expect-error PDF.js typing discrepancy
  await page.render(renderContext).promise;
}

export async function getDocumentPageCount(data: Uint8Array): Promise<number> {
  const pdfDoc = await getPdfjsDocument(data);
  return pdfDoc.numPages;
}
