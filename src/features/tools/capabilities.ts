/**
 * PDF-LoFi Architectural Capability Registry & Scalability Foundation
 * ----------------------------------------------------------------------------
 * Bridges the mental model from individual tool enumeration to shared capability
 * primitives. Enables scaling from 64 available tools to 100+ tools through
 * reusable operational primitives and standardized workspace integration contracts.
 * ----------------------------------------------------------------------------
 */

import { ActiveTab } from '../../types/pdf';
import { CanonicalPdfTool, CANONICAL_TOOLS } from './toolsRegistry';

export type PdfCapabilityId =
  | 'page-manipulation'
  | 'page-geometry'
  | 'text-overlay'
  | 'image-visual-overlay'
  | 'document-inspection'
  | 'forms-processing'
  | 'conversion-rasterization'
  | 'optimization-compression'
  | 'document-intelligence'
  | 'workflow-orchestration';

export type CapabilityReuseLevel = 'HIGH_REUSE' | 'MEDIUM_REUSE' | 'LOW_REUSE' | 'ISOLATED';

export type CapabilityMutationModel =
  | 'mutates_document'
  | 'creates_new_document'
  | 'download_only'
  | 'read_only'
  | 'composite'
  | 'roadmap_spec';

export interface PdfCapability {
  id: PdfCapabilityId;
  name: string;
  description: string;
  targetWorkspace: ActiveTab;
  sharedPrimitives: string[];
  reuseLevel: CapabilityReuseLevel;
  mutationModel: CapabilityMutationModel;
  toolIds: string[];
}

