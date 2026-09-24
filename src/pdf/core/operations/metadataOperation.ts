/**
 * Metadata & Structural Inspection Operations for PDF-LoFi.
 * Reads, updates, sanitizes metadata and detects PDF structures completely in-browser.
 */
import { PDFName, PDFDict, PDFArray } from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface DocumentInspectionData {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  creator: string;
  producer: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  pdfVersion: string;
  pageSize: {
    widthPt: number;
    heightPt: number;
    widthMm: number;
    heightMm: number;
    orientation: 'Portrait' | 'Landscape' | 'Square';
  };
  structure: {
    isEncrypted: boolean;
    hasForms: boolean;
    formFieldCount: number;
    hasOutlines: boolean;
    fontCount: number;
    imageCount: number;
    annotationCount: number;
  };
}

export async function inspectPdfDocument(data: Uint8Array): Promise<DocumentInspectionData> {
  const pdfDoc = await loadPdfLibDoc(data);
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  const title = pdfDoc.getTitle() || '';
  const author = pdfDoc.getAuthor() || '';
  const subject = pdfDoc.getSubject() || '';
  const rawKeywords = pdfDoc.getKeywords() || '';
  const keywords = rawKeywords
    ? rawKeywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean)
    : [];
  const creator = pdfDoc.getCreator() || '';
  const producer = pdfDoc.getProducer() || '';
  const creationDate = pdfDoc.getCreationDate()?.toISOString();
  const modificationDate = pdfDoc.getModificationDate()?.toISOString();

  // First page dimensions
  let widthPt = 595.28;
  let heightPt = 841.89;
  if (pages.length > 0) {
    const size = pages[0].getSize();
    widthPt = Math.round(size.width * 100) / 100;
    heightPt = Math.round(size.height * 100) / 100;
  }
  const widthMm = Math.round((widthPt * 25.4) / 72);
  const heightMm = Math.round((heightPt * 25.4) / 72);
  const orientation =
    widthPt > heightPt ? 'Landscape' : widthPt < heightPt ? 'Portrait' : 'Square';

  // Structure inspection
  let isEncrypted = false;
  try {
    const trailer = (pdfDoc as any).context?.trailerInfo;
    if (trailer?.Encrypt) {
      isEncrypted = true;
    }
  } catch {
    //
  }

  // Forms
  let hasForms = false;
  let formFieldCount = 0;
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    if (fields.length > 0) {
      hasForms = true;
      formFieldCount = fields.length;
    }
  } catch {
    //
  }

  // Outlines / Bookmarks
  let hasOutlines = false;
  try {
    const outlines = pdfDoc.catalog.lookupMaybe(PDFName.of('Outlines'), PDFDict);
    if (outlines) hasOutlines = true;
  } catch {
    //
  }

  // Fonts & Images count from page resources
  let fontCount = 0;
  let imageCount = 0;
  let annotationCount = 0;

  const fontNames = new Set<string>();

  for (const page of pages) {
    try {
      const pageDict = page.node;
      // Count annotations
      const annots = pageDict.lookupMaybe(PDFName.of('Annots'), PDFArray);
      if (annots) {
        annotationCount += annots.size();
      }

      // Count resources
      const resources = pageDict.lookupMaybe(PDFName.of('Resources'), PDFDict);
      if (resources) {
        const fonts = resources.lookupMaybe(PDFName.of('Font'), PDFDict);
        if (fonts) {
          const keys = fonts.keys();
          for (const k of keys) {
            fontNames.add(k.toString());
          }
        }
        const xobjects = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
        if (xobjects) {
          imageCount += xobjects.keys().length;
        }
      }
    } catch {
      // Ignore per-page inspection quirks
    }
  }
  fontCount = fontNames.size;

  return {
    title,
    author,
    subject,
    keywords,
    creator,
    producer,
    creationDate,
    modificationDate,
    pageCount,
    pdfVersion: '1.7',
    pageSize: {
      widthPt,
      heightPt,
      widthMm,
      heightMm,
      orientation,
    },
    structure: {
      isEncrypted,
      hasForms,
      formFieldCount,
      hasOutlines,
      fontCount,
      imageCount,
      annotationCount,
    },
  };
}

export interface UpdateMetadataOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
}

export async function executeUpdateMetadata(
  data: Uint8Array,
  updates: UpdateMetadataOptions
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);

  if (updates.title !== undefined) pdfDoc.setTitle(updates.title);
  if (updates.author !== undefined) pdfDoc.setAuthor(updates.author);
  if (updates.subject !== undefined) pdfDoc.setSubject(updates.subject);
  if (updates.keywords !== undefined) pdfDoc.setKeywords(updates.keywords);
  if (updates.creator !== undefined) pdfDoc.setCreator(updates.creator);
  if (updates.producer !== undefined) pdfDoc.setProducer(updates.producer);
  pdfDoc.setModificationDate(new Date());

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
  };
}

export async function executeSanitizeMetadata(data: Uint8Array): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);

  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator('PDF-LoFi Local Engine');
  pdfDoc.setProducer('PDF-LoFi Local Engine');

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
  };
}
