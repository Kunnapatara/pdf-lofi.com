/**
 * Page Background Operation for PDF-LoFi.
 * Injects a visual color underlay/background behind existing page content at the PDF vector level.
 *
 * Truthful boundary & Implementation details:
 * Uses true PDF-level XObject embedding (pdf-lib embedPage + drawRectangle + drawPage).
 * Zero rasterization is performed: existing vectors, text glyphs, font programs, and searchability
 * are preserved directly above the newly rendered background color layer.
 * Does not claim visual redaction or security sanitization.
 */
import { PDFDocument } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import { parseHexColor } from './textPrimitive';

export interface PageBackgroundOptions {
  colorHex?: string; // e.g. "#FAF8F5", "#FFFDF0", "#FEF3C7"
  opacity?: number; // 0.05 to 1.0 (default 1.0)
  selectedPages?: number[]; // 0-indexed; if omitted or empty, applies to all pages
}

export interface PageBackgroundResult extends OperationResult {
  coloredPagesCount: number;
  appliedColorHex: string;
}

export async function executeAddPageBackground(
  data: Uint8Array,
  options: PageBackgroundOptions = {}
): Promise<PageBackgroundResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Page Background operation.');
  }

  const {
    colorHex = '#FAF8F5',
    opacity = 1.0,
    selectedPages,
  } = options;

  const safeOpacity = Math.max(0.01, Math.min(1.0, opacity));
  const color = parseHexColor(colorHex);

  const srcDoc = await loadPdfLibDoc(data);
  const total = srcDoc.getPageCount();

  if (total === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  const outDoc = await PDFDocument.create();
  const targetSet = selectedPages && selectedPages.length > 0 ? new Set(selectedPages) : null;
  let coloredCount = 0;

  for (let i = 0; i < total; i++) {
    const isTarget = targetSet ? targetSet.has(i) : true;
    const srcPage = srcDoc.getPage(i);
    const { width, height } = srcPage.getSize();
    const rotation = srcPage.getRotation();

    if (isTarget) {
      // PDF-level underlay:
      // 1. Embed source page as Form XObject
      const embedded = await outDoc.embedPage(srcPage);
      // 2. Create target page with exact geometry and rotation
      const outPage = outDoc.addPage([width, height]);
      if (rotation) {
        outPage.setRotation(rotation);
      }
      // 3. Draw background underlay rectangle first
      outPage.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color,
        opacity: safeOpacity,
      });
      // 4. Place original page content vector layer above background
      outPage.drawPage(embedded, {
        x: 0,
        y: 0,
        width,
        height,
      });

      coloredCount++;
    } else {
      // Non-targeted pages are copied directly preserving original streams and dictionaries
      const [copiedPage] = await outDoc.copyPages(srcDoc, [i]);
      outDoc.addPage(copiedPage);
    }
  }

  const savedBytes = await savePdfLibDoc(outDoc);
  return {
    data: savedBytes,
    pageCount: total,
    coloredPagesCount: coloredCount,
    appliedColorHex: colorHex,
  };
}
