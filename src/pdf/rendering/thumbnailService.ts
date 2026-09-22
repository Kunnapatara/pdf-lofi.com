/**
 * PDF Thumbnail Generation Service for PDF-LoFi.
 * Produces lightweight data URLs for page grid rendering with memory cleanup.
 */
import { getPdfjsDocument } from '../engines/pdfjsEngine';

export async function generatePageThumbnail(
  data: Uint8Array,
  pageNumber: number,
  rotation = 0,
  maxDimension = 260
): Promise<string> {
  const pdfDoc = await getPdfjsDocument(data);
  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
    return '';
  }

  const page = await pdfDoc.getPage(pageNumber);
  const totalRotation = (page.rotate + rotation) % 360;
  const unscaledViewport = page.getViewport({ scale: 1.0, rotation: totalRotation });

  const scale = Math.min(
    maxDimension / unscaledViewport.width,
    maxDimension / unscaledViewport.height
  );
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // @ts-expect-error PDF.js typing discrepancy
  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  // Clean up canvas references
  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}
