/**
 * Authoritative Document Service for PDF-LoFi.
 * Coordinates domain operations with strict error boundaries:
 * Original -> Operation -> Validate -> Commit.
 * If an operation fails, the original document is preserved unmodified.
 */
import { LocalDocument } from '../types/pdf';
import {
  executeRotatePage,
  executeRotateMultiplePages,
  executeDeletePages,
  executeDuplicatePage,
  executeInsertBlankPage,
  executeReorderPages,
  executeExtractPages,
  executeMergePdfs,
  OperationResult,
} from '../pdf/core/operations/index';
import { pdfWorkerClient } from '../pdf/workers/workerClient';
import { isValidPdfHeader } from '../pdf/core/documentModel';

export class DocumentService {
  /**
   * Safely applies a mutation with validation and rollback protection
   */
  private async safeMutate(
    document: LocalDocument,
    operationName: string,
    mutationFn: (data: Uint8Array) => Promise<OperationResult>
  ): Promise<LocalDocument> {
    if (!document.data) {
      throw new Error(`Cannot perform ${operationName}: document has no binary data in memory.`);
    }

    // Retain snapshot of original in case of validation failure
    const originalBytes = document.data;

    try {
      const result = await mutationFn(originalBytes);

      // Validate result integrity
      if (!result.data || result.data.byteLength === 0) {
        throw new Error(`Operation ${operationName} returned empty byte buffer.`);
      }

      if (!isValidPdfHeader(result.data)) {
        throw new Error(`Operation ${operationName} returned invalid PDF structure.`);
      }

      return {
        ...document,
        data: result.data,
        pageCount: result.pageCount,
        size: result.data.byteLength,
        processingState: 'completed',
        updatedAt: Date.now(),
      };
    } catch (err) {
      console.error(`DocumentService error in ${operationName}:`, err);
      // Original document preserved
      throw err;
    }
  }

  async rotatePage(document: LocalDocument, pageIndex: number, deltaDegrees: number): Promise<LocalDocument> {
    return this.safeMutate(document, `rotatePage(${pageIndex + 1})`, (data) =>
      executeRotatePage(data, pageIndex, deltaDegrees)
    );
  }

  async rotateMultiplePages(
    document: LocalDocument,
    pageIndices: number[],
    deltaDegrees: number
  ): Promise<LocalDocument> {
    return this.safeMutate(document, `rotateMultiplePages(${pageIndices.length})`, (data) =>
      executeRotateMultiplePages(data, pageIndices, deltaDegrees)
    );
  }

  async deletePages(document: LocalDocument, pageIndices: number[]): Promise<LocalDocument> {
    return this.safeMutate(document, `deletePages(${pageIndices.length})`, (data) =>
      executeDeletePages(data, pageIndices)
    );
  }

  async duplicatePage(document: LocalDocument, pageIndex: number): Promise<LocalDocument> {
    return this.safeMutate(document, `duplicatePage(${pageIndex + 1})`, (data) =>
      executeDuplicatePage(data, pageIndex)
    );
  }

  async insertBlankPage(document: LocalDocument, targetIndex: number): Promise<LocalDocument> {
    return this.safeMutate(document, 'insertBlankPage', (data) =>
      executeInsertBlankPage(data, targetIndex)
    );
  }

  async reorderPages(document: LocalDocument, newOrder: number[]): Promise<LocalDocument> {
    return this.safeMutate(document, 'reorderPages', async (data) => {
      // Use worker client for large page counts
      if (document.pageCount > 10) {
        return pdfWorkerClient.runReorder(data, newOrder);
      }
      return executeReorderPages(data, newOrder);
    });
  }

  async extractPages(data: Uint8Array, pageIndices: number[]): Promise<OperationResult> {
    if (data.length > 5000000) {
      return pdfWorkerClient.runExtract(data, pageIndices);
    }
    return executeExtractPages(data, pageIndices);
  }

  async mergeDocuments(pdfBytesList: Uint8Array[]): Promise<OperationResult> {
    if (pdfBytesList.length > 4 || pdfBytesList.some((b) => b.length > 5000000)) {
      return pdfWorkerClient.runMerge(pdfBytesList);
    }
    return executeMergePdfs(pdfBytesList);
  }
}

export const documentService = new DocumentService();
