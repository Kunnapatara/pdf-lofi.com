/**
 * Canonical PDF-LoFi Tool Registry
 * Single source of truth for all tools across Home, Directory, Header, and Routing.
 *
 * Strict Rules:
 * - No fake tools or fake claims.
 * - Every "available" tool routes to an actual implemented processing surface.
 * - Categories correspond to the 9 Master Workspaces:
 *   'organize' | 'edit' | 'inspect' | 'convert' | 'forms' | 'security' | 'optimize' | 'intelligence' | 'workflows'
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
  Unlock,
  Key,
  EyeOff,
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
  Highlighter,
  Sliders,
  Shield,
  Eye,
  CheckSquare,
  Radio,
  ListOrdered,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppView, ActiveTab } from '../../types/pdf';

export type ToolCategory =
  | 'organize'
  | 'edit'
  | 'inspect'
  | 'convert'
  | 'forms'
  | 'security'
  | 'optimize'
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
  // ==========================================
  // 1. PAGE WORKSPACE (Organize)
  // ==========================================
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
    id: 'extract-pages',
    name: 'Extract Pages',
    shortDescription: 'Select and export targeted pages to build a focused sub-document.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'split',
    workspaceTab: 'split',
    keywords: ['extract', 'pull', 'isolate', 'subset', 'pages'],
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
  {
    id: 'page-selection',
    name: 'Page Selection Engine',
    shortDescription: 'Quickly select all, odd, even, invert, or comma-separated page ranges.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'organize',
    workspaceTab: 'organize',
    keywords: ['select', 'even', 'odd', 'invert', 'range', 'multiselect'],
  },

  // ==========================================
  // 2. EDIT WORKSPACE
  // ==========================================
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
    shortDescription: 'Place electronic signature images or drawings onto pages (image overlay; not a cryptographic digital certificate).',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'edit',
    workspaceTab: 'edit',
    keywords: ['sign', 'signature', 'draw', 'sign pdf', 'e-sign', 'image signature', 'overlay'],
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
  {
    id: 'text-overlay',
    name: 'Text Overlay',
    shortDescription: 'Draw custom typography onto pages at exact coordinates with font and color controls.',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'edit',
    workspaceTab: 'edit',
    keywords: ['text', 'overlay', 'type', 'write', 'add text', 'caption'],
  },
  {
    id: 'markup-pdf',
    name: 'Visual Markup Overlay',
    shortDescription: 'Add visual vector highlights, underline rules, strike-throughs, and bounding boxes to page streams (visual overlay; not PDF /Annot objects).',
    category: 'edit',
    status: 'available',
    processingLocation: 'local',
    routeView: 'edit',
    workspaceTab: 'edit',
    keywords: ['markup', 'highlight', 'underline', 'box', 'annotate', 'pen', 'visual overlay'],
  },

  // ==========================================
  // 3. INSPECT WORKSPACE
  // ==========================================
  {
    id: 'viewer-search',
    name: 'Viewer & Search',
    shortDescription: 'In-browser PDF reader with zoom controls, thumbnails, and instant text search.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'viewer',
    workspaceTab: 'view',
    keywords: ['viewer', 'read', 'search', 'find', 'preview', 'zoom', 'thumbnail'],
  },
  {
    id: 'document-search',
    name: 'Document Search',
    shortDescription: 'Fast client-side text stream search across all document pages with match counter.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'viewer',
    workspaceTab: 'view',
    keywords: ['search', 'find', 'text search', 'query'],
  },
  {
    id: 'metadata-pdf',
    name: 'Metadata Editor',
    shortDescription: 'Inspect and edit document Title, Author, Subject, Keywords, and Creator tags.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['metadata', 'properties', 'tags', 'author', 'title', 'keywords'],
  },
  {
    id: 'inspect-fonts',
    name: 'Font Inspector',
    shortDescription: 'Inspect embedded font structure and report font object counts.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['fonts', 'typography', 'embedded fonts', 'font names'],
  },
  {
    id: 'inspect-images',
    name: 'Image Object Inspector',
    shortDescription: 'Inspect embedded image structure and report image object counts.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['images', 'xobject', 'raster', 'embedded images', 'photos'],
  },
  {
    id: 'inspect-annotations',
    name: 'Annotations Inspector',
    shortDescription: 'Inspect PDF annotation structure and report annotation counts.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['annotations', 'annots', 'comments', 'links', 'widgets'],
  },
  {
    id: 'inspect-forms',
    name: 'Form Inspector',
    shortDescription: 'Inspect PDF form structure and report detected form fields.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['forms', 'acroforms', 'fields', 'xfa', 'widgets'],
  },
  {
    id: 'document-properties',
    name: 'Document Properties',
    shortDescription: 'Inspect PDF version, MediaBox, CropBox, page dimensions (mm/pt), and encryption status.',
    category: 'inspect',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['properties', 'version', 'mediabox', 'cropbox', 'dimensions', 'size'],
  },

  // ==========================================
  // 4. CONVERSION WORKSPACE
  // ==========================================
  {
    id: 'pdf-to-png',
    name: 'PDF → PNG',
    shortDescription: 'Render PDF vector pages to lossless high-resolution PNG images client-side.',
    category: 'convert',
    status: 'available',
    processingLocation: 'local',
    routeView: 'convert',
    workspaceTab: 'convert',
    keywords: ['convert', 'png', 'image', 'raster', 'export png'],
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF → JPG',
    shortDescription: 'Convert document pages to standard JPG photos with custom compression quality.',
    category: 'convert',
    status: 'available',
    processingLocation: 'local',
    routeView: 'convert',
    workspaceTab: 'convert',
    keywords: ['convert', 'jpg', 'jpeg', 'image', 'export jpg'],
  },
  {
    id: 'pdf-to-webp',
    name: 'PDF → WebP',
    shortDescription: 'Export pages to modern high-efficiency WebP format for fast web rendering.',
    category: 'convert',
    status: 'available',
    processingLocation: 'local',
    routeView: 'convert',
    workspaceTab: 'convert',
    keywords: ['convert', 'webp', 'modern image', 'export webp'],
  },
  {
    id: 'images-to-pdf',
    name: 'Images → PDF',
    shortDescription: 'Combine multiple PNG, JPG, or WebP images into a single multi-page PDF document.',
    category: 'convert',
    status: 'available',
    processingLocation: 'local',
    routeView: 'convert',
    workspaceTab: 'convert',
    keywords: ['images to pdf', 'photos to pdf', 'jpg to pdf', 'png to pdf', 'create pdf'],
  },
  {
    id: 'pdf-to-txt',
    name: 'PDF → Plaintext (.txt)',
    shortDescription: 'Extract all searchable text streams into clean plaintext with page markers.',
    category: 'convert',
    status: 'available',
    processingLocation: 'local',
    routeView: 'convert',
    workspaceTab: 'convert',
    keywords: ['convert', 'txt', 'plaintext', 'text extract', 'raw text'],
  },

  // ==========================================
  // 5. FORMS WORKSPACE
  // ==========================================
  {
    id: 'forms-fill',
    name: 'Fill AcroForms',
    shortDescription: 'Enter values into standard AcroForm text fields directly in your browser.',
    category: 'forms',
    status: 'available',
    processingLocation: 'local',
    routeView: 'forms',
    workspaceTab: 'forms',
    keywords: ['form', 'fill', 'acroform', 'inputs', 'text fields'],
  },
  {
    id: 'forms-checkbox',
    name: 'Interactive Checkboxes',
    shortDescription: 'Toggle interactive PDF form checkboxes on or off client-side.',
    category: 'forms',
    status: 'available',
    processingLocation: 'local',
    routeView: 'forms',
    workspaceTab: 'forms',
    keywords: ['checkbox', 'check', 'toggle', 'form checkbox'],
  },
  {
    id: 'forms-radio',
    name: 'Radio Groups',
    shortDescription: 'Select single active choices in mutually exclusive PDF radio button sets.',
    category: 'forms',
    status: 'available',
    processingLocation: 'local',
    routeView: 'forms',
    workspaceTab: 'forms',
    keywords: ['radio', 'option', 'choice', 'form radio'],
  },
  {
    id: 'forms-dropdown',
    name: 'Dropdown Selection',
    shortDescription: 'Select options from interactive PDF combo box and dropdown field lists.',
    category: 'forms',
    status: 'available',
    processingLocation: 'local',
    routeView: 'forms',
    workspaceTab: 'forms',
    keywords: ['dropdown', 'select', 'combobox', 'list'],
  },
  {
    id: 'forms-flatten',
    name: 'Flatten Form Fields',
    shortDescription: 'Lock interactive fields permanently into static vector page graphics.',
    category: 'forms',
    status: 'available',
    processingLocation: 'local',
    routeView: 'forms',
    workspaceTab: 'forms',
    keywords: ['flatten', 'lock', 'static', 'convert fields', 'bake'],
  },
  {
    id: 'forms-xfa',
    name: 'XFA Dynamic Form Detection',
    shortDescription: 'Truthfully detect and flag proprietary dynamic XML Forms Architecture streams.',
    category: 'forms',
    status: 'available',
    processingLocation: 'local',
    routeView: 'forms',
    workspaceTab: 'forms',
    keywords: ['xfa', 'dynamic form', 'xml forms', 'adobe xfa'],
  },

  // ==========================================
  // 6. SECURITY WORKSPACE
  // ==========================================
  {
    id: 'redact-pdf',
    name: 'Visual Blackout (Vector Mask)',
    shortDescription: 'Overlay opaque black vector rectangles over sensitive areas and sanitize metadata. Note: Does not delete underlying text streams.',
    category: 'security',
    status: 'available',
    processingLocation: 'local',
    routeView: 'security',
    workspaceTab: 'security',
    keywords: ['redact', 'blackout', 'censor', 'mask', 'confidential', 'sanitize', 'visual blackout'],
  },
  {
    id: 'structural-redaction',
    name: 'True Structural Redaction',
    shortDescription: 'Irreversible glyph and content-stream token destruction via deep PDF parsing (Roadmap).',
    category: 'security',
    status: 'coming_soon',
    badge: 'Roadmap (QPDF)',
    processingLocation: 'local',
    routeView: 'security',
    workspaceTab: 'security',
    keywords: ['true redaction', 'structural redaction', 'irreversible', 'glyph strip'],
  },
  {
    id: 'protect-pdf',
    name: 'Password Protect (AES-256)',
    shortDescription: 'Standard Security Handler encryption requires client-side WebAssembly QPDF engine.',
    category: 'security',
    status: 'coming_soon',
    badge: 'Roadmap (QPDF)',
    processingLocation: 'local',
    routeView: 'security',
    workspaceTab: 'security',
    keywords: ['password', 'protect', 'encrypt', 'security', 'aes'],
  },
  {
    id: 'encrypt-pdf',
    name: 'PDF Encryption Engine',
    shortDescription: 'Client-side AES-128 / AES-256 standard encryption via QPDF WebAssembly.',
    category: 'security',
    status: 'coming_soon',
    badge: 'Roadmap (QPDF)',
    processingLocation: 'local',
    routeView: 'security',
    workspaceTab: 'security',
    keywords: ['encrypt', 'cipher', 'aes-256', 'cryptography'],
  },
  {
    id: 'decrypt-pdf',
    name: 'Decrypt & Remove Password',
    shortDescription: 'Remove user/owner encryption with authorized password via QPDF WASM.',
    category: 'security',
    status: 'coming_soon',
    badge: 'Roadmap (QPDF)',
    processingLocation: 'local',
    routeView: 'security',
    workspaceTab: 'security',
    keywords: ['decrypt', 'remove password', 'unlock', 'open'],
  },
  {
    id: 'permissions-pdf',
    name: 'Document Permissions',
    shortDescription: 'Restrict printing, copying, or modification via standard PDF permission bitmasks.',
    category: 'security',
    status: 'coming_soon',
    badge: 'Roadmap (QPDF)',
    processingLocation: 'local',
    routeView: 'security',
    workspaceTab: 'security',
    keywords: ['permissions', 'restrict', 'print lock', 'copy lock'],
  },
  {
    id: 'digital-signature',
    name: 'Cryptographic Digital Signature',
    shortDescription: 'PKCS#7 X.509 cryptographic digital signing. (Electronic signature image is available now in Edit).',
    category: 'security',
    status: 'coming_soon',
    badge: 'Roadmap (PKCS#7)',
    processingLocation: 'local',
    routeView: 'security',
    workspaceTab: 'security',
    keywords: ['digital signature', 'pkcs7', 'x509', 'certificate', 'crypto sign'],
  },

  // ==========================================
  // 7. OPTIMIZE WORKSPACE
  // ==========================================
  {
    id: 'compress-pdf',
    name: 'Compress PDF (Stream Optimization)',
    shortDescription: 'Flate object stream optimizer and metadata stripper. Re-encodes PDF indirect object streams; does not downsample raster images or guarantee smaller file size for already-compressed PDFs.',
    category: 'optimize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'optimize',
    workspaceTab: 'optimize',
    keywords: ['compress', 'reduce size', 'optimize', 'shrink', 'smaller', 'flate', 'object streams'],
  },
  {
    id: 'sanitize-metadata',
    name: 'Metadata Cleanup',
    shortDescription: 'Completely purge author, creation dates, software producers, and tracking keywords.',
    category: 'optimize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'inspect',
    workspaceTab: 'inspect',
    keywords: ['sanitize', 'metadata cleanup', 'strip tags', 'privacy'],
  },
  {
    id: 'optimize-images',
    name: 'Image Optimization',
    shortDescription: 'Stream re-compression for embedded image objects to decrease storage footprint.',
    category: 'optimize',
    status: 'coming_soon',
    badge: 'Roadmap',
    processingLocation: 'local',
    routeView: 'optimize',
    workspaceTab: 'optimize',
    keywords: ['images', 'compress images', 'downsample', 'optimize photos'],
  },
  {
    id: 'linearize-pdf',
    name: 'Linearize (Fast Web View)',
    shortDescription: 'Restructure PDF for byte-range streaming via QPDF WebAssembly.',
    category: 'optimize',
    status: 'coming_soon',
    badge: 'Roadmap (QPDF)',
    processingLocation: 'local',
    routeView: 'optimize',
    workspaceTab: 'optimize',
    keywords: ['linearize', 'fast web view', 'streaming', 'byte serving'],
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF Structure',
    shortDescription: 'In development: Deep corrupted PDF structure and xref repair engine with QPDF/WASM.',
    category: 'optimize',
    status: 'coming_soon',
    badge: 'Roadmap (QPDF)',
    processingLocation: 'local',
    routeView: 'optimize',
    workspaceTab: 'optimize',
    keywords: ['repair', 'fix', 'corrupt', 'xref', 'rebuild', 'damaged'],
  },

  // ==========================================
  // 8. INTELLIGENCE WORKSPACE
  // ==========================================
  {
    id: 'ocr-pdf',
    name: 'OCR Text Recognition',
    shortDescription: 'In-browser Tesseract OCR text extraction (UTF-8 multi-language) with searchable PDF layer embedding for Latin scripts.',
    category: 'intelligence',
    status: 'available',
    processingLocation: 'local',
    routeView: 'ocr',
    workspaceTab: 'ocr',
    keywords: ['ocr', 'scanned', 'text recognition', 'tesseract', 'extract text', 'searchable'],
  },
  {
    id: 'searchable-pdf',
    name: 'Searchable PDF Generator',
    shortDescription: 'Embed invisible selectable Latin text layers. Word-aligned bounding boxes and CJK text layers are Roadmap.',
    category: 'intelligence',
    status: 'available',
    processingLocation: 'local',
    routeView: 'ocr',
    workspaceTab: 'ocr',
    keywords: ['searchable', 'text layer', 'ocr layer', 'selectable text'],
  },
  {
    id: 'ocr-confidence',
    name: 'OCR Confidence Analyzer',
    shortDescription: 'Displays overall document and page recognition confidence percentages.',
    category: 'intelligence',
    status: 'available',
    processingLocation: 'local',
    routeView: 'ocr',
    workspaceTab: 'ocr',
    keywords: ['confidence', 'accuracy', 'ocr rating', 'fidelity'],
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
    id: 'visual-compare',
    name: 'Visual Compare (Side-by-Side)',
    shortDescription: 'Side-by-side canvas rendering of document versions to identify layout adjustments.',
    category: 'intelligence',
    status: 'coming_soon',
    badge: 'Roadmap',
    processingLocation: 'local',
    routeView: 'compare',
    workspaceTab: 'compare',
    keywords: ['visual compare', 'side by side', 'canvas diff', 'visual layout'],
  },

  // ==========================================
  // 9. WORKFLOW WORKSPACE
  // ==========================================
  {
    id: 'workflow-pipeline',
    name: 'Workflow Pipeline Engine',
    shortDescription: 'Chain multi-step automated local operations (Crop → Number → Stamp → Compress).',
    category: 'workflows',
    status: 'available',
    processingLocation: 'local',
    routeView: 'workflows',
    workspaceTab: 'workflows',
    keywords: ['workflow', 'pipeline', 'automate', 'chain', 'sequence'],
  },
  {
    id: 'workflow-presets',
    name: 'One-Click Workflow Presets',
    shortDescription: 'Pre-configured pipelines for archival preparation, clean pagination, and official stamping.',
    category: 'workflows',
    status: 'available',
    processingLocation: 'local',
    routeView: 'workflows',
    workspaceTab: 'workflows',
    keywords: ['presets', 'templates', 'one click', 'quick workflow'],
  },
  {
    id: 'workflow-batch',
    name: 'Batch Processing Queue',
    shortDescription: 'Apply workflows across multiple files in a unified local browser execution queue.',
    category: 'workflows',
    status: 'coming_soon',
    badge: 'Roadmap',
    processingLocation: 'local',
    routeView: 'workflows',
    workspaceTab: 'workflows',
    keywords: ['batch', 'queue', 'bulk', 'multi file'],
  },
  {
    id: 'workflow-saved',
    name: 'Saved Custom Workflows',
    shortDescription: 'Save and reuse custom multi-step pipeline recipes in your browser IndexedDB.',
    category: 'workflows',
    status: 'available',
    processingLocation: 'local',
    routeView: 'workflows',
    workspaceTab: 'workflows',
    keywords: ['saved', 'custom workflows', 'indexeddb', 'recipes'],
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
    case 'page-selection':
      return React.createElement(CheckSquare, { className });

    case 'page-numbers':
      return React.createElement(Binary, { className });
    case 'watermark-pdf':
    case 'stamps-pdf':
      return React.createElement(Stamp, { className });
    case 'signature-pdf':
      return React.createElement(PenTool, { className });
    case 'insert-image':
      return React.createElement(FileImage, { className });
    case 'text-overlay':
      return React.createElement(FileText, { className });
    case 'markup-pdf':
      return React.createElement(Highlighter, { className });

    case 'viewer-search':
    case 'document-search':
      return React.createElement(Search, { className });
    case 'metadata-pdf':
    case 'sanitize-metadata':
      return React.createElement(FileText, { className });
    case 'inspect-fonts':
      return React.createElement(Binary, { className });
    case 'inspect-images':
      return React.createElement(FileImage, { className });
    case 'inspect-annotations':
      return React.createElement(Highlighter, { className });
    case 'inspect-forms':
      return React.createElement(FileCheck, { className });
    case 'document-properties':
      return React.createElement(Sliders, { className });

    case 'pdf-to-png':
    case 'pdf-to-jpg':
    case 'pdf-to-webp':
    case 'images-to-pdf':
      return React.createElement(FileImage, { className });
    case 'pdf-to-txt':
      return React.createElement(FileText, { className });

    case 'forms-fill':
      return React.createElement(FileCheck, { className });
    case 'forms-checkbox':
      return React.createElement(CheckSquare, { className });
    case 'forms-radio':
      return React.createElement(Radio, { className });
    case 'forms-dropdown':
      return React.createElement(ListOrdered, { className });
    case 'forms-flatten':
      return React.createElement(Lock, { className });
    case 'forms-xfa':
      return React.createElement(Sparkles, { className });

    case 'redact-pdf':
      return React.createElement(EyeOff, { className });
    case 'protect-pdf':
    case 'encrypt-pdf':
      return React.createElement(Lock, { className });
    case 'decrypt-pdf':
      return React.createElement(Unlock, { className });
    case 'permissions-pdf':
      return React.createElement(Key, { className });
    case 'digital-signature':
      return React.createElement(Shield, { className });

    case 'compress-pdf':
      return React.createElement(Minimize2, { className });
    case 'optimize-images':
      return React.createElement(Zap, { className });
    case 'linearize-pdf':
      return React.createElement(Zap, { className });
    case 'repair-pdf':
      return React.createElement(Wrench, { className });

    case 'ocr-pdf':
    case 'searchable-pdf':
      return React.createElement(ScanText, { className });
    case 'ocr-confidence':
      return React.createElement(Sparkles, { className });
    case 'compare-pdf':
      return React.createElement(GitCompare, { className });
    case 'visual-compare':
      return React.createElement(Eye, { className });

    case 'workflow-pipeline':
    case 'workflow-presets':
    case 'workflow-batch':
    case 'workflow-saved':
      return React.createElement(Workflow, { className });

    default:
      return React.createElement(Layers, { className });
  }
}
