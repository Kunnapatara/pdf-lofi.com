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
  executeReversePages,
  executeAddPageNumbers,
  executeAddTextWatermark,
  executeCropPages,
  CropMargins,
  executeResizePages,
  ResizeOptions,
  executeRemoveBlankPages,
  executeAddStamp,
  StampOptions,
  executeInsertImage,
  InsertImageOptions,
  executeFillForm,
  executeClearForm,
  executeFlattenForm,
  executeUpdateMetadata,
  UpdateMetadataOptions,
  executeSanitizeMetadata,
  executeCompressPdf,
  CompressionOptions,
  CompressionResult,
  PageNumberOptions,
  WatermarkOptions,
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

  async reversePages(document: LocalDocument): Promise<LocalDocument> {
    return this.safeMutate(document, 'reversePages', (data) =>
      executeReversePages(data)
    );
  }

  async addPageNumbers(
    document: LocalDocument,
    options: PageNumberOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'addPageNumbers', (data) =>
      executeAddPageNumbers(data, options)
    );
  }

  async addWatermark(
    document: LocalDocument,
    options: WatermarkOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'addWatermark', (data) =>
      executeAddTextWatermark(data, options)
    );
  }

  async cropPages(
    document: LocalDocument,
    margins: CropMargins,
    pageIndices?: number[]
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'cropPages', (data) =>
      executeCropPages(data, margins, pageIndices)
    );
  }

  async resizePages(
    document: LocalDocument,
    options: ResizeOptions,
    pageIndices?: number[]
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'resizePages', (data) =>
      executeResizePages(data, options, pageIndices)
    );
  }

  async removeBlankPages(
    document: LocalDocument,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ document: LocalDocument; removedCount: number }> {
    if (!document.data) throw new Error('Document has no binary data in memory');
    const result = await executeRemoveBlankPages(document.data, onProgress);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.byteLength,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, removedCount: result.removedCount };
  }

  async addStamp(
    document: LocalDocument,
    options: StampOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'addStamp', (data) =>
      executeAddStamp(data, options)
    );
  }

  async insertImage(
    document: LocalDocument,
    options: InsertImageOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'insertImage', (data) =>
      executeInsertImage(data, options)
    );
  }

  async fillForm(
    document: LocalDocument,
    fieldValues: Record<string, string | boolean>
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'fillForm', (data) =>
      executeFillForm(data, fieldValues)
    );
  }

  async clearForm(document: LocalDocument): Promise<LocalDocument> {
    return this.safeMutate(document, 'clearForm', (data) =>
      executeClearForm(data)
    );
  }

  async flattenForm(document: LocalDocument): Promise<LocalDocument> {
    return this.safeMutate(document, 'flattenForm', (data) =>
      executeFlattenForm(data)
    );
  }

  async updateMetadata(
    document: LocalDocument,
    updates: UpdateMetadataOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'updateMetadata', (data) =>
      executeUpdateMetadata(data, updates)
    );
  }

  async sanitizeMetadata(document: LocalDocument): Promise<LocalDocument> {
    return this.safeMutate(document, 'sanitizeMetadata', (data) =>
      executeSanitizeMetadata(data)
    );
  }

  async compressDocument(
    document: LocalDocument,
    options?: CompressionOptions
  ): Promise<{ document: LocalDocument; compressionResult: CompressionResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const compressionResult = await executeCompressPdf(document.data, options);
    const updatedDoc: LocalDocument = {
      ...document,
      data: compressionResult.data,
      pageCount: compressionResult.pageCount,
      size: compressionResult.compressedSize,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, compressionResult };
  }
}

export const documentService = new DocumentService();
