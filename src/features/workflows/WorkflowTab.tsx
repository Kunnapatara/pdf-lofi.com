import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Plus,
  Trash2,
  Play,
  Save,
  CheckCircle2,
  FolderOpen,
  ArrowDown,
  Sparkles,
  Download,
  Sliders,
  Layers,
  FileCheck,
  Zap,
  Stamp,
  Hash,
  Crop,
  Maximize2,
  FileX,
  X,
} from 'lucide-react';
import { LocalDocument } from '../../types/pdf';
import { documentService } from '../../services/documentService';
import { workflowRepository, StoredWorkflow, WorkflowStep } from '../../storage/workflowRepository';
import { triggerLocalDownload } from '../../pdf/export/exportService';
import { ProcessingBadge } from '../../components/status/ProcessingBadge';

interface WorkflowTabProps {
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
}

const AVAILABLE_ACTIONS: { id: string; name: string; icon: any; defaultParams: Record<string, any> }[] = [
  { id: 'purge-blanks', name: 'Purge Blank Pages', icon: FileX, defaultParams: {} },
  { id: 'reverse', name: 'Reverse Page Order', icon: Layers, defaultParams: {} },
  { id: 'resize-a4', name: 'Standardize to A4', icon: Maximize2, defaultParams: { preset: 'a4', scaleContent: true } },
  { id: 'crop-margins', name: 'Crop Margins (0.5 in)', icon: Crop, defaultParams: { top: 36, bottom: 36, left: 36, right: 36 } },
  { id: 'page-numbers', name: 'Add Page Numbers', icon: Hash, defaultParams: { startNumber: 1, prefix: 'Page ', suffix: ' of {total}', position: 'bottom-center' } },
  { id: 'watermark', name: 'Add Watermark', icon: Stamp, defaultParams: { text: 'CONFIDENTIAL', opacity: 0.2, fontSize: 48, position: 'diagonal' } },
  { id: 'stamp-approved', name: 'Stamp "APPROVED"', icon: Stamp, defaultParams: { type: 'APPROVED', position: 'top-right' } },
  { id: 'flatten-forms', name: 'Flatten Form Fields', icon: FileCheck, defaultParams: {} },
  { id: 'compress', name: 'Compress Streams', icon: Zap, defaultParams: { stripMetadata: true, compressStreams: true } },
];

