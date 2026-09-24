/**
 * Canonical PDF-LoFi Tool Registry
 * Single source of truth for all tools across Home, Directory, Header, and Routing.
 *
 * Strict Rules:
 * - No fake tools or fake claims.
 * - Every "available" tool routes to an actual implemented processing surface.
 * - Categories: 'organize' | 'optimize' | 'convert' | 'edit' | 'security' | 'intelligence' | 'workflows'
 * - Status: 'available' | 'coming_soon'
 * - Clearly demarcates local processing vs server-side state.
 */

import React from 'react';
import {
  GitMerge,
  Scissors,
  Layers,
  RotateCw,
  Copy,
  Trash2,
  FilePlus2,
  Search,
  Minimize2,
  FileImage,
  Lock,
  ScanText,
  Binary,
  Stamp,
  ArrowUpDown,
  Crop,
  Maximize2,
  FileX,
  FileText,
  Wrench,
  FileCheck,
  GitCompare,
  Workflow,
  PenTool,
} from 'lucide-react';
import { AppView, ActiveTab } from '../../types/pdf';

export type ToolCategory =
  | 'organize'
  | 'optimize'
  | 'convert'
  | 'edit'
  | 'security'
  | 'intelligence'
  | 'workflows';

export type ToolStatus = 'available' | 'coming_soon';

export interface CanonicalPdfTool {
  id: string;
  name: string;
  shortDescription: string;
  category: ToolCategory;
  status: ToolStatus;
  processingLocation: 'local';
  routeView?: AppView;
  workspaceTab?: ActiveTab;
  badge?: string;
  requiresPro?: boolean;
  keywords: string[];
}

