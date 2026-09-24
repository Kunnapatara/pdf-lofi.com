/**
 * Deterministic Page Range Parser for PDF-LoFi.
 * Supports ranges such as: "1", "1-3", "1,4,7", "1-3,7,9-11".
 *
 * Strict Rules:
 * - Reject invalid page numbers (<= 0 or > totalPages)
 * - Reject reversed ranges (e.g., "5-2")
 * - Reject non-numeric malformed tokens
 * - Remove duplicates deterministically
 * - Preserve original document ascending page order
 * - Never silently select unintended pages
 */

export interface RangeParseResult {
  valid: boolean;
  pageIndices: number[]; // 0-indexed for pdf-lib
  pageNumbers: number[]; // 1-indexed for display
  pageCount: number;
  displaySummary: string;
  error?: string;
}

export function parsePageRange(input: string, totalPages: number): RangeParseResult {
  if (totalPages <= 0) {
    return {
      valid: false,
      pageIndices: [],
      pageNumbers: [],
      pageCount: 0,
      displaySummary: 'No document loaded',
      error: 'Document has no pages.',
    };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      valid: false,
      pageIndices: [],
      pageNumbers: [],
      pageCount: 0,
      displaySummary: '0 pages selected',
      error: 'Please enter at least one page number or range (e.g. 1-3, 5).',
    };
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return {
      valid: false,
      pageIndices: [],
      pageNumbers: [],
      pageCount: 0,
      displaySummary: '0 pages selected',
      error: 'Please enter valid page numbers or ranges.',
    };
  }

  const pageSet = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const subParts = part.split('-');
      if (subParts.length !== 2) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Invalid range',
          error: `Invalid range format: "${part}". Expected format like "1-5".`,
        };
      }

      const startStr = subParts[0].trim();
      const endStr = subParts[1].trim();

      if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Invalid range',
          error: `Non-numeric values in range: "${part}".`,
        };
      }

      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (start <= 0 || end <= 0) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Invalid page',
          error: `Page numbers must be 1 or greater (found "${part}").`,
        };
      }

      if (start > end) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Reversed range',
          error: `Reversed range "${part}" is not supported. Use "${end}-${start}" instead.`,
        };
      }

      if (start > totalPages || end > totalPages) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Out of bounds',
          error: `Range "${part}" exceeds document length (${totalPages} pages).`,
        };
      }

      for (let p = start; p <= end; p++) {
        pageSet.add(p);
      }
    } else {
      if (!/^\d+$/.test(part)) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Invalid page',
          error: `Invalid page value "${part}". Please enter numbers only.`,
        };
      }

      const pageNum = parseInt(part, 10);
      if (pageNum <= 0) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Invalid page',
          error: `Page numbers must be 1 or greater (found "${part}").`,
        };
      }

      if (pageNum > totalPages) {
        return {
          valid: false,
          pageIndices: [],
          pageNumbers: [],
          pageCount: 0,
          displaySummary: 'Out of bounds',
          error: `Page ${pageNum} exceeds document length (${totalPages} pages).`,
        };
      }

      pageSet.add(pageNum);
    }
  }

  // Sort deterministically to preserve original document ascending order
  const pageNumbers = Array.from(pageSet).sort((a, b) => a - b);
  const pageIndices = pageNumbers.map((p) => p - 1);

  if (pageNumbers.length === 0) {
    return {
      valid: false,
      pageIndices: [],
      pageNumbers: [],
      pageCount: 0,
      displaySummary: '0 pages selected',
      error: 'No valid pages selected.',
    };
  }

  const summary =
    pageNumbers.length === 1
      ? `Page ${pageNumbers[0]}`
      : `${pageNumbers.length} pages (${pageNumbers.join(', ')})`;

  return {
    valid: true,
    pageIndices,
    pageNumbers,
    pageCount: pageNumbers.length,
    displaySummary: summary,
  };
}