export const WorkflowTab: React.FC<WorkflowTabProps> = ({
  document,
  onUpdateDocumentData,
}) => {
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: 'step-1', action: 'purge-blanks', name: 'Purge Blank Pages', params: {} },
    { id: 'step-2', action: 'page-numbers', name: 'Add Page Numbers', params: { startNumber: 1, prefix: 'Page ', suffix: ' of {total}', position: 'bottom-center' } },
    { id: 'step-3', action: 'compress', name: 'Compress Streams', params: { stripMetadata: true, compressStreams: true } },
  ]);

  const [workflowName, setWorkflowName] = useState('Clean & Publish Pipeline');
  const [savedWorkflows, setSavedWorkflows] = useState<StoredWorkflow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load saved workflows on mount
  useEffect(() => {
    async function loadPresets() {
      try {
        const stored = await workflowRepository.getAll();
        setSavedWorkflows(stored);
      } catch (e) {
        console.warn('Could not load workflows', e);
      }
    }
    loadPresets();
  }, []);

  const handleAddStep = (actionId: string) => {
    const actionDef = AVAILABLE_ACTIONS.find((a) => a.id === actionId);
    if (!actionDef) return;

    const newStep: WorkflowStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action: actionDef.id,
      name: actionDef.name,
      params: { ...actionDef.defaultParams },
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleMoveStep = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= steps.length) return;
    const copy = [...steps];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setSteps(copy);
  };

  const handleSaveWorkflowPreset = async () => {
    if (!workflowName.trim() || steps.length === 0) return;
    try {
      const saved = await workflowRepository.save({
        name: workflowName,
        description: `${steps.length} sequential operations`,
        steps,
      });
      setSavedWorkflows((prev) => [saved, ...prev.filter((w) => w.id !== saved.id)]);
      setSuccessBanner(`Workflow "${workflowName}" saved to browser presets.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save workflow');
    }
  };

  const handleLoadWorkflow = (w: StoredWorkflow) => {
    setWorkflowName(w.name);
    const convertedSteps: WorkflowStep[] = w.steps.map((s: any, idx: number) => ({
      id: s.id || `step-${Date.now()}-${idx}`,
      action: s.action || s.type,
      name: s.name,
      params: s.params || {},
    }));
    setSteps(convertedSteps);
    setSuccessBanner(`Loaded workflow preset: "${w.name}"`);
  };

  const handleDeleteSavedWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await workflowRepository.delete(id);
      setSavedWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setErrorMsg('Could not delete workflow preset');
    }
  };

  // Sequential execution pipeline
  const handleExecuteWorkflow = async () => {
    if (!document.data || steps.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessBanner(null);

    let currentDoc: LocalDocument = { ...document };

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStepIdx(i);
        const step = steps[i];
        setProgressMsg(`Running Step ${i + 1} of ${steps.length}: ${step.name}...`);

        switch (step.action) {
          case 'purge-blanks': {
            const res = await documentService.removeBlankPages(currentDoc);
            currentDoc = res.document;
            break;
          }
          case 'reverse': {
            currentDoc = await documentService.reversePages(currentDoc);
            break;
          }
          case 'resize-a4': {
            currentDoc = await documentService.resizePages(currentDoc, {
              preset: step.params.preset || 'a4',
              scaleContent: step.params.scaleContent ?? true,
            });
            break;
          }
          case 'crop-margins': {
            currentDoc = await documentService.cropPages(currentDoc, {
              top: step.params.top || 36,
              bottom: step.params.bottom || 36,
              left: step.params.left || 36,
              right: step.params.right || 36,
            });
            break;
          }
          case 'page-numbers': {
            currentDoc = await documentService.addPageNumbers(currentDoc, {
              startNumber: step.params.startNumber || 1,
              prefix: step.params.prefix || 'Page ',
              suffix: step.params.suffix || ' of {total}',
              position: step.params.position || 'bottom-center',
              fontSize: 10,
              margin: 36,
            });
            break;
          }
          case 'watermark': {
            currentDoc = await documentService.addWatermark(currentDoc, {
              text: step.params.text || 'CONFIDENTIAL',
              opacity: step.params.opacity || 0.2,
              fontSize: step.params.fontSize || 48,
              position: step.params.position || 'diagonal',
            });
            break;
          }
          case 'stamp-approved': {
            currentDoc = await documentService.addStamp(currentDoc, {
              type: step.params.type || 'APPROVED',
              position: step.params.position || 'top-right',
            });
            break;
          }
          case 'flatten-forms': {
            currentDoc = await documentService.flattenForm(currentDoc);
            break;
          }
          case 'compress': {
            const res = await documentService.compressDocument(currentDoc, {
              stripMetadata: step.params.stripMetadata ?? true,
              compressStreams: step.params.compressStreams ?? true,
            });
            currentDoc = res.document;
            break;
          }
          default:
            console.warn(`Unrecognized workflow step: ${step.action}`);
        }
      }

      if (currentDoc.data) {
        await onUpdateDocumentData(currentDoc.data, currentDoc.pageCount, `Execute Workflow (${steps.length} steps)`);
        setSuccessBanner(`All ${steps.length} workflow steps completed successfully!`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Workflow execution failed');
    } finally {
      setIsProcessing(false);
      setCurrentStepIdx(null);
    }
  };

  const handleDownload = () => {
    if (document.data) {
      triggerLocalDownload(document.data, document.name);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-900">Multi-Step Automation Pipeline</h2>
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
        operationName={progressMsg}
        errorMessage={errorMsg || undefined}
        onClearError={() => setErrorMsg(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pipeline Builder */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-base font-bold text-stone-900 bg-transparent hover:bg-stone-50 focus:bg-stone-50 px-2 py-1 rounded-lg border border-transparent focus:border-stone-300"
              />
              <p className="text-xs text-stone-500 px-2 mt-0.5">
                Chains sequential local PDF operations without intermediate server round-trips.
              </p>
            </div>

            <button
              onClick={handleSaveWorkflowPreset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preset</span>
            </button>
          </div>

          {/* Steps Pipeline */}
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isCurrent = isProcessing && currentStepIdx === idx;
              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-orange-500 bg-orange-50/70 shadow-xs ring-2 ring-orange-200'
                      : 'border-stone-200/90 bg-stone-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-stone-200 text-stone-600 text-xs font-bold flex items-center justify-center shadow-2xs">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">{step.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {step.action}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveStep(idx, idx - 1)}
                      disabled={idx === 0 || isProcessing}
                      className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveStep(idx, idx + 1)}
                      disabled={idx === steps.length - 1 || isProcessing}
                      className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleRemoveStep(idx)}
                      disabled={isProcessing}
                      className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Step Selector */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              + Append Step to Pipeline
            </span>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAddStep(action.id)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition-all"
                >
                  <action.icon className="w-3.5 h-3.5 text-stone-500" />
                  <span>{action.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Run Pipeline Action */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-400">Sequenced entirely in-browser.</span>
            <button
              onClick={handleExecuteWorkflow}
              disabled={isProcessing || steps.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Execute Pipeline ({steps.length} Steps)</span>
            </button>
          </div>
        </div>

        {/* Right: Saved Workflow Presets */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Saved Presets</h3>
              </div>
              <span className="text-xs text-stone-400 font-mono">IndexedDB</span>
            </div>

            {savedWorkflows.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">
                No custom workflows saved yet. Configure your steps and click &quot;Save Preset&quot;.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {savedWorkflows.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => handleLoadWorkflow(w)}
                    className="p-3 bg-stone-50 border border-stone-200 rounded-2xl hover:bg-stone-100/80 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">{w.name}</span>
                      <span className="text-[10px] text-stone-400">{w.steps.length} steps</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSavedWorkflow(w.id, e)}
                      className="p-1 text-stone-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-[11px] text-stone-500">
            Workflows automate repetitive preparation tasks before document dispatch.
          </div>
        </div>
      </div>
    </div>
  );
};
