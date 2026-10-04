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
  executeScaleContent,
  ScaleContentOptions,
  executeFitContent,
  FitContentOptions,
  executeAddMargins,
  AddMarginsOptions,
  executeRemoveBlankPages,
  executeAddStamp,
  StampOptions,
  executeInsertImage,
  InsertImageOptions,
  executeImageWatermark,
  ImageWatermarkOptions,
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
  executeInterleavePdfs,
  InterleaveOptions,
  executeNUpPdf,
  NUpOptions,
  executeBookletPdf,
  BookletOptions,
  BookletResult,
  executeCollateDocument,
  CollateDocumentOptions,
  executeAlternateAssembly,
  AlternateAssemblyOptions,
  executeSplitEveryNPdf,
  SplitEveryNOptions,
  SplitEveryNResult,
  executeSetPageLabels,
  executeRemovePageLabels,
  PageLabelRange,
  PageLabelsOptions,
  inspectPdfBookmarks,
  executeSplitByBookmark,
  InspectBookmarksResult,
  SplitByBookmarkOptions,
  SplitByBookmarkResult,
  executeAddBatesNumbering,
  BatesNumberOptions,
  BatesNumberResult,
  executeStripJavaScript,
  StripJavaScriptResult,
  executeStripAnnotations,
  StripAnnotationsResult,
  exportAcroFormData,
  exportAcroFormDataToJson,
  exportAcroFormDataToCsv,
  AcroFormExportResult,
  executeAddHeaderFooter,
  HeaderFooterOptions,
  HeaderFooterResult,
  executeAddDateTimeStamp,
  DateTimeStampOptions,
  DateTimeStampResult,
  executeAddPageBackground,
  PageBackgroundOptions,
  PageBackgroundResult,
  executeBatchRangeExport,
  BatchRangeExportOptions,
  BatchRangeExportResult,
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

  async scaleContent(
    document: LocalDocument,
    options: ScaleContentOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'scaleContent', (data) =>
      executeScaleContent(data, options)
    );
  }

  async fitContent(
    document: LocalDocument,
    options: FitContentOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'fitContent', (data) =>
      executeFitContent(data, options)
    );
  }

  async addMargins(
    document: LocalDocument,
    options: AddMarginsOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'addMargins', (data) =>
      executeAddMargins(data, options)
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

  async addImageWatermark(
    document: LocalDocument,
    options: ImageWatermarkOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'addImageWatermark', (data) =>
      executeImageWatermark(data, options)
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

  async applyTextOverlay(
    document: LocalDocument,
    options: {
      text: string;
      targetPages: number[];
      position: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right' | 'custom';
      customX?: number;
      customY?: number;
      fontSize?: number;
      color?: { r: number; g: number; b: number };
      opacity?: number;
    }
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'applyTextOverlay', (data) =>
      import('../pdf/core/operations/textOverlayOperation').then((m) =>
        m.applyTextOverlay(data, options)
      )
    );
  }

  async applyMarkup(
    document: LocalDocument,
    options: {
      type: 'highlight' | 'underline' | 'box' | 'strike';
      targetPages: number[];
      rect: { x: number; y: number; width: number; height: number };
      color?: { r: number; g: number; b: number };
      opacity?: number;
    }
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'applyMarkup', (data) =>
      import('../pdf/core/operations/markupOperation').then((m) =>
        m.applyMarkup(data, options)
      )
    );
  }

  async applyRedaction(
    document: LocalDocument,
    options: {
      boxes: Array<{ pageNumber: number; x: number; y: number; width: number; height: number }>;
      sanitizeMetadata?: boolean;
    }
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'applyRedaction', (data) =>
      import('../pdf/core/operations/redactionOperation').then((m) =>
        m.applyRedaction(data, options)
      )
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

  async interleaveDocuments(
    pdfABytes: Uint8Array,
    pdfBBytes: Uint8Array,
    options?: InterleaveOptions
  ): Promise<OperationResult> {
    return executeInterleavePdfs(pdfABytes, pdfBBytes, options);
  }

  async nUpDocument(
    document: LocalDocument,
    options: NUpOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'nUpDocument', (data) =>
      executeNUpPdf(data, options)
    );
  }

  async bookletDocument(
    document: LocalDocument,
    options?: BookletOptions
  ): Promise<{ document: LocalDocument; result: BookletResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const result = await executeBookletPdf(document.data, options);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.byteLength,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, result };
  }

  async collateDocument(
    document: LocalDocument,
    options: CollateDocumentOptions
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'collateDocument', (data) =>
      executeCollateDocument(data, options)
    );
  }

  async alternateAssembly(
    documents: Uint8Array[],
    options?: AlternateAssemblyOptions
  ): Promise<OperationResult> {
    return executeAlternateAssembly(documents, options);
  }

  async splitEveryN(
    document: LocalDocument,
    options: SplitEveryNOptions
  ): Promise<SplitEveryNResult> {
    if (!document.data) throw new Error('Document has no binary data');
    return executeSplitEveryNPdf(document.data, {
      ...options,
      outputPrefix: options.outputPrefix || document.name,
    });
  }

  async batchRangeExport(
    document: LocalDocument,
    options: BatchRangeExportOptions
  ): Promise<BatchRangeExportResult> {
    if (!document.data) throw new Error('Document has no binary data');
    return executeBatchRangeExport(document.data, {
      ...options,
      outputPrefix: options.outputPrefix || document.name,
    });
  }

  async setPageLabels(
    document: LocalDocument,
    ranges: PageLabelRange[]
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'setPageLabels', (data) =>
      executeSetPageLabels(data, { ranges })
    );
  }

  async removePageLabels(
    document: LocalDocument
  ): Promise<LocalDocument> {
    return this.safeMutate(document, 'removePageLabels', (data) =>
      executeRemovePageLabels(data)
    );
  }

  async inspectBookmarks(
    document: LocalDocument,
    splitLevel: 'top-level' | 'all' = 'top-level'
  ): Promise<InspectBookmarksResult> {
    if (!document.data) throw new Error('Document has no binary data');
    return inspectPdfBookmarks(document.data, splitLevel);
  }

  async splitByBookmark(
    document: LocalDocument,
    options?: SplitByBookmarkOptions
  ): Promise<SplitByBookmarkResult> {
    if (!document.data) throw new Error('Document has no binary data');
    return executeSplitByBookmark(document.data, options);
  }

  async addBatesNumbering(
    document: LocalDocument,
    options: BatesNumberOptions
  ): Promise<{ document: LocalDocument; result: BatesNumberResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const result = await executeAddBatesNumbering(document.data, options);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.byteLength,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, result };
  }

  async stripJavaScript(
    document: LocalDocument
  ): Promise<{ document: LocalDocument; result: StripJavaScriptResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const result = await executeStripJavaScript(document.data);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.length,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, result };
  }

  async stripAnnotations(
    document: LocalDocument
  ): Promise<{ document: LocalDocument; result: StripAnnotationsResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const result = await executeStripAnnotations(document.data);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.length,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, result };
  }

  async exportFormData(data: Uint8Array): Promise<AcroFormExportResult> {
    return exportAcroFormData(data);
  }

  async exportFormDataToJson(data: Uint8Array, pretty = true): Promise<string> {
    return exportAcroFormDataToJson(data, pretty);
  }

  async exportFormDataToCsv(data: Uint8Array): Promise<string> {
    return exportAcroFormDataToCsv(data);
  }

  async addHeaderFooter(
    document: LocalDocument,
    options: HeaderFooterOptions
  ): Promise<{ document: LocalDocument; result: HeaderFooterResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const result = await executeAddHeaderFooter(document.data, options);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.byteLength,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, result };
  }

  async addDateTimeStamp(
    document: LocalDocument,
    options: DateTimeStampOptions
  ): Promise<{ document: LocalDocument; result: DateTimeStampResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const result = await executeAddDateTimeStamp(document.data, options);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.byteLength,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, result };
  }

  async addPageBackground(
    document: LocalDocument,
    options: PageBackgroundOptions
  ): Promise<{ document: LocalDocument; result: PageBackgroundResult }> {
    if (!document.data) throw new Error('Document has no binary data');
    const result = await executeAddPageBackground(document.data, options);
    const updatedDoc: LocalDocument = {
      ...document,
      data: result.data,
      pageCount: result.pageCount,
      size: result.data.byteLength,
      processingState: 'completed',
      updatedAt: Date.now(),
    };
    return { document: updatedDoc, result };
  }
}

export const documentService = new DocumentService();
