import React, { useState } from 'react';
import { ThumbsUp, Award, Check, BarChart3, HelpCircle } from 'lucide-react';
import { PersonaType, DebateSummary } from '../types';

interface VotingWidgetProps {
  debateId: string;
  votes: { atheist: number; believer: number; total: number };
  userVotedPersona: PersonaType | null;
  onCastVote: (persona: PersonaType, note?: string) => Promise<void>;
  isDebateActive: boolean;
  summary?: DebateSummary;
}

export const VotingWidget: React.FC<VotingWidgetProps> = ({
  debateId,
  votes,
  userVotedPersona,
  onCastVote,
  isDebateActive,
  summary,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  const atheistCount = votes.atheist || 0;
  const believerCount = votes.believer || 0;
  const totalCount = votes.total || atheistCount + believerCount || 1;

  const atheistPercent = Math.round((atheistCount / totalCount) * 100) || 50;
  const believerPercent = 100 - atheistPercent;

  const handleVote = async (persona: PersonaType) => {
    if (userVotedPersona || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCastVote(persona);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">
            Audience Conviction &amp; Voting
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {totalCount} total votes recorded
        </span>
      </div>

      {/* Visual Tug-of-war Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
          <span className="text-cyan-400">Atheist AI: {atheistPercent}% ({atheistCount})</span>
          <span className="text-amber-400">Believer AI: {believerPercent}% ({believerCount})</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 flex shadow-inner">
          <div
            style={{ width: `${atheistPercent}%` }}
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
          />
          <div
            style={{ width: `${believerPercent}%` }}
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
          />
        </div>
      </div>

      {/* Voting Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* Atheist AI Vote Button */}
        <button
          onClick={() => handleVote('atheist')}
          disabled={!!userVotedPersona || isSubmitting}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition active:scale-95 ${
            userVotedPersona === 'atheist'
              ? 'border-2 border-cyan-400 bg-cyan-950/70 text-cyan-300'
              : userVotedPersona
              ? 'border border-slate-800 bg-slate-950/40 text-slate-500 opacity-50 cursor-not-allowed'
              : 'border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 shadow-lg shadow-cyan-950/40'
          }`}
        >
          {userVotedPersona === 'atheist' ? (
            <>
              <Check className="h-4 w-4 text-cyan-400" />
              <span>Voted for Atheist AI</span>
            </>
          ) : (
            <>
              <ThumbsUp className="h-4 w-4 text-cyan-400" />
              <span>Vote Atheist AI</span>
            </>
          )}
        </button>

        {/* Believer AI Vote Button */}
        <button
          onClick={() => handleVote('believer')}
          disabled={!!userVotedPersona || isSubmitting}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition active:scale-95 ${
            userVotedPersona === 'believer'
              ? 'border-2 border-amber-400 bg-amber-950/70 text-amber-300'
              : userVotedPersona
              ? 'border border-slate-800 bg-slate-950/40 text-slate-500 opacity-50 cursor-not-allowed'
              : 'border border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 shadow-lg shadow-amber-950/40'
          }`}
        >
          {userVotedPersona === 'believer' ? (
            <>
              <Check className="h-4 w-4 text-amber-400" />
              <span>Voted for Believer AI</span>
            </>
          ) : (
            <>
              <ThumbsUp className="h-4 w-4 text-amber-400" />
              <span>Vote Believer AI</span>
            </>
          )}
        </button>
      </div>

      {userVotedPersona && (
        <p className="mt-2.5 text-center text-[11px] text-slate-400">
          Your vote is recorded securely on the blockchain-grade ledger. One vote per viewer.
        </p>
      )}

      {/* Post-Debate Analytical Breakdown (If Available) */}
      {summary && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-amber-400" />
              <span>Philosophical Argument Analysis</span>
            </span>
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              {showSummary ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showSummary && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
                <span className="font-semibold text-cyan-300">Atheist AI Strongest Arguments:</span>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-300">
                  {summary.atheistStrongPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3">
                <span className="font-semibold text-amber-300">Believer AI Strongest Arguments:</span>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-300">
                  {summary.believerStrongPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-slate-400">
                <span className="font-semibold text-slate-200">Overall Synthesis:</span>
                <p className="mt-1 leading-relaxed">{summary.overallAssessment}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
