import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Plus,
  Shield,
  Layers,
  Trash2,
  FileText,
  Award,
  AlertTriangle,
  Play,
  RotateCcw,
  X
} from 'lucide-react';
import { Debate } from '../types';

interface DebateListProps {
  debates: Debate[];
  onSelectDebate: (id: string) => void;
  onDeleteDebate: (id: string) => Promise<boolean>;
  openCreateModal: () => void;
  openSettings: () => void;
  onViewTranscript?: (debate: Debate) => void;
  onViewResults?: (debate: Debate) => void;
}

export const DebateList: React.FC<DebateListProps> = ({
  debates,
  onSelectDebate,
  onDeleteDebate,
  openCreateModal,
  openSettings,
  onViewTranscript,
  onViewResults,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Confirmation Modal State
  const [debateToDelete, setDebateToDelete] = useState<Debate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Transcript Quick Viewer Modal
  const [transcriptDebate, setTranscriptDebate] = useState<Debate | null>(null);

  const categories = [
    'all',
    'Energy & Climate',
    'Philosophy & Metaphysics',
    'Technology & AI Ethics',
    'Economics & Society',
    'Bioethics',
    'Cosmology & Origins',
  ];

  const safeDebates = Array.isArray(debates) ? debates : [];
  const filtered = safeDebates.filter(d => {
    if (!d) return false;
    const matchCat = filterCategory === 'all' || d.category?.toLowerCase() === filterCategory.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      d.title?.toLowerCase().includes(query) ||
      d.topic?.toLowerCase().includes(query) ||
      d.debater1?.name?.toLowerCase().includes(query) ||
      d.debater2?.name?.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  const confirmDelete = async () => {
    if (!debateToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const success = await onDeleteDebate(debateToDelete.id);
      if (success) {
        setDebateToDelete(null);
      } else {
        setDeleteError('Server failed to delete debate. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8 sm:p-12 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-md bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
              LIVING STONE
            </span>
            <span className="text-xs text-slate-400">Universal All-Topics AI Debate Arena</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Universal AI vs AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">Debate Arena</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Host formal, high-stakes intellectual discourse across any topic. Configure custom AI debater personas,
            stances, Gemini models, 24kHz studio voices, audience cross-examination, and AI Jury evaluations.
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
              <span>Manage AI Debater Profiles</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800/80 pt-6 text-xs">
          <div className="flex flex-col">
            <span className="font-bold text-cyan-400 uppercase tracking-wider">All-Topics Discourse</span>
            <span className="text-slate-400 mt-0.5">Philosophy, science, energy, ethics &amp; policy</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-amber-400 uppercase tracking-wider">Configurable Personas</span>
            <span className="text-slate-400 mt-0.5">Custom stances, models, voices &amp; colors</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-indigo-400 uppercase tracking-wider">Studio Audio Engine</span>
            <span className="text-slate-400 mt-0.5">One-click full debate voice playback</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-emerald-400 uppercase tracking-wider">AI Jury Adjudication</span>
            <span className="text-slate-400 mt-0.5">Objective multi-dimensional score analytics</span>
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Debate Arena Directory</h2>
            <p className="text-xs text-slate-400">Explore active, live, and archived debates</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by topic, title, or debater..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-lg px-2.5 py-1.5 font-medium transition capitalize ${
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
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 p-12 text-center">
            <Shield className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No debates matching your criteria</p>
            <p className="mt-1 text-xs text-slate-500">Launch a new debate or clear your search filter.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition"
            >
              Launch Debate
            </button>
          </div>
        )}

        {/* Debate Cards Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(debate => {
            const debater1Name = debate.debater1?.name || 'Debater 1';
            const debater2Name = debate.debater2?.name || 'Debater 2';

            const votes = debate.votes || { debater1: 0, debater2: 0, total: 0 };
            const d1Votes = votes.debater1 ?? votes.atheist ?? 0;
            const d2Votes = votes.debater2 ?? votes.believer ?? 0;
            const totalVotes = votes.total || d1Votes + d2Votes || 1;
            const d1Percent = Math.round((d1Votes / totalVotes) * 100);
            const messages = Array.isArray(debate.messages) ? debate.messages : [];

            return (
              <div
                key={debate.id}
                onClick={() => onSelectDebate(debate.id)}
                className="group relative cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-xl transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-cyan-950/20 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300 uppercase truncate max-w-[200px]">
                      {debate.category || 'General'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        debate.status === 'in_progress' || debate.status === 'generating_transcript'
                          ? 'bg-rose-950 border border-rose-500/40 text-rose-300 animate-pulse'
                          : debate.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {debate.status}
                    </span>
                  </div>

                  {/* Debater Profiles Matchup Badge */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="font-bold text-cyan-400 truncate max-w-[130px]">{debater1Name}</span>
                    <span className="text-slate-600 font-extrabold text-[10px]">VS</span>
                    <span className="font-bold text-amber-400 truncate max-w-[130px]">{debater2Name}</span>
                  </div>

                  <h3 className="mt-2 text-lg font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                    {debate.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    "{debate.topic}"
                  </p>
                </div>

                <div className="mt-5">
                  {/* Vote Preview Tug of War */}
                  <div className="border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                      <span className="text-cyan-400 truncate max-w-[120px]">{debater1Name}: {d1Percent}%</span>
                      <span>{messages.length} Turns</span>
                      <span className="text-amber-400 truncate max-w-[120px]">{debater2Name}: {100 - d1Percent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800 flex">
                      <div style={{ width: `${d1Percent}%` }} className="h-full bg-cyan-500" />
                      <div style={{ width: `${100 - d1Percent}%` }} className="h-full bg-amber-500" />
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                    {/* Action Links */}
                    <div className="flex items-center gap-2">
                      {/* View Transcript */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setTranscriptDebate(debate);
                        }}
                        title="View complete transcript"
                        className="flex items-center gap-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 px-2.5 py-1 text-slate-300 hover:text-white transition"
                      >
                        <FileText className="h-3 w-3 text-cyan-400" />
                        <span>Transcript</span>
                      </button>

                      {/* View Results / Jury */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectDebate(debate.id);
                        }}
                        title="View jury analytics and results"
                        className="flex items-center gap-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 px-2.5 py-1 text-slate-300 hover:text-white transition"
                      >
                        <Award className="h-3 w-3 text-amber-400" />
                        <span>Results</span>
                      </button>

                      {/* Delete Debate */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setDebateToDelete(debate);
                        }}
                        title="Delete debate"
                        className="flex items-center gap-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 px-2 py-1 text-rose-300 hover:text-rose-100 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>

                    {/* Open / Enter Arena */}
                    <div className="flex items-center gap-1 font-semibold text-cyan-400 group-hover:translate-x-1 transition">
                      <span>{debate.status === 'in_progress' ? 'Resume' : 'Enter Arena'}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* AUTHENTIC DELETE CONFIRMATION MODAL                      */}
      {/* ======================================================== */}
      {debateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950 border border-rose-800/40">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Debate</h3>
                <p className="text-xs text-rose-300">Permanent data removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">"{debateToDelete.title}"</strong>?
            </p>

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400 space-y-1">
              <p>• Removes verbatim transcript entries and turn history.</p>
              <p>• Cleans up community audience votes &amp; voter fingerprint records.</p>
              <p>• Removes AI Jury score evaluations and analytics.</p>
              <p>• Disconnects any active streaming broadcast for this debate.</p>
            </div>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/60 p-2.5 text-xs text-rose-200">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDebateToDelete(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-950 transition active:scale-95 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK VIEW TRANSCRIPT MODAL                              */}
      {/* ======================================================== */}
      {transcriptDebate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Transcript: {transcriptDebate.title}</h3>
                  <p className="text-xs text-slate-400">{transcriptDebate.messages.length} Turns Recorded</p>
                </div>
              </div>
              <button
                onClick={() => setTranscriptDebate(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {transcriptDebate.messages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No turns generated yet for this debate.</p>
              ) : (
                transcriptDebate.messages.map((turn, idx) => {
                  const isD1 = turn.speakerSide === 'debater1' || turn.persona === 'atheist';
                  return (
                    <div
                      key={turn.id || idx}
                      className={`rounded-xl border p-3 text-xs ${
                        isD1
                          ? 'border-cyan-500/20 bg-cyan-950/20'
                          : 'border-amber-500/20 bg-amber-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className={isD1 ? 'text-cyan-300' : 'text-amber-300'}>
                          Turn #{idx + 1}: {turn.speakerName} ({turn.statementType})
                        </span>
                        <span className="text-[10px] text-slate-500">{turn.roundName}</span>
                      </div>
                      <p className="font-semibold text-slate-200 mb-1">{turn.mainClaim}</p>
                      <p className="text-slate-300 leading-relaxed">{turn.rawText}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  const id = transcriptDebate.id;
                  setTranscriptDebate(null);
                  onSelectDebate(id);
                }}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition"
              >
                Open in Arena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
