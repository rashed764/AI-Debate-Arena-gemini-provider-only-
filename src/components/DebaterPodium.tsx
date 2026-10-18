import React, { useState } from 'react';
import {
  Mic,
  Activity,
  CheckCircle2,
  BrainCircuit,
  Volume2,
  User
} from 'lucide-react';
import { AccentColor, PersonaType } from '../types';

interface DebaterPodiumProps {
  persona?: PersonaType;
  speakerName: string;
  stanceTitle: string;
  philosophicalFramework?: string;
  modelBadge: string;
  isSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  hasConceded?: boolean;
  frequencyData: number[]; // 16 normalized values (0 to 100)
  totalStatements: number;
  avatarImageUrl?: string;
  accentColor?: AccentColor;
  audioDuration?: number;
}

const THEMES: Record<string, {
  borderActive: string;
  borderIdle: string;
  bgGlow: string;
  spotlight: string;
  pillBg: string;
  badge: string;
  accentGradient: string;
  waveColor: string;
  ringActive: string;
  shadow: string;
}> = {
  cyan: {
    borderActive: 'border-cyan-400',
    borderIdle: 'border-cyan-950/60',
    bgGlow: 'from-cyan-500/20 to-sky-500/0',
    spotlight: 'via-cyan-400/15',
    pillBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40',
    badge: 'text-cyan-400',
    accentGradient: 'from-cyan-500 to-sky-600',
    waveColor: 'bg-cyan-400',
    ringActive: 'ring-cyan-500/50',
    shadow: 'shadow-cyan-950/80',
  },
  amber: {
    borderActive: 'border-amber-400',
    borderIdle: 'border-amber-950/60',
    bgGlow: 'from-amber-500/20 to-yellow-500/0',
    spotlight: 'via-amber-400/15',
    pillBg: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
    badge: 'text-amber-400',
    accentGradient: 'from-amber-500 to-yellow-600',
    waveColor: 'bg-amber-400',
    ringActive: 'ring-amber-500/50',
    shadow: 'shadow-amber-950/80',
  },
  emerald: {
    borderActive: 'border-emerald-400',
    borderIdle: 'border-emerald-950/60',
    bgGlow: 'from-emerald-500/20 to-teal-500/0',
    spotlight: 'via-emerald-400/15',
    pillBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40',
    badge: 'text-emerald-400',
    accentGradient: 'from-emerald-500 to-teal-600',
    waveColor: 'bg-emerald-400',
    ringActive: 'ring-emerald-500/50',
    shadow: 'shadow-emerald-950/80',
  },
  purple: {
    borderActive: 'border-purple-400',
    borderIdle: 'border-purple-950/60',
    bgGlow: 'from-purple-500/20 to-fuchsia-500/0',
    spotlight: 'via-purple-400/15',
    pillBg: 'bg-purple-950/90 text-purple-300 border-purple-500/40',
    badge: 'text-purple-400',
    accentGradient: 'from-purple-500 to-fuchsia-600',
    waveColor: 'bg-purple-400',
    ringActive: 'ring-purple-500/50',
    shadow: 'shadow-purple-950/80',
  },
  rose: {
    borderActive: 'border-rose-400',
    borderIdle: 'border-rose-950/60',
    bgGlow: 'from-rose-500/20 to-pink-500/0',
    spotlight: 'via-rose-400/15',
    pillBg: 'bg-rose-950/90 text-rose-300 border-rose-500/40',
    badge: 'text-rose-400',
    accentGradient: 'from-rose-500 to-pink-600',
    waveColor: 'bg-rose-400',
    ringActive: 'ring-rose-500/50',
    shadow: 'shadow-rose-950/80',
  },
  blue: {
    borderActive: 'border-blue-400',
    borderIdle: 'border-blue-950/60',
    bgGlow: 'from-blue-500/20 to-indigo-500/0',
    spotlight: 'via-blue-400/15',
    pillBg: 'bg-blue-950/90 text-blue-300 border-blue-500/40',
    badge: 'text-blue-400',
    accentGradient: 'from-blue-500 to-indigo-600',
    waveColor: 'bg-blue-400',
    ringActive: 'ring-blue-500/50',
    shadow: 'shadow-blue-950/80',
  },
  indigo: {
    borderActive: 'border-indigo-400',
    borderIdle: 'border-indigo-950/60',
    bgGlow: 'from-indigo-500/20 to-violet-500/0',
    spotlight: 'via-indigo-400/15',
    pillBg: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/40',
    badge: 'text-indigo-400',
    accentGradient: 'from-indigo-500 to-violet-600',
    waveColor: 'bg-indigo-400',
    ringActive: 'ring-indigo-500/50',
    shadow: 'shadow-indigo-950/80',
  },
  orange: {
    borderActive: 'border-orange-400',
    borderIdle: 'border-orange-950/60',
    bgGlow: 'from-orange-500/20 to-amber-500/0',
    spotlight: 'via-orange-400/15',
    pillBg: 'bg-orange-950/90 text-orange-300 border-orange-500/40',
    badge: 'text-orange-400',
    accentGradient: 'from-orange-500 to-amber-600',
    waveColor: 'bg-orange-400',
    ringActive: 'ring-orange-500/50',
    shadow: 'shadow-orange-950/80',
  },
};

