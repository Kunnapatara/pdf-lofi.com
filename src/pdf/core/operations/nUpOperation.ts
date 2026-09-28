/**
 * N-Up PDF Operation for PDF-LoFi.
 * Composites multiple source pages onto a single sheet (2-up or 4-up).
 * Preserves source page vector content, fonts, and graphics using pdf-lib embedPage.
 */
import { PDFName } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface NUpOptions {
  layout: '2-up' | '4-up';
  paperSize?: 'A4' | 'Letter';
  margin?: number;
  spacing?: number;
}

const PAPER_SIZES: Record<'A4' | 'Letter', { portrait: [number, number]; landscape: [number, number] }> = {
  A4: {
    portrait: [595.28, 841.89],
    landscape: [841.89, 595.28],
  },
  Letter: {
    portrait: [612.0, 792.0],
    landscape: [792.0, 612.0],
  },
};

/**
 * Executes N-Up page imposition on a PDF document.
 * 2-up arranges 2 pages side-by-side on a landscape sheet.
 * 4-up arranges 4 pages in a 2x2 grid on a portrait sheet.
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

  const perSheet = layout === '2-up' ? 2 : 4;
  const sheetCount = Math.ceil(srcPageCount / perSheet);

  const outDoc = await createEmptyPdfDoc();

  // For 2-up: landscape sheet pairs portrait pages side-by-side
  // For 4-up: portrait sheet arranges 4 pages in a 2x2 grid
  const sheetDims =
    layout === '2-up'
      ? PAPER_SIZES[paper].landscape
      : PAPER_SIZES[paper].portrait;

  const [sheetW, sheetH] = sheetDims;

  for (let s = 0; s < sheetCount; s++) {
    const outPage = outDoc.addPage([sheetW, sheetH]);

    if (layout === '2-up') {
      // 2 horizontal slots side-by-side
      const slotW = (sheetW - 2 * margin - spacing) / 2;
      const slotH = sheetH - 2 * margin;

      for (let slot = 0; slot < 2; slot++) {
        const pageIdx = s * 2 + slot;
        if (pageIdx >= srcPageCount) break;

        const srcPage = srcDoc.getPage(pageIdx);
        // Ensure page has a /Contents stream so embedPage does not throw on empty/blank pages
        if (!srcPage.node.has(PDFName.of('Contents'))) {
          srcPage.drawText('', { x: 0, y: 0, size: 0.1 });
        }
        const embedded = await outDoc.embedPage(srcPage);

        // Aspect ratio fit
        const scale = Math.min(slotW / embedded.width, slotH / embedded.height);
        const drawW = embedded.width * scale;
        const drawH = embedded.height * scale;

        const slotX = margin + slot * (slotW + spacing);
        const slotY = margin;

        const drawX = slotX + (slotW - drawW) / 2;
        const drawY = slotY + (slotH - drawH) / 2;

        outPage.drawPage(embedded, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });
      }
    } else {
      // 4-up: 2x2 grid (2 columns, 2 rows)
      // Slot 0: Top-Left, Slot 1: Top-Right, Slot 2: Bottom-Left, Slot 3: Bottom-Right
      const slotW = (sheetW - 2 * margin - spacing) / 2;
      const slotH = (sheetH - 2 * margin - spacing) / 2;

      for (let slot = 0; slot < 4; slot++) {
        const pageIdx = s * 4 + slot;
        if (pageIdx >= srcPageCount) break;

        const srcPage = srcDoc.getPage(pageIdx);
        // Ensure page has a /Contents stream so embedPage does not throw on empty/blank pages
        if (!srcPage.node.has(PDFName.of('Contents'))) {
          srcPage.drawText('', { x: 0, y: 0, size: 0.1 });
        }
        const embedded = await outDoc.embedPage(srcPage);

        const col = slot % 2; // 0 = left, 1 = right
        const row = Math.floor(slot / 2); // 0 = top, 1 = bottom

        const slotX = margin + col * (slotW + spacing);
        // In PDF coordinates, bottom is y=0, so top row is row 0 -> y = margin + slotH + spacing
        const slotY = row === 0 ? margin + slotH + spacing : margin;

        const scale = Math.min(slotW / embedded.width, slotH / embedded.height);
        const drawW = embedded.width * scale;
        const drawH = embedded.height * scale;

        const drawX = slotX + (slotW - drawW) / 2;
        const drawY = slotY + (slotH - drawH) / 2;

        outPage.drawPage(embedded, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });
      }
    }
  }

  const savedBytes = await savePdfLibDoc(outDoc);
  return {
    data: savedBytes,
    pageCount: outDoc.getPageCount(),
  };
}
