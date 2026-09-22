/**
 * Local PDF Manipulation Engine Bridge for PDF-LoFi.
 * Delegates to authoritative PDF Core Operations & DocumentService.
 * License: MIT
 */
import {
  executeRotatePage,
  executeRotateMultiplePages,
  executeDeletePages,
  executeReorderPages,
  executeDuplicatePage,
  executeInsertBlankPage,
  executeExtractPages,
  executeMergePdfs,
  OperationResult,
} from './core/operations/index';
import { triggerLocalDownload } from './export/exportService';
import { loadPdfLibDoc } from './engines/pdfLibEngine';

export type PageOperationResult = OperationResult;

export async function loadPdfDoc(data: Uint8Array) {
  return loadPdfLibDoc(data);
}

export async function rotatePage(
  data: Uint8Array,
  pageIndex: number,
  deltaDegrees: number
): Promise<OperationResult> {
  return executeRotatePage(data, pageIndex, deltaDegrees);
}

export async function rotateMultiplePages(
  data: Uint8Array,
  pageIndices: number[],
  deltaDegrees: number
): Promise<OperationResult> {
  return executeRotateMultiplePages(data, pageIndices, deltaDegrees);
}

export async function deletePages(
  data: Uint8Array,
  pageIndicesToDelete: number[]
): Promise<OperationResult> {
  return executeDeletePages(data, pageIndicesToDelete);
}

export async function reorderPages(
  data: Uint8Array,
  newOrder: number[]
): Promise<OperationResult> {
  return executeReorderPages(data, newOrder);
}

export async function duplicatePage(
  data: Uint8Array,
  pageIndex: number
): Promise<OperationResult> {
  return executeDuplicatePage(data, pageIndex);
}

export async function insertBlankPage(
  data: Uint8Array,
  targetIndex: number
): Promise<OperationResult> {
  return executeInsertBlankPage(data, targetIndex);
}

export async function extractPages(
  data: Uint8Array,
  pageIndicesToExtract: number[]
): Promise<OperationResult> {
  return executeExtractPages(data, pageIndicesToExtract);
}

export async function mergePdfs(
  pdfBytesList: Uint8Array[]
): Promise<OperationResult> {
  return executeMergePdfs(pdfBytesList);
}

export function downloadPdf(bytes: Uint8Array, filename: string): void {
  triggerLocalDownload(bytes, filename);
}
