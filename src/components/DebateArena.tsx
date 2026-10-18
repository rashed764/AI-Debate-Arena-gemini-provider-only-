import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Shield,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Flame,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Share2,
  Mic,
  Activity,
  Users,
  Award
} from 'lucide-react';
import { Debate, DebateTurn, PersonaType, PlaybackMode } from '../types';
import { VotingWidget } from './VotingWidget';
import { AudienceQuestions } from './AudienceQuestions';
import { JuryScoreChart } from './JuryScoreChart';

interface DebateArenaProps {
  debate: Debate | null;
  onStartDebate: (id: string) => Promise<void>;
  onStepDebate: (id: string) => Promise<void>;
  onPauseDebate: (id: string) => Promise<void>;
  onResumeDebate: (id: string) => Promise<void>;
  onStopDebate: (id: string) => Promise<void>;
  onCastVote: (persona: PersonaType, note?: string) => Promise<void>;
  onAddQuestion: (authorName: string, text: string) => Promise<void>;
  onRetryAudio: (messageId: string) => Promise<void>;
  userVotedPersona: PersonaType | null;
  playbackMode: PlaybackMode;
  onChangePlaybackMode: (mode: PlaybackMode) => void;
  // Audio state
  activePlayingMessageId: string | null;
  onPlayMessageAudio: (msg: DebateTurn) => void;
  onPauseMessageAudio: () => void;
  isAudioPlaying: boolean;
  autoplayBlocked?: boolean;
  onUnlockAudio?: () => void;
}

