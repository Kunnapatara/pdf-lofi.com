/**
 * Document State Management for PDF-LoFi.
 * Manages active document in memory and synchronizes with DocumentRepository.
 */
import { useState, useEffect, useCallback } from 'react';
import { LocalDocument } from '../types/pdf';
import { documentRepository } from '../storage/documentRepository';
import { clearPdfjsCache } from '../pdf/engines/pdfjsEngine';

export function useDocumentStore() {
  const [currentDocument, setCurrentDocument] = useState<LocalDocument | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<LocalDocument[]>([]);

  // Load recent documents on initial mount
  const refreshRecent = useCallback(async () => {
    try {
      const docs = await documentRepository.getRecent(8);
      setRecentDocuments(docs);
    } catch (err) {
      console.warn('Could not load recent documents:', err);
    }
  }, []);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  // Set new active document and persist
  const setDocument = useCallback(
    async (doc: LocalDocument | null) => {
      clearPdfjsCache();
      setCurrentDocument(doc);
      if (doc) {
        await documentRepository.save(doc);
        await refreshRecent();
      }
    },
    [refreshRecent]
  );

  // Update existing document with new mutation result
  const updateDocumentData = useCallback(
    async (newData: Uint8Array, pageCount: number, _operationName: string) => {
      if (!currentDocument) return;
      clearPdfjsCache();

      const updated: LocalDocument = {
        ...currentDocument,
        data: newData,
        pageCount,
        size: newData.byteLength,
        processingState: 'completed',
        updatedAt: Date.now(),
      };

      setCurrentDocument(updated);
      await documentRepository.save(updated);
      await refreshRecent();
    },
    [currentDocument, refreshRecent]
  );

  // Reopen a document from local storage
  const openRecentDocument = useCallback(
    async (id: string) => {
      const doc = await documentRepository.getById(id);
      if (doc && doc.data) {
        clearPdfjsCache();
        setCurrentDocument(doc);
        return true;
      }
      return false;
    },
    []
  );

  // Remove a document from storage
  const removeRecentDocument = useCallback(
    async (id: string) => {
      await documentRepository.delete(id);
      if (currentDocument?.id === id) {
        setCurrentDocument(null);
      }
      await refreshRecent();
    },
    [currentDocument, refreshRecent]
  );

  // Clear all documents
  const clearAllRecent = useCallback(async () => {
    await documentRepository.clear();
    setRecentDocuments([]);
    setCurrentDocument(null);
  }, []);

  return {
    currentDocument,
    recentDocuments,
    setDocument,
    updateDocumentData,
    openRecentDocument,
    removeRecentDocument,
    clearAllRecent,
    refreshRecent,
  };
}
