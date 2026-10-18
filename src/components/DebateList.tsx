import React, { useState } from 'react';
import { Sparkles, MessageSquare, Flame, CheckCircle2, ChevronRight, Plus, Shield, Layers } from 'lucide-react';
import { Debate } from '../types';

interface DebateListProps {
  debates: Debate[];
  onSelectDebate: (id: string) => void;
  openCreateModal: () => void;
  openSettings: () => void;
}

export const DebateList: React.FC<DebateListProps> = ({
  debates,
  onSelectDebate,
  openCreateModal,
  openSettings,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', 'Cosmology & Origins', 'Philosophy of Mind', 'Ethics & Epistemology', 'Moral Realism'];

  const safeDebates = Array.isArray(debates) ? debates : [];
  const filtered = safeDebates.filter(d => {
    if (!d) return false;
    if (filterCategory === 'all') return true;
    return d.category === filterCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8 sm:p-12 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-md bg-gradient-to-r from-cyan-500 to-indigo-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
              WIZARD'S CHESS: LIVING STONE
            </span>
            <span className="text-xs text-slate-400">Autonomous AI vs AI Intellectual Arena</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            The Ultimate Arena of <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">Atheist AI</span> vs{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">Believer AI</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Witness high-level philosophical, cosmological, and metaphysical debates between two distinct Gemini-powered intelligences.
            Featuring separate independent API credentials, 24kHz studio voice synthesis, audience cross-examination, and real-time community voting.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-amber-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-cyan-950/60 hover:opacity-95 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Launch New Debate</span>
            </button>

            <button
              onClick={openSettings}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition"
            >
              <span>Configure AI &amp; Voice Keys</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800/80 pt-6 text-xs">
          <div className="flex flex-col">
            <span className="font-bold text-cyan-400 uppercase tracking-wider">Independent Keys</span>
            <span className="text-slate-400 mt-0.5">Separate API keys per AI persona</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-amber-400 uppercase tracking-wider">Studio TTS Audio</span>
            <span className="text-slate-400 mt-0.5">Distinct voice actors with zero overlap</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-indigo-400 uppercase tracking-wider">Interactive Q&amp;A</span>
            <span className="text-slate-400 mt-0.5">Audience questions injected into debate</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-emerald-400 uppercase tracking-wider">Community Ledger</span>
            <span className="text-slate-400 mt-0.5">One-vote enforcement &amp; argument breakdown</span>
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Debate Arena Directory</h2>
            <p className="text-xs text-slate-400">Explore active, live, and archived philosophical debates</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-lg px-3 py-1.5 font-medium transition capitalize ${
                  filterCategory === cat
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Debate Cards Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(debate => {
            const votes = debate.votes || { atheist: 0, believer: 0, total: 0 };
            const atheistVotes = votes.atheist || 0;
            const believerVotes = votes.believer || 0;
            const totalVotes = votes.total || atheistVotes + believerVotes || 1;
            const atheistPercent = Math.round((atheistVotes / totalVotes) * 100);
            const messages = Array.isArray(debate.messages) ? debate.messages : [];

            return (
              <div
                key={debate.id}
                onClick={() => onSelectDebate(debate.id)}
                className="group relative cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-xl transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-cyan-950/20"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300 uppercase">
                    {debate.category}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      debate.status === 'in_progress'
                        ? 'bg-rose-950 border border-rose-500/40 text-rose-300 animate-pulse'
                        : debate.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {debate.status}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-white group-hover:text-cyan-300 transition">
                  {debate.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  "{debate.topic}"
                </p>

                {/* Vote Preview Tug of War */}
                <div className="mt-5 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span className="text-cyan-400">Atheist: {atheistPercent}%</span>
                    <span>{messages.length} Statements</span>
                    <span className="text-amber-400">Believer: {100 - atheistPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800 flex">
                    <div style={{ width: `${atheistPercent}%` }} className="h-full bg-cyan-500" />
                    <div style={{ width: `${100 - atheistPercent}%` }} className="h-full bg-amber-500" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Language: {debate.language}</span>
                  <div className="flex items-center gap-1 font-semibold text-cyan-400 group-hover:translate-x-1 transition">
                    <span>Enter Arena</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
