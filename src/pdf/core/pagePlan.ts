/**
 * Canonical PagePlan & PageRef model for PDF-LoFi.
 * Enables representation of planned page operations (reorders, rotations, additions)
 * without cloning full PDF byte buffers on every intermediate micro-change.
 */
import { normalizeRotation } from './pageModel';

export interface PageRef {
  /** Unique ID for UI tracking & drag keys */
  id: string;
  /** Source document ID if originating from an imported PDF */
  sourceDocId?: string;
  /** 0-indexed position within the original source document */
  sourcePageIndex?: number;
  /** Cumulative rotation offset relative to the original source (0, 90, 180, 270) */
  rotationOffset: number;
  /** True if this is an inserted blank page */
  isBlank?: boolean;
}

export interface DocumentPagePlan {
  documentId: string;
  pages: PageRef[];
}

/**
 * Builds an initial linear PagePlan for a document of N pages
 */
export function createInitialPagePlan(documentId: string, pageCount: number): DocumentPagePlan {
  const pages: PageRef[] = [];
  for (let i = 0; i < pageCount; i++) {
    pages.push({
      id: `${documentId}-p${i + 1}`,
      sourceDocId: documentId,
      sourcePageIndex: i,
      rotationOffset: 0,
      isBlank: false,
    });
  }
  return {
    documentId,
    pages,
  };
}

/**
 * Applies a rotation offset to a specific page reference
 */
export function rotatePlanPage(plan: DocumentPagePlan, index: number, deltaDegrees: number): DocumentPagePlan {
  if (index < 0 || index >= plan.pages.length) return plan;
  const newPages = [...plan.pages];
  const target = newPages[index];
  newPages[index] = {
    ...target,
    rotationOffset: normalizeRotation(target.rotationOffset + deltaDegrees),
  };
  return {
    ...plan,
    pages: newPages,
  };
}

/**
 * Reorders pages in plan
 */
export function reorderPlanPages(plan: DocumentPagePlan, fromIndex: number, toIndex: number): DocumentPagePlan {
  if (
    fromIndex < 0 ||
    fromIndex >= plan.pages.length ||
    toIndex < 0 ||
    toIndex >= plan.pages.length ||
    fromIndex === toIndex
  ) {
    return plan;
  }
  const newPages = [...plan.pages];
  const [moved] = newPages.splice(fromIndex, 1);
  newPages.splice(toIndex, 0, moved);
  return {
    ...plan,
    pages: newPages,
  };
}

/**
 * Inserts a blank page into plan
 */
export function insertBlankPlanPage(plan: DocumentPagePlan, targetIndex: number): DocumentPagePlan {
  const clamped = Math.max(0, Math.min(targetIndex, plan.pages.length));
  const newPages = [...plan.pages];
  const newPageRef: PageRef = {
    id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    rotationOffset: 0,
    isBlank: true,
  };
  newPages.splice(clamped, 0, newPageRef);
  return {
    ...plan,
    pages: newPages,
  };
}
