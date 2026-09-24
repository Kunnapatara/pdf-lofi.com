import React, { useState, useEffect } from 'react';
import {
  FileText,
  Shield,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Save,
  Tag,
  Calendar,
  User,
  FileType,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { inspectPdfDocument, DocumentInspectionData } from '../../pdf/core/operations/metadataOperation';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface InspectTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
}

export const InspectTab: React.FC<InspectTabProps> = ({
  document,
  onUpdateDocumentData,
}) => {
  const [inspection, setInspection] = useState<DocumentInspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Editable fields
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [editCreator, setEditCreator] = useState('');

  const loadInspectionData = async () => {
    if (!document.data) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await inspectPdfDocument(document.data);
      setInspection(data);
      setEditTitle(data.title);
      setEditAuthor(data.author);
      setEditSubject(data.subject);
      setEditKeywords(data.keywords.join(', '));
      setEditCreator(data.creator);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not inspect PDF structure');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInspectionData();
  }, [document.id, document.data]);

  const handleSaveMetadata = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Updating document metadata locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const keywordsArr = editKeywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean);
      const updated = await documentService.updateMetadata(document, {
        title: editTitle,
        author: editAuthor,
        subject: editSubject,
        keywords: keywordsArr,
        creator: editCreator,
      });

      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Update Metadata');
        setSuccessBanner('Document metadata saved successfully.');
        await loadInspectionData();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update metadata');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSanitizeMetadata = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Stripping identifying metadata for privacy...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const updated = await documentService.sanitizeMetadata(document);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Sanitize Metadata');
        setSuccessBanner('All identifying metadata stripped successfully.');
        await loadInspectionData();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to sanitize metadata');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (document.data) {
      triggerLocalDownload(document.data, document.name);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">Document Intelligence & Structure</h2>
        </div>

        <button
          onClick={handleDownload}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs ml-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      <ProcessingBadge
        state={isProcessing ? 'processing' : errorMsg ? 'error' : document.processingState}
        operationName={processingMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      {isLoading ? (
        <div className="p-12 text-center text-xs text-stone-400 font-mono">
          Inspecting PDF structures client-side...
        </div>
      ) : inspection ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Core File Properties & Structural Elements */}
          <div className="lg:col-span-6 space-y-6">
            {/* Quick Metrics */}
            <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Core Document Parameters
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase block">Pages</span>
                  <span className="text-base font-bold text-stone-900">{inspection.pageCount}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase block">File Size</span>
                  <span className="text-base font-bold text-stone-900">{formatBytes(document.size)}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase block">PDF Version</span>
                  <span className="text-base font-bold text-stone-900">v{inspection.pdfVersion}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase block">Dimensions</span>
                  <span className="text-xs font-bold text-stone-800">
                    {inspection.pageSize.widthMm} × {inspection.pageSize.heightMm} mm
                  </span>
                  <span className="text-[10px] text-stone-400 block font-mono">
                    {inspection.pageSize.widthPt} × {inspection.pageSize.heightPt} pt
                  </span>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase block">Orientation</span>
                  <span className="text-base font-bold text-stone-900">{inspection.pageSize.orientation}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase block">Security</span>
                  <span className="text-xs font-bold text-emerald-700">
                    {inspection.structure.isEncrypted ? 'Encrypted' : 'Standard (Open)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Structural Elements Inspection */}
            <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Structural Inspection
              </h3>

              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-stone-600">AcroForms / Form Fields</span>
                  <span className="font-bold text-stone-900">
                    {inspection.structure.hasForms ? `Detected (${inspection.structure.formFieldCount} fields)` : 'Not detected'}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-stone-600">Document Outlines / Bookmarks</span>
                  <span className="font-bold text-stone-900">
                    {inspection.structure.hasOutlines ? 'Detected' : 'Not detected'}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-stone-600">Referenced Embedded Fonts</span>
                  <span className="font-bold text-stone-900">{inspection.structure.fontCount} fonts detected</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-stone-600">Embedded XObject Images</span>
                  <span className="font-bold text-stone-900">{inspection.structure.imageCount} image objects</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-stone-600">Annotated Elements</span>
                  <span className="font-bold text-stone-900">{inspection.structure.annotationCount} annotations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata Viewer & Editor */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">Document Metadata Editor</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  View and update document identity tags in-browser.
                </p>
              </div>

              <button
                onClick={handleSanitizeMetadata}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                title="Erase author, title, and creation info for privacy"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sanitize Metadata</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Annual Report 2026"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Author / Creator</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Subject / Summary</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="e.g. Financial Overview"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Keywords (Comma separated)</label>
                <input
                  type="text"
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  placeholder="e.g. finance, quarterly, report"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Creator Application</label>
                <input
                  type="text"
                  value={editCreator}
                  onChange={(e) => setEditCreator(e.target.value)}
                  placeholder="e.g. PDF-LoFi"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="pt-2 text-[11px] text-stone-400 font-mono space-y-1">
                <div>Producer: {inspection.producer || 'Standard PDF Engine'}</div>
                <div>Created: {inspection.creationDate ? new Date(inspection.creationDate).toLocaleString() : 'Unknown'}</div>
                <div>Modified: {inspection.modificationDate ? new Date(inspection.modificationDate).toLocaleString() : 'Unknown'}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                onClick={handleSaveMetadata}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Metadata</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
