import React, { useState } from 'react';
import { X, Sparkles, Layers, Volume2, Globe, Search, BrainCircuit } from 'lucide-react';
import { DebateMode, PlaybackMode } from '../types';

interface CreateDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (debateData: any) => Promise<void>;
}

const CURATED_TOPICS = [
  {
    title: 'Cosmology and the First Cause',
    topic: 'Does the origin and mathematical fine-tuning of the universe require a transcendent, intentional Creator, or is a naturalistic framework sufficient?',
    category: 'Cosmology & Origins',
  },
  {
    title: 'Consciousness: Biology or Transcendent Soul?',
    topic: 'Can subjective conscious experience (qualia) be fully accounted for by physical brain chemistry, or does mind point to immaterial reality?',
    category: 'Philosophy of Mind',
  },
  {
    title: 'The Problem of Suffering and Moral Foundations',
    topic: 'Does gratuitous suffering disprove an omnipotent, benevolent God, or can skeptical theism and free will defend theism?',
    category: 'Ethics & Epistemology',
  },
  {
    title: 'Objective Morality Without God',
    topic: 'Can objective moral truths exist within an unguided evolutionary universe, or does genuine moral realism require transcendent anchoring?',
    category: 'Moral Realism',
  },
];

const LANGUAGES = [
  'English',
  'Bengali (বাংলা)',
  'Spanish (Español)',
  'French (Français)',
  'German (Deutsch)',
  'Arabic (العربية)',
];

export const CreateDebateModal: React.FC<CreateDebateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Philosophy & Theology');
  const [mode, setMode] = useState<DebateMode>('automatic');
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('text_and_voice');
  const [language, setLanguage] = useState('English');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectCurated = (item: typeof CURATED_TOPICS[0]) => {
    setTitle(item.title);
    setTopic(item.topic);
    setCategory(item.category);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim() || topic.slice(0, 50),
        topic: topic.trim(),
        category,
        mode,
        playbackMode,
        language,
        thinkingEnabled,
        searchEnabled,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-amber-500 p-0.5">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Initiate New AI Debate</h2>
              <p className="text-xs text-slate-400">Match Atheist AI against Believer AI in formal discourse</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Curated Topic Chips */}
        <div className="mt-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Featured Curated Topics:
          </span>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CURATED_TOPICS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectCurated(item)}
                className="flex flex-col text-left rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5 hover:border-cyan-500/40 hover:bg-slate-900 transition group"
              >
                <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                  {item.title}
                </span>
                <span className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                  {item.topic}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Debate Title
            </label>
            <input
              type="text"
              placeholder="e.g. Cosmology & The Question of Transcendent Origin"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Debate Resolution / Topic Prompt <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="State the core thesis or question to be debated..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Debate Mode */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Debate Mode
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as DebateMode)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="automatic">Automatic (Full Structured Debate)</option>
                <option value="interactive">Interactive (Audience Questions Live)</option>
              </select>
            </div>

            {/* Playback Mode */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Audio &amp; Voice Mode
              </label>
              <select
                value={playbackMode}
                onChange={e => setPlaybackMode(e.target.value as PlaybackMode)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="text_and_voice">Text + Voice (Recommended)</option>
                <option value="voice_only">Voice Only (Podcast Style)</option>
                <option value="text_only">Text Only (No Audio)</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Debate Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={searchEnabled}
                onChange={e => setSearchEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-cyan-500"
              />
              <Search className="h-3.5 w-3.5 text-cyan-400" />
              <span>Enable Google Search Grounding</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={e => setThinkingEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-500"
              />
              <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
              <span>Enable High Thinking (Deep Deliberation)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !topic.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-cyan-950/50 hover:opacity-95 transition disabled:opacity-50 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>{submitting ? 'Creating Debate...' : 'Launch Debate Arena'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
