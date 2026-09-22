export type ProcessingState = 'idle' | 'loading' | 'processing' | 'completed' | 'error';

export type ProcessingLocation = 'local' | 'cloud';

export interface LocalDocument {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  mimeType: 'application/pdf';
  processingState: ProcessingState;
  processingLocation: ProcessingLocation;
  createdAt: number;
  updatedAt: number;
  data?: Uint8Array;
}

export interface DocumentPageInfo {
  pageNumber: number; // 1-indexed original or current
  originalPageNumber: number;
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
  isDeleted?: boolean;
  isBlank?: boolean;
  thumbnailUrl?: string;
  sourceDocId?: string;
}

export interface SearchMatch {
  pageNumber: number;
  textSnippet: string;
}

export type ActiveTab = 'view' | 'organize' | 'merge' | 'split' | 'tools';

export type AppView = 'home' | 'merge' | 'split' | 'compress' | 'convert' | 'tools' | 'workspace' | 'organize' | 'viewer' | 'pricing' | 'account';

export type ToolCategory =
  | 'all'
  | 'workflows'
  | 'organize'
  | 'optimize'
  | 'convert'
  | 'edit'
  | 'security'
  | 'intelligence';

export type ToolStatus = 'READY' | 'COMING_SOON';

export interface ToolItem {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  badge?: string;
  status: ToolStatus;
  processingLocation: ProcessingLocation;
  actionKey?: ActiveTab;
  viewKey?: AppView;
}