export const CANONICAL_TOOLS: CanonicalPdfTool[] = [
  // --- Category: Organize ---
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    shortDescription: 'Combine multiple PDF files into one single document with reordering.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'merge',
    workspaceTab: 'merge',
    keywords: ['merge', 'combine', 'join', 'append', 'bind', 'collate', 'batch'],
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    shortDescription: 'Extract specific pages or page ranges into an independent new PDF.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'split',
    workspaceTab: 'split',
    keywords: ['split', 'extract', 'range', 'cut', 'separate', 'pages'],
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    shortDescription: 'Visual multi-page reordering, rotation, deletion, and page duplication grid.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['organize', 'reorder', 'sort', 'pages', 'manager', 'layout', 'grid'],
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate Pages',
    shortDescription: 'Rotate individual pages or entire documents 90° clockwise or counterclockwise.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['rotate', 'turn', 'orientation', 'upside down', 'landscape', 'portrait', 'cw', 'ccw'],
  },
  {
    id: 'delete-pages',
    name: 'Delete Pages',
    shortDescription: 'Remove unwanted, corrupted, or blank pages cleanly with instant byte rebuild.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['delete', 'remove', 'strip', 'clean', 'trash', 'unwanted'],
  },
  {
    id: 'duplicate-pages',
    name: 'Duplicate Pages',
    shortDescription: 'Clone any page instantly to create duplicate sections or form templates.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['duplicate', 'clone', 'copy', 'repeat', 'template'],
  },
  {
    id: 'insert-blank-page',
    name: 'Insert Blank Page',
    shortDescription: 'Add blank standard A4/letter spacer pages anywhere in the document.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['blank', 'insert', 'add page', 'spacer', 'empty page'],
  },
  {
    id: 'reverse-pdf',
    name: 'Reverse Pages',
    shortDescription: 'Invert the page sequence of your PDF document from end to beginning.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['reverse', 'invert', 'flip', 'order', 'backward', 'sequence'],
  },
  {
    id: 'crop-pdf',
    name: 'Crop Margins (Viewport)',
    shortDescription: 'Adjust visible page CropBox viewport and margins in points (does not delete underlying streams).',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['crop', 'margins', 'trim', 'cut', 'box', 'border', 'viewport'],
  },
  {
    id: 'resize-pdf',
    name: 'Standardize Page Size',
    shortDescription: 'Resize document pages to standard international formats like A4 or Letter with proportional scaling.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['resize', 'dimensions', 'a4', 'letter', 'standardize', 'format'],
  },
  {
    id: 'purge-blank-pages',
    name: 'Purge Blank Pages',
    shortDescription: 'Heuristic raster pixel density and text scan to detect and remove blank scanner sheets.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['blank', 'purge', 'scanner', 'empty', 'clean', 'auto delete', 'heuristic'],
  },

  // --- Category: Edit & Markup ---
  {
    id: 'page-numbers',
    name: 'Page Numbers',
    shortDescription: 'Insert sequential page numbers into headers or footers with customizable format and margins.',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'page-numbers',
    workspaceTab: 'edit',
    keywords: ['numbers', 'pagination', 'header', 'footer', 'stamp', 'numbering', 'page counter'],
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    shortDescription: 'Overlay customizable security stamps and text watermarks with opacity and angle controls.',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'watermark',
    workspaceTab: 'edit',
    keywords: ['watermark', 'stamp', 'confidential', 'draft', 'overlay', 'security', 'brand'],
  },
  {
    id: 'stamps-pdf',
    name: 'Document Stamps',
    shortDescription: 'Stamp official office badges like APPROVED, DRAFT, CONFIDENTIAL, or REVIEWED with dates.',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'edit',
    workspaceTab: 'edit',
    keywords: ['stamp', 'approved', 'draft', 'reviewed', 'confidential', 'badge'],
  },
  {
    id: 'signature-pdf',
    name: 'Signature Image',
    shortDescription: 'Draw or upload an electronic signature image and place it onto document pages.',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'edit',
    workspaceTab: 'edit',
    keywords: ['sign', 'signature', 'draw', 'sign pdf', 'e-sign', 'image signature'],
  },
  {
    id: 'insert-image',
    name: 'Insert Image / Logo',
    shortDescription: 'Place corporate logos, graphics, or diagrams onto document pages.',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'edit',
    workspaceTab: 'edit',
    keywords: ['image', 'logo', 'insert', 'graphic', 'diagram', 'overlay'],
  },

  // --- Category: Intelligence & Inspection ---
  {
    id: 'viewer-search',
    name: 'Viewer & Search',
    shortDescription: 'In-browser PDF reader with zoom controls, thumbnails, and instant text search.',
    category: 'intelligence',
    status: 'available',
    processingLocation: 'local',
    routeView: 'viewer',
    workspaceTab: 'view',
    keywords: ['viewer', 'read', 'search', 'find', 'preview', 'zoom', 'thumbnail'],
  },
  {
    id: 'inspect-pdf',
    name: 'Inspect & Metadata',
    shortDescription: 'Examine PDF version, page geometry, embedded fonts, and edit or sanitize metadata.',
    category: 'intelligence',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['inspect', 'metadata', 'properties', 'fonts', 'structure', 'sanitize', 'version'],
  },
  {
    id: 'ocr-pdf',
    name: 'OCR Text Recognition',
    shortDescription: 'In-browser Tesseract OCR to extract selectable text and embed searchable layers (Latin/ASCII with UTF-8 export).',
    category: 'intelligence',
    status: 'available',
    processingLocation: 'local',
    routeView: 'ocr',
    workspaceTab: 'ocr',
    keywords: ['ocr', 'scanned', 'text recognition', 'tesseract', 'extract text', 'searchable'],
  },

  // --- Category: Optimize & Security ---
  {
    id: 'compress-pdf',
    name: 'Compress PDF (Stream Optimization)',
    shortDescription: 'Flate object stream optimizer and metadata stripper to reduce file size. Note: does not downsample raster images.',
    category: 'optimize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'optimize',
    workspaceTab: 'optimize',
    keywords: ['compress', 'reduce size', 'optimize', 'shrink', 'smaller', 'flate', 'object streams'],
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF Structure',
    shortDescription: 'In development: Deep corrupted PDF repair engine with QPDF/WASM.',
    category: 'security',
    status: 'coming_soon',
    badge: 'Roadmap',
    processingLocation: 'local',
    routeView: 'optimize',
    workspaceTab: 'optimize',
    keywords: ['repair', 'fix', 'corrupt', 'xref', 'rebuild', 'damaged'],
  },

  // --- Category: Forms, Compare & Workflows ---
  {
    id: 'forms-pdf',
    name: 'PDF Forms & Flatten',
    shortDescription: 'Fill interactive AcroForm fields and flatten widgets into static vectors. Note: dynamic XFA forms are not supported.',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'forms',
    workspaceTab: 'forms',
    keywords: ['forms', 'acroforms', 'fill', 'flatten', 'checkbox', 'fields', 'lock'],
  },
  {
    id: 'compare-pdf',
    name: 'Compare Documents (Text Diff)',
    shortDescription: 'Extracts and compares text streams across document pages line-by-line to identify modified pages.',
    category: 'intelligence',
    status: 'available',
    processingLocation: 'local',
    routeView: 'compare',
    workspaceTab: 'compare',
    keywords: ['compare', 'diff', 'versions', 'revisions', 'changes', 'text diff'],
  },
  {
    id: 'workflow-pdf',
    name: 'Local Workflow Pipeline',
    shortDescription: 'Compose and execute multi-step automated local workflows on documents in-browser.',
    category: 'workflows',
    status: 'available',
    processingLocation: 'local',
    routeView: 'workflows',
    workspaceTab: 'workflows',
    keywords: ['workflow', 'pipeline', 'batch', 'automate', 'sequence', 'chain'],
  },
];

