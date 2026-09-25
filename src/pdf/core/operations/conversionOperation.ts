/**
 * PDF-LoFi Local Conversion Operations
 * 100% In-Browser Client-Side Transformations:
 * - PDF -> PNG / JPG / WebP (via pdfjs-dist Canvas rendering)
 * - Images -> PDF (via pdf-lib embedPng / embedJpg)
 * - PDF -> TXT (via pdfjs-dist text extraction)
 */

import { PDFDocument, rgb } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { getPdfjsDoc, renderPageToCanvas, extractTextFromPage } from '../../engines/pdfjsEngine';

export interface RenderedPageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
}

/**
 * Render PDF pages to image DataURLs using HTML Canvas client-side.
 */
export async function convertPdfToImages(
  pdfBytes: Uint8Array,
  options: {
    format?: 'png' | 'jpeg' | 'webp';
    scale?: number;
    quality?: number;
    pages?: number[]; // 1-indexed page numbers, empty = all
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<RenderedPageImage[]> {
  const format = options.format || 'png';
  const scale = options.scale || 1.5;
  const quality = options.quality ?? 0.92;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

  const pdfjsDoc = await getPdfjsDoc(pdfBytes);
  const totalPages = pdfjsDoc.numPages;

  const targetPages = options.pages && options.pages.length > 0
    ? options.pages.filter((p) => p >= 1 && p <= totalPages)
    : Array.from({ length: totalPages }, (_, i) => i + 1);

  const results: RenderedPageImage[] = [];

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];
    options.onProgress?.(i + 1, targetPages.length);

    const canvas = document.createElement('canvas');
    await renderPageToCanvas(pdfjsDoc, pageNum, canvas, scale);

    const dataUrl = canvas.toDataURL(mimeType, quality);
    results.push({
      pageNumber: pageNum,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      format,
    });
  }

  return results;
}

export interface ImageInputItem {
  data: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg' | 'image/jpg' | string;
  name?: string;
  width?: number;
  height?: number;
}

/**
 * Convert an array of image files into a single multi-page PDF document client-side.
 */
export async function convertImagesToPdf(
  images: ImageInputItem[],
  options: {
    pageSize?: 'fit' | 'a4' | 'letter';
    margin?: number;
  } = {}
): Promise<{ data: Uint8Array; pageCount: number }> {
  if (images.length === 0) {
    throw new Error('At least one image is required to generate a PDF.');
  }

  const pdfDoc = await PDFDocument.create();
  const pageSizeOption = options.pageSize || 'fit';
  const margin = options.margin ?? 0;

  for (const imgItem of images) {
    let embeddedImage;
    const isPng = imgItem.mimeType.toLowerCase().includes('png');

    try {
      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(imgItem.data);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imgItem.data);
      }
    } catch {
      // Fallback try other format if header differed from mimeType
      try {
        if (isPng) {
          embeddedImage = await pdfDoc.embedJpg(imgItem.data);
        } else {
          embeddedImage = await pdfDoc.embedPng(imgItem.data);
        }
      } catch (e) {
        throw new Error(`Failed to decode image "${imgItem.name || 'unnamed'}": unsupported or corrupted image stream.`);
      }
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let pageWidth = imgWidth + margin * 2;
    let pageHeight = imgHeight + margin * 2;

    if (pageSizeOption === 'a4') {
      pageWidth = 595.28;
      pageHeight = 841.89;
    } else if (pageSizeOption === 'letter') {
      pageWidth = 612.0;
      pageHeight = 792.0;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    if (pageSizeOption === 'fit') {
      page.drawImage(embeddedImage, {
        x: margin,
        y: margin,
        width: imgWidth,
        height: imgHeight,
      });
    } else {
      // Scale proportionally within margins
      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;
      const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight, 1);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;
      const drawX = (pageWidth - drawWidth) / 2;
      const drawY = (pageHeight - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  const outputBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: outputBytes,
    pageCount: images.length,
  };
}

/**
 * Extract full document text into structured plaintext (.txt) format.
 */
export async function convertPdfToTxt(
  pdfBytes: Uint8Array,
  options: {
    includePageMarkers?: boolean;
    pages?: number[];
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<string> {
  const pdfjsDoc = await getPdfjsDoc(pdfBytes);
  const totalPages = pdfjsDoc.numPages;
  const includeMarkers = options.includePageMarkers ?? true;

  const targetPages = options.pages && options.pages.length > 0
    ? options.pages.filter((p) => p >= 1 && p <= totalPages)
    : Array.from({ length: totalPages }, (_, i) => i + 1);

  const textSections: string[] = [];

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];
    options.onProgress?.(i + 1, targetPages.length);

    const pageText = await extractTextFromPage(pdfjsDoc, pageNum);
    if (includeMarkers) {
      textSections.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
    } else {
      textSections.push(pageText.trim());
    }
  }

  return textSections.join('\n\n');
}