export const CAPABILITY_REGISTRY: Record<PdfCapabilityId, PdfCapability> = {
  'page-manipulation': {
    id: 'page-manipulation',
    name: 'Page Manipulation & Structural Assembly',
    description: 'Reordering, rotation, deletion, duplication, collation, extraction, and range-based batch assembly.',
    targetWorkspace: 'organize',
    sharedPrimitives: [
      'pdfLibEngine (loadPdfLibDoc, savePdfLibDoc, copyPages)',
      'rangeParser (parsePageRange, parseBatchRanges)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'mutates_document',
    toolIds: [
      'merge-pdf',
      'split-pdf',
      'organize-pdf',
      'rotate-pdf',
      'delete-pages',
      'duplicate-pages',
      'extract-pages',
      'reverse-pdf',
      'insert-blank-page',
      'purge-blank-pages',
      'page-selection',
      'interleave-pdf',
      'page-assembly',
      'split-every-n',
      'page-labels',
      'split-by-bookmark',
      'page-range-batch-export',
    ],
  },

  'page-geometry': {
    id: 'page-geometry',
    name: 'Page Geometry & Imposition',
    description: 'CropBox margin adjustments, standard dimensions standardization (A4/Letter/Legal), N-Up, and booklet imposition.',
    targetWorkspace: 'organize',
    sharedPrimitives: [
      'pdfLibEngine (embedPage, setCropBox, setMediaBox, scale)',
      'STANDARD_SIZES (a4, letter, legal dimension presets)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'mutates_document',
    toolIds: [
      'crop-pdf',
      'resize-pdf',
      'n-up-pdf',
      'booklet-pdf',
    ],
  },

  'text-overlay': {
    id: 'text-overlay',
    name: 'Text Overlay & Placement Engine',
    description: 'Dynamic text positioning, page numbering, Bates stamping, headers/footers, date stamps, and token expansion.',
    targetWorkspace: 'edit',
    sharedPrimitives: [
      'textPrimitive (calculateTextCoordinates, resolveStandardFont, parseHexColor, expandDynamicTokens, formatLocalIsoDate)',
      'rangeParser (parsePageRange)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'mutates_document',
    toolIds: [
      'page-numbers',
      'bates-numbering',
      'header-footer',
      'date-time-stamp',
      'text-overlay',
      'stamps-pdf',
    ],
  },

  'image-visual-overlay': {
    id: 'image-visual-overlay',
    name: 'Image & Visual Overlay Engine',
    description: 'Watermarking, electronic signature placement, raster image embedding, visual redaction masks, and page backgrounds.',
    targetWorkspace: 'edit',
    sharedPrimitives: [
      'insertImageOperation (executeInsertImage, PNG/JPEG embedding, coordinate presets)',
      'pdfLibEngine (drawImage, drawRectangle, embedPng, embedJpg)',
      'rangeParser (parsePageRange)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'mutates_document',
    toolIds: [
      'watermark-pdf',
      'signature-pdf',
      'insert-image',
      'markup-pdf',
      'page-background',
      'redact-pdf',
      'structural-redaction',
      'digital-signature',
    ],
  },

  'document-inspection': {
    id: 'document-inspection',
    name: 'Document Inspection & Introspection',
    description: 'Metadata extraction, font inventory, image object analysis, annotation enumeration, form presence check, and full-text search.',
    targetWorkspace: 'inspect',
    sharedPrimitives: [
      'metadataOperation (inspectPdfDocument, DocumentInspectionData)',
      'pdfjsEngine (extractTextFromPage, textSearch)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'read_only',
    toolIds: [
      'viewer-search',
      'document-search',
      'metadata-pdf',
      'inspect-fonts',
      'inspect-images',
      'inspect-annotations',
      'inspect-forms',
      'document-properties',
    ],
  },

  'forms-processing': {
    id: 'forms-processing',
    name: 'Forms & Interactive Field Processing',
    description: 'Interactive AcroForm field discovery, value setting, radio/checkbox grouping, form flattening, data export, and XFA detection.',
    targetWorkspace: 'forms',
    sharedPrimitives: [
      'formOperation (inspectPdfForm, executeFillForm, executeFlattenForm, FormFieldInfo)',
      'exportFormOperation (exportAcroFormData, json/csv serialization)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'mutates_document',
    toolIds: [
      'forms-fill',
      'forms-checkbox',
      'forms-radio',
      'forms-dropdown',
      'export-form-data',
      'forms-flatten',
      'forms-xfa',
    ],
  },

  'conversion-rasterization': {
    id: 'conversion-rasterization',
    name: 'Conversion & In-Browser Rasterization',
    description: 'Client-side PDF page rendering to PNG/JPG/WebP, multi-image ingestion to PDF, and vector text extraction to TXT.',
    targetWorkspace: 'convert',
    sharedPrimitives: [
      'conversionOperation (convertPdfToImages, convertImagesToPdf, convertPdfToTxt)',
      'pdfjsEngine (renderPageToCanvas, extractTextFromPage)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'download_only',
    toolIds: [
      'pdf-to-png',
      'pdf-to-jpg',
      'pdf-to-webp',
      'images-to-pdf',
      'pdf-to-txt',
    ],
  },

  'optimization-compression': {
    id: 'optimization-compression',
    name: 'Optimization & Structural Stream Pruning',
    description: 'Object stream compression, metadata stripping, embedded JavaScript removal, annotation stripping, and structure repair.',
    targetWorkspace: 'optimize',
    sharedPrimitives: [
      'compressOperation (executeCompressPdf, useObjectStreams, stripMetadata)',
      'stripJavaScriptOperation (executeStripJavaScript)',
      'stripAnnotationsOperation (executeStripAnnotations)',
      'metadataOperation (executeSanitizeMetadata)',
    ],
    reuseLevel: 'MEDIUM_REUSE',
    mutationModel: 'mutates_document',
    toolIds: [
      'compress-pdf',
      'sanitize-metadata',
      'strip-javascript',
      'strip-annotations',
      'optimize-images',
      'linearize-pdf',
      'repair-pdf',
      'protect-pdf',
      'encrypt-pdf',
      'decrypt-pdf',
      'permissions-pdf',
    ],
  },

  'document-intelligence': {
    id: 'document-intelligence',
    name: 'Document Intelligence & Analysis',
    description: 'Client-side OCR via Tesseract worker, invisible searchable text layer embedding, confidence analysis, and text diffing.',
    targetWorkspace: 'ocr',
    sharedPrimitives: [
      'ocrEngine (runOcrOnPdfPages, embedOcrTextLayer, Tesseract worker)',
      'compareOperation (comparePdfDocuments, text diffing)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'composite',
    toolIds: [
      'ocr-pdf',
      'searchable-pdf',
      'ocr-confidence',
      'compare-pdf',
      'visual-compare',
    ],
  },

  'workflow-orchestration': {
    id: 'workflow-orchestration',
    name: 'Workflow Pipeline & Task Composition',
    description: 'Sequential composition and execution of multi-step PDF operation pipelines with local preset management.',
    targetWorkspace: 'workflows',
    sharedPrimitives: [
      'workflowRepository (IndexedDB stored workflows, steps)',
      'documentService (chained operation execution)',
    ],
    reuseLevel: 'HIGH_REUSE',
    mutationModel: 'composite',
    toolIds: [
      'workflow-pipeline',
      'workflow-presets',
      'workflow-saved',
      'workflow-batch',
    ],
  },
};

/**
 * Returns the parent capability definition for any canonical tool ID.
 */
export function getCapabilityForTool(toolId: string): PdfCapability | undefined {
  return Object.values(CAPABILITY_REGISTRY).find((cap) => cap.toolIds.includes(toolId));
}

/**
 * Returns all CanonicalPdfTool instances assigned to a specific capability.
 */
export function getToolsForCapability(capabilityId: PdfCapabilityId): CanonicalPdfTool[] {
  const cap = CAPABILITY_REGISTRY[capabilityId];
  if (!cap) return [];
  const idSet = new Set(cap.toolIds);
  return CANONICAL_TOOLS.filter((t) => idSet.has(t.id));
}

/**
 * Validates a tool definition against the Scalability Contract.
 * Ensures that any future tool added to the registry adheres to structural invariants.
 */
export function validateToolScalabilityContract(tool: CanonicalPdfTool): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tool.id || typeof tool.id !== 'string') {
    errors.push(`Tool must have a valid non-empty id.`);
  }

  if (!tool.name || tool.name.trim().length === 0) {
    errors.push(`Tool ${tool.id}: name is required.`);
  }

  if (!tool.shortDescription || tool.shortDescription.trim().length === 0) {
    errors.push(`Tool ${tool.id}: shortDescription is required.`);
  }

  if (tool.processingLocation !== 'local') {
    errors.push(`Tool ${tool.id}: processingLocation must be 'local'.`);
  }

  // Capability mapping verification
  const capability = getCapabilityForTool(tool.id);
  if (!capability) {
    errors.push(`Tool ${tool.id}: must be mapped to an authoritative PdfCapability in CAPABILITY_REGISTRY.`);
  }

  if (tool.status === 'available') {
    if (!tool.workspaceTab) {
      errors.push(`Available tool ${tool.id}: workspaceTab is mandatory.`);
    }
    if (!tool.routeView) {
      errors.push(`Available tool ${tool.id}: routeView is mandatory.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
