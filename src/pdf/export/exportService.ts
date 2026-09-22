/**
 * PDF Export & Local Download Service for PDF-LoFi.
 * Manages Blob creation, filename sanitization, and URL revocation.
 */

export function sanitizeFilename(filename: string): string {
  const clean = filename.replace(/[/\\?%*:|"<>]/g, '_').trim();
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean || 'document'}.pdf`;
}

export function createPdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

export function triggerLocalDownload(bytes: Uint8Array, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const validName = sanitizeFilename(filename);
  const blob = createPdfBlob(bytes);
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = validName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke object URL to avoid browser memory leaks
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
}
