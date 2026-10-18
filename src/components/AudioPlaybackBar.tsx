import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Headphones,
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';
import { PlaybackMode, PersonaType } from '../types';

interface AudioPlaybackBarProps {
  playbackMode: PlaybackMode;
  onChangePlaybackMode: (mode: PlaybackMode) => void;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  speed: number;
  activeSpeaker: PersonaType | null;
  currentStatementTitle: string;
  onTogglePlayPause: () => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onChangeSpeed: (spd: number) => void;
  onReplayCurrent: () => void;
  hasPlayableAudio: boolean;
  autoplayBlocked?: boolean;
  onUnlockAudio?: () => void;
}

export const AudioPlaybackBar: React.FC<AudioPlaybackBarProps> = ({
  playbackMode,
  onChangePlaybackMode,
  isPlaying,
  isMuted,
  volume,
  speed,
  activeSpeaker,
  currentStatementTitle,
  onTogglePlayPause,
  onToggleMute,
  onChangeVolume,
  onChangeSpeed,
  onReplayCurrent,
  hasPlayableAudio,
  autoplayBlocked,
  onUnlockAudio,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        {/* Left: Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
            Mode:
          </span>
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
            <button
              onClick={() => onChangePlaybackMode('text_and_voice')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition ${
                playbackMode === 'text_and_voice'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Text + Voice</span>
            </button>

            <button
              onClick={() => onChangePlaybackMode('voice_only')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition ${
                playbackMode === 'voice_only'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>Voice Only</span>
            </button>

            <button
              onClick={() => onChangePlaybackMode('text_only')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition ${
                playbackMode === 'text_only'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Text Only</span>
            </button>
          </div>
        </div>

        {/* Center: Live Waveform & Speaker Status */}
        <div className="flex items-center gap-3">
          {activeSpeaker ? (
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                activeSpeaker === 'atheist'
                  ? 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
                  : 'border-amber-500/40 bg-amber-950/60 text-amber-300'
              }`}
            >
              {/* Waveform Animation */}
              <div className="flex items-center gap-0.5 h-4">
                <span className={`w-1 rounded-full animate-pulse ${activeSpeaker === 'atheist' ? 'bg-cyan-400 h-4' : 'bg-amber-400 h-4'}`} />
                <span className={`w-1 rounded-full animate-pulse delay-75 ${activeSpeaker === 'atheist' ? 'bg-cyan-400 h-2' : 'bg-amber-400 h-2'}`} />
                <span className={`w-1 rounded-full animate-pulse delay-150 ${activeSpeaker === 'atheist' ? 'bg-cyan-400 h-3.5' : 'bg-amber-400 h-3.5'}`} />
                <span className={`w-1 rounded-full animate-pulse delay-100 ${activeSpeaker === 'atheist' ? 'bg-cyan-400 h-2' : 'bg-amber-400 h-2'}`} />
              </div>
              <span>
                {activeSpeaker === 'atheist' ? 'Atheist AI Speaking' : 'Believer AI Speaking'}:
              </span>
              <span className="max-w-[200px] truncate font-normal text-slate-300 hidden md:inline">
                {currentStatementTitle || 'Live argument in progress'}
              </span>
            </div>
          ) : autoplayBlocked ? (
            <button
              onClick={onUnlockAudio}
              className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-950/80 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-900 transition animate-pulse"
            >
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Autoplay Blocked • Click to Enable Audio</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`h-2 w-2 rounded-full ${currentStatementTitle.includes('Buffering') || currentStatementTitle.includes('Waiting') ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'}`} />
              <span>{currentStatementTitle || 'Audio Idle • No Active Speech'}</span>
            </div>
          )}
        </div>

        {/* Right: Audio Controls */}
        <div className="flex items-center gap-3">
          {/* Replay */}
          <button
            onClick={onReplayCurrent}
            disabled={!hasPlayableAudio}
            title="Replay Current Statement"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Master Play/Pause */}
          <button
            onClick={onTogglePlayPause}
            disabled={!hasPlayableAudio && playbackMode === 'voice_only'}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-950/60 hover:from-cyan-400 hover:to-indigo-500 transition active:scale-95 disabled:opacity-50"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          {/* Mute/Volume */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="text-slate-400 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={e => onChangeVolume(parseFloat(e.target.value))}
              className="w-16 accent-cyan-500"
            />
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs">
            <FastForward className="h-3 w-3 text-slate-400" />
            <select
              value={speed}
              onChange={e => onChangeSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-slate-200 focus:outline-none"
            >
              <option value="0.75" className="bg-slate-900">0.8x</option>
              <option value="1.0" className="bg-slate-900">1.0x</option>
              <option value="1.25" className="bg-slate-900">1.2x</option>
              <option value="1.5" className="bg-slate-900">1.5x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
