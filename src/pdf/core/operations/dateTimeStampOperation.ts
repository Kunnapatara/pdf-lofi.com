/**
 * Date & Time Stamp Operation for PDF-LoFi.
 * Overlays deterministic date and time stamps onto selected pages.
 *
 * Determinism requirement:
 * The timestamp is captured strictly at execution time (or supplied via custom values).
 * Once rendered, the static text vector is embedded in the PDF and does not depend on a live clock.
 */
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';
import {
  calculateTextCoordinates,
  parseHexColor,
  resolveStandardFont,
  StandardTextPosition,
  SupportedFontFamily,
} from './textPrimitive';

export type StampMode =
  | 'current-date'
  | 'current-date-time'
  | 'custom-date'
  | 'custom-date-time';

export type DateFormat =
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'MONTH_DD_YYYY'; // e.g. "September 29, 2026"

export type TimeFormat =
  | '24_SEC' // "14:30:15"
  | '24_MIN' // "14:30"
  | '12_SEC' // "02:30:15 PM"
  | '12_MIN'; // "02:30 PM"

export interface DateTimeStampOptions {
  mode?: StampMode;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  customDate?: string; // e.g. "2026-09-29"
  customTime?: string; // e.g. "14:30"
  prefix?: string; // e.g. "Received: " or "Stamped: "
  suffix?: string;

  // Typography & Placement
  position?: StandardTextPosition;
  fontFamily?: SupportedFontFamily;
  fontSize?: number;
  textColorHex?: string;
  opacity?: number;
  margin?: number; // distance in points from edge

  // Target pages
  selectedPages?: number[]; // 0-indexed; if omitted or empty, applies to all pages

  // Optional execution timestamp override for testing
  executionTimestamp?: Date;
}

export interface DateTimeStampResult extends OperationResult {
  stampedText: string;
  stampedPagesCount: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Formats a Date object according to chosen DateFormat.
 */
export function formatDate(date: Date, format: DateFormat = 'YYYY-MM-DD'): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'MONTH_DD_YYYY':
      return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${yyyy}`;
    case 'YYYY-MM-DD':
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Formats a Date object according to chosen TimeFormat.
 */
export function formatTime(date: Date, format: TimeFormat = '24_MIN'): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (format) {
    case '24_SEC':
      return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
    case '24_MIN':
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    case '12_SEC': {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    }
    case '12_MIN': {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    default:
      return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
}

/**
 * Resolves the deterministic text string for the stamp based on options.
 */
export function buildStampText(options: DateTimeStampOptions): string {
  const mode = options.mode || 'current-date';
  const prefix = options.prefix || '';
  const suffix = options.suffix || '';
  const execDate = options.executionTimestamp || new Date();

  let body = '';
  switch (mode) {
    case 'current-date': {
      body = formatDate(execDate, options.dateFormat);
      break;
    }
    case 'current-date-time': {
      const d = formatDate(execDate, options.dateFormat);
      const t = formatTime(execDate, options.timeFormat);
      body = `${d} ${t}`;
      break;
    }
    case 'custom-date': {
      body = options.customDate || formatDate(execDate, options.dateFormat);
      break;
    }
    case 'custom-date-time': {
      const d = options.customDate || formatDate(execDate, options.dateFormat);
      const t = options.customTime || formatTime(execDate, options.timeFormat);
      body = `${d} ${t}`.trim();
      break;
    }
  }

  return `${prefix}${body}${suffix}`;
}

export async function executeAddDateTimeStamp(
  data: Uint8Array,
  options: DateTimeStampOptions = {}
): Promise<DateTimeStampResult> {
  if (!data || data.length === 0) {
    throw new Error('PDF document bytes are required for Date & Time Stamp operation.');
  }

  const {
    position = 'top-right',
    fontFamily = 'Helvetica',
    fontSize = 10,
    textColorHex = '#1E293B',
    opacity = 1.0,
    margin = 36,
    selectedPages,
  } = options;

  if (fontSize <= 0 || fontSize > 72) {
    throw new Error('Font size must be between 1 and 72 pt.');
  }
  if (margin < 0) {
    throw new Error('Margin cannot be negative.');
  }

  const stampedText = buildStampText(options);
  if (!stampedText.trim()) {
    throw new Error('Stamp text cannot be empty.');
  }

  const pdfDoc = await loadPdfLibDoc(data);
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error('PDF document must contain at least 1 page.');
  }

  const font = await resolveStandardFont(pdfDoc, fontFamily);
  const color = parseHexColor(textColorHex);
  const safeOpacity = Math.max(0.05, Math.min(1.0, opacity));

  const targetSet = selectedPages && selectedPages.length > 0 ? new Set(selectedPages) : null;
  let stampedCount = 0;

  for (let i = 0; i < total; i++) {
    if (targetSet && !targetSet.has(i)) {
      continue;
    }

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    const textWidth = font.widthOfTextAtSize(stampedText, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    const { x, y } = calculateTextCoordinates(
      position,
      width,
      height,
      textWidth,
      textHeight,
      margin,
      margin
    );

    page.drawText(stampedText, {
      x,
      y,
      size: fontSize,
      font,
      color,
      opacity: safeOpacity,
    });

    stampedCount++;
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: total,
    stampedText,
    stampedPagesCount: stampedCount,
  };
}
