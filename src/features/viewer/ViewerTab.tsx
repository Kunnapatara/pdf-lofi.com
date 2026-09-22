import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Search, Download, AlertCircle } from 'lucide-react';
import { LocalDocument, SearchMatch } from '../../types/pdf';
import { renderPageCanvas } from '../../pdf/rendering/renderService';
import { generatePageThumbnail } from '../../pdf/rendering/thumbnailService';
import { searchPdfInBrowser } from '../../pdf/rendering/textSearch';
import { triggerLocalDownload } from '../../pdf/export/exportService';

interface ViewerTabProps {
  document: LocalDocument;
  onPageCountChange?: (count: number) => void;
  onSelectOrganize: () => void;
}

export const ViewerTab: React.FC<ViewerTabProps> = ({
  document,
  onSelectOrganize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const totalPages = document.pageCount;

  // Load thumbnails for navigation strip
  useEffect(() => {
    if (!document.data) return;
    let isCancelled = false;

    async function loadThumbnails() {
      if (!document.data) return;
      const thumbs: string[] = [];
      const count = Math.min(document.pageCount, 20); // render up to 20 for preview strip
      for (let i = 1; i <= count; i++) {
        try {
          const thumbUrl = await generatePageThumbnail(document.data, i, 0, 140);
          if (isCancelled) return;
          thumbs.push(thumbUrl);
        } catch (e) {
          console.warn(`Failed thumbnail for page ${i}:`, e);
          thumbs.push('');
        }
      }
      if (!isCancelled) {
        setThumbnails(thumbs);
      }
    }

    loadThumbnails();
    return () => {
      isCancelled = true;
    };
  }, [document.data, document.pageCount]);

  // Render current page to canvas
  useEffect(() => {
    if (!document.data || !canvasRef.current) return;
    let isCancelled = false;

    async function renderCurrent() {
      if (!document.data || !canvasRef.current) return;
      setIsRendering(true);
      setRenderError(null);
      try {
        await renderPageCanvas({
          canvas: canvasRef.current,
          data: document.data,
          pageNumber: currentPage,
          scale,
          rotation,
        });
      } catch (err) {
        if (!isCancelled) {
          console.error('Page render error:', err);
          setRenderError(err instanceof Error ? err.message : 'Error rendering page canvas');
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    renderCurrent();
    return () => {
      isCancelled = true;
    };
  }, [document.data, currentPage, scale, rotation]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document.data || !searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const matches = await searchPdfInBrowser(document.data, searchQuery);
      setSearchResults(matches);
      if (matches.length > 0) {
        // Jump to first match
        setCurrentPage(matches[0].pageNumber);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = () => {
    if (document.data) {
      triggerLocalDownload(document.data, document.name);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
      {/* Viewer Control Toolbar matching QRxMENU clean pill bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            id="btn-prev-page"
            className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 px-2 text-xs font-semibold text-stone-700">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= totalPages) setCurrentPage(val);
              }}
              className="w-12 text-center py-1 border border-stone-200 rounded-lg text-xs font-mono font-bold focus:outline-orange-500"
            />
            <span className="text-stone-400">of {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            id="btn-next-page"
            className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.15).toFixed(2)))}
            className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-stone-600" />
          </button>
          <span className="text-xs font-mono font-semibold text-stone-600 px-2 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)))}
            className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-stone-600" />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 transition-all ml-1 cursor-pointer"
            title="Rotate View (Temporary view rotation)"
          >
            <RotateCw className="w-4 h-4 text-stone-600" />
          </button>
        </div>

        {/* Text Search Form */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search text in PDF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs w-44 sm:w-56 focus:outline-orange-500 bg-stone-50/50"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSearching ? 'Searching...' : 'Find'}
          </button>
        </form>

        {/* Download & Organize Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectOrganize}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer"
          >
            Organize Pages →
          </button>
          <button
            onClick={handleDownload}
            id="btn-viewer-download"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Search Matches Notification if active */}
      {hasSearched && (
        <div className="bg-white rounded-2xl border border-stone-200 p-3 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-semibold text-stone-800">
              {searchResults.length === 0
                ? `No matches found for "${searchQuery}"`
                : `Found ${searchResults.length} ${searchResults.length === 1 ? 'match' : 'matches'} for "${searchQuery}":`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {searchResults.map((m, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(m.pageNumber)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                  currentPage === m.pageNumber
                    ? 'bg-orange-500 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
                title={m.textSnippet}
              >
                p.{m.pageNumber}
              </button>
            ))}
            <button
              onClick={() => {
                setHasSearched(false);
                setSearchResults([]);
                setSearchQuery('');
              }}
              className="text-stone-400 hover:text-stone-700 text-xs ml-2 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Viewer Area + Thumbnail Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Thumbnail Strip */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-stone-200/90 p-4 shadow-xs max-h-[720px] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Pages ({totalPages})
            </span>
            <span className="text-[10px] text-stone-400">Click to jump</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
              const thumb = thumbnails[pNum - 1];
              const isCurrent = currentPage === pNum;

              return (
                <div
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center ${
                    isCurrent
                      ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-400/30'
                      : 'border-stone-200/80 hover:border-stone-300 bg-stone-50/50 hover:bg-white'
                  }`}
                >
                  <div className="w-full aspect-[3/4] bg-white rounded-lg border border-stone-200/60 overflow-hidden flex items-center justify-center mb-1.5 shadow-2xs">
                    {thumb ? (
                      <img src={thumb} alt={`Page ${pNum}`} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-stone-300 font-mono">Page {pNum}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold ${isCurrent ? 'text-orange-600' : 'text-stone-600'}`}>
                    Page {pNum}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Large Interactive Canvas Viewer */}
        <div className="lg:col-span-9 bg-stone-100/70 rounded-3xl border border-stone-200/90 p-6 shadow-xs flex flex-col items-center justify-center min-h-[600px] overflow-auto relative">
          {isRendering && (
            <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-orange-600 border border-orange-200 shadow-xs flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              <span>Rendering canvas...</span>
            </div>
          )}

          {renderError ? (
            <div className="p-6 bg-red-50 text-red-800 rounded-2xl border border-red-200 text-center space-y-2 max-w-md">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
              <div className="font-bold text-sm">Failed to render page {currentPage}</div>
              <div className="text-xs text-red-700">{renderError}</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-stone-200/80 p-2 max-w-full overflow-auto transition-transform duration-150">
              <canvas ref={canvasRef} className="block mx-auto max-w-full h-auto rounded" />
            </div>
          )}

          {/* Canvas Bottom Sub-bar */}
          <div className="mt-4 text-xs font-semibold text-stone-500 flex items-center gap-2">
            <span>Page {currentPage} of {totalPages}</span>
            <span>•</span>
            <span>{rotation !== 0 ? `Rotated ${rotation}°` : 'Original View'}</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Client Canvas (Zero Network)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
