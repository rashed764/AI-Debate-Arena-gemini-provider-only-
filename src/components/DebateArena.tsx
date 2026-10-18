import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Shield,
  HelpCircle,
  Clock,
  Award,
  Users,
  Activity,
  FileText,
  FastForward,
  Share2,
  Layers,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { Debate, DebateTurn, PersonaType, PlaybackMode } from '../types';
import { DebaterPodium } from './DebaterPodium';
import { StageCaptions } from './StageCaptions';
import { VotingWidget } from './VotingWidget';
import { AudienceQuestions } from './AudienceQuestions';
import { JuryScoreChart } from './JuryScoreChart';
import { StageBackground } from './StageBackground';
import { useAudioAnalyser } from '../utils/useAudioAnalyser';

interface DebateArenaProps {
  debate: Debate | null;
  onStartDebate: (id: string) => Promise<void>;
  onStepDebate: (id: string) => Promise<void>;
  onPauseDebate: (id: string) => Promise<void>;
  onResumeDebate: (id: string) => Promise<void>;
  onStopDebate: (id: string) => Promise<void>;
  onCastVote: (side: 'debater1' | 'debater2', note?: string) => Promise<void>;
  onAddQuestion: (authorName: string, text: string) => Promise<void>;
  onRetryAudio: (messageId: string) => Promise<void>;
  userVotedPersona: string | null;
  playbackMode: PlaybackMode;
  onChangePlaybackMode: (mode: PlaybackMode) => void;
  activePlayingMessageId: string | null;
  onPlayMessageAudio: (msg: DebateTurn, enableAutoContinuation?: boolean) => void;
  onPauseMessageAudio: () => void;
  isAudioPlaying: boolean;
  autoplayBlocked?: boolean;
  onUnlockAudio?: () => void;
  audioElement?: HTMLAudioElement | null;
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
  audioElement,
}) => {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'stage' | 'transcript' | 'jury'>('stage');
  const [isTranscriptDrawerOpen, setIsTranscriptDrawerOpen] = useState(false);

  // Selected turn to inspect on the Stage Teleprompter
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(null);

  const messages = Array.isArray(debate?.messages) ? debate.messages : [];

  // Real-time Web Audio API frequency analysis
  const audioAnalysis = useAudioAnalyser(audioElement || null, isAudioPlaying, false);

  // Determine current active turn
  const activePlayingMessage = messages.find(m => m.id === activePlayingMessageId);
  const lastMessage = messages[messages.length - 1];

  // If a turn is currently playing audio, follow it; otherwise follow user selected or latest
  const displayedTurn = activePlayingMessage
    ? activePlayingMessage
    : selectedTurnIndex !== null && messages[selectedTurnIndex]
    ? messages[selectedTurnIndex]
    : lastMessage || null;

  const currentTurnIdx = displayedTurn ? messages.findIndex(m => m.id === displayedTurn.id) : 0;

  // Track active speaker side for stage lighting and visualizer
  const activeSpeakerSide: 'debater1' | 'debater2' | null = activePlayingMessage
    ? activePlayingMessage.speakerSide || (activePlayingMessage.persona === 'believer' ? 'debater2' : 'debater1')
    : displayedTurn
    ? displayedTurn.speakerSide || (displayedTurn.persona === 'believer' ? 'debater2' : 'debater1')
    : null;

  const isLive = debate?.status === 'in_progress';
  const isGeneratingTranscript = debate?.status === 'generating_transcript';
  const isGeneratingAudio = debate?.status === 'generating_audio';
  const isAudioReady = debate?.status === 'audio_ready';
  const isPaused = debate?.status === 'paused';
  const isCompleted = debate?.status === 'completed';

  // Count audio readiness for progress display
  const readyAudioCount = messages.filter(m => m.audioStatus === 'ready').length;
  const audioProgressPct = messages.length > 0 ? Math.round((readyAudioCount / messages.length) * 100) : 0;
  const hasPlayableAudio = readyAudioCount > 0;

  // Handle Full Debate Playback
  const handlePlayFullDebate = () => {
    if (messages.length === 0) return;
    if (isAudioPlaying) {
      onPauseMessageAudio();
      return;
    }
    const firstPlayable = messages.find(m => m.audioStatus === 'ready') || messages[0];
    onPlayMessageAudio(firstPlayable, true);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 3000);
  };

  if (!debate) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Shield className="h-12 w-12 text-slate-600 mb-3 animate-pulse" />
        <h2 className="text-xl font-bold text-white">No Debate Selected</h2>
        <p className="mt-1 text-sm text-slate-400">Select an existing debate from the directory or launch a new arena.</p>
      </div>
    );
  }

  const debater1 = debate.debater1 || {
    id: 'debater1',
    name: 'Debater 1',
    position: 'Primary Affirmation',
    persona: 'Rigorous debate specialist',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Fenrir',
    voiceStyle: 'Analytical and sharp',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH' as const,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    accentColor: 'cyan' as const,
  };

  const debater2 = debate.debater2 || {
    id: 'debater2',
    name: 'Debater 2',
    position: 'Counter Proposition',
    persona: 'Profound debate scholar',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Kore',
    voiceStyle: 'Philosophical and warm',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH' as const,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    accentColor: 'amber' as const,
  };

  const d1Votes = debate.votes.debater1 ?? debate.votes.atheist ?? 0;
  const d2Votes = debate.votes.debater2 ?? debate.votes.believer ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6">
      {/* Autoplay Browser Audio Unlock Banner */}
      {autoplayBlocked && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-cyan-500/40 bg-cyan-950/80 px-4 py-3 text-cyan-200 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-cyan-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-medium">
              Audio autoplay paused by browser security policy. Click to enable continuous voice streaming.
            </span>
          </div>
          <button
            onClick={onUnlockAudio}
            className="rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Arena Stage Control Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Execution Trigger */}
          {debate.status === 'idle' && (
            <button
              onClick={() => onStartDebate(debate.id)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-950 hover:opacity-90 transition active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Commence Debate</span>
            </button>
          )}

          {isLive && (
            <button
              onClick={() => onPauseDebate(debate.id)}
              className="flex items-center gap-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
            >
              <Pause className="h-4 w-4 fill-current" />
              <span>Pause Arena</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={() => onResumeDebate(debate.id)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Resume Stream</span>
            </button>
          )}

          {/* Interactive Step-by-Step Button */}
          {debate.mode === 'interactive' && !isCompleted && (
            <button
              onClick={() => onStepDebate(debate.id)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>Advance Turn</span>
            </button>
          )}

          {/* Stop / Conclude */}
          {(isLive || isPaused) && (
            <button
              onClick={() => onStopDebate(debate.id)}
              className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition"
            >
              Conclude
            </button>
          )}

          {/* Re-play Finished Audio */}
          {isCompleted && (
            <button
              onClick={handlePlayFullDebate}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                isAudioPlaying
                  ? 'bg-amber-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white hover:opacity-95 shadow-md shadow-cyan-950'
              }`}
            >
              {isAudioPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause Conversation</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play Full Debate Audio</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Action Tools: Full Transcript Drawer & Share */}
        <div className="flex items-center gap-2">
          {/* Transcript Trigger */}
          <button
            onClick={() => setIsTranscriptDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" />
            <span>Full Transcript</span>
            <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-400">
              {messages.length}
            </span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{copyFeedback ? 'Copied Link!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Progress Notification for Background Audio Synthesis */}
      {isGeneratingAudio && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin text-amber-400" />
              <span>Synthesizing Studio Audio with Gemini TTS ({readyAudioCount} / {messages.length} Turns Prepared)</span>
            </span>
            <span className="font-mono text-amber-400 font-bold">{audioProgressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
            <div
              style={{ width: `${audioProgressPct}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. THE MAIN STAGE ARENA (STANDING PODIUMS)               */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-8 shadow-2xl mb-8">
        {/* Atmospheric Stage Lighting, Volumetric Spotlights & Tiered Auditorium Silhouettes */}
        <StageBackground
          activeSpeakerSide={activeSpeakerSide}
          debater1Color={debater1.accentColor}
          debater2Color={debater2.accentColor}
          isSpeaking={isAudioPlaying || isLive}
          isLive={isLive}
        />

        {/* Grid Stage: Left Podium | Central Curved LED Screen | Right Podium */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* DEBATER 1 (LEFT PODIUM) */}
          <div className="lg:col-span-4 flex justify-center order-2 lg:order-1">
            <DebaterPodium
              speakerName={debater1.name}
              stanceTitle={debater1.position}
              philosophicalFramework={debater1.persona}
              modelBadge={debater1.modelId}
              accentColor={debater1.accentColor}
              avatarImageUrl={debater1.avatarUrl}
              isSpeaking={activeSpeakerSide === 'debater1' && (isLive || isAudioPlaying)}
              isThinking={isGeneratingTranscript && (messages.length % 2 === 0)}
              isListening={activeSpeakerSide === 'debater2'}
              frequencyData={activeSpeakerSide === 'debater1' ? audioAnalysis.frequencyData : new Array(16).fill(0)}
              totalStatements={messages.filter(m => m.speakerSide === 'debater1' || m.persona === 'atheist').length}
            />
          </div>

          {/* CENTRAL CURVED LED BACKDROP & TOPIC DISPLAY */}
          <div className="lg:col-span-4 flex flex-col items-center text-center order-1 lg:order-2 px-2">
            {/* Stage Emblem */}
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700/80 px-4 py-1 text-xs font-semibold text-slate-300 mb-4 shadow-lg backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono tracking-wider text-[11px] uppercase">
                AI DEBATE ARENA · MAIN STAGE
              </span>
            </div>

            {/* Curved LED Wall Digital Monitor */}
            <div className="w-full rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

              {/* Broadcast Phase Indicator */}
              <div className="relative z-10 flex items-center justify-center gap-1.5 mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  {displayedTurn ? displayedTurn.roundName : 'STAGE READY'}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {messages.length} / {debate.totalTurns} TURNS
                </span>
              </div>

              {/* Debate Core Topic */}
              <div className="relative z-10">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  {debate.title}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 italic line-clamp-3">
                  "{debate.topic}"
                </p>
              </div>

              {/* Live Status Ticker */}
              <div className="relative z-10 mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Stage Status:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isLive || isGeneratingTranscript
                        ? 'bg-rose-400 animate-ping'
                        : isAudioPlaying
                        ? 'bg-cyan-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>
                    {isGeneratingTranscript
                      ? 'Generating Text Stream...'
                      : isGeneratingAudio
                      ? 'Synthesizing Studio Audio...'
                      : isAudioPlaying
                      ? 'Voice Broadcast On Air'
                      : isLive
                      ? 'Live Arena In Progress'
                      : 'Stage Ready'}
                  </span>
                </span>
              </div>
            </div>

            {/* Quick Play Full Debate CTA when ready */}
            {hasPlayableAudio && !isAudioPlaying && (
              <button
                onClick={handlePlayFullDebate}
                className="mt-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-cyan-950 hover:scale-105 transition"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Full Debate Audio</span>
              </button>
            )}
          </div>

          {/* DEBATER 2 (RIGHT PODIUM) */}
          <div className="lg:col-span-4 flex justify-center order-3">
            <DebaterPodium
              speakerName={debater2.name}
              stanceTitle={debater2.position}
              philosophicalFramework={debater2.persona}
              modelBadge={debater2.modelId}
              accentColor={debater2.accentColor}
              avatarImageUrl={debater2.avatarUrl}
              isSpeaking={activeSpeakerSide === 'debater2' && (isLive || isAudioPlaying)}
              isThinking={isGeneratingTranscript && (messages.length % 2 === 1)}
              isListening={activeSpeakerSide === 'debater1'}
              frequencyData={activeSpeakerSide === 'debater2' ? audioAnalysis.frequencyData : new Array(16).fill(0)}
              totalStatements={messages.filter(m => m.speakerSide === 'debater2' || m.persona === 'believer').length}
            />
          </div>
        </div>

        {/* 3. Layered Stage Floor Reflection & Auditorium Silhouettes */}
        <div className="relative mt-8 pt-6 border-t border-slate-800/80">
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

          {/* Auditorium Crowd Silhouette Grid */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" />
              <span>Auditorium Gallery Connected · Live Community &amp; AI Jury</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span>{debater1.name}: <strong className="text-cyan-400 font-mono">{d1Votes} votes</strong></span>
              <span>·</span>
              <span>{debater2.name}: <strong className="text-amber-400 font-mono">{d2Votes} votes</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. STAGE-INTEGRATED ARGUMENT CAPTIONS TELEPROMPTER       */}
      {/* ======================================================== */}
      <div className="mb-8">
        <StageCaptions
          currentTurn={displayedTurn}
          turnNumber={currentTurnIdx + 1}
          totalTurns={messages.length || debate.totalTurns}
          hasPrevTurn={currentTurnIdx > 0}
          hasNextTurn={currentTurnIdx < messages.length - 1}
          onPrevTurn={() => setSelectedTurnIndex(Math.max(0, currentTurnIdx - 1))}
          onNextTurn={() => setSelectedTurnIndex(Math.min(messages.length - 1, currentTurnIdx + 1))}
          onOpenFullTranscript={() => setIsTranscriptDrawerOpen(true)}
          isPlayingThis={activePlayingMessageId === displayedTurn?.id && isAudioPlaying}
        />
      </div>

      {/* ======================================================== */}
      {/* 4. AUDIENCE PARTICIPATION, VOTING & AI JURY EVALUATION   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 cols): Live Community Voting & Jury Analysis */}
        <div className="lg:col-span-6 space-y-6">
          <VotingWidget
            debateId={debate.id}
            debater1Name={debater1.name}
            debater2Name={debater2.name}
            debater1Color={debater1.accentColor}
            debater2Color={debater2.accentColor}
            votes={debate.votes}
            userVotedSide={userVotedPersona}
            onCastVote={onCastVote}
            isDebateActive={isLive}
            summary={debate.summary}
          />

          {messages.length > 0 && <JuryScoreChart debate={debate} />}
        </div>

        {/* Right Column (6 cols): Audience Cross-Examination Questions */}
        <div className="lg:col-span-6 space-y-6">
          <AudienceQuestions
            debateId={debate.id}
            questions={debate.questions}
            onAddQuestion={onAddQuestion}
            isInteractiveMode={debate.mode === 'interactive'}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. SLIDE-OUT COMPLETE TRANSCRIPT DRAWER / MODAL         */}
      {/* ======================================================== */}
      {isTranscriptDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="relative h-full w-full max-w-2xl bg-slate-900 border-l sm:border border-slate-800 sm:rounded-3xl p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Full Verbatim Debate Transcript</h3>
              </div>
              <button
                onClick={() => setIsTranscriptDrawerOpen(false)}
                className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:text-white transition"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {messages.map((turn, tIdx) => {
                const isD1 = turn.speakerSide === 'debater1' || turn.persona === 'atheist';
                return (
                  <div
                    key={turn.id}
                    onClick={() => {
                      setSelectedTurnIndex(tIdx);
                      setIsTranscriptDrawerOpen(false);
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isD1
                        ? 'border-cyan-500/30 bg-cyan-950/15 hover:border-cyan-400'
                        : 'border-amber-500/30 bg-amber-950/15 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-bold ${isD1 ? 'text-cyan-400' : 'text-amber-400'}`}>
                        Turn #{tIdx + 1} • {turn.speakerName} ({turn.roundName})
                      </span>
                      {turn.audioStatus === 'ready' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <Volume2 className="h-3 w-3" />
                          <span>Voice Ready</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 font-semibold mb-1">{turn.mainClaim}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{turn.rawText}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
