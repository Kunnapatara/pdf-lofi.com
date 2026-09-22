/**
 * Canonical PDF-LoFi Tool Registry
 * Single source of truth for all tools across Home, Directory, Header, and Routing.
 *
 * Strict Rules:
 * - No fake tools or fake claims.
 * - Every "available" tool routes to an actual implemented processing surface.
 * - Categories: 'organize' | 'optimize' | 'convert' | 'edit' | 'security' | 'intelligence'
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
} from 'lucide-react';
import { AppView, ActiveTab } from '../../types/pdf';

export type ToolCategory =
  | 'organize'
  | 'optimize'
  | 'convert'
  | 'edit'
  | 'security'
  | 'intelligence';

export type ToolStatus = 'available' | 'coming_soon';

export interface CanonicalPdfTool {
  id: string;
  name: string;
  shortDescription: string;
  category: ToolCategory;
  status: ToolStatus;
  processingLocation: 'local';
  routeView: AppView;
  workspaceTab?: ActiveTab;
  badge?: string;
  requiresPro?: boolean;
  keywords: string[];
}

export const CANONICAL_TOOLS: CanonicalPdfTool[] = [
  // --- Category: Organize (All Available & Working) ---
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    shortDescription: 'Combine multiple PDF files into one single document with reordering.',
    category: 'organize',
    status: 'available',
    processingLocation: 'local',
    routeView: 'merge',
    badge: 'Popular',
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
    badge: 'Popular',
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
    badge: 'Core Tool',
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

  // --- Category: Intelligence (Viewer & Search is Available & Working) ---
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

  // --- Category: Optimize (Upcoming local engine) ---
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    shortDescription: 'Upcoming client-side stream optimizer to reduce PDF size without cloud upload.',
    category: 'optimize',
    status: 'coming_soon',
    processingLocation: 'local',
    routeView: 'compress',
    keywords: ['compress', 'reduce size', 'optimize', 'shrink', 'smaller'],
  },

  // --- Category: Convert (Upcoming local image rasterizer) ---
  {
    id: 'convert-pdf',
    name: 'Convert PDF',
    shortDescription: 'Upcoming in-browser rasterizer to convert PDF pages into PNG or JPG images.',
    category: 'convert',
    status: 'coming_soon',
    processingLocation: 'local',
    routeView: 'convert',
    keywords: ['convert', 'image', 'png', 'jpg', 'raster', 'export images'],
  },

  // --- Category: Security (Upcoming client-side encryption) ---
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    shortDescription: 'Upcoming standard password protection and permissions encryption.',
    category: 'security',
    status: 'coming_soon',
    processingLocation: 'local',
    routeView: 'tools',
    keywords: ['protect', 'password', 'encrypt', 'lock', 'security'],
  },

  // --- Category: Edit (Upcoming annotation tool) ---
  {
    id: 'page-numbers',
    name: 'Page Numbers',
    shortDescription: 'Upcoming client-side header and footer sequential page number stamper.',
    category: 'edit',
    status: 'coming_soon',
    processingLocation: 'local',
    routeView: 'tools',
    keywords: ['numbers', 'pagination', 'header', 'footer', 'stamp'],
  },

  // --- Category: Intelligence (Upcoming in-browser OCR) ---
  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    shortDescription: 'Upcoming browser-based OCR engine to extract selectable text from scans.',
    category: 'intelligence',
    status: 'coming_soon',
    processingLocation: 'local',
    routeView: 'tools',
    keywords: ['ocr', 'scanned', 'text recognition', 'tesseract', 'extract text'],
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
    case 'viewer-search':
      return React.createElement(Search, { className });
    case 'compress-pdf':
      return React.createElement(Minimize2, { className });
    case 'convert-pdf':
      return React.createElement(FileImage, { className });
    case 'protect-pdf':
      return React.createElement(Lock, { className });
    case 'page-numbers':
      return React.createElement(Binary, { className });
    case 'ocr-pdf':
      return React.createElement(ScanText, { className });
    default:
      return React.createElement(Layers, { className });
  }
}
