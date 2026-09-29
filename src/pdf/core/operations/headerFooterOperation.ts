/**
 * Header & Footer Operation for PDF-LoFi.
 * Overlays headers and footers with left, center, and right alignments,
 * dynamic tokens ({page}, {total}, {date}), custom margins, colors, and fonts.
 *
 * Truthful boundary:
 * Modifies page content streams by overlaying vector text headers and footers.
 * Does not mutate underlying page structures or rasterize existing vectors.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import {
  calculateTextCoordinates,
  expandDynamicTokens,
  formatLocalIsoDate,
  parseHexColor,
  resolveStandardFont,
  SupportedFontFamily,
} from './textPrimitive';

export interface HeaderFooterOptions {
  // Header configuration
  enableHeader?: boolean;
  headerLeft?: string;
  headerCenter?: string;
  headerRight?: string;

  // Footer configuration
  enableFooter?: boolean;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;

  // Typography & Styling
  fontFamily?: SupportedFontFamily;
  fontSize?: number;
  textColorHex?: string;
  opacity?: number;

  // Margins (in points)
  topBottomMargin?: number;
  leftRightMargin?: number;

  // Target pages
  selectedPages?: number[]; // 0-indexed; if omitted or empty, applies to all pages

  // Optional execution timestamp override for deterministic tests
  executionDate?: string;
}

export interface HeaderFooterResult extends OperationResult {
  modifiedPagesCount: number;
}

export async function executeAddHeaderFooter(
  data: Uint8Array,
  options: HeaderFooterOptions = {}
): Promise<HeaderFooterResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Header & Footer operation.');
  }

  const {
    enableHeader = true,
    headerLeft = '',
    headerCenter = '',
    headerRight = '',
    enableFooter = true,
    footerLeft = '',
    footerCenter = '',
    footerRight = '',
    fontFamily = 'Helvetica',
    fontSize = 10,
    textColorHex = '#1E293B',
    opacity = 1.0,
    topBottomMargin = 36,
    leftRightMargin = 36,
    selectedPages,
    executionDate,
  } = options;

  // Validate margin and font size bounds
  if (fontSize <= 0 || fontSize > 72) {
    throw new Error('Font size must be between 1 and 72 pt.');
  }
  if (topBottomMargin < 0 || leftRightMargin < 0) {
    throw new Error('Margins cannot be negative.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  const font = await resolveStandardFont(pdfDoc, fontFamily);
  const color = parseHexColor(textColorHex);
  const safeOpacity = Math.max(0.05, Math.min(1.0, opacity));

  // Capture execution date string deterministically using local calendar date
  const dateStr = executionDate || formatLocalIsoDate();

  const targetSet = selectedPages && selectedPages.length > 0 ? new Set(selectedPages) : null;
  let modifiedCount = 0;

  for (let i = 0; i < total; i++) {
    if (targetSet && !targetSet.has(i)) {
      continue;
    }

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const tokenContext = {
      page: i + 1,
      total,
      date: dateStr,
    };

    // --- Header Rendering ---
    if (enableHeader) {
      // Header Left
      if (headerLeft) {
        const text = expandDynamicTokens(headerLeft, tokenContext);
        if (text) {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          const { x, y } = calculateTextCoordinates(
            'top-left',
            width,
            height,
            textWidth,
            textHeight,
            leftRightMargin,
            topBottomMargin
          );
          page.drawText(text, { x, y, size: fontSize, font, color, opacity: safeOpacity });
        }
      }

      // Header Center
      if (headerCenter) {
        const text = expandDynamicTokens(headerCenter, tokenContext);
        if (text) {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          const { x, y } = calculateTextCoordinates(
            'top-center',
            width,
            height,
            textWidth,
            textHeight,
            leftRightMargin,
            topBottomMargin
          );
          page.drawText(text, { x, y, size: fontSize, font, color, opacity: safeOpacity });
        }
      }

      // Header Right
      if (headerRight) {
        const text = expandDynamicTokens(headerRight, tokenContext);
        if (text) {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          const { x, y } = calculateTextCoordinates(
            'top-right',
            width,
            height,
            textWidth,
            textHeight,
            leftRightMargin,
            topBottomMargin
          );
          page.drawText(text, { x, y, size: fontSize, font, color, opacity: safeOpacity });
        }
      }
    }

    // --- Footer Rendering ---
    if (enableFooter) {
      // Footer Left
      if (footerLeft) {
        const text = expandDynamicTokens(footerLeft, tokenContext);
        if (text) {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          const { x, y } = calculateTextCoordinates(
            'bottom-left',
            width,
            height,
            textWidth,
            textHeight,
            leftRightMargin,
            topBottomMargin
          );
          page.drawText(text, { x, y, size: fontSize, font, color, opacity: safeOpacity });
        }
      }

      // Footer Center
      if (footerCenter) {
        const text = expandDynamicTokens(footerCenter, tokenContext);
        if (text) {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          const { x, y } = calculateTextCoordinates(
            'bottom-center',
            width,
            height,
            textWidth,
            textHeight,
            leftRightMargin,
            topBottomMargin
          );
          page.drawText(text, { x, y, size: fontSize, font, color, opacity: safeOpacity });
        }
      }

      // Footer Right
      if (footerRight) {
        const text = expandDynamicTokens(footerRight, tokenContext);
        if (text) {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          const { x, y } = calculateTextCoordinates(
            'bottom-right',
            width,
            height,
            textWidth,
            textHeight,
            leftRightMargin,
            topBottomMargin
          );
          page.drawText(text, { x, y, size: fontSize, font, color, opacity: safeOpacity });
        }
      }
    }

    modifiedCount++;
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: total,
    modifiedPagesCount: modifiedCount,
  };
}
