/**
 * Booklet / Signature Imposition Operation for PDF-LoFi.
 * Arranges PDF pages into print-ready booklet signatures with automatic
 * saddle-stitch imposition, duplex front/back layout, and blank-page padding.
 * Preserves source page vector content, fonts, and graphics using pdf-lib embedPage.
 * Refactored in Sprint C2.1 to consume shared pageGeometryPrimitive.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import {
  resolvePageDimensions,
  calculateSlotGrid,
  calculateAspectFit,
  safeEmbedPage,
} from './pageGeometryPrimitive';

export interface BookletOptions {
  paperSize?: 'A4' | 'Letter';
  signatureSize?: 'all' | 4 | 8 | 16;
  duplexOrientation?: 'short-edge' | 'long-edge';
  bindingEdge?: 'left' | 'right';
  margin?: number;
  spacing?: number;
}

export interface BookletResult extends OperationResult {
  paddedPageCount: number;
  sheetsCount: number;
  signaturesCount: number;
}

/**
 * Executes Booklet Signature Imposition on a PDF document.
 * 
 * Saddle-Stitch Formula:
 * For a signature of S pages (S is a multiple of 4):
 * Number of sheets = S / 4
 * Each sheet k (0 <= k < S/4) has:
 *  - Front (Outside): Left = (bindingEdge==='left' ? S - 1 - 2*k : 2*k),
 *                     Right = (bindingEdge==='left' ? 2*k : S - 1 - 2*k)
 *  - Back (Inside):   Left = (bindingEdge==='left' ? 2*k + 1 : S - 2 - 2*k),
 *                     Right = (bindingEdge==='left' ? S - 2 - 2*k : 2*k + 1)
 */
export async function executeBookletPdf(
  data: Uint8Array,
  options?: BookletOptions
): Promise<BookletResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Booklet processing.');
  }

  const srcDoc = await loadPdfLibDoc(data);
  const srcPageCount = srcDoc.getPageCount();

  if (srcPageCount === 0) {
    throw new Error('PDF document must contain at least 1 page for Booklet processing.');
  }

  const paper = options?.paperSize || 'A4';
  const margin = options?.margin !== undefined ? Math.max(0, options.margin) : 18;
  const spacing = options?.spacing !== undefined ? Math.max(0, options.spacing) : 12;
  const bindingEdge = options?.bindingEdge || 'left';
  const sigOption = options?.signatureSize || 'all';

  const { width: sheetW, height: sheetH } = resolvePageDimensions({
    paperSize: paper,
    orientation: 'landscape',
  });

  // Split into signature groups of indices
  const signatureChunks: number[][] = [];
  if (sigOption === 'all') {
    const indices = Array.from({ length: srcPageCount }, (_, i) => i);
    signatureChunks.push(indices);
  } else {
    const chunkSize = typeof sigOption === 'number' ? sigOption : 4;
    for (let i = 0; i < srcPageCount; i += chunkSize) {
      const chunk: number[] = [];
      for (let j = i; j < Math.min(i + chunkSize, srcPageCount); j++) {
        chunk.push(j);
      }
      signatureChunks.push(chunk);
    }
  }

  const outDoc = await createEmptyPdfDoc();
  let totalPaddedPages = 0;
  let totalSheets = 0;

  // 2-slot grid (1 row, 2 columns) on landscape sheet
  const grid = calculateSlotGrid({
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    cols: 2,
    rows: 1,
    margin,
    spacing,
  });

  for (const sigIndices of signatureChunks) {
    // Pad signature page count to the next multiple of 4
    const originalChunkLen = sigIndices.length;
    const sigPaddedCount = Math.ceil(originalChunkLen / 4) * 4;
    totalPaddedPages += sigPaddedCount;

    const sheetsInSig = sigPaddedCount / 4;
    totalSheets += sheetsInSig;

    // Helper to draw an embedded page into a slot (or leave blank if index is padding)
    const drawSlot = async (
      targetPage: any,
      localSigIdx: number,
      isLeftSlot: boolean
    ) => {
      if (localSigIdx >= originalChunkLen) {
        // Blank padding slot: leave blank
        return;
      }

      const globalPageIdx = sigIndices[localSigIdx];
      const srcPage = srcDoc.getPage(globalPageIdx);
      const embedded = await safeEmbedPage(outDoc, srcPage);

      const fit = calculateAspectFit({
        srcWidth: embedded.width,
        srcHeight: embedded.height,
        targetWidth: grid.slotWidth,
        targetHeight: grid.slotHeight,
      });

      const { slotX, slotY } = grid.getSlotCoordinates(isLeftSlot ? 0 : 1, 0);
      const drawX = slotX + fit.x;
      const drawY = slotY + fit.y;

      targetPage.drawPage(embedded, {
        x: drawX,
        y: drawY,
        width: fit.width,
        height: fit.height,
      });
    };

    for (let k = 0; k < sheetsInSig; k++) {
      // 1. Front of Sheet (Outside)
      const frontPage = outDoc.addPage([sheetW, sheetH]);
      const frontLeftIdx = bindingEdge === 'left' ? sigPaddedCount - 1 - 2 * k : 2 * k;
      const frontRightIdx = bindingEdge === 'left' ? 2 * k : sigPaddedCount - 1 - 2 * k;

      await drawSlot(frontPage, frontLeftIdx, true);
      await drawSlot(frontPage, frontRightIdx, false);

      // 2. Back of Sheet (Inside)
      const backPage = outDoc.addPage([sheetW, sheetH]);
      const backLeftIdx = bindingEdge === 'left' ? 2 * k + 1 : sigPaddedCount - 2 - 2 * k;
      const backRightIdx = bindingEdge === 'left' ? sigPaddedCount - 2 - 2 * k : 2 * k + 1;

      await drawSlot(backPage, backLeftIdx, true);
      await drawSlot(backPage, backRightIdx, false);
    }
  }

  const savedBytes = await savePdfLibDoc(outDoc);
  return {
    data: savedBytes,
    pageCount: outDoc.getPageCount(),
    paddedPageCount: totalPaddedPages,
    sheetsCount: totalSheets,
    signaturesCount: signatureChunks.length,
  };
}

