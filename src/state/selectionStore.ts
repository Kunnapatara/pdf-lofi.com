/**
 * Page Selection State for PDF-LoFi.
 * Manages multi-page selection for batch operations (delete, extract, rotate).
 */
import { useState, useCallback } from 'react';

export function useSelectionStore() {
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 0-indexed

  const togglePage = useCallback((index: number) => {
    setSelectedPages((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  const selectAll = useCallback((totalCount: number) => {
    setSelectedPages(Array.from({ length: totalCount }, (_, i) => i));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPages([]);
  }, []);

  const isSelected = useCallback(
    (index: number) => selectedPages.includes(index),
    [selectedPages]
  );

  return {
    selectedPages,
    togglePage,
    selectAll,
    clearSelection,
    isSelected,
  };
}
