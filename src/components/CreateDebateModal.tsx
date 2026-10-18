import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, UserCheck, Shield, ChevronDown, Check } from 'lucide-react';
import { DebateMode, PlaybackMode, DebaterProfilePublic } from '../types';

interface CreateDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (debateData: any) => Promise<void>;
  profiles?: DebaterProfilePublic[];
}

const CURATED_TOPICS = [
  {
    title: 'Nuclear Energy vs 100% Renewables',
    topic: 'Is nuclear fission essential for achieving a reliable, low-carbon future, or can renewable energy and grid storage suffice on their own?',
    category: 'Energy & Climate',
    d1Position: 'Nuclear energy is indispensable for zero-carbon baseload grid stability',
    d2Position: 'Renewable energy with battery storage is faster, safer, and cheaper to scale',
  },
  {
    title: 'Cosmology, Contingency & Cosmic Fine-Tuning',
    topic: 'Does the existence and physical fine-tuning of the universe imply an intentional Creator, or is a naturalistic framework sufficient?',
    category: 'Philosophy & Metaphysics',
    d1Position: 'Naturalistic parsimony and quantum cosmology sufficiently explain physical reality',
    d2Position: 'Universal fine-tuning and contingency necessitate an intentional necessary Mind',
  },
  {
    title: 'Artificial General Intelligence & Consciousness',
    topic: 'Can advanced synthetic neural architectures ever possess subjective conscious experience (qualia), or will they remain non-sentient computational simulations?',
    category: 'Technology & AI Ethics',
    d1Position: 'Subjective consciousness is substrate-independent and realizable in complex silicon systems',
    d2Position: 'Computational simulations only mimic conscious behaviors without genuine subjective interiority',
  },
  {
    title: 'Universal Basic Income & Automation',
    topic: 'Should governments implement an unconditional Universal Basic Income (UBI) to address AI-driven automation displacement?',
    category: 'Economics & Society',
    d1Position: 'UBI guarantees human dignity and macroeconomic stability in an automated economy',
    d2Position: 'UBI is fiscally unsustainable, disincentivizes productivity, and inflates consumer prices',
  },
  {
    title: 'Human Germline Genetic Engineering',
    topic: 'Should CRISPR human germline editing be permitted for cognitive and physiological enhancements beyond disease prevention?',
    category: 'Bioethics',
    d1Position: 'Responsible genetic enhancement will eradicate suffering and expand human potential',
    d2Position: 'Germline modification risks irreversible ecological inequality and eugenic stratification',
  },
];

const LANGUAGES = [
  'English',
  'Spanish (Español)',
  'French (Français)',
  'German (Deutsch)',
  'Bengali (বাংলা)',
  'Arabic (العربية)',
];

