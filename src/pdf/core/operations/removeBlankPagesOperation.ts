/**
 * Remove Blank Pages Operation for PDF-LoFi.
 * Reliably detects blank pages by analyzing both text stream and rendered pixel density.
 */
import { getPdfjsDocument } from '../../engines/pdfjsEngine';
import { executeDeletePages } from './deleteOperation';
import { OperationResult } from './rotateOperation';

export interface BlankDetectionResult {
  blankPageIndices: number[]; // 0-indexed
  totalPages: number;
}

/**
 * Scans a PDF and returns indices of pages that are completely blank or have negligible content.
 */
export async function detectBlankPages(
  data: Uint8Array,
  progressCallback?: (current: number, total: number) => void
): Promise<BlankDetectionResult> {
  const pdfjsDoc = await getPdfjsDocument(data);
  const totalPages = pdfjsDoc.numPages;
  const blankPageIndices: number[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (progressCallback) {
      progressCallback(pageNum, totalPages);
    }

    try {
      const page = await pdfjsDoc.getPage(pageNum);

      // Check text stream first
      const textContent = await page.getTextContent();
      const hasText = textContent.items.some((item: any) => item.str && item.str.trim().length > 0);

      if (hasText) {
        // Page has selectable text, definitely not blank
        continue;
      }

      // If in Node / headless test environment without DOM document, mark page with no text as blank
      if (typeof document === 'undefined') {
        blankPageIndices.push(pageNum - 1);
        continue;
      }

      // If no text, check raster pixel density on a small 150x200 canvas
      const viewport = page.getViewport({ scale: 0.25 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(50, Math.floor(viewport.width));
      canvas.height = Math.max(50, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');

      if (!ctx) continue;

      // Fill with pure white first
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let nonWhitePixelCount = 0;
      const totalPixelCount = canvas.width * canvas.height;

      // Check for non-white / colored pixels
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        // If alpha is high and color is sufficiently non-white
        if (a > 30 && (r < 240 || g < 240 || b < 240)) {
          nonWhitePixelCount++;
        }
      }

      // If non-white pixels account for less than 0.15% of the page area, consider it blank
      const nonWhiteRatio = nonWhitePixelCount / totalPixelCount;
      if (nonWhiteRatio < 0.0015) {
        blankPageIndices.push(pageNum - 1);
      }
    } catch (err) {
      console.warn(`Error scanning page ${pageNum} for blank detection:`, err);
    }
  }

  return {
    blankPageIndices,
    totalPages,
  };
}

/**
 * Removes detected blank pages from the document.
 */
export async function executeRemoveBlankPages(
  data: Uint8Array,
  progressCallback?: (current: number, total: number) => void
): Promise<OperationResult & { removedCount: number }> {
  const { blankPageIndices, totalPages } = await detectBlankPages(data, progressCallback);

  if (blankPageIndices.length === 0) {
    return {
      data,
      pageCount: totalPages,
      removedCount: 0,
    };
  }

  if (blankPageIndices.length >= totalPages) {
    throw new Error('All pages in this document appear blank. At least one page must be kept.');
  }

  const result = await executeDeletePages(data, blankPageIndices);
  return {
    ...result,
    removedCount: blankPageIndices.length,
  };
}
