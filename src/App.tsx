/**
 * PDF-LoFi — Familiar Tool-First UX + QRxMENU Theme
 * Everything you need to work with PDFs. Without uploading your documents.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Minimize2, FileImage } from 'lucide-react';
import { Header } from './components/Header';
import { WorkFocusModal } from './components/WorkFocusModal';
import { LandingView } from './features/landing/LandingView';
import { MergeToolView } from './features/tools/MergeToolView';
import { SplitToolView } from './features/tools/SplitToolView';
import { PlaceholderToolView } from './features/tools/PlaceholderToolView';
import { ToolsDirectory } from './features/tools/ToolsDirectory';
import { WorkspaceView } from './features/workspace/WorkspaceView';
import { PricingView } from './features/pricing/PricingView';
import { AccountView } from './features/account/AccountView';
import { LocalDocument, ActiveTab, AppView } from './types/pdf';
import { getPdfMetadata, clearPdfCache } from './pdf/pdfRenderer';
import { generateSamplePdf } from './pdf/samplePdf';
import {
  saveDocumentToDB,
  getRecentDocumentsFromDB,
  getDocumentFromDB,
  deleteDocumentFromDB,
  clearAllDocumentsFromDB,
} from './storage/db';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [currentDocument, setCurrentDocument] = useState<LocalDocument | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<ActiveTab>('organize');
  const [recentDocuments, setRecentDocuments] = useState<LocalDocument[]>([]);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isFocusMinimized, setIsFocusMinimized] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string>('peaceful-piano');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notification, setNotification] = useState<{
    message: string;
    type: 'error' | 'info' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);

  // Monitor online / offline status truthfully
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load recent documents from IndexedDB on startup
  useEffect(() => {
    async function loadRecent() {
      try {
        const docs = await getRecentDocumentsFromDB(8);
        setRecentDocuments(docs);
      } catch (err) {
        console.warn('Could not read recent docs from IndexedDB:', err);
      }
    }
    loadRecent();

    // Check URL parameters for view routing (e.g. from checkout redirect)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'account' || viewParam === 'pricing') {
        setCurrentView(viewParam);
      }
      if (params.get('checkout') === 'success') {
        setNotification({
          message: 'Welcome to Pro Pass! Your subscription has been recorded.',
          type: 'info',
        });
      }
    }
  }, []);

  // Helper to ingest a PDF from raw bytes
  const ingestPdf = async (uint8: Uint8Array, name: string): Promise<LocalDocument | null> => {
    try {
      clearPdfCache();
      const meta = await getPdfMetadata(uint8);
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newDoc: LocalDocument = {
        id: docId,
        name,
        size: uint8.byteLength,
        pageCount: meta.pageCount,
        mimeType: 'application/pdf',
        processingState: 'idle',
        processingLocation: 'local',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: uint8,
      };

      setCurrentDocument(newDoc);

      // Persist to local IndexedDB
      await saveDocumentToDB(newDoc);
      const updatedList = await getRecentDocumentsFromDB(8);
      setRecentDocuments(updatedList);

      return newDoc;
    } catch (err) {
      console.error('Error loading PDF document:', err);
      setNotification({
        type: 'error',
        message: 'Could not open the selected PDF. Please verify the file is not corrupted or password-protected.',
      });
      return null;
    }
  };

  // Handle file picker selection from header or landing
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    if (files.length > 1) {
      // Switch directly to merge tool
      setCurrentView('merge');
    } else {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const doc = await ingestPdf(new Uint8Array(buffer), file.name);
      if (doc) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('organize');
      }
    }
    e.target.value = '';
  };

  // Handle drag and drop files on home
  const handleDropFiles = async (files: FileList) => {
    if (files.length === 0) return;
    if (files.length > 1) {
      setCurrentView('merge');
    } else {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const doc = await ingestPdf(new Uint8Array(buffer), file.name);
      if (doc) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('organize');
      }
    }
  };

  // Load built-in 4-page sample PDF
  const handleLoadSample = async (targetTab: ActiveTab = 'organize'): Promise<LocalDocument | null> => {
    try {
      const sampleBytes = await generateSamplePdf();
      const doc = await ingestPdf(sampleBytes, 'PDF-LoFi_Sample_Document.pdf');
      if (doc) {
        setCurrentView('workspace');
        setActiveWorkspaceTab(targetTab);
        return doc;
      }
    } catch (err) {
      console.error('Failed generating sample PDF:', err);
    }
    return null;
  };

  // Handle document update from page operations (rotate, delete, duplicate, etc.)
  const handleUpdateDocumentData = async (
    newData: Uint8Array,
    pageCount: number,
    operationName: string
  ) => {
    if (!currentDocument) return;
    clearPdfCache();

    const updated: LocalDocument = {
      ...currentDocument,
      data: newData,
      pageCount,
      size: newData.byteLength,
      processingState: 'completed',
      updatedAt: Date.now(),
    };

    setCurrentDocument(updated);

    // Update in IndexedDB
    await saveDocumentToDB(updated);
    const updatedList = await getRecentDocumentsFromDB(8);
    setRecentDocuments(updatedList);
  };

  // Open recent document from IndexedDB
  const handleOpenRecentDocument = async (doc: LocalDocument) => {
    try {
      const stored = await getDocumentFromDB(doc.id);
      if (stored && stored.data) {
        clearPdfCache();
        setCurrentDocument(stored);
        setCurrentView('workspace');
        setActiveWorkspaceTab('organize');
      } else {
        setNotification({
          type: 'error',
          message: 'Document data could not be recovered from local device cache.',
        });
      }
    } catch (err) {
      console.error('Error opening recent doc:', err);
    }
  };

  const handleOpenSplitOrMergedDocInWorkspace = async (
    data: Uint8Array,
    name: string,
    pageCount: number
  ) => {
    const doc = await ingestPdf(data, name);
    if (doc) {
      setCurrentView('workspace');
      setActiveWorkspaceTab('organize');
    }
  };

  // Navigation handler
  const handleNavigateView = (view: AppView) => {
    if (view === 'organize') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('organize');
      } else {
        // Prompt file load or sample
        handleLoadSample('organize');
      }
      return;
    }

    if (view === 'viewer') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('view');
      } else {
        handleLoadSample('view');
      }
      return;
    }

    if (view === 'edit' || view === 'page-numbers' || view === 'watermark') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('edit');
      } else {
        handleLoadSample('edit');
      }
      return;
    }

    if (view === 'compress' || view === 'optimize') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('optimize');
      } else {
        handleLoadSample('optimize');
      }
      return;
    }

    if (view === 'inspect') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('inspect');
      } else {
        handleLoadSample('inspect');
      }
      return;
    }

    if (view === 'ocr') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('ocr');
      } else {
        handleLoadSample('ocr');
      }
      return;
    }

    if (view === 'forms') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('forms');
      } else {
        handleLoadSample('forms');
      }
      return;
    }

    if (view === 'compare') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('compare');
      } else {
        handleLoadSample('compare');
      }
      return;
    }

    if (view === 'workflows') {
      if (currentDocument) {
        setCurrentView('workspace');
        setActiveWorkspaceTab('workflows');
      } else {
        handleLoadSample('workflows');
      }
      return;
    }

    if (view === 'workspace') {
      if (!currentDocument) {
        handleLoadSample('organize');
        return;
      }
    }

    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col justify-between selection:bg-orange-200 selection:text-orange-950 font-sans">
      {/* Hidden file input for header action */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleSelectFile}
        id="global-file-input"
      />

      <div>
        {/* Floating Island Header Banner with Primary Navigation */}
        <Header
          currentView={currentView}
          onNavigateView={handleNavigateView}
          currentDocument={currentDocument}
          onOpenFocusModal={() => {
            if (isFocusMinimized) {
              setIsFocusMinimized(false);
            }
            setIsFocusModalOpen(true);
          }}
          onLoadSample={handleLoadSample}
          onSelectFile={handleSelectFile}
          isFocusActive={isFocusModalOpen || isFocusMinimized}
        />

        {/* View Routing based on Tool-First Architecture */}
        <main className="w-full">
          {currentView === 'home' && (
            <LandingView
              onOpenPdf={() => fileInputRef.current?.click()}
              onTrySample={handleLoadSample}
              onOpenFocusModal={() => {
                if (isFocusMinimized) {
                  setIsFocusMinimized(false);
                }
                setIsFocusModalOpen(true);
              }}
              onSelectTool={handleNavigateView}
              onDropFiles={handleDropFiles}
              recentDocuments={recentDocuments}
              onOpenRecentDocument={handleOpenRecentDocument}
            />
          )}

          {currentView === 'merge' && (
            <MergeToolView
              initialPdf={
                currentDocument && currentDocument.data
                  ? {
                      name: currentDocument.name,
                      size: currentDocument.size,
                      pageCount: currentDocument.pageCount,
                      data: currentDocument.data,
                    }
                  : undefined
              }
              onOpenMergedInWorkspace={handleOpenSplitOrMergedDocInWorkspace}
              onBackToHome={() => setCurrentView('home')}
            />
          )}

          {currentView === 'split' && (
            <SplitToolView
              document={currentDocument}
              onSelectDocument={async (uint8, name) => {
                await ingestPdf(uint8, name);
              }}
              onOpenSplitInWorkspace={handleOpenSplitOrMergedDocInWorkspace}
              onBackToHome={() => setCurrentView('home')}
            />
          )}

          {currentView === 'compress' && (
            <PlaceholderToolView
              toolName="Compress PDF"
              description="Reduce PDF file size while preserving high visual quality and typography."
              iconNode={<Minimize2 className="w-6 h-6 text-orange-600" />}
              onNavigateView={handleNavigateView}
            />
          )}

          {currentView === 'convert' && (
            <PlaceholderToolView
              toolName="Convert PDF"
              description="Convert PDF pages to high-resolution JPG or PNG images directly in your browser."
              iconNode={<FileImage className="w-6 h-6 text-orange-600" />}
              onNavigateView={handleNavigateView}
            />
          )}

          {currentView === 'tools' && (
            <ToolsDirectory
              onSelectToolAction={(tab) => {
                if (tab === 'merge') setCurrentView('merge');
                else if (tab === 'split') setCurrentView('split');
                else {
                  if (currentDocument) {
                    setCurrentView('workspace');
                    setActiveWorkspaceTab(tab);
                  } else {
                    handleLoadSample();
                  }
                }
              }}
              onNavigateView={handleNavigateView}
              hasDocument={!!currentDocument}
              onOpenPdf={() => fileInputRef.current?.click()}
            />
          )}

          {currentView === 'workspace' && currentDocument && (
            <WorkspaceView
              currentDocument={currentDocument}
              activeTab={activeWorkspaceTab}
              onSelectTab={setActiveWorkspaceTab}
              onNavigateView={handleNavigateView}
              onUpdateDocumentData={handleUpdateDocumentData}
              onOpenFocusModal={() => {
                if (isFocusMinimized) {
                  setIsFocusMinimized(false);
                }
                setIsFocusModalOpen(true);
              }}
              onOpenAnotherPdf={() => fileInputRef.current?.click()}
              onOpenMergedDoc={handleOpenSplitOrMergedDocInWorkspace}
              isFocusActive={isFocusModalOpen || isFocusMinimized}
              onStartFocusWithTrack={(track) => {
                setActiveTrackId(track.id);
                setIsFocusModalOpen(true);
                setIsFocusMinimized(false);
              }}
            />
          )}

          {currentView === 'pricing' && (
            <PricingView onNavigateView={handleNavigateView} />
          )}

          {currentView === 'account' && (
            <AccountView onNavigateView={handleNavigateView} />
          )}
        </main>
      </div>

      {/* Work & Focus Modal / Persistent Audio Stream */}
      <WorkFocusModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        isMinimized={isFocusMinimized}
        onToggleMinimize={() => {
          if (isFocusMinimized) {
            setIsFocusMinimized(false);
            setIsFocusModalOpen(true);
          } else {
            setIsFocusMinimized(true);
            setIsFocusModalOpen(false);
          }
        }}
        activeTrackId={activeTrackId}
        onTrackChange={(track) => setActiveTrackId(track.id)}
        hasActiveDocument={!!currentDocument}
      />

      {/* In-app Notification / Confirmation Dialog (iframe-safe) */}
      {notification && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-sm font-semibold text-stone-900 leading-snug">
              {notification.message}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              {notification.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setNotification(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => notification.onConfirm?.()}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setNotification(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer with Truthful Status Indicators */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 border-t border-stone-200/60 mt-auto text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('home')}
            className="font-bold text-stone-800 hover:text-orange-600 transition-colors cursor-pointer"
          >
            PDF-LoFi
          </button>
          <span>•</span>
          <span>pdf-lofi.com</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-stone-500">
          <span>Supported PDF operations run in your browser</span>
          <span>•</span>
          <span>Focus audio via YouTube</span>
          <span>•</span>
          <span>Open-source client-side engines</span>
        </div>
      </footer>
    </div>
  );
}
