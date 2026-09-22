/**
 * Workspace Navigation & UI State for PDF-LoFi.
 * Manages active tab, view modes, and focus companion modal state.
 */
import { useState, useCallback } from 'react';
import { ActiveTab } from '../types/pdf';

export function useWorkspaceStore(initialTab: ActiveTab = 'organize') {
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isFocusMinimized, setIsFocusMinimized] = useState(false);

  const openFocusModal = useCallback(() => setIsFocusModalOpen(true), []);
  const closeFocusModal = useCallback(() => setIsFocusModalOpen(false), []);
  const toggleFocusMinimize = useCallback(
    () => setIsFocusMinimized((prev) => !prev),
    []
  );

  return {
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    isFocusModalOpen,
    isFocusMinimized,
    openFocusModal,
    closeFocusModal,
    toggleFocusMinimize,
  };
}
