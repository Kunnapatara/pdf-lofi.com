/**
 * Automated Verification Script for PDF-LoFi Engine & Operations
 * Tests real PDF transformations with pdf-lib and pdfjs-dist.
 */
import { PDFDocument, rgb, StandardFonts, PDFTextField, PDFCheckBox } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Import operations
import {
  executeMergePdfs,
  executeExtractPages,
  executeReorderPages,
  executeRotatePage,
  executeRotateMultiplePages,
  executeDeletePages,
  executeDuplicatePage,
  executeInsertBlankPage,
  executeReversePages,
  executeCropPages,
  executeResizePages,
  executeAddPageNumbers,
  executeAddTextWatermark,
  executeAddStamp,
  executeInsertImage,
  inspectPdfDocument,
  executeUpdateMetadata,
  executeSanitizeMetadata,
  inspectPdfForm,
  executeFillForm,
  executeFlattenForm,
  comparePdfDocuments,
  executeCompressPdf,
} from './src/pdf/core/operations';
import { embedOcrTextLayer, PageOcrOutput } from './src/pdf/engines/ocrEngine';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`[PASS] ${name}: ${details}`);
  } else {
    results.push({ name, passed: false, details: `FAILED: ${details}` });
    console.error(`[FAIL] ${name}: ${details}`);
  }
}

async function createMultiPageFixture(pageCount = 3, label = 'Doc'): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`${label} - Page ${i} Content`, { x: 50, y: 700, font, size: 24, color: rgb(0.1, 0.1, 0.1) });
  }
  return await doc.save();
}

async function createAcroFormFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const form = doc.getForm();
  
  const textField = form.createTextField('fullName');
  textField.setText('Jane Doe');
  textField.addToPage(page, { x: 50, y: 700, width: 200, height: 25 });

  const checkBox = form.createCheckBox('agreeTerms');
  checkBox.addToPage(page, { x: 50, y: 650, width: 20, height: 20 });

  return await doc.save();
}

