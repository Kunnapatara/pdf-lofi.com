import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates an authentic 4-page PDF document in-memory using pdf-lib.
 * Completely local, zero network requests.
 */
export async function generateSamplePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Introduction
  const page1 = pdfDoc.addPage([600, 780]);
  page1.drawRectangle({
    x: 40,
    y: 700,
    width: 520,
    height: 44,
    color: rgb(0.98, 0.45, 0.09), // Orange #F97316
  });
  page1.drawText('PDF-LoFi — Local-First PDF Workspace', {
    x: 55,
    y: 715,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page1.drawText('Page 1: Product Overview & Architecture', {
    x: 40,
    y: 660,
    size: 16,
    font: fontBold,
    color: rgb(0.11, 0.1, 0.09),
  });
  page1.drawText(
    'Everything you need to work with PDFs. Without uploading your documents.\n\n' +
    'Traditional PDF utilities require sending your sensitive files across third-party\n' +
    'cloud networks to remote servers for processing. PDF-LoFi takes a fundamentally\n' +
    'different approach:\n\n' +
    '• 100% Client-Side Processing: Core PDF operations execute in your browser engine.\n' +
    '• Zero Document Uploads: Files stay on your local device at all times.\n' +
    '• High Performance: Uses pdf-lib & Mozilla PDF.js for blazing fast manipulation.\n' +
    '• Privacy Verified: No telemetry on document contents or extracted text.',
    {
      x: 40,
      y: 520,
      size: 11,
      font: fontRegular,
      lineHeight: 18,
      color: rgb(0.2, 0.2, 0.2),
    }
  );
  page1.drawText('PDF-LoFi • Page 1 of 4 • Confidential & Local', {
    x: 40,
    y: 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Page 2: Core Operations
  const page2 = pdfDoc.addPage([600, 780]);
  page2.drawText('Page 2: Core Workspace Capabilities', {
    x: 40,
    y: 720,
    size: 16,
    font: fontBold,
    color: rgb(0.11, 0.1, 0.09),
  });
  page2.drawText(
    'PDF-LoFi Sprint 1 provides instant tools for everyday document workflows:\n\n' +
    '1. High Fidelity Viewer: Zoom, jump to page, and search text with live highlights.\n' +
    '2. Page Organization: Reorder pages, rotate by 90-degree increments, duplicate,\n' +
    '   or delete unnecessary pages with immediate visual feedback.\n' +
    '3. Insert Blank Pages: Easily append or prepend clean blank pages for formatting.\n' +
    '4. Merge Documents: Combine multiple PDF files seamlessly in any desired order.\n' +
    '5. Split & Extract: Select precise page ranges to export as independent PDFs.\n\n' +
    'All changes are previewed in real-time on your canvas without server round-trips.',
    {
      x: 40,
      y: 540,
      size: 11,
      font: fontRegular,
      lineHeight: 18,
      color: rgb(0.2, 0.2, 0.2),
    }
  );
  page2.drawText('PDF-LoFi • Page 2 of 4 • Confidential & Local', {
    x: 40,
    y: 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Page 3: Architecture & Security Verification
  const page3 = pdfDoc.addPage([600, 780]);
  page3.drawText('Page 3: Architecture & Security Verification', {
    x: 40,
    y: 720,
    size: 16,
    font: fontBold,
    color: rgb(0.11, 0.1, 0.09),
  });
  page3.drawText(
    'How PDF-LoFi guarantees your document privacy:\n\n' +
    '[1] File Import: Read directly via browser File API into ArrayBuffer.\n' +
    '[2] DOM Canvas Rendering: Rendered using Mozilla PDF.js canvas pipeline.\n' +
    '[3] Binary Mutations: Executed locally with pdf-lib (MIT License).\n' +
    '[4] Export: Generated as a local browser Blob URL (blob:http...) for download.\n\n' +
    'Network Auditing:\n' +
    'Open your browser Network tab at any time during manipulation. You will observe\n' +
    'zero POST/PUT requests transmitting PDF binaries. The processing is genuinely local.',
    {
      x: 40,
      y: 530,
      size: 11,
      font: fontRegular,
      lineHeight: 18,
      color: rgb(0.2, 0.2, 0.2),
    }
  );
  page3.drawText('PDF-LoFi • Page 3 of 4 • Confidential & Local', {
    x: 40,
    y: 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Page 4: Work & Focus
  const page4 = pdfDoc.addPage([600, 780]);
  page4.drawText('Page 4: Work & Focus Integration', {
    x: 40,
    y: 720,
    size: 16,
    font: fontBold,
    color: rgb(0.11, 0.1, 0.09),
  });
  page4.drawText(
    'Work & Focus pairs high-efficiency document processing with relaxing audio ambience:\n\n' +
    '• Seamless toggle between document editing and curated lo-fi audio.\n' +
    '• Built upon official standard YouTube embeds with zero hidden view generation.\n' +
    '• Focus timer to manage deep-work intervals.\n\n' +
    'Thank you for using PDF-LoFi. You can test rotating, deleting, duplicating, or\n' +
    'extracting this sample page right now in the workspace!',
    {
      x: 40,
      y: 550,
      size: 11,
      font: fontRegular,
      lineHeight: 18,
      color: rgb(0.2, 0.2, 0.2),
    }
  );
  page4.drawText('PDF-LoFi • Page 4 of 4 • Confidential & Local', {
    x: 40,
    y: 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