export const CreateDebateModal: React.FC<CreateDebateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  profiles = [],
}) => {
  const [availableProfiles, setAvailableProfiles] = useState<DebaterProfilePublic[]>(profiles);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Philosophy & Metaphysics');

  const [debater1Id, setDebater1Id] = useState('');
  const [debater2Id, setDebater2Id] = useState('');
  const [debater1Position, setDebater1Position] = useState('');
  const [debater2Position, setDebater2Position] = useState('');

  const [totalTurns, setTotalTurns] = useState<number>(6);
  const [mode, setMode] = useState<DebateMode>('automatic');
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('text_and_voice');
  const [language, setLanguage] = useState('English');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch or sync profiles
  useEffect(() => {
    if (isOpen) {
      setLoadingProfiles(true);
      fetch('/api/profiles')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.profiles) && data.profiles.length > 0) {
            setAvailableProfiles(data.profiles);
            // Default selection if empty
            if (!debater1Id) {
              const enabled = data.profiles.filter((p: DebaterProfilePublic) => p.status === 'enabled');
              const d1 = enabled[0] || data.profiles[0];
              const d2 = enabled[1] || data.profiles[1] || d1;
              setDebater1Id(d1.id);
              setDebater1Position(d1.position);
              setDebater2Id(d2.id);
              setDebater2Position(d2.position);
            }
          }
        })
        .catch(err => console.error('Error fetching profiles:', err))
        .finally(() => setLoadingProfiles(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const enabledProfiles = availableProfiles.filter(p => p.status === 'enabled');
  const d1 = availableProfiles.find(p => p.id === debater1Id) || enabledProfiles[0];
  const d2 = availableProfiles.find(p => p.id === debater2Id) || enabledProfiles[1] || d1;

  const handleSelectCurated = (item: typeof CURATED_TOPICS[0]) => {
    setTitle(item.title);
    setTopic(item.topic);
    setCategory(item.category);
    if (item.d1Position) setDebater1Position(item.d1Position);
    if (item.d2Position) setDebater2Position(item.d2Position);
  };

  const handleD1Change = (id: string) => {
    setDebater1Id(id);
    const prof = availableProfiles.find(p => p.id === id);
    if (prof) setDebater1Position(prof.position);
  };

  const handleD2Change = (id: string) => {
    setDebater2Id(id);
    const prof = availableProfiles.find(p => p.id === id);
    if (prof) setDebater2Position(prof.position);
  };

  // Warnings
  const isSameProfile = debater1Id === debater2Id;
  const isSamePosition =
    debater1Position.trim().toLowerCase() === debater2Position.trim().toLowerCase() &&
    debater1Position.trim().length > 0;

  const d1Incompatible =
    d1 && d1.topicScope && d1.topicScope !== 'All Topics' && category !== d1.topicScope;
  const d2Incompatible =
    d2 && d2.topicScope && d2.topicScope !== 'All Topics' && category !== d2.topicScope;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim() || topic.slice(0, 60),
        topic: topic.trim(),
        category,
        debater1Id: d1?.id,
        debater2Id: d2?.id,
        debater1Position: debater1Position.trim() || d1?.position,
        debater2Position: debater2Position.trim() || d2?.position,
        totalTurns,
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
      <div className="my-8 w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-amber-500 p-0.5">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Initiate Universal AI Debate</h2>
              <p className="text-xs text-slate-400">Configure any topic and match two compatible AI debater profiles</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-900 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Featured Curated Topics */}
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{item.category}</span>
                </div>
                <span className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                  {item.topic}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Topic & Title */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Debate Resolution / Topic Prompt <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="State the core thesis, proposition, or inquiry to be debated..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Debate Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nuclear Energy vs 100% Renewables"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Topic Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Energy & Climate, Philosophy, AI Ethics"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* DEBATER PROFILE SELECTION & POSITION ASSIGNMENT          */}
          {/* ======================================================== */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-bold text-white mb-3">AI Debater Pairing &amp; Positions</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Debater 1 (Left Podium) */}
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Side 1 (Left Podium)
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                    {d1?.modelId}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Select Debater Profile:</label>
                  <select
                    value={debater1Id}
                    onChange={e => handleD1Change(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {availableProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.status === 'disabled' ? '(Disabled)' : ''} — {p.position.slice(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Assigned Position for this Debate:</label>
                  <textarea
                    rows={2}
                    value={debater1Position}
                    onChange={e => setDebater1Position(e.target.value)}
                    placeholder="Exact position Side 1 must defend..."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Debater 2 (Right Podium) */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Side 2 (Right Podium)
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                    {d2?.modelId}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Select Debater Profile:</label>
                  <select
                    value={debater2Id}
                    onChange={e => handleD2Change(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    {availableProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.status === 'disabled' ? '(Disabled)' : ''} — {p.position.slice(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Assigned Position for this Debate:</label>
                  <textarea
                    rows={2}
                    value={debater2Position}
                    onChange={e => setDebater2Position(e.target.value)}
                    placeholder="Exact position Side 2 must defend..."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Incompatibility / Same Profile Warnings */}
            {isSameProfile && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Notice: You selected <strong>{d1?.name}</strong> for both sides. Ensure their assigned positions differ so they engage in authentic counter-arguments.
                </span>
              </div>
            )}

            {isSamePosition && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  Warning: Both debaters have identical assigned positions! Meaningful debates require opposing or complementary stances.
                </span>
              </div>
            )}

            {(d1Incompatible || d2Incompatible) && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-500/40 bg-blue-950/30 p-3 text-xs text-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Scope Advisory: One or both profiles are scoped to specific topics (e.g., {d1?.topicScope}, {d2?.topicScope}). They will debate within the context of their expertise.
                </span>
              </div>
            )}
          </div>

          {/* Configuration Options */}
          <div className="border-t border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Debate Length
              </label>
              <select
                value={totalTurns}
                onChange={e => setTotalTurns(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value={4}>4 Turns (2 Rounds - Fast Opening &amp; Closing)</option>
                <option value={6}>6 Turns (3 Rounds - Standard Formal Debate)</option>
                <option value={8}>8 Turns (4 Rounds - Deep Cross-Examination)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Progression Mode
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as DebateMode)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="automatic">Automatic Stream (Continuous)</option>
                <option value="interactive">Interactive (Turn-by-Turn Q&amp;A)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Audio Preference
              </label>
              <select
                value={playbackMode}
                onChange={e => setPlaybackMode(e.target.value as PlaybackMode)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="text_and_voice">Text &amp; Voice Synthesis (Recommended)</option>
                <option value="text_only">Text-Only (Fastest, No Audio)</option>
              </select>
            </div>
          </div>

          {/* Advanced Switches */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs text-slate-300">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchEnabled}
                  onChange={e => setSearchEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Google Search Grounding</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thinkingEnabled}
                  onChange={e => setThinkingEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Deep Thinking Mode</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Language:</span>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-cyan-950 hover:opacity-90 transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{submitting ? 'Preparing Stage...' : 'Launch AI Debate Arena'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
