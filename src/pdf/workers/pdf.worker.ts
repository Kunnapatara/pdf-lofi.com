/**
 * PDF Processing Web Worker for PDF-LoFi.
 * Receives serializable byte arrays, invokes PDF domain operations, and posts back results.
 */
import { executeMergePdfs } from '../core/operations/mergeOperation';
import { executeReorderPages } from '../core/operations/reorderOperation';
import { executeExtractPages } from '../core/operations/extractOperation';

export type WorkerTaskType = 'MERGE' | 'REORDER' | 'EXTRACT';

export interface WorkerRequestMessage {
  id: string;
  type: WorkerTaskType;
  payload: {
    pdfBytesList?: Uint8Array[];
    bytes?: Uint8Array;
    indices?: number[];
  };
}

export interface WorkerResponseMessage {
  id: string;
  success: boolean;
  data?: Uint8Array;
  pageCount?: number;
  error?: string;
}

self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'MERGE' && payload.pdfBytesList) {
      const result = await executeMergePdfs(payload.pdfBytesList);
      const response: WorkerResponseMessage = {
        id,
        success: true,
        data: result.data,
        pageCount: result.pageCount,
      };
      self.postMessage(response);
    } else if (type === 'REORDER' && payload.bytes && payload.indices) {
      const result = await executeReorderPages(payload.bytes, payload.indices);
      const response: WorkerResponseMessage = {
        id,
        success: true,
        data: result.data,
        pageCount: result.pageCount,
      };
      self.postMessage(response);
    } else if (type === 'EXTRACT' && payload.bytes && payload.indices) {
      const result = await executeExtractPages(payload.bytes, payload.indices);
      const response: WorkerResponseMessage = {
        id,
        success: true,
        data: result.data,
        pageCount: result.pageCount,
      };
      self.postMessage(response);
    } else {
      throw new Error(`Unsupported task type: ${type}`);
    }
  } catch (err) {
    const errorResponse: WorkerResponseMessage = {
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorResponse);
  }
};
