/**
 * Page Assembly (Collate / Uncollate / Alternate Assembly) Operation for PDF-LoFi.
 * Supports:
 * 1. Single-document collation & uncollation (reorganizing duplicate sets).
 * 2. Multi-document alternating assembly (interleaving pages across N source documents).
 * Preserves vector content, fonts, and annotations via pdf-lib copyPages.
 */
import { loadPdfLibDoc, savePdfLibDoc, createEmptyPdfDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface CollateDocumentOptions {
  mode: 'collate' | 'uncollate';
  copies?: number; // Number of duplicated sets (e.g. 2, 3...)
  pagesPerSet?: number; // Size of each document set
}

export interface AlternateAssemblyOptions {
  /** If true, reverses even documents (0-indexed odd: 2nd, 4th...) for duplex back-side scans */
  reverseEven?: boolean;
}

/**
 * Reorganizes a single PDF document between collated and uncollated sequence.
 * 
 * Collated:   [Set1_P1, Set1_P2, Set1_P3, Set2_P1, Set2_P2, Set2_P3]
 * Uncollated: [Set1_P1, Set2_P1, Set1_P2, Set2_P2, Set1_P3, Set2_P3]
 */
export async function executeCollateDocument(
  data: Uint8Array,
  options: CollateDocumentOptions
): Promise<OperationResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Collate / Uncollate processing.');
  }

  const srcDoc = await loadPdfLibDoc(data);
  const total = srcDoc.getPageCount();

  if (total === 0) {
    throw new Error('PDF document must contain at least 1 page for Collate processing.');
  }

  if (total === 1) {
    return { data, pageCount: 1 };
  }

  const mode = options.mode;
  let copies = options.copies;
  let pagesPerSet = options.pagesPerSet;

  if (!copies && !pagesPerSet) {
    copies = 2; // Default to 2 sets
    pagesPerSet = Math.ceil(total / copies);
  } else if (copies && !pagesPerSet) {
    copies = Math.max(1, copies);
    pagesPerSet = Math.ceil(total / copies);
  } else if (!copies && pagesPerSet) {
    pagesPerSet = Math.max(1, pagesPerSet);
    copies = Math.ceil(total / pagesPerSet);
  } else {
    copies = Math.max(1, copies!);
    pagesPerSet = Math.max(1, pagesPerSet!);
  }

  const newIndices: number[] = [];

  if (mode === 'uncollate') {
    // Input is Collated: group by page position (all P1s, then all P2s...)
    for (let p = 0; p < pagesPerSet; p++) {
      for (let c = 0; c < copies; c++) {
        const idx = c * pagesPerSet + p;
        if (idx < total) {
          newIndices.push(idx);
        }
      }
    }
  } else {
    // mode === 'collate'
    // Input is Uncollated: reconstruct sets (Set 1 all pages, then Set 2 all pages...)
    for (let c = 0; c < copies; c++) {
      for (let p = 0; p < pagesPerSet; p++) {
        const idx = p * copies + c;
        if (idx < total) {
          newIndices.push(idx);
        }
      }
    }
  }

  const outDoc = await createEmptyPdfDoc();
  const copiedPages = await outDoc.copyPages(srcDoc, newIndices);
  copiedPages.forEach((page) => outDoc.addPage(page));

  const savedBytes = await savePdfLibDoc(outDoc);
  return {
    data: savedBytes,
    pageCount: outDoc.getPageCount(),
  };
}

/**
 * Interleaves pages across multiple PDF documents in alternating sequence.
 * Handles unequal document lengths cleanly by continuing with remaining pages.
 */
export async function executeAlternateAssembly(
  documents: Uint8Array[],
  options?: AlternateAssemblyOptions
): Promise<OperationResult> {
  if (!documents || documents.length === 0) {
    throw new Error('At least one PDF document is required for Alternate Assembly.');
  }

  if (documents.length === 1) {
    const srcDoc = await loadPdfLibDoc(documents[0]);
    return { data: documents[0], pageCount: srcDoc.getPageCount() };
  }

  const loadedDocs = await Promise.all(documents.map((d) => loadPdfLibDoc(d)));
  const pageCounts = loadedDocs.map((d) => d.getPageCount());
  const maxPages = Math.max(...pageCounts);

  const outDoc = await createEmptyPdfDoc();

  // Prepare copied pages per document
  const copiedByDoc: any[][] = [];
  for (let d = 0; d < loadedDocs.length; d++) {
    const doc = loadedDocs[d];
    const count = pageCounts[d];
    const indices = Array.from({ length: count }, (_, i) => i);
    // If reverseEven is set, reverse even-numbered documents (1, 3, etc. 0-indexed)
    if (options?.reverseEven && d % 2 === 1) {
      indices.reverse();
    }
    const copied = await outDoc.copyPages(doc, indices);
    copiedByDoc.push(copied);
  }

  // Interleave round-robin
  for (let p = 0; p < maxPages; p++) {
    for (let d = 0; d < loadedDocs.length; d++) {
      if (p < copiedByDoc[d].length) {
        outDoc.addPage(copiedByDoc[d][p]);
      }
    }
  }

  const savedBytes = await savePdfLibDoc(outDoc);
  return {
    data: savedBytes,
    pageCount: outDoc.getPageCount(),
  };
}
