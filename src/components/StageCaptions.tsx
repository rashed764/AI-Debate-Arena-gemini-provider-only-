import React from 'react';
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import { DebateTurn } from '../types';

interface StageCaptionsProps {
  currentTurn: DebateTurn | null;
  turnNumber: number;
  totalTurns: number;
  onPrevTurn?: () => void;
  onNextTurn?: () => void;
  hasPrevTurn?: boolean;
  hasNextTurn?: boolean;
  onOpenFullTranscript: () => void;
  isPlayingThis: boolean;
}

export const StageCaptions: React.FC<StageCaptionsProps> = ({
  currentTurn,
  turnNumber,
  totalTurns,
  onPrevTurn,
  onNextTurn,
  hasPrevTurn,
  hasNextTurn,
  onOpenFullTranscript,
  isPlayingThis,
}) => {
  if (!currentTurn) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/75 backdrop-blur-2xl p-8 text-center shadow-2xl">
        <Sparkles className="mx-auto h-8 w-8 text-slate-500 mb-2 animate-pulse" />
        <h4 className="text-base font-bold text-white">Stage Teleprompter Ready</h4>
        <p className="mt-1 text-xs text-slate-300 max-w-md mx-auto">
          Start the debate to stream verbatim argument captions and deductive premises in real time.
        </p>
      </div>
    );
  }

  const isAtheist = currentTurn.persona === 'atheist';

  // Dynamic style configuration based on debater & statement type
  const borderHighlight = isAtheist ? 'border-cyan-500/50' : 'border-amber-500/50';
  const badgeTheme = isAtheist
    ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40'
    : 'bg-amber-950/90 text-amber-300 border-amber-500/40';
  const textAccent = isAtheist ? 'text-cyan-400' : 'text-amber-400';

  const statementTypeLabels: Record<string, string> = {
    opening: 'Opening Statement',
    rebuttal: 'Direct Rebuttal & Refutation',
    cross_examination: 'Philosophical Cross-Examination',
    audience_response: 'Audience Inquiry Response',
    closing: 'Final Synthesis & Closing',
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${borderHighlight} bg-slate-950/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl transition-all duration-300`}>
      {/* Background Lighting Scrim */}
      <div
        className={`absolute -top-32 ${
          isAtheist ? '-left-32 bg-cyan-500/15' : '-right-32 bg-amber-500/15'
        } h-64 w-64 rounded-full blur-3xl pointer-events-none`}
      />

      {/* 1. Caption Teleprompter Bar Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm border shadow-md ${
              isAtheist
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/60'
                : 'bg-amber-500/25 text-amber-200 border-amber-500/60'
            }`}
          >
            {isAtheist ? 'A' : 'B'}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-wide">
                {currentTurn.speakerName}
              </h3>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeTheme}`}>
                {statementTypeLabels[currentTurn.statementType] || currentTurn.statementType}
              </span>
              {isPlayingThis && (
                <span className="flex items-center gap-1 rounded bg-rose-950/90 border border-rose-500/50 px-2 py-0.5 text-[10px] font-bold text-rose-300 animate-pulse shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                  <span>SYNCED TO VOICE</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span>{currentTurn.roundName}</span>
              <span>•</span>
              <span className="font-mono">Turn {turnNumber} of {totalTurns}</span>
            </div>
          </div>
        </div>

        {/* Caption Controls: Turn Stepper & Transcript Drawer Trigger */}
        <div className="flex items-center gap-2">
          {onPrevTurn && (
            <button
              onClick={onPrevTurn}
              disabled={!hasPrevTurn}
              title="Previous Statement"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {onNextTurn && (
            <button
              onClick={onNextTurn}
              disabled={!hasNextTurn}
              title="Next Statement"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onOpenFullTranscript}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View Full Transcript</span>
          </button>
        </div>
      </div>

      {/* 2. Structured Statement Argument Body */}
      <div className="relative z-10 mt-5 space-y-4">
        {/* Core Thesis / Claim Banner */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border shadow-md backdrop-blur-xl ${
            isAtheist
              ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-100'
              : 'border-amber-500/40 bg-amber-950/30 text-amber-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Quote className="h-4 w-4 opacity-85" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-90">
              Core Thesis &amp; Proposition
            </span>
          </div>
          <p className="text-base sm:text-lg font-bold leading-snug text-white">
            {currentTurn.mainClaim}
          </p>
        </div>

        {/* Spoken Verbatim Monologue */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/75 backdrop-blur-xl p-4 sm:p-6 text-slate-100 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-2">
            Verbatim Spoken Monologue:
          </span>
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-slate-100 font-normal">
            {currentTurn.rawText}
          </p>
        </div>

        {/* Deductive Deductions & Premises Grid */}
        {currentTurn.reasoning && currentTurn.reasoning.length > 0 && (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 shadow-md">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-3">
              Analytical Premises &amp; Deductive Arguments
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentTurn.reasoning.map((premise, pIdx) => (
                <div
                  key={pIdx}
                  className="flex items-start gap-3 rounded-xl border border-slate-700/50 bg-slate-950/60 backdrop-blur-md p-3 text-xs sm:text-sm text-slate-200"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono font-bold text-xs ${
                      isAtheist
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40'
                        : 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                    }`}
                  >
                    {pIdx + 1}
                  </span>
                  <p className="leading-relaxed">{premise}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direct Rebuttal Callout */}
        {currentTurn.responseToOpponent && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 backdrop-blur-xl p-4 sm:p-5 text-rose-100 shadow-md">
            <div className="flex items-center gap-2 mb-1 text-rose-300">
              <span className="text-[11px] font-black uppercase tracking-wider">
                Direct Counter-Argument to Opponent
              </span>
            </div>
            <p className="text-xs sm:text-sm italic leading-relaxed text-slate-100">
              "{currentTurn.responseToOpponent}"
            </p>
          </div>
        )}

        {/* Cross-Examination Inquiries for Opponent */}
        {currentTurn.questionsForOpponent && currentTurn.questionsForOpponent.length > 0 && (
          <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 backdrop-blur-xl p-4 text-purple-100 shadow-md">
            <div className="flex items-center gap-2 mb-2 text-purple-300">
              <HelpCircle className="h-4 w-4" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                Formal Inquiries Posed to Opponent
              </span>
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-100">
              {currentTurn.questionsForOpponent.map((q, qIdx) => (
                <li key={qIdx} className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Epistemic Uncertainties or Concessions */}
        {currentTurn.uncertainties && currentTurn.uncertainties.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 backdrop-blur-xl p-3.5 text-xs text-amber-100 flex items-start gap-2.5 shadow-md">
            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5 text-amber-300">
                Acknowledged Epistemic Boundary / Concession
              </span>
              <p className="italic">{currentTurn.uncertainties.join(' ')}</p>
            </div>
          </div>
        )}

        {/* Citations & Sources */}
        {currentTurn.sources && currentTurn.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Academic &amp; Philosophical Sources:</span>
            {currentTurn.sources.map((src, sIdx) => (
              <a
                key={sIdx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 hover:underline ${textAccent}`}
              >
                <span>{src.title}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
