/**
 * N-Up PDF Operation for PDF-LoFi.
 * Composites multiple source pages onto a single sheet (2-up, 4-up, 6-up, 8-up).
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

export type NUpLayout = '2-up' | '4-up' | '6-up' | '8-up';

export interface NUpOptions {
  layout: NUpLayout;
  paperSize?: 'A4' | 'Letter';
  margin?: number;
  spacing?: number;
  orientation?: 'portrait' | 'landscape' | 'auto';
  pageOrder?: 'horizontal' | 'vertical';
}

/**
 * Executes N-Up page imposition on a PDF document.
 * 2-up: 2 pages side-by-side on landscape sheet (or 1x2 on portrait)
 * 4-up: 4 pages in 2x2 grid on portrait sheet (or landscape)
 * 6-up: 6 pages in 3x2 grid on landscape sheet (or 2x3 on portrait)
 * 8-up: 8 pages in 4x2 grid on landscape sheet (or 2x4 on portrait)
 * Unused slots on the final sheet remain blank.
 */
export async function executeNUpPdf(
  data: Uint8Array,
  options: NUpOptions
): Promise<OperationResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for N-Up processing.');
  }

  const srcDoc = await loadPdfLibDoc(data);
  const srcPageCount = srcDoc.getPageCount();

  if (srcPageCount === 0) {
    throw new Error('PDF document must contain at least 1 page for N-Up processing.');
  }

  const layout = options.layout;
  const paper = options.paperSize || 'A4';
  const margin = options.margin !== undefined ? Math.max(0, options.margin) : 18;
  const spacing = options.spacing !== undefined ? Math.max(0, options.spacing) : 12;

  // Determine sheet orientation and grid rows/columns
  let isLandscape: boolean;
  if (options.orientation && options.orientation !== 'auto') {
    isLandscape = options.orientation === 'landscape';
  } else {
    // Standard defaults: 4-up defaults to portrait, 2-up/6-up/8-up default to landscape
    isLandscape = layout === '4-up' ? false : true;
  }

  let cols: number;
  let rows: number;

  if (layout === '2-up') {
    cols = isLandscape ? 2 : 1;
    rows = isLandscape ? 1 : 2;
  } else if (layout === '4-up') {
    cols = 2;
    rows = 2;
  } else if (layout === '6-up') {
    cols = isLandscape ? 3 : 2;
    rows = isLandscape ? 2 : 3;
  } else if (layout === '8-up') {
    cols = isLandscape ? 4 : 2;
    rows = isLandscape ? 2 : 4;
  } else {
    throw new Error(`Unsupported N-Up layout: ${layout}`);
  }

  const perSheet = cols * rows;
  const sheetCount = Math.ceil(srcPageCount / perSheet);

  const outDoc = await createEmptyPdfDoc();

  const { width: sheetW, height: sheetH } = resolvePageDimensions({
    paperSize: paper,
    orientation: isLandscape ? 'landscape' : 'portrait',
  });

  const grid = calculateSlotGrid({
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    cols,
    rows,
    margin,
    spacing,
  });

  for (let s = 0; s < sheetCount; s++) {
    const outPage = outDoc.addPage([sheetW, sheetH]);

    for (let slot = 0; slot < perSheet; slot++) {
      const pageIdx = s * perSheet + slot;
      if (pageIdx >= srcPageCount) break;

      const srcPage = srcDoc.getPage(pageIdx);
      const embedded = await safeEmbedPage(outDoc, srcPage);

      let col: number;
      let row: number;
      if (options.pageOrder === 'vertical') {
        col = Math.floor(slot / rows);
        row = slot % rows;
      } else {
        col = slot % cols;
        row = Math.floor(slot / cols);
      }

      const { slotX, slotY } = grid.getSlotCoordinates(col, row);

      const fit = calculateAspectFit({
        srcWidth: embedded.width,
        srcHeight: embedded.height,
        targetWidth: grid.slotWidth,
        targetHeight: grid.slotHeight,
      });

      const drawX = slotX + fit.x;
      const drawY = slotY + fit.y;

      outPage.drawPage(embedded, {
        x: drawX,
        y: drawY,
        width: fit.width,
        height: fit.height,
      });
    }
  }

  const savedBytes = await savePdfLibDoc(outDoc);
  return {
    data: savedBytes,
    pageCount: outDoc.getPageCount(),
  };
}

