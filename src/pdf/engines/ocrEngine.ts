/**
 * Browser-based OCR Engine Adapter using Tesseract.js.
 * License: Apache-2.0
 * Processes scans and images entirely in a client-side Web Worker without server uploads.
 */
import { createWorker } from 'tesseract.js';
import { getPdfjsDocument } from './pdfjsEngine';
import { loadPdfLibDoc, savePdfLibDoc } from './pdfLibEngine';
import { StandardFonts, rgb } from 'pdf-lib';

export interface PageOcrOutput {
  pageNumber: number;
  text: string;
  confidence: number;
}

export interface OcrDocumentResult {
  pages: PageOcrOutput[];
  fullText: string;
  averageConfidence: number;
}

export const SUPPORTED_OCR_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'jpn', name: 'Japanese' },
];

export async function runOcrOnPdfPages(
  data: Uint8Array,
  pageIndices: number[], // 0-indexed
  language = 'eng',
  onProgress?: (current: number, total: number, status: string) => void
): Promise<OcrDocumentResult> {
  const pdfDoc = await getPdfjsDocument(data);
  const totalTargetPages = pageIndices.length;

  if (totalTargetPages === 0) {
    return { pages: [], fullText: '', averageConfidence: 0 };
  }

  if (onProgress) {
    onProgress(0, totalTargetPages, 'Initializing OCR engine...');
  }

  // Initialize Tesseract worker
  const worker = await createWorker(language, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const pct = Math.round((m.progress || 0) * 100);
        onProgress(0, totalTargetPages, `Recognizing text (${pct}%)...`);
      }
    },
  });

  const pagesOutput: PageOcrOutput[] = [];
  let totalConfidence = 0;

  try {
    for (let i = 0; i < pageIndices.length; i++) {
      const pageIdx = pageIndices[i];
      const pageNum = pageIdx + 1;

      if (onProgress) {
        onProgress(i + 1, totalTargetPages, `Rendering page ${pageNum}...`);
      }

      const page = await pdfDoc.getPage(pageNum);
      // High-resolution rendering for maximum OCR accuracy (scale: 2.0)
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      if (onProgress) {
        onProgress(i + 1, totalTargetPages, `Analyzing page ${pageNum} (${i + 1}/${totalTargetPages})...`);
      }

      // Perform OCR on rendered canvas
      const { data: ocrData } = await worker.recognize(canvas);
      const recognizedText = ocrData.text.trim();
      const confidence = Math.round(ocrData.confidence || 0);

      pagesOutput.push({
        pageNumber: pageNum,
        text: recognizedText,
        confidence,
      });

      totalConfidence += confidence;
    }
  } finally {
    await worker.terminate();
  }

  const fullText = pagesOutput.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');
  const averageConfidence =
    pagesOutput.length > 0 ? Math.round(totalConfidence / pagesOutput.length) : 0;

  return {
    pages: pagesOutput,
    fullText,
    averageConfidence,
  };
}

/**
 * Embeds OCR-recognized text into a selectable text layer behind each PDF page.
 */
export async function embedOcrTextLayer(
  pdfData: Uint8Array,
  pageOcrOutputs: PageOcrOutput[]
): Promise<Uint8Array> {
  const pdfDoc = await loadPdfLibDoc(pdfData);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const ocrMap = new Map<number, string>();
  for (const p of pageOcrOutputs) {
    ocrMap.set(p.pageNumber - 1, p.text);
  }

  for (let i = 0; i < pages.length; i++) {
    const text = ocrMap.get(i);
    if (!text) continue;

    const page = pages[i];
    const { height: pageHeight } = page.getSize();

    // Split text into lines and embed as faint/invisible selectable text
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    let curY = pageHeight - 40;

    for (const line of lines) {
      if (curY < 30) break;
      const cleanLine = line.replace(/[^\x20-\x7E]/g, ' ').substring(0, 100);
      try {
        page.drawText(cleanLine, {
          x: 40,
          y: curY,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.1),
          opacity: 0.01, // Invisible selectable text layer
        });
      } catch {
        // Ignore character encoding errors for exotic glyphs
      }
      curY -= 12;
    }
  }

  return await savePdfLibDoc(pdfDoc);
}
