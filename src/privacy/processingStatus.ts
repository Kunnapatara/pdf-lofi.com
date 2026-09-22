/**
 * Truthful Processing Status Definitions for PDF-LoFi.
 * Standardizes non-exaggerated, technically accurate labels.
 */

export const PROCESSING_MESSAGES = {
  IDLE: 'Ready for local operation',
  PROCESSING: (operationName: string) => `LOCAL: Processing ${operationName} on this device...`,
  COMPLETED: '✓ Completed locally — No document upload required',
  ERROR: (details?: string) => details
    ? `Operation stopped: ${details} (Original document was preserved).`
    : 'Operation stopped. The original document was preserved.',
} as const;

export type ProcessingStateCode = 'idle' | 'loading' | 'processing' | 'completed' | 'error';