/**
 * Returns only the tools that are fully implemented and available right now.
 */
export const AVAILABLE_TOOLS = CANONICAL_TOOLS.filter((t) => t.status === 'available');

/**
 * Helper to get an icon element for any canonical tool ID.
 */
export function getToolIcon(id: string, className = 'w-6 h-6'): React.ReactNode {
  switch (id) {
    case 'merge-pdf':
      return React.createElement(GitMerge, { className });
    case 'split-pdf':
    case 'extract-pages':
      return React.createElement(Scissors, { className });
    case 'organize-pdf':
      return React.createElement(Layers, { className });
    case 'rotate-pdf':
      return React.createElement(RotateCw, { className });
    case 'delete-pages':
      return React.createElement(Trash2, { className });
    case 'duplicate-pages':
      return React.createElement(Copy, { className });
    case 'insert-blank-page':
      return React.createElement(FilePlus2, { className });
    case 'reverse-pdf':
      return React.createElement(ArrowUpDown, { className });
    case 'crop-pdf':
      return React.createElement(Crop, { className });
    case 'resize-pdf':
      return React.createElement(Maximize2, { className });
    case 'purge-blank-pages':
      return React.createElement(FileX, { className });
    case 'viewer-search':
      return React.createElement(Search, { className });
    case 'compress-pdf':
      return React.createElement(Minimize2, { className });
    case 'repair-pdf':
      return React.createElement(Wrench, { className });
    case 'protect-pdf':
      return React.createElement(Lock, { className });
    case 'page-numbers':
      return React.createElement(Binary, { className });
    case 'watermark-pdf':
      return React.createElement(Stamp, { className });
    case 'stamps-pdf':
      return React.createElement(Stamp, { className });
    case 'signature-pdf':
      return React.createElement(PenTool, { className });
    case 'insert-image':
      return React.createElement(FileImage, { className });
    case 'inspect-pdf':
      return React.createElement(FileText, { className });
    case 'ocr-pdf':
      return React.createElement(ScanText, { className });
    case 'forms-pdf':
      return React.createElement(FileCheck, { className });
    case 'compare-pdf':
      return React.createElement(GitCompare, { className });
    case 'workflow-pdf':
      return React.createElement(Workflow, { className });
    default:
      return React.createElement(Layers, { className });
  }
}
