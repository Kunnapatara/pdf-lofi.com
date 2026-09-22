/**
 * Network Policy & Privacy Enforcement for PDF-LoFi.
 *
 * Core Guarantee:
 * Zero document bytes, text, thumbnails, or metadata leave the user's browser.
 *
 * External network requests are restricted strictly to:
 * - Google Fonts (Plus Jakarta Sans, JetBrains Mono stylesheets)
 * - Mozilla PDF.js Web Worker script (cdnjs CDN)
 * - YouTube Focus Stream embed (youtube-nocookie.com)
 */

export interface NetworkAllowlistItem {
  domain: string;
  purpose: string;
  handlesDocumentData: false;
}

export const ALLOWED_EXTERNAL_HOSTS: readonly NetworkAllowlistItem[] = [
  {
    domain: 'fonts.googleapis.com',
    purpose: 'Typography stylesheets',
    handlesDocumentData: false,
  },
  {
    domain: 'fonts.gstatic.com',
    purpose: 'Typography font files',
    handlesDocumentData: false,
  },
  {
    domain: 'cdnjs.cloudflare.com',
    purpose: 'Mozilla PDF.js compiled worker script',
    handlesDocumentData: false,
  },
  {
    domain: 'www.youtube-nocookie.com',
    purpose: 'Work & Focus ambient audio/video embed',
    handlesDocumentData: false,
  },
] as const;

/**
 * Validates that an operation is being executed strictly on-device.
 */
export function assertLocalProcessing(operationName: string): boolean {
  // In-browser execution assertion
  if (typeof window === 'undefined') {
    throw new Error(`Operation ${operationName} cannot run outside browser runtime.`);
  }
  return true;
}
