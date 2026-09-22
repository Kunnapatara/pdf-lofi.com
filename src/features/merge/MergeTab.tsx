import React, { useState } from 'react';
import { GitMerge, Plus, ArrowUp, ArrowDown, Trash2, FileText, Download, CheckCircle2 } from 'lucide-react';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { getDocumentPageCount } from '../../pdf/rendering/renderService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface MergeFileItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  data: Uint8Array;
}

interface MergeTabProps {
  initialPdf?: { name: string; size: number; pageCount: number; data: Uint8Array };
  onOpenMergedDoc: (data: Uint8Array, name: string, pageCount: number) => void;
}

export const MergeTab: React.FC<MergeTabProps> = ({ initialPdf, onOpenMergedDoc }) => {
  const [files, setFiles] = useState<MergeFileItem[]>(() => {
    if (initialPdf) {
      return [
        {
          id: 'initial-1',
          name: initialPdf.name,
          size: initialPdf.size,
          pageCount: initialPdf.pageCount,
          data: initialPdf.data,
        },
      ];
    }
    return [];
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mergedResult, setMergedResult] = useState<{ data: Uint8Array; pageCount: number; name: string } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    setErrorMsg(null);

    for (const file of incoming) {
      try {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        const pageCount = await getDocumentPageCount(uint8);

        setFiles((prev) => [
          ...prev,
          {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            pageCount,
            data: uint8,
          },
        ]);
      } catch (err) {
        console.error('Error adding PDF to merge:', err);
        setErrorMsg(`Failed to parse ${file.name}. Ensure it is a valid PDF.`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= files.length) return;
    setFiles((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(newIdx, 0, item);
      return copy;
    });
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMergedResult(null);
  };

  const handleExecuteMerge = async () => {
    if (files.length < 2) {
      setErrorMsg('Please select at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const pdfBytesList = files.map((f) => f.data);
      const result = await documentService.mergeDocuments(pdfBytesList);
      const mergedName = `merged_${files.length}_documents.pdf`;

      setMergedResult({
        data: result.data,
        pageCount: result.pageCount,
        name: mergedName,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadMerged = () => {
    if (mergedResult) {
      triggerLocalDownload(mergedResult.data, mergedResult.name);
    }
  };

  const totalPagesToMerge = files.reduce((acc, curr) => acc + curr.pageCount, 0);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <GitMerge className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Merge PDFs</h2>
            <p className="text-xs text-stone-500">
              Combine multiple PDF documents into a single file locally on your device.
            </p>
          </div>
        </div>

        <ProcessingBadge
          state={isProcessing ? 'processing' : errorMsg ? 'error' : mergedResult ? 'completed' : 'idle'}
          operationName="Merging PDF documents locally"
          errorMessage={errorMsg || undefined}
          onClearError={() => setErrorMsg(null)}
        />
      </div>

      {/* Files List Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wide">
            Documents to Combine ({files.length})
          </div>
          <div className="text-xs text-stone-500">
            Total Pages: <span className="font-bold text-stone-800">{totalPagesToMerge}</span>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-stone-300 mx-auto" />
            <div className="text-sm font-bold text-stone-700">No PDFs selected for merge</div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Add at least two PDF files to merge them into one organized document.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {files.map((file, idx) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/50 hover:bg-white hover:border-orange-200 transition-all"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-bold text-stone-900 truncate" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {file.pageCount} pages • {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 transition-all text-stone-600 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === files.length - 1}
                    className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 transition-all text-stone-600 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg border border-stone-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-stone-400 ml-1 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleAddFiles}
            id="merge-file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another PDF</span>
          </button>

          <button
            onClick={handleExecuteMerge}
            disabled={files.length < 2 || isProcessing}
            id="btn-run-merge"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <GitMerge className="w-4 h-4" />
            <span>Merge {files.length} PDFs Locally</span>
          </button>
        </div>
      </div>

      {/* Success Result Card */}
      {mergedResult && (
        <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Merge Completed Locally</h3>
                <p className="text-xs text-emerald-700">
                  {mergedResult.name} ({mergedResult.pageCount} total pages) is ready.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
              100% In-Browser
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleDownloadMerged}
              id="btn-download-merged"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Merged PDF</span>
            </button>

            <button
              onClick={() => onOpenMergedDoc(mergedResult.data, mergedResult.name, mergedResult.pageCount)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-white text-emerald-900 hover:bg-emerald-100/50 border border-emerald-300 transition-all cursor-pointer"
            >
              <span>Open in Workspace Viewer →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
