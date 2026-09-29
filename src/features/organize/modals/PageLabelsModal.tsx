import React, { useState, useMemo } from 'react';
import { Hash, X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { LocalDocument } from '../../../types/pdf';
import {
  PageLabelRange,
  PageLabelStyle,
  generatePageLabelsPreview,
} from '../../../pdf/core/operations/pageLabelsOperation';
import { documentService } from '../../../services/documentService';

interface PageLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LocalDocument;
  onUpdateDocumentData: (newData: Uint8Array, pageCount: number, operationName: string) => Promise<void>;
}

export const PageLabelsModal: React.FC<PageLabelsModalProps> = ({
  isOpen,
  onClose,
  document,
  onUpdateDocumentData,
}) => {
  const [ranges, setRanges] = useState<
    { id: string; startPage: number; style: PageLabelStyle; prefix: string; startNumber: number }[]
  >([
    { id: 'r_1', startPage: 1, style: 'decimal', prefix: '', startNumber: 1 },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute live preview of labels for all pages
  const previewLabels = useMemo(() => {
    const coreRanges: PageLabelRange[] = ranges.map((r) => ({
      startPageIndex: Math.max(0, r.startPage - 1),
      style: r.style,
      prefix: r.prefix,
      startNumber: r.startNumber,
    }));
    return generatePageLabelsPreview(coreRanges, document.pageCount);
  }, [ranges, document.pageCount]);

  if (!isOpen) return null;

  const handleAddRange = () => {
    const nextStartPage = Math.min(
      document.pageCount,
      (ranges[ranges.length - 1]?.startPage || 1) + 2
    );
    setRanges([
      ...ranges,
      {
        id: `r_${Date.now()}`,
        startPage: nextStartPage,
        style: 'decimal',
        prefix: 'A-',
        startNumber: 1,
      },
    ]);
  };

  const handleRemoveRange = (id: string) => {
    if (ranges.length <= 1) return;
    setRanges(ranges.filter((r) => r.id !== id));
  };

  const handleUpdateRange = (
    id: string,
    field: 'startPage' | 'style' | 'prefix' | 'startNumber',
    val: any
  ) => {
    setRanges(
      ranges.map((r) => {
        if (r.id !== id) return r;
        return { ...r, [field]: val };
      })
    );
  };

  const handleApply = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const coreRanges: PageLabelRange[] = ranges.map((r) => ({
        startPageIndex: Math.max(0, Math.min(document.pageCount - 1, r.startPage - 1)),
        style: r.style,
        prefix: r.prefix,
        startNumber: Math.max(1, r.startNumber),
      }));

      const updated = await documentService.setPageLabels(document, coreRanges);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Set Page Labels');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update page labels');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLabels = async () => {
    if (!document.data) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const updated = await documentService.removePageLabels(document);
      if (updated.data) {
        await onUpdateDocumentData(updated.data, updated.pageCount, 'Remove Page Labels');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove page labels');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-xl w-full shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-base font-bold text-stone-900">Page Labels</h3>
              <p className="text-[11px] text-stone-500">
                Define semantic PDF page labels for logical document navigation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        {/* Range Configuration List */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {ranges.map((r, index) => (
            <div
              key={r.id}
              className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800">
                  {index === 0 ? 'Primary Range' : `Section Range ${index + 1}`}
                </span>
                {ranges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRange(r.id)}
                    className="text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">
                    Starts on Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={document.pageCount}
                    value={r.startPage}
                    onChange={(e) =>
                      handleUpdateRange(
                        r.id,
                        'startPage',
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">
                    Label Style
                  </label>
                  <select
                    value={r.style}
                    onChange={(e) =>
                      handleUpdateRange(r.id, 'style', e.target.value as PageLabelStyle)
                    }
                    className="w-full mt-0.5 px-2 py-1.5 bg-white border border-stone-200 rounded-xl"
                  >
                    <option value="decimal">1, 2, 3 (Arabic)</option>
                    <option value="roman-lower">i, ii, iii (Roman Lower)</option>
                    <option value="roman-upper">I, II, III (Roman Upper)</option>
                    <option value="alpha-lower">a, b, c (Alpha Lower)</option>
                    <option value="alpha-upper">A, B, C (Alpha Upper)</option>
                    <option value="none">Prefix Only (No Number)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">
                    Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A- or App-"
                    value={r.prefix}
                    onChange={(e) => handleUpdateRange(r.id, 'prefix', e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">
                    Start Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={r.startNumber}
                    onChange={(e) =>
                      handleUpdateRange(
                        r.id,
                        'startNumber',
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          ))}

          {ranges.length < 5 && (
            <button
              type="button"
              onClick={handleAddRange}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 p-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Numbering Range (e.g. Front Matter, Appendix)</span>
            </button>
          )}
        </div>

        {/* Live Preview Strip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-stone-600">
            <span className="font-bold">Logical Label Preview:</span>
            <span>{document.pageCount} total pages</span>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-2 overflow-x-auto text-xs py-2">
            {previewLabels.slice(0, 12).map((label, idx) => (
              <div
                key={idx}
                className="shrink-0 flex flex-col items-center justify-center min-w-10 px-2 py-1 bg-white border border-stone-200 rounded-xl shadow-2xs"
              >
                <span className="text-[10px] text-stone-400 font-mono">P.{idx + 1}</span>
                <span className="font-bold text-stone-800">{label || '—'}</span>
              </div>
            ))}
            {previewLabels.length > 12 && (
              <span className="text-[11px] text-stone-400 shrink-0 pl-1">
                +{previewLabels.length - 12} more...
              </span>
            )}
          </div>
        </div>

        <p className="text-[10px] text-stone-400 leading-tight">
          Adds semantic PDF page labels used by compatible PDF viewers for logical page navigation and display.
          Does not alter visual page content or stream objects.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={handleRemoveLabels}
            disabled={isProcessing}
            className="text-xs font-semibold text-stone-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            Remove Labels
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            >
              {isProcessing ? 'Applying...' : 'Apply Page Labels'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
