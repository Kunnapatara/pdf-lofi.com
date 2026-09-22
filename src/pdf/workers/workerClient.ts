/**
 * Typed Web Worker Client for PDF-LoFi.
 * Encapsulates message passing and provides automatic fallback to direct local execution.
 */
import { WorkerRequestMessage, WorkerResponseMessage } from './pdf.worker';
import { executeMergePdfs } from '../core/operations/mergeOperation';
import { executeReorderPages } from '../core/operations/reorderOperation';
import { executeExtractPages } from '../core/operations/extractOperation';
import { OperationResult } from '../core/operations/rotateOperation';

export class PdfWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, { resolve: (res: OperationResult) => void; reject: (err: Error) => void }>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = (e: MessageEvent<WorkerResponseMessage>) => {
          const { id, success, data, pageCount, error } = e.data;
          const handler = this.pending.get(id);
          if (handler) {
            this.pending.delete(id);
            if (success && data && typeof pageCount === 'number') {
              handler.resolve({ data, pageCount });
            } else {
              handler.reject(new Error(error || 'Worker operation failed'));
            }
          }
        };
        this.worker.onerror = (err) => {
          console.warn('Worker error, fallback enabled:', err);
        };
      } catch (err) {
        console.warn('Could not instantiate Worker, using main-thread fallback:', err);
        this.worker = null;
      }
    }
  }

  async runMerge(pdfBytesList: Uint8Array[]): Promise<OperationResult> {
    if (!this.worker) {
      // Fallback
      return executeMergePdfs(pdfBytesList);
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg: WorkerRequestMessage = {
      id,
      type: 'MERGE',
      payload: { pdfBytesList },
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage(msg);
    });
  }

  async runReorder(bytes: Uint8Array, indices: number[]): Promise<OperationResult> {
    if (!this.worker) {
      return executeReorderPages(bytes, indices);
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg: WorkerRequestMessage = {
      id,
      type: 'REORDER',
      payload: { bytes, indices },
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage(msg);
    });
  }

  async runExtract(bytes: Uint8Array, indices: number[]): Promise<OperationResult> {
    if (!this.worker) {
      return executeExtractPages(bytes, indices);
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg: WorkerRequestMessage = {
      id,
      type: 'EXTRACT',
      payload: { bytes, indices },
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage(msg);
    });
  }
}

export const pdfWorkerClient = new PdfWorkerClient();
