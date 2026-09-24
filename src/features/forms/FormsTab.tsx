import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Lock,
  Save,
  Layers,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import {
  inspectPdfForm,
  FormInspectionResult,
  FormFieldInfo,
} from '../../pdf/core/operations/formOperation';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface FormsTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
}

export const FormsTab: React.FC<FormsTabProps> = ({
  document,
  onUpdateDocumentData,
}) => {
  const [formInspection, setFormInspection] = useState<FormInspectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadFormState = async () => {
    if (!document.data) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await inspectPdfForm(document.data);
      setFormInspection(result);

      const initialValues: Record<string, string | boolean> = {};
      for (const field of result.fields) {
        initialValues[field.name] = field.value;
      }
      setFieldValues(initialValues);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not inspect PDF forms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFormState();
  }, [document.id, document.data]);

  const handleFieldChange = (name: string, val: string | boolean) => {
    setFieldValues((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleSaveFilledForm = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Writing filled form field values locally...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const updated = await documentService.fillForm(document, fieldValues);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Fill Form Fields');
        setSuccessBanner('Form values successfully saved into PDF.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save form fields');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearForm = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Clearing form fields...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const updated = await documentService.clearForm(document);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Clear Form Fields');
        setSuccessBanner('All form fields cleared.');
        await loadFormState();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to clear form');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlattenForm = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setProcessingMsg('Flattening form widgets into static vectors...');
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      // First save current values if modified
      const withValues = await documentService.fillForm(document, fieldValues);
      // Then flatten
      const flattened = await documentService.flattenForm(withValues);
      if (flattened.data) {
        await onUpdateDocumentData(flattened.data, flattened.pageCount, 'Flatten Form Fields');
        setSuccessBanner('Form flattened! Interactive inputs converted into non-editable vector graphics.');
        await loadFormState();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to flatten form');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (document.data) {
      triggerLocalDownload(document.data, document.name);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">PDF AcroForms & Field Flattening</h2>
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
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
          Scanning PDF for interactive AcroForm fields...
        </div>
      ) : formInspection?.isXfa ? (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Proprietary Dynamic XFA Form Detected</span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            This document contains Adobe proprietary dynamic XML Forms Architecture (XFA) streams.
            Modern standards-compliant browser engines only process standard ISO-32000 AcroForms.
            To fill this document, open it in an Adobe Acrobat compliant viewer.
          </p>
        </div>
      ) : !formInspection?.hasForm || formInspection.fields.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center max-w-lg mx-auto space-y-3">
          <FileCheck className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-sm font-bold text-stone-800">No Interactive Form Fields Detected</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            This PDF does not contain interactive AcroForm text fields, checkboxes, or dropdowns.
            To add text annotations or signatures, please use the <strong>Edit / Markup</strong> tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form Fields List */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Interactive Form Fields ({formInspection.fields.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Direct client-side AcroForm reading and field editing.
                </p>
              </div>

              <button
                onClick={handleClearForm}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Fields</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {formInspection.fields.map((field) => (
                <div key={field.name} className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 font-mono">{field.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-stone-400">
                      {field.type}
                    </span>
                  </div>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      disabled={field.isReadOnly}
                      value={String(fieldValues[field.name] ?? '')}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl"
                    />
                  )}

                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        disabled={field.isReadOnly}
                        checked={Boolean(fieldValues[field.name])}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="font-medium text-stone-700">Checked</span>
                    </label>
                  )}

                  {field.type === 'dropdown' && field.options && (
                    <select
                      disabled={field.isReadOnly}
                      value={String(fieldValues[field.name] ?? '')}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl"
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'radio' && field.options && (
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      {field.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={field.name}
                            value={opt}
                            disabled={field.isReadOnly}
                            checked={fieldValues[field.name] === opt}
                            onChange={() => handleFieldChange(field.name, opt)}
                            className="accent-orange-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-400">Zero data sent to server.</span>
              <button
                onClick={handleSaveFilledForm}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Filled Form</span>
              </button>
            </div>
          </div>

          {/* Right: Flatten Form Card */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-600" />
                  <h3 className="text-base font-bold text-stone-900">Flatten Form Fields</h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Permanently burn active form values into static visual page content.
                </p>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-600 space-y-2">
                <p>
                  Flattening converts interactive text inputs, checkboxes, and buttons into uneditable PDF vector shapes.
                </p>
                <p className="font-bold text-stone-800">
                  Recommended before archiving, printing, or distributing completed contracts.
                </p>
              </div>
            </div>

            <button
              onClick={handleFlattenForm}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Flatten & Lock Form</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
