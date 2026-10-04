/**
 * Canonical Server-Authoritative Operation Costs
 * Strictly governs usage credit consumption across Free and Pro tiers.
 * Client cannot supply or alter credit pricing.
 */

export interface CanonicalOperation {
  type: string;
  cost: number;
  category: 'local_free' | 'metered';
  description: string;
}

export const CANONICAL_OPERATION_COSTS: Record<string, CanonicalOperation> = {
  // Local-First Free Operations (0 credits — unlimited local processing)
  pdf_operation_local: {
    type: 'pdf_operation_local',
    cost: 0,
    category: 'local_free',
    description: 'Local PDF operation (in-browser)',
  },
  pdf_view: {
    type: 'pdf_view',
    cost: 0,
    category: 'local_free',
    description: 'Local PDF viewing & thumbnail rendering',
  },
  reorder_pages: {
    type: 'reorder_pages',
    cost: 0,
    category: 'local_free',
    description: 'Reorder pages',
  },
  rotate_pages: {
    type: 'rotate_pages',
    cost: 0,
    category: 'local_free',
    description: 'Rotate pages',
  },
  delete_pages: {
    type: 'delete_pages',
    cost: 0,
    category: 'local_free',
    description: 'Delete pages',
  },
  duplicate_pages: {
    type: 'duplicate_pages',
    cost: 0,
    category: 'local_free',
    description: 'Duplicate pages',
  },
  insert_blank: {
    type: 'insert_blank',
    cost: 0,
    category: 'local_free',
    description: 'Insert blank page',
  },
  split_pdf: {
    type: 'split_pdf',
    cost: 0,
    category: 'local_free',
    description: 'Split PDF by ranges',
  },
  reverse_pdf: {
    type: 'reverse_pdf',
    cost: 0,
    category: 'local_free',
    description: 'Reverse page order',
  },
  scale_content: {
    type: 'scale_content',
    cost: 0,
    category: 'local_free',
    description: 'Scale page content proportionally',
  },
  fit_content: {
    type: 'fit_content',
    cost: 0,
    category: 'local_free',
    description: 'Fit content to standard page geometry',
  },
  add_margins: {
    type: 'add_margins',
    cost: 0,
    category: 'local_free',
    description: 'Add page margins',
  },
  crop_pdf: {
    type: 'crop_pdf',
    cost: 0,
    category: 'local_free',
    description: 'Crop PDF page boundaries',
  },
  resize_pdf: {
    type: 'resize_pdf',
    cost: 0,
    category: 'local_free',
    description: 'Resize page dimensions',
  },
  n_up_pdf: {
    type: 'n_up_pdf',
    cost: 0,
    category: 'local_free',
    description: 'N-Up multi-page layout',
  },
  booklet_pdf: {
    type: 'booklet_pdf',
    cost: 0,
    category: 'local_free',
    description: 'Booklet saddle-stitch imposition',
  },
  page_assembly: {
    type: 'page_assembly',
    cost: 0,
    category: 'local_free',
    description: 'Page assembly & collation',
  },
  split_every_n: {
    type: 'split_every_n',
    cost: 0,
    category: 'local_free',
    description: 'Split document every N pages',
  },
  page_labels: {
    type: 'page_labels',
    cost: 0,
    category: 'local_free',
    description: 'Page numbering labels',
  },
  split_by_bookmark: {
    type: 'split_by_bookmark',
    cost: 0,
    category: 'local_free',
    description: 'Split by outline bookmarks',
  },
  batch_range_export: {
    type: 'batch_range_export',
    cost: 0,
    category: 'local_free',
    description: 'Batch range export',
  },
  merge_pdf: {
    type: 'merge_pdf',
    cost: 0,
    category: 'local_free',
    description: 'Standard PDF merge',
  },

  // Metered Operations (consuming monthly credits)
  pdf_operation: {
    type: 'pdf_operation',
    cost: 1,
    category: 'metered',
    description: 'Standard PDF operation execution',
  },
  batch_merge_large: {
    type: 'batch_merge_large',
    cost: 1,
    category: 'metered',
    description: 'High-capacity batch merge (exceeding free limit)',
  },
  ocr_scan: {
    type: 'ocr_scan',
    cost: 2,
    category: 'metered',
    description: 'OCR text recognition & searchability',
  },
  visual_compare: {
    type: 'visual_compare',
    cost: 1,
    category: 'metered',
    description: 'Visual document difference comparison',
  },
  workflow_execution: {
    type: 'workflow_execution',
    cost: 2,
    category: 'metered',
    description: 'Multi-step workflow pipeline execution',
  },
  advanced_export: {
    type: 'advanced_export',
    cost: 1,
    category: 'metered',
    description: 'Advanced document export',
  },
};

/**
 * Returns canonical operation definition if valid, null otherwise.
 */
export function getCanonicalOperation(operationType: string): CanonicalOperation | null {
  if (!operationType || typeof operationType !== 'string') return null;
  const normalized = operationType.trim().toLowerCase().replace(/[-\s]/g, '_');
  return CANONICAL_OPERATION_COSTS[normalized] || CANONICAL_OPERATION_COSTS[operationType] || null;
}
