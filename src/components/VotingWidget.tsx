import React, { useState } from 'react';
import { ThumbsUp, Award, Check, BarChart3 } from 'lucide-react';
import { AccentColor, DebateSummary } from '../types';

interface VotingWidgetProps {
  debateId: string;
  debater1Name: string;
  debater2Name: string;
  debater1Color?: AccentColor;
  debater2Color?: AccentColor;
  votes: { debater1: number; debater2: number; total: number; atheist?: number; believer?: number };
  userVotedSide: 'debater1' | 'debater2' | string | null;
  onCastVote: (side: 'debater1' | 'debater2') => Promise<void>;
  isDebateActive: boolean;
  summary?: DebateSummary;
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; bar: string; btnActive: string }> = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-500/40', bar: 'from-cyan-600 to-cyan-400', btnActive: 'border-cyan-400 bg-cyan-950/70 text-cyan-300' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-500/40', bar: 'from-amber-400 to-amber-600', btnActive: 'border-amber-400 bg-amber-950/70 text-amber-300' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-500/40', bar: 'from-emerald-500 to-teal-400', btnActive: 'border-emerald-400 bg-emerald-950/70 text-emerald-300' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-500/40', bar: 'from-purple-500 to-fuchsia-400', btnActive: 'border-purple-400 bg-purple-950/70 text-purple-300' },
  rose: { text: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-500/40', bar: 'from-rose-500 to-pink-400', btnActive: 'border-rose-400 bg-rose-950/70 text-rose-300' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-500/40', bar: 'from-blue-500 to-indigo-400', btnActive: 'border-blue-400 bg-blue-950/70 text-blue-300' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-950/40', border: 'border-indigo-500/40', bar: 'from-indigo-500 to-violet-400', btnActive: 'border-indigo-400 bg-indigo-950/70 text-indigo-300' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-500/40', bar: 'from-orange-500 to-amber-400', btnActive: 'border-orange-400 bg-orange-950/70 text-orange-300' },
};

export const VotingWidget: React.FC<VotingWidgetProps> = ({
  debateId,
  debater1Name,
  debater2Name,
  debater1Color = 'cyan',
  debater2Color = 'amber',
  votes,
  userVotedSide,
  onCastVote,
  isDebateActive,
  summary,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  const d1Count = votes.debater1 ?? votes.atheist ?? 0;
  const d2Count = votes.debater2 ?? votes.believer ?? 0;
  const totalCount = votes.total || d1Count + d2Count || 1;

  const d1Percent = Math.round((d1Count / totalCount) * 100) || 50;
  const d2Percent = 100 - d1Percent;

  const d1Theme = COLOR_MAP[debater1Color] || COLOR_MAP.cyan;
  const d2Theme = COLOR_MAP[debater2Color] || COLOR_MAP.amber;

  const isD1Voted = userVotedSide === 'debater1' || userVotedSide === 'atheist';
  const isD2Voted = userVotedSide === 'debater2' || userVotedSide === 'believer';

  const handleVote = async (side: 'debater1' | 'debater2') => {
    if (userVotedSide || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCastVote(side);
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
          <span className={d1Theme.text}>{debater1Name}: {d1Percent}% ({d1Count})</span>
          <span className={d2Theme.text}>{debater2Name}: {d2Percent}% ({d2Count})</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 flex shadow-inner">
          <div
            style={{ width: `${d1Percent}%` }}
            className={`h-full bg-gradient-to-r ${d1Theme.bar} transition-all duration-500`}
          />
          <div
            style={{ width: `${d2Percent}%` }}
            className={`h-full bg-gradient-to-r ${d2Theme.bar} transition-all duration-500`}
          />
        </div>
      </div>

      {/* Voting Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* Debater 1 Vote Button */}
        <button
          onClick={() => handleVote('debater1')}
          disabled={!!userVotedSide || isSubmitting}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition active:scale-95 ${
            isD1Voted
              ? `border-2 ${d1Theme.btnActive}`
              : userVotedSide
              ? 'border border-slate-800 bg-slate-950/40 text-slate-500 opacity-50 cursor-not-allowed'
              : `border ${d1Theme.border} ${d1Theme.bg} ${d1Theme.text} hover:opacity-90 shadow-lg`
          }`}
        >
          {isD1Voted ? (
            <>
              <Check className="h-4 w-4" />
              <span>Voted for {debater1Name}</span>
            </>
          ) : (
            <>
              <ThumbsUp className="h-4 w-4" />
              <span className="truncate">Vote {debater1Name}</span>
            </>
          )}
        </button>

        {/* Debater 2 Vote Button */}
        <button
          onClick={() => handleVote('debater2')}
          disabled={!!userVotedSide || isSubmitting}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition active:scale-95 ${
            isD2Voted
              ? `border-2 ${d2Theme.btnActive}`
              : userVotedSide
              ? 'border border-slate-800 bg-slate-950/40 text-slate-500 opacity-50 cursor-not-allowed'
              : `border ${d2Theme.border} ${d2Theme.bg} ${d2Theme.text} hover:opacity-90 shadow-lg`
          }`}
        >
          {isD2Voted ? (
            <>
              <Check className="h-4 w-4" />
              <span>Voted for {debater2Name}</span>
            </>
          ) : (
            <>
              <ThumbsUp className="h-4 w-4" />
              <span className="truncate">Vote {debater2Name}</span>
            </>
          )}
        </button>
      </div>

      {userVotedSide && (
        <p className="mt-2.5 text-center text-[11px] text-slate-400">
          Your vote is recorded securely on the debate ledger. One vote per viewer.
        </p>
      )}

      {/* Post-Debate Analytical Breakdown (If Available) */}
      {summary && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-amber-400" />
              <span>Argument &amp; Dialectic Analysis</span>
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
              <div className={`rounded-xl border ${d1Theme.border} ${d1Theme.bg} p-3`}>
                <span className={`font-semibold ${d1Theme.text}`}>{debater1Name} Strongest Points:</span>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-300">
                  {(summary.debater1StrongPoints || summary.atheistStrongPoints || []).map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className={`rounded-xl border ${d2Theme.border} ${d2Theme.bg} p-3`}>
                <span className={`font-semibold ${d2Theme.text}`}>{debater2Name} Strongest Points:</span>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-300">
                  {(summary.debater2StrongPoints || summary.believerStrongPoints || []).map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              {summary.overallAssessment && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-slate-400">
                  <span className="font-semibold text-slate-200">Overall Synthesis:</span>
                  <p className="mt-1 leading-relaxed">{summary.overallAssessment}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
