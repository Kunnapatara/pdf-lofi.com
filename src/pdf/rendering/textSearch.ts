/**
 * Client-Side PDF Text Search Engine for PDF-LoFi.
 * Scans page text streams in-memory with contextual snippet extraction.
 */
import { getPdfjsDocument } from '../engines/pdfjsEngine';
import { SearchMatch } from '../../types/pdf';

export async function searchPdfInBrowser(
  data: Uint8Array,
  query: string
): Promise<SearchMatch[]> {
  if (!query || query.trim().length < 2) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const pdfDoc = await getPdfjsDocument(data);
  const matches: SearchMatch[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    const lowerPageText = pageText.toLowerCase();
    const matchIndex = lowerPageText.indexOf(normalizedQuery);

    if (matchIndex !== -1) {
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(pageText.length, matchIndex + normalizedQuery.length + 50);
      const snippet =
        (start > 0 ? '...' : '') +
        pageText.substring(start, end).trim() +
        (end < pageText.length ? '...' : '');

      matches.push({
        pageNumber: i,
        textSnippet: snippet || pageText.slice(0, 80),
      });
    }
  }

  return matches;
}
