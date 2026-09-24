/**
 * PDF Comparison Engine for PDF-LoFi.
 * Performs client-side structural, page count, and page-by-page text diffing.
 * Zero server uploads.
 */
import { getPdfjsDocument } from '../../engines/pdfjsEngine';

export interface PageComparisonDiff {
  pageNumber: number;
  status: 'identical' | 'modified' | 'added_in_b' | 'removed_in_b';
  docAText: string;
  docBText: string;
  diffLines?: {
    type: 'same' | 'added' | 'removed';
    text: string;
  }[];
}

export interface DocumentComparisonResult {
  docAName: string;
  docBName: string;
  docAPageCount: number;
  docBPageCount: number;
  totalComparedPages: number;
  identicalPagesCount: number;
  modifiedPagesCount: number;
  pageDiffs: PageComparisonDiff[];
}

export async function comparePdfDocuments(
  docAData: Uint8Array,
  docBData: Uint8Array,
  docAName: string,
  docBName: string,
  progressCallback?: (current: number, total: number) => void
): Promise<DocumentComparisonResult> {
  const docA = await getPdfjsDocument(docAData);
  const docB = await getPdfjsDocument(docBData);

  const numPagesA = docA.numPages;
  const numPagesB = docB.numPages;
  const maxPages = Math.max(numPagesA, numPagesB);

  const pageDiffs: PageComparisonDiff[] = [];
  let identicalCount = 0;
  let modifiedCount = 0;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    if (progressCallback) {
      progressCallback(pageNum, maxPages);
    }

    let textA = '';
    let textB = '';

    if (pageNum <= numPagesA) {
      try {
        const pageA = await docA.getPage(pageNum);
        const contentA = await pageA.getTextContent();
        textA = contentA.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch {
        textA = '';
      }
    }

    if (pageNum <= numPagesB) {
      try {
        const pageB = await docB.getPage(pageNum);
        const contentB = await pageB.getTextContent();
        textB = contentB.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch {
        textB = '';
      }
    }

    if (pageNum > numPagesA) {
      pageDiffs.push({
        pageNumber: pageNum,
        status: 'added_in_b',
        docAText: '',
        docBText: textB,
      });
      modifiedCount++;
    } else if (pageNum > numPagesB) {
      pageDiffs.push({
        pageNumber: pageNum,
        status: 'removed_in_b',
        docAText: textA,
        docBText: '',
      });
      modifiedCount++;
    } else if (textA === textB) {
      pageDiffs.push({
        pageNumber: pageNum,
        status: 'identical',
        docAText: textA,
        docBText: textB,
      });
      identicalCount++;
    } else {
      // Compute line diff
      const linesA = textA.split(/(?<=[.?!])\s+/).filter(Boolean);
      const linesB = textB.split(/(?<=[.?!])\s+/).filter(Boolean);
      const diffLines: { type: 'same' | 'added' | 'removed'; text: string }[] = [];

      const setB = new Set(linesB);
      const setA = new Set(linesA);

      for (const line of linesA) {
        if (setB.has(line)) {
          diffLines.push({ type: 'same', text: line });
        } else {
          diffLines.push({ type: 'removed', text: line });
        }
      }

      for (const line of linesB) {
        if (!setA.has(line)) {
          diffLines.push({ type: 'added', text: line });
        }
      }

      pageDiffs.push({
        pageNumber: pageNum,
        status: 'modified',
        docAText: textA,
        docBText: textB,
        diffLines,
      });
      modifiedCount++;
    }
  }

  return {
    docAName,
    docBName,
    docAPageCount: numPagesA,
    docBPageCount: numPagesB,
    totalComparedPages: maxPages,
    identicalPagesCount: identicalCount,
    modifiedPagesCount: modifiedCount,
    pageDiffs,
  };
}