export const DebateArena: React.FC<DebateArenaProps> = ({
  debate,
  onStartDebate,
  onStepDebate,
  onPauseDebate,
  onResumeDebate,
  onStopDebate,
  onCastVote,
  onAddQuestion,
  onRetryAudio,
  userVotedPersona,
  playbackMode,
  onChangePlaybackMode,
  activePlayingMessageId,
  onPlayMessageAudio,
  onPauseMessageAudio,
  isAudioPlaying,
  autoplayBlocked,
  onUnlockAudio,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'stage' | 'transcript' | 'jury'>('stage');

  const messages = Array.isArray(debate?.messages) ? debate.messages : [];
  const prevMsgLengthRef = useRef(messages.length);

  // Auto-scroll when new message is appended
  useEffect(() => {
    const currentLen = messages.length;
    if (currentLen > prevMsgLengthRef.current && prevMsgLengthRef.current > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgLengthRef.current = currentLen;
  }, [messages.length]);

  if (!debate) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Shield className="h-12 w-12 text-slate-600 mb-3 animate-pulse" />
        <h2 className="text-xl font-bold text-white">No Debate Selected</h2>
        <p className="mt-1 text-sm text-slate-400">Select an existing debate from the directory or launch a new arena.</p>
      </div>
    );
  }

  const isLive = debate.status === 'in_progress';
  const isGeneratingTranscript = debate.status === 'generating_transcript';
  const isGeneratingAudio = debate.status === 'generating_audio';
  const isAudioReady = debate.status === 'audio_ready';
  const isPaused = debate.status === 'paused';
  const isCompleted = debate.status === 'completed';

  const lastMessage = messages[messages.length - 1];
  const activePlayingMessage = messages.find(m => m.id === activePlayingMessageId);

  // Determine current active speaker on stage
  const activeSpeaker: PersonaType = activePlayingMessage
    ? activePlayingMessage.persona
    : lastMessage
    ? (lastMessage.persona === 'atheist' ? 'believer' : 'atheist')
    : 'atheist';

  const atheistMessages = messages.filter(m => m.persona === 'atheist');
  const believerMessages = messages.filter(m => m.persona === 'believer');

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 3000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 pb-32">
      {/* ======================================================== */}
      {/* 1. CINEMATIC STAGE HEADER & STATUS BANNER               */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl mb-6">
        {/* Ambient Stage Spotlights */}
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="rounded-md bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                {debate.category}
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                {debate.mode === 'interactive' ? 'Interactive Q&A Mode' : 'Structured 24-Turn Arena'}
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                {debate.language}
              </span>

              {/* Status Badge */}
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isLive || isGeneratingTranscript || isGeneratingAudio
                    ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300 animate-pulse'
                    : isCompleted || isAudioReady
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isLive || isGeneratingTranscript ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>
                  {isGeneratingTranscript
                    ? 'GENERATING DEBATE TRANSCRIPT...'
                    : isGeneratingAudio
                    ? 'SYNTHESIZING STUDIO VOICE AUDIO...'
                    : isLive
                    ? 'LIVE ARENA IN PROGRESS'
                    : isCompleted || isAudioReady
                    ? 'DEBATE COMPLETED & READY'
                    : 'ARENA IDLE / READY'}
                </span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {debate.title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 italic border-l-2 border-cyan-500 pl-3">
              "{debate.topic}"
            </p>
          </div>

          {/* Stage Control Panel */}
          <div className="flex flex-wrap items-center gap-2.5">
            {debate.status === 'idle' && (
              <button
                onClick={() => onStartDebate(debate.id)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-cyan-950/80 hover:opacity-95 transition active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Full Debate</span>
              </button>
            )}

            {isLive && (
              <>
                <button
                  onClick={() => onPauseDebate(debate.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={() => onStopDebate(debate.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition"
                >
                  <span>Stop</span>
                </button>
              </>
            )}

            {isPaused && (
              <button
                onClick={() => onResumeDebate(debate.id)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950 hover:bg-emerald-500 transition"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Resume Debate</span>
              </button>
            )}

            {!isCompleted && !isAudioReady && (
              <button
                onClick={() => onStepDebate(debate.id)}
                disabled={isLive || isGeneratingTranscript}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-40"
                title="Execute single turn manually"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span>Step Turn</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Share debate URL"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{copyFeedback ? 'Copied Link!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-6 flex items-center gap-2 border-t border-slate-800 pt-4">
          <button
            onClick={() => setActiveTab('stage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'stage'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Main Stage Arena</span>
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'transcript'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Full Transcript ({messages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('jury')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'jury'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>AI Jury Analytics</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. THE DEBATE SHOW STAGE (OPPOSING PODIUMS & LED WALL)  */}
      {/* ======================================================== */}
      {activeTab === 'stage' && (
        <div className="space-y-6">
          {/* Main Stage Grid */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-10 shadow-2xl">
            {/* Stage Floor Reflection Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cyan-950/20 via-slate-950/40 to-transparent pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* ATHEIST AI PODIUM (LEFT STAGE) */}
              <div
                className={`lg:col-span-4 relative rounded-2xl border p-6 text-center transition-all duration-500 ${
                  activeSpeaker === 'atheist' && (isLive || isAudioPlaying)
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-2xl shadow-cyan-500/30 scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                {/* Active Speaker Indicator Glow */}
                {activeSpeaker === 'atheist' && (isLive || isAudioPlaying) && (
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 opacity-40 blur-lg animate-pulse pointer-events-none" />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  {/* Avatar / Portrait */}
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-2 border-cyan-500/60 bg-gradient-to-br from-cyan-950 to-slate-900 p-2 shadow-xl shadow-cyan-950">
                    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.2)_0%,transparent_70%)]" />
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop"
                      alt="Atheist AI"
                      className="h-full w-full rounded-xl object-cover grayscale contrast-125"
                    />
                    <div className="absolute -bottom-2 -right-2 rounded-full bg-cyan-500 p-1.5 text-slate-950 shadow-lg">
                      <Mic className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <span className="mt-4 rounded bg-cyan-950 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
                    Naturalism &amp; Empiricism
                  </span>

                  <h2 className="mt-2 text-xl font-black text-white tracking-wide">Atheist AI</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Model: Gemini Flash / Pro</p>

                  <div className="mt-4 w-full border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Statements:</span>
                    <span className="font-mono font-bold text-cyan-400">{atheistMessages.length}</span>
                  </div>

                  {activeSpeaker === 'atheist' && (isLive || isAudioPlaying) && (
                    <div className="mt-3 w-full rounded-xl bg-cyan-500/20 border border-cyan-500/40 py-1.5 text-xs font-bold text-cyan-300 animate-pulse flex items-center justify-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>SPEAKING / ACTIVE</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CENTRAL STAGE LED DISPLAY & TOPIC */}
              <div className="lg:col-span-4 text-center px-2 py-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-4 py-1 text-xs font-semibold text-slate-300 mb-4 shadow-inner">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>WIZARD'S CHESS: LIVE ARENA</span>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-amber-500/5 pointer-events-none" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                    Current Debate Stage Topic
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {debate.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-300 italic">
                    "{debate.topic}"
                  </p>

                  <div className="mt-4 border-t border-slate-800/80 pt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
                    <span>Progress: <strong className="text-white font-mono">{messages.length} / {debate.totalTurns}</strong> Turns</span>
                  </div>
                </div>

                {/* Auditorium Silhouette Footer */}
                <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-slate-500">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>Live Audience &amp; AI Jury Connected</span>
                </div>
              </div>

              {/* BELIEVER AI PODIUM (RIGHT STAGE) */}
              <div
                className={`lg:col-span-4 relative rounded-2xl border p-6 text-center transition-all duration-500 ${
                  activeSpeaker === 'believer' && (isLive || isAudioPlaying)
                    ? 'border-amber-400 bg-amber-950/40 shadow-2xl shadow-amber-500/30 scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                {/* Active Speaker Indicator Glow */}
                {activeSpeaker === 'believer' && (isLive || isAudioPlaying) && (
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 opacity-40 blur-lg animate-pulse pointer-events-none" />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  {/* Avatar / Portrait */}
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950 to-slate-900 p-2 shadow-xl shadow-amber-950">
                    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,transparent_70%)]" />
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop"
                      alt="Believer AI"
                      className="h-full w-full rounded-xl object-cover grayscale contrast-125"
                    />
                    <div className="absolute -bottom-2 -right-2 rounded-full bg-amber-500 p-1.5 text-slate-950 shadow-lg">
                      <Mic className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <span className="mt-4 rounded bg-amber-950 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                    Metaphysical Realism
                  </span>

                  <h2 className="mt-2 text-xl font-black text-white tracking-wide">Believer AI</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Model: Gemini Flash / Pro</p>

                  <div className="mt-4 w-full border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Statements:</span>
                    <span className="font-mono font-bold text-amber-400">{believerMessages.length}</span>
                  </div>

                  {activeSpeaker === 'believer' && (isLive || isAudioPlaying) && (
                    <div className="mt-3 w-full rounded-xl bg-amber-500/20 border border-amber-500/40 py-1.5 text-xs font-bold text-amber-300 animate-pulse flex items-center justify-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      <span>SPEAKING / ACTIVE</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. STAGE-INTEGRATED CAPTION SURFACE & RECENT STATEMENTS   */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols): Latest Stage Statement & Captions */}
            <div className="lg:col-span-8 space-y-6">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                  <Shield className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                  <h3 className="text-lg font-bold text-white">Stage is Set and Ready</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                    Click <strong className="text-cyan-400">Start Full Debate</strong> above to generate the complete 24-turn philosophical debate text stream across both podiums.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      <span>Live Stage Caption Stream ({messages.length} Statements)</span>
                    </h3>
                    <span className="text-xs text-slate-400">Chronological Order</span>
                  </div>

                  {messages.map((turn, idx) => {
                    const isAtheist = turn.persona === 'atheist';
                    const isPlayingThis = activePlayingMessageId === turn.id;

                    return (
                      <div
                        key={turn.id}
                        className={`rounded-2xl border p-6 transition-all duration-300 ${
                          isPlayingThis
                            ? isAtheist
                              ? 'border-cyan-400 bg-cyan-950/30 shadow-xl shadow-cyan-950/40'
                              : 'border-amber-400 bg-amber-950/30 shadow-xl shadow-amber-950/40'
                            : 'border-slate-800/80 bg-slate-950/80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                                isAtheist ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              }`}
                            >
                              {turn.persona === 'atheist' ? 'A' : 'B'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-sm">{turn.speakerName}</h4>
                                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 uppercase">
                                  {turn.roundName}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">Turn #{turn.turnIndex + 1} • {turn.statementType}</span>
                            </div>
                          </div>

                          {/* Audio Playback Controls for individual statement */}
                          <div className="flex items-center gap-2">
                            {turn.audioStatus === 'ready' && turn.audioUrl && (
                              <button
                                onClick={() => {
                                  if (isPlayingThis && isAudioPlaying) {
                                    onPauseMessageAudio();
                                  } else {
                                    onPlayMessageAudio(turn);
                                  }
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                  isPlayingThis && isAudioPlaying
                                    ? 'bg-rose-600 text-white shadow-lg'
                                    : isAtheist
                                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg'
                                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                                }`}
                              >
                                {isPlayingThis && isAudioPlaying ? (
                                  <>
                                    <Pause className="h-3.5 w-3.5" />
                                    <span>Pause Audio</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3.5 w-3.5" />
                                    <span>Play Voice</span>
                                  </>
                                )}
                              </button>
                            )}

                            {turn.audioStatus === 'generating' && (
                              <span className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
                                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                                <span>Synthesizing Voice...</span>
                              </span>
                            )}

                            {turn.audioStatus === 'failed' && (
                              <button
                                onClick={() => onRetryAudio(turn.id)}
                                className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Retry Audio</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Statement Body */}
                        <div className="mt-4 space-y-3 text-xs sm:text-sm">
                          {/* Main Thesis */}
                          <div
                            className={`rounded-xl p-3 border ${
                              isAtheist
                                ? 'border-cyan-500/20 bg-cyan-950/20 text-cyan-200'
                                : 'border-amber-500/20 bg-amber-950/20 text-amber-200'
                            }`}
                          >
                            <span className="font-extrabold uppercase text-[10px] tracking-wider block mb-0.5 opacity-80">
                              Core Thesis:
                            </span>
                            <p className="font-semibold leading-relaxed">{turn.mainClaim}</p>
                          </div>

                          {/* Spoken Text Monologue */}
                          {playbackMode !== 'voice_only' && (
                            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm whitespace-pre-line">
                              {turn.rawText}
                            </p>
                          )}

                          {/* Supporting Premises */}
                          {turn.reasoning && turn.reasoning.length > 0 && playbackMode !== 'voice_only' && (
                            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                Supporting Deductions &amp; Evidence:
                              </span>
                              <ul className="space-y-1 text-slate-300">
                                {turn.reasoning.map((r, rIdx) => (
                                  <li key={rIdx} className="flex items-start gap-2">
                                    <span className={`font-mono text-xs font-bold ${isAtheist ? 'text-cyan-400' : 'text-amber-400'}`}>
                                      {rIdx + 1}.
                                    </span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Direct Rebuttal */}
                          {turn.responseToOpponent && playbackMode !== 'voice_only' && (
                            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-slate-300">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                                Direct Rebuttal to Opponent:
                              </span>
                              <p className="italic text-slate-300">{turn.responseToOpponent}</p>
                            </div>
                          )}

                          {/* Citations */}
                          {turn.sources && turn.sources.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                              <span>Citations:</span>
                              {turn.sources.map((s, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-cyan-400 hover:underline"
                                >
                                  <span>{s.title}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Right Column (4 cols): Voting, Analytics & Audience Q&A */}
            <div className="lg:col-span-4 space-y-6">
              {messages.length > 0 && <JuryScoreChart debate={debate} />}

              <VotingWidget
                debateId={debate.id}
                votes={debate.votes}
                userVotedPersona={userVotedPersona}
                onCastVote={onCastVote}
                isDebateActive={isLive}
                summary={debate.summary}
              />

              <AudienceQuestions
                debateId={debate.id}
                questions={debate.questions}
                onAddQuestion={onAddQuestion}
                isInteractiveMode={debate.mode === 'interactive'}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TRANSCRIPT TAB VIEW                                  */}
      {/* ======================================================== */}
      {activeTab === 'transcript' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-lg font-bold text-white mb-2">Complete Chronological Debate Transcript</h3>
            <p className="text-xs text-slate-400 mb-6">Full verbatim transcript generated across all rounds, rebuttals, and cross-examinations.</p>

            {messages.length === 0 ? (
              <p className="text-xs text-slate-400">No transcript generated yet.</p>
            ) : (
              <div className="space-y-6">
                {messages.map(m => (
                  <div key={m.id} className="border-b border-slate-800 pb-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-bold text-white">{m.speakerName} ({m.roundName})</span>
                      <span className="font-mono">Turn #{m.turnIndex + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-cyan-300 mb-1">Thesis: {m.mainClaim}</p>
                    <p className="text-xs text-slate-300">{m.rawText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. AI JURY ANALYTICS TAB VIEW                           */}
      {/* ======================================================== */}
      {activeTab === 'jury' && (
        <div className="space-y-6">
          {messages.length > 0 ? (
            <JuryScoreChart debate={debate} />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-12 text-center text-slate-400 text-xs">
              Generate the debate first to view AI jury analytics and score trends.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
