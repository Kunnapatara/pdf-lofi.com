/**
 * Page Background Operation for PDF-LoFi.
 * Injects a visual color underlay/background behind existing page content at the PDF vector level.
 *
 * Truthful boundary & Structural Preservation:
 * Mutates the existing PDFDocument in place by prepending a vector background content stream
 * to the targeted page's /Contents dictionary entry.
 *
 * This guarantees 100% preservation of:
 * - Document-level structures: /AcroForm, /Outlines (bookmarks), /Dests, /Names, /PageLabels
 * - Page-level structures: /Annots (URI links, internal links, widgets, notes), /Tabs, /UserUnit, /AA, /StructParents
 * - Page geometry: MediaBox, CropBox (including non-zero offsets), and Rotation
 * - Blank pages: gracefully handles pages with missing /Contents without throwing exceptions
 *
 * Does not rasterize pages. Does not recreate the document container.
 */
import { PDFArray, PDFName } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import { parseHexColor } from './textPrimitive';

export interface PageBackgroundOptions {
  colorHex?: string; // e.g. "#FAF8F5", "#FFFDF0", "#FEF3C7"
  opacity?: number; // 0.01 to 1.0 (default 1.0)
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

  const pdfDoc = await loadPdfLibDoc(data);
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  const targetSet = selectedPages && selectedPages.length > 0 ? new Set(selectedPages) : null;
  let coloredCount = 0;

  for (let i = 0; i < total; i++) {
    if (targetSet && !targetSet.has(i)) {
      continue;
    }

    const page = pdfDoc.getPage(i);
    // Respect exact MediaBox coordinates (including non-zero offsets)
    const mediaBox = page.getMediaBox();
    const x = mediaBox.x;
    const y = mediaBox.y;
    const width = mediaBox.width;
    const height = mediaBox.height;

    // Register opacity graphics state if opacity < 1.0
    let gsName = '';
    if (safeOpacity < 0.999) {
      const gsObj = pdfDoc.context.obj({
        Type: 'ExtGState',
        ca: safeOpacity,
      });
      const gsKey = page.node.newExtGState('GS', gsObj);
      gsName = gsKey.asString().replace(/^\//, '');
    }

    const gsCommand = gsName ? `/${gsName} gs ` : '';
    const r = color.red.toFixed(4);
    const g = color.green.toFixed(4);
    const b = color.blue.toFixed(4);

    // Vector drawing commands: save state, set opacity, set fill color, draw rectangle over MediaBox, fill, restore state
    const bgOps = `q ${gsCommand}${r} ${g} ${b} rg ${x} ${y} ${width} ${height} re f Q\n`;
    const bgStream = pdfDoc.context.flateStream(bgOps);
    const bgStreamRef = pdfDoc.context.register(bgStream);

    const rawContents = page.node.get(PDFName.of('Contents'));

    if (!rawContents) {
      // Case C — /Contents is missing (e.g. blank page or page with only annotations)
      // Directly assign the background stream as the page's /Contents
      page.node.set(PDFName.of('Contents'), bgStreamRef);
    } else {
      const resolvedContents = pdfDoc.context.lookup(rawContents);
      if (resolvedContents instanceof PDFArray) {
        // Case B — /Contents is an array of streams
        // Prepend background stream so it executes first
        resolvedContents.insert(0, bgStreamRef);
      } else {
        // Case A — /Contents is a single stream / reference
        // Wrap into [backgroundStream, originalContents]
        page.node.set(
          PDFName.of('Contents'),
          pdfDoc.context.obj([bgStreamRef, rawContents])
        );
      }
    }

    coloredCount++;
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: total,
    coloredPagesCount: coloredCount,
    appliedColorHex: colorHex,
  };
}
