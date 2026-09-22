import React from 'react';
import { FileText, Trash2, Clock, HardDrive, ArrowRight } from 'lucide-react';
import { LocalDocument } from '../../types/pdf';

interface RecentDocumentsProps {
  documents: LocalDocument[];
  onOpenDocument: (id: string) => void;
  onRemoveDocument: (id: string) => void;
  onClearAll: () => void;
}

export const RecentDocuments: React.FC<RecentDocumentsProps> = ({
  documents,
  onOpenDocument,
  onRemoveDocument,
  onClearAll,
}) => {
  if (documents.length === 0) {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return (
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-6">
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <h3 className="text-sm font-bold text-stone-900 tracking-tight">Recent Local Documents</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
              IndexedDB ({documents.length})
            </span>
          </div>

          <button
            onClick={onClearAll}
            className="text-xs text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
          >
            Clear History
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group p-3.5 rounded-2xl border border-stone-200/80 hover:border-orange-200 hover:shadow-xs bg-stone-50/50 hover:bg-white transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-900 truncate" title={doc.name}>
                      {doc.name}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveDocument(doc.id);
                    }}
                    className="p-1 rounded-md text-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove from recent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-stone-500 mb-2">
                  <span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                  <span>•</span>
                  <span>{formatBytes(doc.size)}</span>
                  <span>•</span>
                  <span>{formatDate(doc.updatedAt)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <HardDrive className="w-2.5 h-2.5" />
                  LOCAL
                </span>

                <button
                  onClick={() => onOpenDocument(doc.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 group-hover:text-orange-700 cursor-pointer"
                >
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
