import React, { useState, useRef } from 'react';
import {
  GitMerge,
  Upload,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { getDocumentPageCount } from '../../pdf/rendering/renderService';
import { generateSamplePdf } from '../../pdf/samplePdf';
import { EntitlementManager } from '../../services/entitlementService';

interface MergeFileItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  data: Uint8Array;
}

interface MergeToolViewProps {
  initialPdf?: { name: string; size: number; pageCount: number; data: Uint8Array };
  onOpenMergedInWorkspace: (data: Uint8Array, name: string, pageCount: number) => void;
  onBackToHome: () => void;
  onNavigateToPricing?: () => void;
}

export const MergeToolView: React.FC<MergeToolViewProps> = ({
  initialPdf,
  onOpenMergedInWorkspace,
  onBackToHome,
  onNavigateToPricing,
}) => {
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
  const [isEntitlementError, setIsEntitlementError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mergedResult, setMergedResult] = useState<{
    data: Uint8Array;
    pageCount: number;
    name: string;
    fileCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFilesFromList = async (incomingFiles: File[]) => {
    setErrorMsg(null);
    const newItems: MergeFileItem[] = [];

    for (const file of incomingFiles) {
      try {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        const pageCount = await getDocumentPageCount(uint8);

        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          pageCount,
          data: uint8,
        });
      } catch (err) {
        console.error('Error adding PDF to merge:', err);
        setErrorMsg(`Failed to read "${file.name}". Please verify it is a valid PDF.`);
      }
    }

    if (newItems.length > 0) {
      setFiles((prev) => [...prev, ...newItems]);
      setMergedResult(null);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const fileList = Array.from(e.target.files);
    await addFilesFromList(fileList);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files).filter((f) =>
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (fileList.length === 0) {
        setErrorMsg('Please drop PDF files only.');
        return;
      }
      await addFilesFromList(fileList);
    }
  };

  const handleAddSample = async () => {
    try {
      const sampleBytes = await generateSamplePdf();
      setFiles((prev) => [
        ...prev,
        {
          id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: `Sample_Doc_${prev.length + 1}.pdf`,
          size: sampleBytes.byteLength,
          pageCount: 4,
          data: sampleBytes,
        },
      ]);
      setMergedResult(null);
    } catch (err) {
      console.error('Failed generating sample PDF:', err);
    }
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
      setIsEntitlementError(false);
      return;
    }

    const validation = EntitlementManager.validateMergeBatch(files.length);
    if (!validation.allowed) {
      setErrorMsg(validation.error || 'File limit exceeded for merge.');
      setIsEntitlementError(!validation.isPro);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setIsEntitlementError(false);
    try {
      const pdfBytesList = files.map((f) => f.data);
      const result = await documentService.mergeDocuments(pdfBytesList);
      const mergedName = `merged_${files.length}_documents.pdf`;

      setMergedResult({
        data: result.data,
        pageCount: result.pageCount,
        name: mergedName,
        fileCount: files.length,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Merge failed');
      setIsEntitlementError(false);
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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        id="merge-tool-file-input"
      />

      {/* Tool Header */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                  Merge PDF
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  LOCAL
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Combine PDF files in the order you want.
              </p>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors self-start sm:self-center cursor-pointer"
          >
            ← Back to All Tools
          </button>
        </div>
      </div>

      {/* Error notification if any */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEntitlementError && onNavigateToPricing && (
              <button
                onClick={onNavigateToPricing}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Upgrade to Pro</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsEntitlementError(false);
              }}
              className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Step 1 / Drop Zone when empty */}
      {files.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center transition-all shadow-xs flex flex-col items-center justify-center ${
            isDragging
              ? 'border-orange-500 bg-orange-50/40 scale-[1.01]'
              : 'border-stone-300 hover:border-orange-300'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-100/70 text-orange-600 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-stone-900 mb-1">
            Drop PDF files here
          </h3>
          <p className="text-xs text-stone-500 mb-6 max-w-sm">
            Select multiple PDF files to combine. All processing is strictly performed locally in your browser.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              id="btn-merge-select-files"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs shadow-orange-500/25 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Select Files</span>
            </button>

            <button
              onClick={handleAddSample}
              id="btn-merge-sample"
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-stone-500" />
              <span>Try Sample PDF</span>
            </button>
          </div>
        </div>
      ) : (
        /* Step 2: Configured List of Selected Files */
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
              <span>PDF Files to Combine ({files.length})</span>
              <span className="text-stone-400 font-normal">•</span>
              <span className="text-stone-500 font-medium lowercase">drag or use arrows to reorder</span>
            </div>
            <div className="text-xs text-stone-500 font-semibold">
              Total Pages: <span className="text-stone-900 font-bold">{totalPagesToMerge}</span>
            </div>
          </div>

          {/* Files List */}
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

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                id="btn-merge-add-more"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add more files</span>
              </button>

              <button
                onClick={handleAddSample}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-all cursor-pointer"
              >
                <span>+ Add Sample</span>
              </button>
            </div>

            <button
              onClick={handleExecuteMerge}
              disabled={files.length < 2 || isProcessing}
              id="btn-execute-merge"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shadow-orange-500/25 active:scale-95 cursor-pointer"
            >
              <GitMerge className="w-4 h-4" />
              <span>{isProcessing ? 'Merging PDFs...' : `Merge ${files.length} PDFs`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing State */}
      {isProcessing && (
        <div className="bg-white rounded-3xl border border-orange-200 p-6 shadow-xs text-center space-y-3 animate-in fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            LOCAL — Processing on this device
          </div>
          <h4 className="text-base font-bold text-stone-900">Merging PDFs...</h4>
          <p className="text-xs text-stone-500">
            Combining pages in-memory without uploading your documents.
          </p>
        </div>
      )}

      {/* Step 4: Final Result Card */}
      {mergedResult && !isProcessing && (
        <div className="bg-emerald-50/80 rounded-3xl border border-emerald-200/90 p-6 sm:p-7 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  ✓ PDF merged successfully
                </h3>
                <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                  {mergedResult.pageCount} pages • {mergedResult.fileCount} documents
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Completed locally • Your PDF was not uploaded
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
              Ready
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-emerald-200/60">
            <button
              onClick={handleDownloadMerged}
              id="btn-merge-download"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={() =>
                onOpenMergedInWorkspace(
                  mergedResult.data,
                  mergedResult.name,
                  mergedResult.pageCount
                )
              }
              id="btn-merge-open-workspace"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-emerald-900 hover:bg-emerald-100/50 border border-emerald-300 transition-all cursor-pointer"
            >
              <span>Open in Advanced Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setMergedResult(null);
                setFiles([]);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-emerald-800 hover:text-emerald-950 ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Start another merge</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
