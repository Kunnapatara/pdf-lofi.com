import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Headphones,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  ExternalLink,
  Square,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export interface FocusTrack {
  id: string;
  title: string;
  description: string;
  youtubeVideoId: string;
}

export const FOCUS_TRACKS: FocusTrack[] = [
  {
    id: 'peaceful-piano',
    title: 'Peaceful Piano',
    description: 'Minimalist solo piano for deep reading and concentration',
    youtubeVideoId: '4xDzrJKXOOY',
  },
  {
    id: 'coffee-rain',
    title: 'Coffee & Rain',
    description: 'Warm cafe ambience with gentle rain acoustics',
    youtubeVideoId: 'WPni755-Krg',
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus',
    description: 'Subtle ambient frequencies for sustained cognitive work',
    youtubeVideoId: 'DWcJFNfaw9c',
  },
  {
    id: 'lofi-beats',
    title: 'Chill Lo-Fi Beats',
    description: 'Soft instrumental beats to keep a steady workflow rhythm',
    youtubeVideoId: 'jfKfPfyJRdk',
  },
];

interface WorkFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  activeTrackId?: string;
  onTrackChange?: (track: FocusTrack) => void;
  hasActiveDocument?: boolean;
}

export const WorkFocusModal: React.FC<WorkFocusModalProps> = ({
  isOpen,
  onClose,
  isMinimized,
  onToggleMinimize,
  activeTrackId,
  onTrackChange,
  hasActiveDocument = false,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<FocusTrack>(
    FOCUS_TRACKS.find((t) => t.id === activeTrackId) || FOCUS_TRACKS[0]
  );
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync selected track if external prop changes
  useEffect(() => {
    if (activeTrackId) {
      const match = FOCUS_TRACKS.find((t) => t.id === activeTrackId);
      if (match) setSelectedTrack(match);
    }
  }, [activeTrackId]);

  // Focus Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartWorkFocus = () => {
    setHasStartedPlayback(true);
    setIsPlaying(true);
    setIsTimerRunning(true);
  };

  const handleSelectTrack = (track: FocusTrack) => {
    setSelectedTrack(track);
    if (onTrackChange) onTrackChange(track);
    if (hasStartedPlayback) {
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const nextPlaying = !isPlaying;
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextPlaying ? 'playVideo' : 'pauseVideo',
          args: '',
        }),
        '*'
      );
      setIsPlaying(nextPlaying);
      setIsTimerRunning(nextPlaying);
    } else {
      setIsPlaying(!isPlaying);
      setIsTimerRunning(!isPlaying);
    }
  };

  const handleStopSession = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'stopVideo',
          args: '',
        }),
        '*'
      );
    }
    setHasStartedPlayback(false);
    setIsPlaying(false);
    setIsTimerRunning(false);
    setTimerSeconds(25 * 60);
    onClose();
  };

  // If completely inactive, render nothing
  if (!isOpen && !isMinimized && !hasStartedPlayback) {
    return null;
  }

  // YouTube embed URL
  const embedUrl = `https://www.youtube-nocookie.com/embed/${selectedTrack.youtubeVideoId}?enablejsapi=1&autoplay=${
    hasStartedPlayback ? 1 : 0
  }`;

  return (
    <div
      className={
        isMinimized
          ? 'fixed bottom-4 right-4 z-50 pointer-events-auto'
          : 'fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4'
      }
    >
      <div
        className={
          isMinimized
            ? 'bg-stone-900 text-white rounded-2xl p-3.5 shadow-2xl border border-stone-700 w-84 sm:w-96 flex flex-col gap-2.5 transition-all'
            : 'bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95'
        }
      >
        {/* Full Modal Header (only visible when not minimized) */}
        {!isMinimized && (
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                  <span>Work & Focus</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    Official YouTube Embed
                  </span>
                </h2>
                <p className="text-xs text-stone-500">
                  Calm audio ambience while you read, split, merge, or organize your PDF
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {hasStartedPlayback && (
                <button
                  onClick={onToggleMinimize}
                  className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  title="Minimize to Mini Player"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={hasStartedPlayback ? onToggleMinimize : onClose}
                className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Container (Maintains identical tree to protect iframe lifecycle) */}
        <div className={isMinimized ? 'flex items-center gap-3' : 'p-6 space-y-4'}>
          {/* Track selection buttons (only visible in full modal) */}
          {!isMinimized && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                Choose Focus Track
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                      selectedTrack.id === track.id
                        ? 'bg-orange-50 text-orange-700 border-orange-300 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{track.title}</div>
                    <div className="text-[10px] text-stone-500 font-normal line-clamp-1">
                      {track.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Persistent YouTube Embed Container */}
          <div
            className={
              isMinimized
                ? 'w-28 h-18 rounded-xl overflow-hidden bg-black shrink-0 relative shadow-xs'
                : 'relative rounded-2xl overflow-hidden aspect-video bg-stone-900 border border-stone-200/90 shadow-inner'
            }
          >
            {hasStartedPlayback ? (
              <iframe
                ref={iframeRef}
                key="youtube-focus-player"
                title={selectedTrack.title}
                src={embedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white">
                <div
                  onClick={handleStartWorkFocus}
                  className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30 cursor-pointer hover:scale-105 transition-transform"
                >
                  <Play className="w-6 h-6 ml-0.5" />
                </div>
                <h3 className="font-bold text-sm text-stone-200">{selectedTrack.title}</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-xs">{selectedTrack.description}</p>
                <div className="mt-3 text-[11px] text-stone-400">
                  Ready to stream via official YouTube embed
                </div>
              </div>
            )}
          </div>

          {/* Mini Player Metadata (only shown when minimized) */}
          {isMinimized && (
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                <Headphones className="w-3 h-3" />
                <span>PDF-LoFi</span>
              </div>
              <div className="text-xs font-bold text-white truncate" title={selectedTrack.title}>
                {selectedTrack.title}
              </div>
              <div className="text-[11px] text-stone-400 font-mono mt-0.5 flex items-center gap-1.5">
                <span>{formatTimer(timerSeconds)}</span>
                {isTimerRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
              </div>
            </div>
          )}

          {/* Timer controls in full modal */}
          {!isMinimized && (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                  Focus Session Timer
                </div>
                <div className="text-2xl font-mono font-bold text-stone-800 tracking-tight">
                  {formatTimer(timerSeconds)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isTimerRunning
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                </button>
                <button
                  onClick={() => {
                    setTimerSeconds(25 * 60);
                    setIsTimerRunning(false);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 cursor-pointer"
                >
                  25m
                </button>
                <button
                  onClick={() => {
                    setTimerSeconds(50 * 60);
                    setIsTimerRunning(false);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 cursor-pointer"
                >
                  50m
                </button>
              </div>
            </div>
          )}

          {/* Canonical Action Button in Full Modal */}
          {!isMinimized && (
            <div className="space-y-2">
              {!hasStartedPlayback ? (
                <button
                  onClick={handleStartWorkFocus}
                  id="btn-start-work-focus"
                  className="w-full py-3 rounded-2xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>▶ Start Work & Focus</span>
                </button>
              ) : (
                <button
                  onClick={onToggleMinimize}
                  id="btn-keep-playing-work"
                  className="w-full py-3 rounded-2xl text-sm font-bold bg-stone-900 text-white hover:bg-stone-800 shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Keep playing while you work →</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mini Player Bottom Controls Bar */}
        {isMinimized && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={togglePlayPause}
                className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onToggleMinimize}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
                title="Expand full player"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expand</span>
              </button>

              <a
                href={`https://www.youtube.com/watch?v=${selectedTrack.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-orange-300 transition-colors text-[11px]"
                title="Open track on YouTube"
              >
                <span>YouTube</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <button
              onClick={handleStopSession}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
              title="Stop audio and timer"
            >
              <Square className="w-3 h-3" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {/* Full Modal Truthful Privacy Footer */}
        {!isMinimized && (
          <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>PDF processing happens on your device. Focus audio is provided by YouTube.</span>
            <a
              href={`https://www.youtube.com/watch?v=${selectedTrack.youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-orange-600 font-semibold inline-flex items-center gap-1"
            >
              <span>Open on YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