export const DebaterPodium: React.FC<DebaterPodiumProps> = ({
  persona,
  speakerName,
  stanceTitle,
  philosophicalFramework,
  modelBadge,
  isSpeaking,
  isThinking,
  isListening,
  hasConceded,
  frequencyData,
  totalStatements,
  avatarImageUrl,
  accentColor = 'cyan',
}) => {
  const [imgError, setImgError] = useState(false);

  // Fallback if color isn't in dictionary
  const colorKey = accentColor && THEMES[accentColor] ? accentColor : persona === 'believer' ? 'amber' : 'cyan';
  const theme = THEMES[colorKey] || THEMES.cyan;

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* 1. Overhead Volumetric Spotlight Beam */}
      <div
        className={`pointer-events-none absolute -top-24 h-48 w-full max-w-[280px] bg-gradient-to-b from-transparent ${theme.spotlight} to-transparent blur-2xl transition-opacity duration-700 ${
          isSpeaking ? 'opacity-100 scale-110' : isThinking ? 'opacity-40' : 'opacity-10'
        }`}
      />

      {/* 2. Main Debater Podium Box */}
      <div
        className={`relative w-full rounded-3xl border transition-all duration-500 p-5 sm:p-6 backdrop-blur-xl ${
          isSpeaking
            ? `${theme.borderActive} bg-slate-900/90 shadow-2xl ${theme.shadow} scale-[1.02] ring-2 ${theme.ringActive}`
            : isThinking
            ? `border-slate-700 bg-slate-900/80 shadow-lg`
            : `${theme.borderIdle} bg-slate-950/80 shadow-md`
        }`}
      >
        {/* Subtle Ambient Internal Glow */}
        <div
          className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${theme.bgGlow} pointer-events-none transition-opacity duration-500 ${
            isSpeaking ? 'opacity-100' : 'opacity-20'
          }`}
        />

        {/* Header / Status Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isSpeaking
                  ? `${theme.waveColor} animate-ping`
                  : isThinking
                  ? 'bg-purple-400 animate-pulse'
                  : 'bg-slate-600'
              }`}
            />
            <span className="font-bold tracking-wide uppercase text-[11px] text-slate-300">
              {isSpeaking
                ? 'ON AIR • ACTIVE SPEAKER'
                : isThinking
                ? 'SYNTHESIZING ARGUMENT'
                : 'LISTENING AT PODIUM'}
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
            {modelBadge}
          </span>
        </div>

        {/* Center: Stage Portrait */}
        <div className="relative z-10 flex flex-col items-center mt-5">
          <div className="relative group">
            {/* Holographic Glowing Border Ring */}
            <div
              className={`absolute -inset-1.5 rounded-2xl bg-gradient-to-r ${theme.accentGradient} opacity-30 blur-md transition duration-500 ${
                isSpeaking ? 'opacity-80 scale-105' : 'opacity-20'
              }`}
            />

            {/* Debater Portrait Container */}
            <div className="relative h-32 w-32 sm:h-36 sm:w-36 overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950 shadow-2xl flex items-center justify-center">
              {avatarImageUrl && !imgError ? (
                <img
                  src={avatarImageUrl}
                  alt={speakerName}
                  onError={() => setImgError(true)}
                  className={`h-full w-full object-cover transition-all duration-700 ${
                    isSpeaking
                      ? 'scale-105 contrast-110 brightness-105'
                      : isThinking
                      ? 'brightness-90 saturate-75'
                      : 'grayscale-[20%] brightness-95'
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-slate-400 p-2">
                  <User className="h-12 w-12 text-slate-600 mb-1" />
                  <span className="text-[10px] font-mono uppercase text-slate-500">AI Debater</span>
                </div>
              )}

              {/* Holographic Scanlines Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.35)_51%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

              {/* Thinking / Processing Spinner */}
              {isThinking && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                  <BrainCircuit className="h-7 w-7 text-purple-400 animate-spin mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    Formulating Logic...
                  </span>
                </div>
              )}

              {/* Status Badge in Corner */}
              <div
                className={`absolute bottom-2 right-2 rounded-lg p-1.5 shadow-lg border transition ${
                  isSpeaking
                    ? `${theme.waveColor} text-slate-950 border-white`
                    : 'bg-slate-900/90 text-slate-400 border-slate-700'
                }`}
              >
                {isSpeaking ? <Mic className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </div>
            </div>
          </div>

          {/* Name & Stance Banner */}
          <div className="text-center mt-3">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>{speakerName}</span>
              {hasConceded && (
                <span
                  title="Conceded an analytical point"
                  className="rounded-full bg-slate-800 p-1 text-slate-400 hover:text-amber-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              )}
            </h3>

            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${theme.pillBg} max-w-[280px] truncate`}>
                {stanceTitle}
              </span>
            </div>

            {philosophicalFramework && (
              <p className="mt-1 text-[11px] text-slate-400 max-w-[260px] mx-auto line-clamp-1 italic">
                {philosophicalFramework}
              </p>
            )}
          </div>
        </div>

        {/* 3. Integrated Podium Desk with Live Real-Time Spectrum Visualizer */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="h-3 w-3" />
              <span>Voice Spectrum (Web Audio)</span>
            </span>
            <span className="font-mono font-bold text-slate-300">
              {totalStatements} {totalStatements === 1 ? 'Turn' : 'Turns'} Spoken
            </span>
          </div>

          {/* 16-Band Responsive Audio Spectrum Visualizer */}
          <div className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800/90 p-1.5 flex items-end justify-between gap-1 shadow-inner">
            {frequencyData.map((val, idx) => {
              const barHeight = isSpeaking ? Math.max(12, val) : Math.max(6, Math.round(val * 0.2));

              return (
                <div
                  key={idx}
                  className="relative flex-1 h-full flex items-end justify-center rounded-sm overflow-hidden"
                >
                  <div
                    style={{ height: `${barHeight}%` }}
                    className={`w-full rounded-xs transition-all duration-75 ${
                      isSpeaking
                        ? `${theme.waveColor} shadow-[0_0_8px_rgba(255,255,255,0.4)]`
                        : 'bg-slate-700/60'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