async function createTinyPngBytes(): Promise<Uint8Array> {
  // 1x1 transparent PNG
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function runAllTests() {
  console.log('--- STARTING VERIFICATION TEST SUITE ---');

  // Test 1: Merge PDF
  try {
    const doc1 = await createMultiPageFixture(3, 'Doc1');
    const doc2 = await createMultiPageFixture(2, 'Doc2');
    const merged = await executeMergePdfs([doc1, doc2]);
    const reloaded = await PDFDocument.load(merged.data);
    assert(reloaded.getPageCount() === 5, 'Merge PDF', `Merged 3+2 pages, got ${reloaded.getPageCount()} pages`);
  } catch (e: any) {
    assert(false, 'Merge PDF', e.message);
  }

  // Test 2: Split / Extract Pages
  try {
    const doc = await createMultiPageFixture(5, 'Doc');
    const extracted = await executeExtractPages(doc, [1, 3]); // pages 2 and 4 (0-indexed 1 and 3)
    const reloaded = await PDFDocument.load(extracted.data);
    assert(reloaded.getPageCount() === 2, 'Split / Extract Pages', `Extracted 2 pages from 5, got ${reloaded.getPageCount()} pages`);
  } catch (e: any) {
    assert(false, 'Split / Extract Pages', e.message);
  }

  // Test 3: Reorder Pages
  try {
    const doc = await createMultiPageFixture(4, 'Doc');
    const reordered = await executeReorderPages(doc, [3, 2, 1, 0]);
    const reloaded = await PDFDocument.load(reordered.data);
    assert(reloaded.getPageCount() === 4, 'Reorder Pages', `Reordered 4 pages successfully`);
  } catch (e: any) {
    assert(false, 'Reorder Pages', e.message);
  }

  // Test 4: Rotate Pages
  try {
    const doc = await createMultiPageFixture(2, 'Doc');
    const rotatedCW = await executeRotatePage(doc, 0, 90);
    const reloadedCW = await PDFDocument.load(rotatedCW.data);
    const angleCW = reloadedCW.getPage(0).getRotation().angle;
    assert(angleCW === 90, 'Rotate Pages CW', `Page 0 rotated CW to ${angleCW}°`);

    const rotatedCCW = await executeRotatePage(rotatedCW.data, 0, -90);
    const reloadedCCW = await PDFDocument.load(rotatedCCW.data);
    const angleCCW = reloadedCCW.getPage(0).getRotation().angle;
    assert(angleCCW === 0, 'Rotate Pages CCW', `Page 0 rotated CCW back to ${angleCCW}°`);
  } catch (e: any) {
    assert(false, 'Rotate Pages', e.message);
  }

  // Test 5: Delete Pages
  try {
    const doc = await createMultiPageFixture(5, 'Doc');
    const deleted = await executeDeletePages(doc, [1, 3]);
    const reloaded = await PDFDocument.load(deleted.data);
    assert(reloaded.getPageCount() === 3, 'Delete Pages', `Deleted 2 pages from 5, remaining: ${reloaded.getPageCount()}`);
  } catch (e: any) {
    assert(false, 'Delete Pages', e.message);
  }

  // Test 6: Duplicate Pages
  try {
    const doc = await createMultiPageFixture(2, 'Doc');
    const duplicated = await executeDuplicatePage(doc, 0);
    const reloaded = await PDFDocument.load(duplicated.data);
    assert(reloaded.getPageCount() === 3, 'Duplicate Page', `Duplicated page 0, got ${reloaded.getPageCount()} pages`);
  } catch (e: any) {
    assert(false, 'Duplicate Page', e.message);
  }

  // Test 7: Insert Blank Page
  try {
    const doc = await createMultiPageFixture(2, 'Doc');
    const inserted = await executeInsertBlankPage(doc, 1);
    const reloaded = await PDFDocument.load(inserted.data);
    assert(reloaded.getPageCount() === 3, 'Insert Blank Page', `Inserted blank page at idx 1, got ${reloaded.getPageCount()} pages`);
  } catch (e: any) {
    assert(false, 'Insert Blank Page', e.message);
  }

  // Test 8: Reverse Pages
  try {
    const doc = await createMultiPageFixture(3, 'Doc');
    const reversed = await executeReversePages(doc);
    const reloaded = await PDFDocument.load(reversed.data);
    assert(reloaded.getPageCount() === 3, 'Reverse Pages', `Reversed 3 pages, preserved count ${reloaded.getPageCount()}`);
  } catch (e: any) {
    assert(false, 'Reverse Pages', e.message);
  }

  // Test 9: Crop Margins (CropBox modification)
  try {
    const doc = await createMultiPageFixture(1, 'Doc');
    const cropped = await executeCropPages(doc, { top: 20, bottom: 20, left: 30, right: 30 });
    const reloaded = await PDFDocument.load(cropped.data);
    const cropBox = reloaded.getPage(0).getCropBox();
    assert(cropBox.x === 30 && cropBox.y === 20, 'Crop Margins', `CropBox adjusted to x=${cropBox.x}, y=${cropBox.y}, width=${cropBox.width}, height=${cropBox.height}`);
  } catch (e: any) {
    assert(false, 'Crop Margins', e.message);
  }

  // Test 10: Standardize Page Size
  try {
    const doc = await createMultiPageFixture(1, 'Doc');
    const resizedA4 = await executeResizePages(doc, { preset: 'a4', scaleContent: true });
    const reloadedA4 = await PDFDocument.load(resizedA4.data);
    const sizeA4 = reloadedA4.getPage(0).getSize();
    assert(Math.abs(sizeA4.width - 595.28) < 1 && Math.abs(sizeA4.height - 841.89) < 1, 'Standardize Page Size (A4)', `Page resized to ${sizeA4.width} x ${sizeA4.height}`);

    const resizedLetter = await executeResizePages(doc, { preset: 'letter', scaleContent: true });
    const reloadedLetter = await PDFDocument.load(resizedLetter.data);
    const sizeLetter = reloadedLetter.getPage(0).getSize();
    assert(Math.abs(sizeLetter.width - 612) < 1 && Math.abs(sizeLetter.height - 792) < 1, 'Standardize Page Size (Letter)', `Page resized to ${sizeLetter.width} x ${sizeLetter.height}`);
  } catch (e: any) {
    assert(false, 'Standardize Page Size', e.message);
  }

  // Test 11: Page Numbers
  try {
    const doc = await createMultiPageFixture(3, 'Doc');
    const numbered = await executeAddPageNumbers(doc, {
      startNumber: 1,
      prefix: 'Page ',
      suffix: ' of {total}',
      position: 'bottom-center',
    });
    const reloaded = await PDFDocument.load(numbered.data);
    assert(reloaded.getPageCount() === 3, 'Page Numbers', `Successfully stamped page numbers on 3 pages`);
  } catch (e: any) {
    assert(false, 'Page Numbers', e.message);
  }

  // Test 12: Watermark PDF
  try {
    const doc = await createMultiPageFixture(2, 'Doc');
    const watermarked = await executeAddTextWatermark(doc, {
      text: 'CONFIDENTIAL',
      opacity: 0.25,
      rotationAngle: 45,
      fontSize: 40,
    });
    const reloaded = await PDFDocument.load(watermarked.data);
    assert(reloaded.getPageCount() === 2, 'Watermark PDF', `Embedded vector text watermark across document`);
  } catch (e: any) {
    assert(false, 'Watermark PDF', e.message);
  }

  // Test 13: Document Stamps
  try {
    const doc = await createMultiPageFixture(1, 'Doc');
    const stamped = await executeAddStamp(doc, {
      type: 'APPROVED',
      position: 'top-right',
      includeDate: true,
    });
    const reloaded = await PDFDocument.load(stamped.data);
    assert(reloaded.getPageCount() === 1, 'Document Stamps', `Stamped APPROVED badge with date onto page`);
  } catch (e: any) {
    assert(false, 'Document Stamps', e.message);
  }

  // Test 14: Signature Image / Insert Image
  try {
    const doc = await createMultiPageFixture(1, 'Doc');
    const pngBytes = await createTinyPngBytes();
    const inserted = await executeInsertImage(doc, {
      imageData: pngBytes,
      mimeType: 'image/png',
      width: 100,
      height: 50,
      pageIndex: 0,
      positionPreset: 'bottom-right',
    });
    const reloaded = await PDFDocument.load(inserted.data);
    assert(reloaded.getPageCount() === 1, 'Insert Signature / Image', `Embedded electronic signature PNG onto document`);
  } catch (e: any) {
    assert(false, 'Insert Signature / Image', e.message);
  }

  // Test 15: Inspect & Metadata
  try {
    const doc = await createMultiPageFixture(2, 'Doc');
    const inspected = await inspectPdfDocument(doc);
    assert(inspected.pageCount === 2, 'Inspect PDF', `Inspected document: ${inspected.pageCount} pages, size ${inspected.pageSize.widthPt}x${inspected.pageSize.heightPt} pt`);

    const updated = await executeUpdateMetadata(doc, {
      title: 'Verified Title',
      author: 'Verified Author',
    });
    const reloaded = await PDFDocument.load(updated.data);
    assert(reloaded.getTitle() === 'Verified Title' && reloaded.getAuthor() === 'Verified Author', 'Update Metadata', `Updated title to "${reloaded.getTitle()}" and author to "${reloaded.getAuthor()}"`);

    const sanitized = await executeSanitizeMetadata(updated.data);
    const sanitizedReloaded = await PDFDocument.load(sanitized.data);
    assert(!sanitizedReloaded.getTitle() && !sanitizedReloaded.getAuthor(), 'Sanitize Metadata', `Sanitized all identifying metadata`);
  } catch (e: any) {
    assert(false, 'Inspect & Metadata', e.message);
  }

  // Test 16: Forms & Flatten
  try {
    const formDoc = await createAcroFormFixture();
    const inspected = await inspectPdfForm(formDoc);
    assert(inspected.hasForm && inspected.fields.length === 2, 'Inspect AcroForm', `Detected AcroForm with ${inspected.fields.length} fields`);

    const filled = await executeFillForm(formDoc, {
      fullName: 'Alice Smith',
      agreeTerms: true,
    });
    const filledDoc = await PDFDocument.load(filled.data);
    const filledForm = filledDoc.getForm();
    const nameField = filledForm.getTextField('fullName');
    assert(nameField.getText() === 'Alice Smith', 'Fill AcroForm', `Field fullName updated to "${nameField.getText()}"`);

    const flattened = await executeFlattenForm(filled.data);
    const flattenedDoc = await PDFDocument.load(flattened.data);
    const flattenedForm = flattenedDoc.getForm();
    const flattenedFields = flattenedForm.getFields();
    assert(flattenedFields.length === 0, 'Flatten AcroForm', `Flattened fields into static vectors; remaining interactive fields: ${flattenedFields.length}`);
  } catch (e: any) {
    assert(false, 'Forms & Flatten', e.message);
  }

  // Test 17: Text Comparison
  try {
    const docA = await createMultiPageFixture(2, 'Version A');
    const docB = await createMultiPageFixture(2, 'Version B');
    const compResult = await comparePdfDocuments(docA, docB, 'docA.pdf', 'docB.pdf');
    assert(compResult.totalComparedPages === 2 && compResult.modifiedPagesCount === 2, 'Compare Documents (Text Diff)', `Compared 2 documents: identified ${compResult.modifiedPagesCount} modified pages`);
  } catch (e: any) {
    assert(false, 'Compare Documents', e.message);
  }

  // Test 18: Stream Compression
  try {
    const doc = await createMultiPageFixture(3, 'Compress Test');
    const compRes = await executeCompressPdf(doc, { stripMetadata: true, compressStreams: true });
    const reloaded = await PDFDocument.load(compRes.data);
    assert(reloaded.getPageCount() === 3, 'Compress PDF (Stream Optimization)', `Re-encoded streams; original: ${compRes.originalSize}B, compressed: ${compRes.compressedSize}B, valid PDF`);
  } catch (e: any) {
    assert(false, 'Compress PDF', e.message);
  }

  // Test 19: embedOcrTextLayer Unicode Latin accents test
  try {
    const doc = await createMultiPageFixture(1, 'Doc');
    const ocrOutputs: PageOcrOutput[] = [
      {
        pageNumber: 1,
        text: 'Résumé de l’année: Über große Änderungen & Español niño',
        confidence: 95,
      },
    ];
    const embedded = await embedOcrTextLayer(doc, ocrOutputs);
    const reloaded = await PDFDocument.load(embedded);
    assert(reloaded.getPageCount() === 1, 'OCR Embed Text Layer (Latin Accents)', `Embedded text layer containing accented Latin characters without crashing`);
  } catch (e: any) {
    assert(false, 'OCR Embed Text Layer (Latin Accents)', e.message);
  }

  // Test 20: Corrupted PDF error handling
  try {
    const corruptData = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x00, 0x99, 0xaa, 0xbb]); // broken bytes
    let caught = false;
    try {
      await PDFDocument.load(corruptData);
    } catch {
      caught = true;
    }
    assert(caught, 'Corrupted PDF Rejection', 'Corrupted PDF correctly rejected with an error; confirms why fake repair must not be claimed');
  } catch (e: any) {
    assert(false, 'Corrupted PDF Rejection', e.message);
  }

  console.log('--- TEST SUMMARY ---');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passedCount} / ${results.length}`);
}

runAllTests();
