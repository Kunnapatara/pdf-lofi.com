import React, { useState } from 'react';
import {
  FileText,
  HardDrive,
  RefreshCw,
  Headphones,
  Play,
  X,
} from 'lucide-react';
import { LocalDocument, ActiveTab, AppView } from '../../types/pdf';
import { CategoryNav } from '../../components/CategoryNav';
import { ViewerTab } from './ViewerTab';
import { OrganizeTab } from './OrganizeTab';
import { MergeTab } from './MergeTab';
import { SplitTab } from './SplitTab';
import { ToolsDirectory } from '../tools/ToolsDirectory';
import { FOCUS_TRACKS, FocusTrack } from '../focus/WorkFocusModal';

interface WorkspaceViewProps {
  currentDocument: LocalDocument;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onNavigateView?: (view: AppView) => void;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
  onOpenFocusModal: () => void;
  onOpenAnotherPdf: () => void;
  onOpenMergedDoc: (data: Uint8Array, name: string, pageCount: number) => void;
  isFocusActive?: boolean;
  onStartFocusWithTrack?: (track: FocusTrack) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  currentDocument,
  activeTab,
  onSelectTab,
  onNavigateView,
  onUpdateDocumentData,
  onOpenFocusModal,
  onOpenAnotherPdf,
  onOpenMergedDoc,
  isFocusActive = false,
  onStartFocusWithTrack,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<FocusTrack>(FOCUS_TRACKS[0]);
  const [dismissFocusPrompt, setDismissFocusPrompt] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleStartFocus = () => {
    if (onStartFocusWithTrack) {
      onStartFocusWithTrack(selectedTrack);
    } else {
      onOpenFocusModal();
    }
  };

  return (
    <div className="w-full space-y-4 pb-16">
      {/* Document Identity Banner */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-stone-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-stone-900 truncate" title={currentDocument.name}>
                  {currentDocument.name}
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full shrink-0">
                  <HardDrive className="w-2.5 h-2.5" />
                  LOCAL
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mt-0.5">
                <span>{currentDocument.pageCount} {currentDocument.pageCount === 1 ? 'page' : 'pages'}</span>
                <span>•</span>
                <span>{formatBytes(currentDocument.size)}</span>
                <span>•</span>
                <span className="text-stone-400">Processed in browser</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAnotherPdf}
              className="px-3.5 py-2 rounded-full text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              <span>Change PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 14: PDF-First UX Post-Ingestion Decision (Optional enhancement) */}
      {!isFocusActive && !dismissFocusPrompt && (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl border border-orange-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in fade-in">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-stone-900">Your PDF is ready.</span>
                <span className="text-xs text-stone-500">Choose your focus sound (optional):</span>
              </div>

              {/* Track Choice Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {FOCUS_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedTrack.id === track.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {track.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <button
                onClick={handleStartFocus}
                id="btn-post-ingest-focus"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>▶ Start Work & Focus</span>
              </button>

              <button
                onClick={() => setDismissFocusPrompt(true)}
                className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Continue without focus audio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Category Nav */}
      <CategoryNav
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        hasDocument={true}
        onOpenFocusModal={onOpenFocusModal}
      />

      {/* Main Tab Content */}
      <main className="w-full">
        {activeTab === 'view' && (
          <ViewerTab
            document={currentDocument}
            onSelectOrganize={() => onSelectTab('organize')}
          />
        )}

        {activeTab === 'organize' && (
          <OrganizeTab
            document={currentDocument}
            onUpdateDocumentData={onUpdateDocumentData}
          />
        )}

        {activeTab === 'merge' && (
          <MergeTab
            initialPdf={currentDocument.data ? {
              name: currentDocument.name,
              size: currentDocument.size,
              pageCount: currentDocument.pageCount,
              data: currentDocument.data,
            } : undefined}
            onOpenMergedDoc={onOpenMergedDoc}
          />
        )}

        {activeTab === 'split' && (
          <SplitTab document={currentDocument} />
        )}

        {activeTab === 'tools' && (
          <ToolsDirectory
            onSelectToolAction={onSelectTab}
            onNavigateView={onNavigateView}
            hasDocument={true}
            onOpenPdf={onOpenAnotherPdf}
          />
        )}
      </main>
    </div>
  );
};
