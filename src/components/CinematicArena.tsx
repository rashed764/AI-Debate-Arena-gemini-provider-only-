import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  Users,
  Vote,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  HelpCircle,
  ExternalLink,
  Sliders,
  FolderOpen,
  Share2,
  Check,
  Activity
} from 'lucide-react';
import { Debate, DebateTurn, PersonaType, PlaybackMode, AccentColor } from '../types';
import { useAudioAnalyser, AudioAnalysis } from '../utils/useAudioAnalyser';
import { AudioVisualizerCanvas } from './AudioVisualizerCanvas';

interface CinematicArenaProps {
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
  onNavigateView?: (view: 'arena' | 'list' | 'settings') => void;
  onOpenCreateModal?: () => void;
  analyserNode?: AnalyserNode | null;
  audioAnalysis?: AudioAnalysis;
}

// Accent Color Theme Map
interface ColorTheme {
  primary: string;
  glow: string;
  glowRgba: string;
  badgeBg: string;
  textGlow: string;
  border: string;
  hex: string;
}

const COLOR_THEMES: Record<AccentColor, ColorTheme> = {
  cyan: {
    primary: '#06b6d4',
    glow: 'from-cyan-500/50 via-cyan-600/20 to-transparent',
    glowRgba: 'rgba(6, 182, 212, 0.75)',
    badgeBg: 'bg-cyan-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(6,182,212,0.85)] text-cyan-300',
    border: 'border-cyan-400',
    hex: '#06b6d4',
  },
  blue: {
    primary: '#3b82f6',
    glow: 'from-blue-500/50 via-blue-600/20 to-transparent',
    glowRgba: 'rgba(59, 130, 246, 0.75)',
    badgeBg: 'bg-blue-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(59,130,246,0.85)] text-blue-400',
    border: 'border-blue-400',
    hex: '#3b82f6',
  },
  indigo: {
    primary: '#6366f1',
    glow: 'from-indigo-500/50 via-indigo-600/20 to-transparent',
    glowRgba: 'rgba(99, 102, 241, 0.75)',
    badgeBg: 'bg-indigo-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(99,102,241,0.85)] text-indigo-400',
    border: 'border-indigo-400',
    hex: '#6366f1',
  },
  amber: {
    primary: '#f59e0b',
    glow: 'from-amber-500/50 via-amber-600/20 to-transparent',
    glowRgba: 'rgba(245, 158, 11, 0.75)',
    badgeBg: 'bg-amber-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(245,158,11,0.85)] text-amber-300',
    border: 'border-amber-400',
    hex: '#f59e0b',
  },
  rose: {
    primary: '#f43f5e',
    glow: 'from-rose-500/50 via-rose-600/20 to-transparent',
    glowRgba: 'rgba(244, 63, 94, 0.75)',
    badgeBg: 'bg-rose-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(244,63,94,0.85)] text-rose-400',
    border: 'border-rose-400',
    hex: '#f43f5e',
  },
  orange: {
    primary: '#f97316',
    glow: 'from-orange-500/50 via-orange-600/20 to-transparent',
    glowRgba: 'rgba(249, 115, 22, 0.75)',
    badgeBg: 'bg-orange-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(249,115,22,0.85)] text-orange-400',
    border: 'border-orange-400',
    hex: '#f97316',
  },
  emerald: {
    primary: '#10b981',
    glow: 'from-emerald-500/50 via-emerald-600/20 to-transparent',
    glowRgba: 'rgba(16, 185, 129, 0.75)',
    badgeBg: 'bg-emerald-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(16,185,129,0.85)] text-emerald-400',
    border: 'border-emerald-400',
    hex: '#10b981',
  },
  purple: {
    primary: '#a855f7',
    glow: 'from-purple-500/50 via-purple-600/20 to-transparent',
    glowRgba: 'rgba(168, 85, 247, 0.75)',
    badgeBg: 'bg-purple-600',
    textGlow: 'drop-shadow-[0_0_12px_rgba(168,85,247,0.85)] text-purple-400',
    border: 'border-purple-400',
    hex: '#a855f7',
  },
};

// Splits debate speech text into natural spoken sentence and phrase units for live subtitle tracking
function splitIntoSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  // Split on Bengali danda (।, ॥), period (.), question mark (?), exclamation (!), semicolon (;), or newline (\n)
  const rawSegments = text
    .split(/(?<=[।॥?!.\n;])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  // If a segment is very long (> 15 words), divide on commas or natural sub-clauses for tight audio sync
  const result: string[] = [];
  for (const seg of rawSegments) {
    const words = seg.split(/\s+/).filter(Boolean);
    if (words.length > 15) {
      const commaParts = seg.split(/(?<=[,，])\s+/);
      if (commaParts.length > 1) {
        for (const cp of commaParts) {
          const cpTrim = cp.trim();
          if (!cpTrim) continue;
          const cWords = cpTrim.split(/\s+/);
          if (cWords.length > 12) {
            for (let i = 0; i < cWords.length; i += 10) {
              result.push(cWords.slice(i, i + 10).join(' '));
            }
          } else {
            result.push(cpTrim);
          }
        }
      } else {
        for (let i = 0; i < words.length; i += 10) {
          result.push(words.slice(i, i + 10).join(' '));
        }
      }
    } else {
      result.push(seg);
    }
  }
  return result.length > 0 ? result : [text];
}

export const CinematicArena: React.FC<CinematicArenaProps> = ({
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
  onNavigateView,
  onOpenCreateModal,
  analyserNode: propAnalyserNode,
  audioAnalysis: propAudioAnalysis,
}) => {
  // Active slide-over drawer: 'transcript' | 'vote' | 'qa' | 'visualizer' | null
  const [activeDrawer, setActiveDrawer] = useState<'transcript' | 'vote' | 'qa' | 'visualizer' | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isExpandedSubtitle, setIsExpandedSubtitle] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Question submission form
  const [questionAuthor, setQuestionAuthor] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [isSubmittingQ, setIsSubmittingQ] = useState(false);
  const [qSubmittedMessage, setQSubmittedMessage] = useState(false);

  // Voting reasoning note
  const [voteReasoning, setVoteReasoning] = useState('');
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real-time audio analysis: use passed prop or internal hook
  const internalAudioAnalysis = useAudioAnalyser(audioElement || null, isAudioPlaying, false);
  const audioAnalysis = propAudioAnalysis || internalAudioAnalysis;
  const effectiveAnalyserNode = propAnalyserNode !== undefined ? propAnalyserNode : audioAnalysis.analyserNode;

  // High-precision audio timer calculation synced to audioElement
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120);

  useEffect(() => {
    if (!audioElement) return;

    let animId: number;
    let isTracking = false;

    const poll = () => {
      if (audioElement && !audioElement.paused && !audioElement.ended) {
        setCurrentTime(audioElement.currentTime || 0);
        if (audioElement.duration && isFinite(audioElement.duration) && !isNaN(audioElement.duration)) {
          setDuration(audioElement.duration);
        }
        animId = requestAnimationFrame(poll);
      } else {
        isTracking = false;
      }
    };

    const startTracking = () => {
      if (!isTracking) {
        isTracking = true;
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(poll);
      }
    };

    const stopTracking = () => {
      isTracking = false;
      cancelAnimationFrame(animId);
      if (audioElement) {
        setCurrentTime(audioElement.currentTime || 0);
      }
    };

    const handleTime = () => {
      setCurrentTime(audioElement.currentTime || 0);
      if (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
        setDuration(audioElement.duration);
      }
    };

    audioElement.addEventListener('timeupdate', handleTime);
    audioElement.addEventListener('loadedmetadata', handleTime);
    audioElement.addEventListener('play', startTracking);
    audioElement.addEventListener('playing', startTracking);
    audioElement.addEventListener('seeked', handleTime);
    audioElement.addEventListener('pause', stopTracking);
    audioElement.addEventListener('ended', stopTracking);

    if (!audioElement.paused && !audioElement.ended) {
      startTracking();
    }

    return () => {
      cancelAnimationFrame(animId);
      audioElement.removeEventListener('timeupdate', handleTime);
      audioElement.removeEventListener('loadedmetadata', handleTime);
      audioElement.removeEventListener('play', startTracking);
      audioElement.removeEventListener('playing', startTracking);
      audioElement.removeEventListener('seeked', handleTime);
      audioElement.removeEventListener('pause', stopTracking);
      audioElement.removeEventListener('ended', stopTracking);
    };
  }, [audioElement]);

  // Messages and turn tracking
  const messages = Array.isArray(debate?.messages) ? debate.messages : [];
  const activePlayingMessage = messages.find(m => m.id === activePlayingMessageId);
  const lastMessage = messages[messages.length - 1];

  // Follow active playback message or latest turn
  const currentTurn = activePlayingMessage || lastMessage || null;
  const currentTurnIndex = currentTurn ? messages.findIndex(m => m.id === currentTurn.id) : 0;

  // Active speaker side: 'debater1' | 'debater2' | null
  const activeSpeakerSide: 'debater1' | 'debater2' | null = activePlayingMessage
    ? activePlayingMessage.speakerSide || (activePlayingMessage.persona === 'believer' ? 'debater2' : 'debater1')
    : currentTurn && isAudioPlaying
    ? currentTurn.speakerSide || (currentTurn.persona === 'believer' ? 'debater2' : 'debater1')
    : null;

  // Speaker state flags
  const isSpeaking = isAudioPlaying && activeSpeakerSide !== null;
  const isDebater1Active = isSpeaking && activeSpeakerSide === 'debater1';
  const isDebater2Active = isSpeaking && activeSpeakerSide === 'debater2';

  // Fallback defaults for Debater Profiles
  const debater1 = debate?.debater1 || {
    id: 'debater1',
    name: 'Believer AI',
    position: 'Metaphysical Realism & Cosmic Purpose',
    persona: 'Philosophical scholar',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Fenrir',
    voiceStyle: 'Articulate and resonant',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH' as const,
    avatarUrl: '',
    accentColor: 'blue' as AccentColor,
  };

  const debater2 = debate?.debater2 || {
    id: 'debater2',
    name: 'Atheist AI',
    position: 'Naturalism & Empirical Parsimony',
    persona: 'Incisive analytical philosopher',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Kore',
    voiceStyle: 'Analytical and skeptical',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH' as const,
    avatarUrl: '',
    accentColor: 'rose' as AccentColor,
  };

  // Color profiles
  const d1Theme = COLOR_THEMES[debater1.accentColor || 'blue'] || COLOR_THEMES.blue;
  const d2Theme = COLOR_THEMES[debater2.accentColor || 'rose'] || COLOR_THEMES.rose;

  // Votes
  const d1Votes = debate?.votes?.debater1 ?? debate?.votes?.believer ?? 142;
  const d2Votes = debate?.votes?.debater2 ?? debate?.votes?.atheist ?? 150;

  // Remaining seconds countdown (formatted mm:ss)
  const remainingSeconds = Math.max(0, Math.ceil(duration - currentTime));
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const timerDisplay = isSpeaking ? formatTimer(remainingSeconds) : '00:06';

  // Full statement text for the active turn
  const fullStatementText =
    currentTurn?.rawText ||
    currentTurn?.mainClaim ||
    (currentTurn?.reasoning && currentTurn.reasoning.length > 0 ? currentTurn.reasoning.join(' ') : '') ||
    (debate?.topic ? `TOPIC: ${debate.topic}` : 'AWAITING STATEMENT GENERATION IN THE ARENA...');

  // Live sentence segmentation across Bengali, English, or any language
  const subtitleSentences = useMemo(() => splitIntoSentences(fullStatementText), [fullStatementText]);

  // Audio progress through the current statement (0 to 1)
  const statementProgress = useMemo(() => {
    if (!duration || duration <= 0 || !isFinite(duration)) return 0;
    return Math.min(0.999, Math.max(0, currentTime / duration));
  }, [currentTime, duration]);

  // Precompute sentence timing brackets based on word and character length
  // This accurately reflects actual spoken duration instead of assuming equal sentence lengths
  const sentenceTimings = useMemo(() => {
    if (!subtitleSentences || subtitleSentences.length === 0) return [];
    
    // Weight each sentence: word count + character count + punctuation pause
    const weights = subtitleSentences.map(sent => {
      const words = sent.split(/\s+/).filter(Boolean).length;
      const chars = sent.length;
      return Math.max(10, words * 7 + chars * 1.2);
    });

    const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;

    let cumulative = 0;
    return weights.map((w, idx) => {
      const startRatio = cumulative / totalWeight;
      cumulative += w;
      const endRatio = idx === weights.length - 1 ? 1.0 : cumulative / totalWeight;
      return { startRatio, endRatio };
    });
  }, [subtitleSentences]);

  // Active sentence index dynamically tracking the speaker's vocal progression
  // Incorporates 0.35s anticipation lead so subtitle appears right on vocal onset (never late)
  const activeSentenceIndex = useMemo(() => {
    if (!isSpeaking || subtitleSentences.length <= 1 || !duration || duration <= 0) return 0;

    const leadSeconds = 0.35;
    const effectiveTime = Math.min(duration, currentTime + leadSeconds);
    const progress = Math.min(0.999, Math.max(0, effectiveTime / duration));

    for (let i = 0; i < sentenceTimings.length; i++) {
      if (progress < sentenceTimings[i].endRatio || i === sentenceTimings.length - 1) {
        return i;
      }
    }
    return 0;
  }, [isSpeaking, subtitleSentences.length, duration, currentTime, sentenceTimings]);

  const activeSpokenSentence = subtitleSentences[activeSentenceIndex] || fullStatementText;
  const nextSpokenSentence = subtitleSentences[activeSentenceIndex + 1] || null;

  // Turn navigation
  const handlePrevTurn = () => {
    if (currentTurnIndex > 0 && messages[currentTurnIndex - 1]) {
      onPlayMessageAudio(messages[currentTurnIndex - 1], true);
    }
  };

  const handleNextTurn = () => {
    if (currentTurnIndex < messages.length - 1 && messages[currentTurnIndex + 1]) {
      onPlayMessageAudio(messages[currentTurnIndex + 1], true);
    }
  };

  // Auto-hide controls after inactivity
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      // Keep controls visible if a drawer is open or debate is idle
      if (!activeDrawer && isAudioPlaying) {
        setShowControls(false);
      }
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || isSubmittingQ) return;
    setIsSubmittingQ(true);
    try {
      await onAddQuestion(questionAuthor.trim() || 'Audience Member', questionText.trim());
      setQuestionText('');
      setQSubmittedMessage(true);
      setTimeout(() => setQSubmittedMessage(false), 4000);
    } finally {
      setIsSubmittingQ(false);
    }
  };

  const handleVoteSubmit = async (side: 'debater1' | 'debater2') => {
    if (isSubmittingVote) return;
    setIsSubmittingVote(true);
    try {
      await onCastVote(side, voteReasoning.trim() || undefined);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Audio Equalizer bars values
  const leftFreq = isDebater1Active ? audioAnalysis.frequencyData : new Array(16).fill(0);
  const rightFreq = isDebater2Active ? audioAnalysis.frequencyData : new Array(16).fill(0);

  return (
    <div
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="fixed inset-0 w-screen h-[100dvh] overflow-hidden select-none bg-[#030614] flex flex-col justify-between font-sans text-slate-100 z-10"
    >
      {/* ======================================================== */}
      {/* 1. CINEMATIC BACKGROUND: THEATER GRID & DYNAMIC LIGHTS   */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle Dark Studio Grid Pattern (matches YouTube reference) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b14_1px,transparent_1px),linear-gradient(to_bottom,#1e293b14_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />

        {/* Deep Atmospheric Radial Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(15,23,42,0.1)_0%,rgba(3,6,20,0.85)_75%,rgba(2,4,14,1)_100%)]" />

        {/* ------------------------------------------------------ */}
        {/* LEFT VOLUMETRIC SPOTLIGHT & RADIAL BACKLIGHT (DEBATER 1) */}
        {/* ------------------------------------------------------ */}
        <div
          style={{
            background: `radial-gradient(circle at 25% 65%, ${d1Theme.glowRgba} 0%, rgba(15, 23, 42, 0) 65%)`,
            filter: 'blur(70px)',
          }}
          className={`absolute -top-10 -left-10 w-[70vw] sm:w-[50vw] h-[90vh] transition-all duration-1000 transform ${
            isDebater1Active
              ? 'opacity-95 scale-110 animate-breathing-glow'
              : isDebater2Active
              ? 'opacity-10 scale-95'
              : 'opacity-25 scale-100'
          }`}
        />

        {/* Overhead Volumetric Cone Beam Left */}
        <div
          style={{
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            background: `linear-gradient(to bottom, ${d1Theme.glowRgba}, transparent)`,
            filter: 'blur(35px)',
          }}
          className={`absolute -top-20 left-[10%] w-[320px] h-[580px] transform -rotate-15 origin-top transition-all duration-700 ${
            isDebater1Active ? 'opacity-85 scale-105' : 'opacity-10'
          }`}
        />

        {/* ------------------------------------------------------ */}
        {/* RIGHT VOLUMETRIC SPOTLIGHT & RADIAL BACKLIGHT (DEBATER 2) */}
        {/* ------------------------------------------------------ */}
        <div
          style={{
            background: `radial-gradient(circle at 75% 65%, ${d2Theme.glowRgba} 0%, rgba(15, 23, 42, 0) 65%)`,
            filter: 'blur(70px)',
          }}
          className={`absolute -top-10 -right-10 w-[70vw] sm:w-[50vw] h-[90vh] transition-all duration-1000 transform ${
            isDebater2Active
              ? 'opacity-95 scale-110 animate-breathing-glow'
              : isDebater1Active
              ? 'opacity-10 scale-95'
              : 'opacity-25 scale-100'
          }`}
        />

        {/* Overhead Volumetric Cone Beam Right */}
        <div
          style={{
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            background: `linear-gradient(to bottom, ${d2Theme.glowRgba}, transparent)`,
            filter: 'blur(35px)',
          }}
          className={`absolute -top-20 right-[10%] w-[320px] h-[580px] transform rotate-15 origin-top transition-all duration-700 ${
            isDebater2Active ? 'opacity-85 scale-105' : 'opacity-10'
          }`}
        />

        {/* ------------------------------------------------------ */}
        {/* AMPHITHEATER AUDIENCE SILHOUETTES IN THE BACKGROUND    */}
        {/* ------------------------------------------------------ */}
        <div className="absolute bottom-0 inset-x-0 h-[38vh] flex flex-col justify-end overflow-hidden">
          {/* Back Tier (Distant Rows) */}
          <div className="relative w-full h-16 opacity-30">
            <svg className="w-full h-full fill-slate-800" viewBox="0 0 1200 60" preserveAspectRatio="none">
              {Array.from({ length: 42 }).map((_, i) => (
                <circle key={`bg-head-${i}`} cx={20 + i * 28.5} cy={22 + (i % 3) * 4} r={9} />
              ))}
              {Array.from({ length: 42 }).map((_, i) => (
                <path
                  key={`bg-body-${i}`}
                  d={`M ${8 + i * 28.5},60 Q ${20 + i * 28.5},32 ${32 + i * 28.5},60 Z`}
                />
              ))}
            </svg>
          </div>

          {/* Mid Tier (Main Stadium Arc) with dynamic side lighting wash */}
          <div className="relative w-full h-24 opacity-60">
            <svg className="w-full h-full fill-slate-900" viewBox="0 0 1200 80" preserveAspectRatio="none">
              {Array.from({ length: 34 }).map((_, i) => (
                <circle key={`mid-head-${i}`} cx={25 + i * 35} cy={28 + (i % 2) * 5} r={12} />
              ))}
              {Array.from({ length: 34 }).map((_, i) => (
                <path
                  key={`mid-body-${i}`}
                  d={`M ${10 + i * 35},80 Q ${25 + i * 35},42 ${40 + i * 35},80 Z`}
                />
              ))}
            </svg>
          </div>

          {/* Front Tier Silhouettes (Nearest Stage Perimeter) */}
          <div className="relative w-full h-28 opacity-90">
            <svg className="w-full h-full fill-slate-950" viewBox="0 0 1200 100" preserveAspectRatio="none">
              {Array.from({ length: 26 }).map((_, i) => (
                <circle key={`fg-head-${i}`} cx={35 + i * 46} cy={35 + (i % 3) * 6} r={16} />
              ))}
              {Array.from({ length: 26 }).map((_, i) => (
                <path
                  key={`fg-body-${i}`}
                  d={`M ${12 + i * 46},100 Q ${35 + i * 46},54 ${58 + i * 46},100 Z`}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Circular Illuminated Stage Platform in Center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[72vw] sm:w-[60vw] max-w-[850px] h-28 sm:h-36 rounded-[50%] bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border-t border-slate-600/40 shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
          {/* Specular Edge Gloss */}
          <div className="absolute inset-x-6 top-1 h-3 rounded-[50%] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          {/* Floor Reflection Pools */}
          <div
            className={`absolute bottom-3 left-1/4 w-44 h-8 rounded-full blur-xl transition-all duration-700 ${
              isDebater1Active ? 'bg-cyan-500/40 opacity-100 scale-110' : 'bg-transparent opacity-0'
            }`}
          />
          <div
            className={`absolute bottom-3 right-1/4 w-44 h-8 rounded-full blur-xl transition-all duration-700 ${
              isDebater2Active ? 'bg-rose-500/40 opacity-100 scale-110' : 'bg-transparent opacity-0'
            }`}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP TELECAST HUD & SUBTITLE CAPSULE                   */}
      {/* ======================================================== */}
      <header className="relative z-20 pt-3 sm:pt-5 px-4 sm:px-10 flex flex-col items-center">
        {/* Discreet Top Navigation Bar */}
        <div className="w-full flex items-center justify-between max-w-5xl mb-2 text-xs">
          <div className="flex items-center gap-2">
            {onNavigateView && (
              <button
                onClick={() => onNavigateView('list')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1 font-semibold text-slate-300 hover:text-white hover:bg-slate-850 backdrop-blur-md transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Debates Directory</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onNavigateView && (
              <button
                onClick={() => onNavigateView('settings')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1 font-semibold text-slate-300 hover:text-white hover:bg-slate-850 backdrop-blur-md transition"
              >
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">AI Profiles</span>
              </button>
            )}

            {onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1 font-bold text-white shadow-md shadow-cyan-950 hover:from-cyan-500 hover:to-blue-500 transition active:scale-95"
              >
                <span>+ New</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Header Row: Left Score | Center Debater Labels | Right Timer & Score */}
        <div className="w-full flex items-center justify-between max-w-5xl">
          {/* Left Pill: Debater 1 Score (Matches Blue 142 in reference) */}
          <div
            title={`${debater1.name} Community Score`}
            className="flex items-center justify-center rounded-2xl bg-[#1e3a8a]/90 border border-blue-400/40 px-5 sm:px-7 py-2 sm:py-2.5 shadow-xl shadow-blue-950/60 backdrop-blur-md transition-transform hover:scale-105"
          >
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wider font-mono">
              {d1Votes}
            </span>
          </div>

          {/* Center Debater Title Header: e.g. BELIEVER & ATHEIST */}
          <div className="flex items-center gap-4 sm:gap-8 px-2">
            <span
              className={`text-lg sm:text-2xl md:text-3xl font-black tracking-widest uppercase transition-all duration-500 ${
                isDebater1Active
                  ? `${d1Theme.textGlow} scale-105`
                  : 'text-blue-500/70 hover:text-blue-400'
              }`}
            >
              {debater1.name.replace(/\s+AI$/i, '') || 'BELIEVER'}
            </span>

            <span className="text-slate-600 font-black text-sm sm:text-lg select-none">VS</span>

            <span
              className={`text-lg sm:text-2xl md:text-3xl font-black tracking-widest uppercase transition-all duration-500 ${
                isDebater2Active
                  ? `${d2Theme.textGlow} scale-105`
                  : 'text-rose-500/70 hover:text-rose-400'
              }`}
            >
              {debater2.name.replace(/\s+AI$/i, '') || 'ATHEIST'}
            </span>
          </div>

          {/* Right Pill: Timer Countdown & Debater 2 Score (Matches Red 00:06 150) */}
          <div
            title={`${debater2.name} Community Score`}
            className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-[#991b1b]/90 border border-rose-400/40 px-4 sm:px-6 py-2 sm:py-2.5 shadow-xl shadow-rose-950/60 backdrop-blur-md transition-transform hover:scale-105"
          >
            <span className="text-xs sm:text-sm font-bold text-rose-200 font-mono tracking-tight">
              {timerDisplay}
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wider font-mono">
              {d2Votes}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------ */}
        {/* TOP-CENTER SUBTITLE CAPSULE (Matches YouTube reference) */}
        {/* ------------------------------------------------------ */}
        <div className="mt-3 sm:mt-5 w-full max-w-2xl px-2">
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/20 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-7 py-3 sm:py-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] text-center transition-all duration-300">
            {/* Active Round & Speaker Tag */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
              <span
                className={`h-2 w-2 rounded-full ${
                  isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                }`}
              />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300">
                {currentTurn?.roundName || 'ACTIVE DEBATE TURN'}
              </span>
              <span className="text-slate-600">·</span>
              <span className={`text-[10px] sm:text-xs font-bold ${activeSpeakerSide === 'debater1' ? 'text-cyan-400' : 'text-rose-400'}`}>
                {currentTurn?.speakerName || (activeSpeakerSide === 'debater1' ? debater1.name : debater2.name)}
              </span>
              {isSpeaking && subtitleSentences.length > 1 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                    Line {activeSentenceIndex + 1}/{subtitleSentences.length}
                  </span>
                </>
              )}
              {/* Full Statement Toggle */}
              <button
                type="button"
                onClick={() => setIsExpandedSubtitle(!isExpandedSubtitle)}
                className="ml-1 text-[10px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                title="Toggle Full Statement View"
              >
                {isExpandedSubtitle ? 'Live Line' : 'Full Statement'}
              </button>
            </div>

            {/* Prominent Live Subtitle Dialogue */}
            {isExpandedSubtitle ? (
              <div className="max-h-36 overflow-y-auto text-left px-2 py-1 space-y-1 rounded-xl bg-slate-900/60 border border-slate-800 my-1">
                {subtitleSentences.map((sent, sIdx) => {
                  const isCurrentSentence = isSpeaking && sIdx === activeSentenceIndex;
                  return (
                    <span
                      key={`sent-${sIdx}`}
                      className={`inline text-xs sm:text-sm leading-relaxed transition-colors duration-200 ${
                        isCurrentSentence
                          ? `${activeSpeakerSide === 'debater1' ? 'text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-500/50' : 'text-rose-300 font-bold bg-rose-950/80 border border-rose-500/50'} px-1.5 py-0.5 rounded shadow-sm`
                          : sIdx < activeSentenceIndex
                          ? 'text-slate-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {sent}{' '}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-white text-sm sm:text-base md:text-lg font-bold tracking-wide leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-all duration-200">
                "{activeSpokenSentence}"
              </p>
            )}

            {/* Real-time Voice Progression Bar */}
            {isSpeaking && (
              <div className="mt-2 w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
                <div
                  style={{
                    width: `${Math.round(statementProgress * 100)}%`,
                    backgroundColor: activeSpeakerSide === 'debater1' ? d1Theme.primary : d2Theme.primary,
                  }}
                  className="h-full transition-all duration-200 shadow-[0_0_8px_currentColor]"
                />
              </div>
            )}

            {/* Mobile Audio Visualizer Band */}
            <div className="mt-2.5 md:hidden">
              <AudioVisualizerCanvas
                analyserNode={effectiveAnalyserNode}
                isPlaying={isAudioPlaying}
                activeSpeakerSide={activeSpeakerSide}
                speakerName={
                  activeSpeakerSide === 'debater1'
                    ? debater1.name
                    : activeSpeakerSide === 'debater2'
                    ? debater2.name
                    : 'Debate Stage'
                }
                accentColor={
                  activeSpeakerSide === 'debater1'
                    ? d1Theme.primary
                    : activeSpeakerSide === 'debater2'
                    ? d2Theme.primary
                    : '#38bdf8'
                }
                height={52}
                initialMode="oscilloscope"
                showControls={false}
                showTelemetry={false}
                className="bg-slate-900/50 border-slate-800/60"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. CENTER STAGE: 3D SEATED DEBATERS & ARMCHAIRS          */}
      {/* ======================================================== */}
      <main className="relative z-10 flex-1 flex items-end justify-between px-2 sm:px-8 md:px-14 pb-14 sm:pb-16 max-w-7xl mx-auto w-full">
        {/* ------------------------------------------------------ */}
        {/* LEFT EQUALIZER COLUMN (TELEMETRY DOT-MATRIX LED BARS)  */}
        {/* ------------------------------------------------------ */}
        <div className="hidden md:flex flex-col items-center gap-2 pb-10">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-950/80 border border-slate-800">
            {Array.from({ length: 16 }).map((_, i) => {
              const active = isDebater1Active && leftFreq[i] > 25;
              return (
                <div
                  key={`dot-l-${i}`}
                  className={`w-2 h-2 rounded-xs transition-colors duration-150 ${
                    active ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800/80'
                  }`}
                />
              );
            })}
          </div>
          {/* Vertical Level Bar */}
          <div className="w-1.5 h-20 rounded-full bg-slate-800 overflow-hidden flex flex-col justify-end">
            <div
              style={{
                height: `${isDebater1Active ? Math.min(100, Math.max(10, audioAnalysis.volumeLevel * 1.5)) : 10}%`,
              }}
              className="w-full bg-cyan-400 transition-all duration-100 shadow-[0_0_10px_#06b6d4]"
            />
          </div>
        </div>

        {/* ------------------------------------------------------ */}
        {/* LEFT DEBATER: SEATED IN MODERN ARMCHAIR (DEBATER 1)    */}
        {/* ------------------------------------------------------ */}
        <div className="relative flex flex-col items-center flex-1 max-w-[340px] sm:max-w-[420px]">
          {/* Ambient Lighting Behind Portrait */}
          <div
            style={{
              background: `radial-gradient(circle, ${d1Theme.glowRgba} 0%, transparent 70%)`,
            }}
            className={`absolute -inset-10 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
              isDebater1Active ? 'opacity-95 scale-110 animate-breathing-glow' : 'opacity-20 scale-90'
            }`}
          />

          {/* Debater Character & Armchair Container */}
          <div
            className={`relative w-48 sm:w-64 md:w-80 h-56 sm:h-72 md:h-88 transition-transform duration-700 ${
              isDebater1Active ? 'scale-105 animate-subtle-nod' : 'scale-100'
            }`}
          >
            {/* SVG Seated Debater 1 in Modern Armchair */}
            <svg
              viewBox="0 0 200 220"
              className="w-full h-full drop-shadow-[0_20px_25px_rgba(0,0,0,0.85)] overflow-visible"
            >
              <defs>
                <linearGradient id="chair1Grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="60%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="d1Attire" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="skin1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#fba04b" />
                </linearGradient>
              </defs>

              {/* Backrest of Modern Armchair */}
              <polygon
                points="30,60 135,60 145,160 20,160"
                fill="url(#chair1Grad)"
                stroke="#334155"
                strokeWidth="2"
              />
              {/* Outer Left Armrest */}
              <polygon
                points="15,95 38,90 38,175 15,170"
                fill="#0f172a"
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* Seated Debater 1 Torso (Light Blue Attire) */}
              <path
                d="M 52,90 Q 85,82 118,90 L 126,155 Q 85,160 46,155 Z"
                fill="url(#d1Attire)"
              />

              {/* Neck & Head */}
              <circle cx="85" cy="54" r="17" fill="url(#skin1)" />
              {/* Styled Hair Profile */}
              <path
                d="M 70,52 Q 85,30 102,48 Q 94,38 78,42 Z"
                fill="#1e1b4b"
              />

              {/* Arms resting on lap / armrest */}
              <path
                d="M 52,96 Q 36,115 50,145 L 62,148 Q 48,122 60,98 Z"
                fill="#0284c7"
              />
              <path
                d="M 116,96 Q 130,115 120,146 L 108,148 Q 118,122 108,98 Z"
                fill="#0284c7"
              />
              {/* Hands */}
              <circle cx="56" cy="148" r="6.5" fill="url(#skin1)" />
              <circle cx="114" cy="148" r="6.5" fill="url(#skin1)" />

              {/* Seated Legs & Pants */}
              <path d="M 52,152 L 55,190 L 72,190 L 75,152 Z" fill="#0f172a" />
              <path d="M 92,152 L 95,190 L 112,190 L 115,152 Z" fill="#0f172a" />
              {/* Shoes */}
              <ellipse cx="62" cy="195" rx="12" ry="5" fill="#f8fafc" />
              <ellipse cx="106" cy="195" rx="12" ry="5" fill="#f8fafc" />

              {/* Inner Right Armrest */}
              <polygon
                points="128,90 152,95 146,170 124,172"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Debater 1 Stance Label Pill */}
          <div className="mt-2 text-center max-w-[280px]">
            <span
              title={debater1.position}
              className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-cyan-400 drop-shadow-md block truncate"
            >
              {debater1.position}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------ */}
        {/* CENTER STAGE: REAL-TIME CANVAS AUDIO VISUALIZER HUD    */}
        {/* ------------------------------------------------------ */}
        <div className="hidden md:flex flex-col items-center justify-end flex-1 max-w-xs lg:max-w-md mx-2 sm:mx-4 pb-4 z-20">
          <AudioVisualizerCanvas
            analyserNode={effectiveAnalyserNode}
            isPlaying={isAudioPlaying}
            activeSpeakerSide={activeSpeakerSide}
            speakerName={
              activeSpeakerSide === 'debater1'
                ? debater1.name
                : activeSpeakerSide === 'debater2'
                ? debater2.name
                : 'Debate Stage Ambient'
            }
            accentColor={
              activeSpeakerSide === 'debater1'
                ? d1Theme.primary
                : activeSpeakerSide === 'debater2'
                ? d2Theme.primary
                : '#38bdf8'
            }
            secondaryColor={
              activeSpeakerSide === 'debater1'
                ? '#38bdf8'
                : activeSpeakerSide === 'debater2'
                ? '#f97316'
                : '#818cf8'
            }
            height={118}
            initialMode="dual"
            className="w-full border-slate-700/70 shadow-[0_12px_32px_rgba(0,0,0,0.85)]"
          />
        </div>

        {/* ------------------------------------------------------ */}
        {/* RIGHT DEBATER: SEATED IN MODERN ARMCHAIR (DEBATER 2)   */}
        {/* ------------------------------------------------------ */}
        <div className="relative flex flex-col items-center flex-1 max-w-[340px] sm:max-w-[420px]">
          {/* Ambient Lighting Behind Portrait */}
          <div
            style={{
              background: `radial-gradient(circle, ${d2Theme.glowRgba} 0%, transparent 70%)`,
            }}
            className={`absolute -inset-10 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
              isDebater2Active ? 'opacity-95 scale-110 animate-breathing-glow' : 'opacity-20 scale-90'
            }`}
          />

          {/* Debater Character & Armchair Container */}
          <div
            className={`relative w-48 sm:w-64 md:w-80 h-56 sm:h-72 md:h-88 transition-transform duration-700 ${
              isDebater2Active ? 'scale-105 animate-subtle-nod' : 'scale-100'
            }`}
          >
            {/* SVG Seated Debater 2 in Modern Armchair with Speech Gestures */}
            <svg
              viewBox="0 0 200 220"
              className="w-full h-full drop-shadow-[0_20px_25px_rgba(0,0,0,0.85)] overflow-visible"
            >
              <defs>
                <linearGradient id="chair2Grad" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="60%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="d2Attire" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="skin2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>

              {/* Backrest of Modern Armchair */}
              <polygon
                points="170,60 65,60 55,160 180,160"
                fill="url(#chair2Grad)"
                stroke="#334155"
                strokeWidth="2"
              />
              {/* Outer Right Armrest */}
              <polygon
                points="185,95 162,90 162,175 185,170"
                fill="#0f172a"
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* Seated Debater 2 Torso (Red Attire - Matches Atheist in reference) */}
              <path
                d="M 148,90 Q 115,82 82,90 L 74,155 Q 115,160 154,155 Z"
                fill="url(#d2Attire)"
              />

              {/* Neck & Head */}
              <circle cx="115" cy="54" r="17" fill="url(#skin2)" />
              {/* Short Styled Hair */}
              <path
                d="M 130,52 Q 115,30 98,48 Q 106,38 122,42 Z"
                fill="#18181b"
              />

              {/* Gesturing Arms (Speaking toward opponent) */}
              <path
                d="M 148,96 Q 164,115 142,142 L 132,138 Q 146,118 140,98 Z"
                fill="#b91c1c"
              />
              <path
                d="M 84,96 Q 66,112 80,140 L 92,136 Q 78,118 84,98 Z"
                fill="#b91c1c"
              />
              {/* Gesturing Hands */}
              <circle cx="134" cy="140" r="6.5" fill="url(#skin2)" />
              <circle cx="86" cy="138" r="6.5" fill="url(#skin2)" />

              {/* Seated Legs & Pants */}
              <path d="M 148,152 L 145,190 L 128,190 L 125,152 Z" fill="#0f172a" />
              <path d="M 108,152 L 105,190 L 88,190 L 85,152 Z" fill="#0f172a" />
              {/* Shoes */}
              <ellipse cx="138" cy="195" rx="12" ry="5" fill="#1e293b" />
              <ellipse cx="94" cy="195" rx="12" ry="5" fill="#1e293b" />

              {/* Inner Left Armrest */}
              <polygon
                points="72,90 48,95 54,170 76,172"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Debater 2 Stance Label Pill */}
          <div className="mt-2 text-center max-w-[280px]">
            <span
              title={debater2.position}
              className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-rose-400 drop-shadow-md block truncate"
            >
              {debater2.position}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------ */}
        {/* RIGHT EQUALIZER COLUMN & LIVING STONE SEAL             */}
        {/* ------------------------------------------------------ */}
        <div className="hidden md:flex flex-col items-center gap-2 pb-10">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-950/80 border border-slate-800">
            {Array.from({ length: 16 }).map((_, i) => {
              const active = isDebater2Active && rightFreq[i] > 25;
              return (
                <div
                  key={`dot-r-${i}`}
                  className={`w-2 h-2 rounded-xs transition-colors duration-150 ${
                    active ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-slate-800/80'
                  }`}
                />
              );
            })}
          </div>
          {/* Vertical Level Bar */}
          <div className="w-1.5 h-20 rounded-full bg-slate-800 overflow-hidden flex flex-col justify-end">
            <div
              style={{
                height: `${isDebater2Active ? Math.min(100, Math.max(10, audioAnalysis.volumeLevel * 1.5)) : 10}%`,
              }}
              className="w-full bg-rose-500 transition-all duration-100 shadow-[0_0_10px_#f43f5e]"
            />
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 4. LIVING STONE EMBLEM MEDALLION (BOTTOM RIGHT)          */}
      {/* ======================================================== */}
      <div
        title="Living Stone AI Debate Arena"
        className="absolute bottom-5 right-5 sm:bottom-7 sm:right-7 z-20 flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full border-2 border-orange-500/80 bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 shadow-[0_0_20px_rgba(249,115,22,0.6)] cursor-pointer hover:scale-105 transition"
      >
        {/* Dual Faces Debate Silhouette Icon */}
        <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7 fill-white">
          <path d="M12 2C8.5 2 6 4.5 6 8c0 2.5 1.5 4.5 3.5 5.5V17c0 .6.4 1 1 1h3c.6 0 1-.4 1-1v-3.5c2-1 3.5-3 3.5-5.5 0-3.5-2.5-6-6-6zm-1 14h-1v-2.2c-.8-.4-1.5-1-2-1.8.8.6 1.8 1 3 1v3zm3 0h-1v-3c1.2 0 2.2-.4 3-1-.5.8-1.2 1.4-2 1.8V16z" />
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 5. MINIMAL FLOATING CONTROL DOCK (BOTTOM CENTER)         */}
      {/* ======================================================== */}
      <footer
        className={`fixed bottom-3 sm:bottom-5 inset-x-0 z-30 flex justify-center px-4 transition-all duration-500 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-30 hover:opacity-100 translate-y-1'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-full border border-slate-700/80 bg-slate-950/80 backdrop-blur-xl px-4 py-2 sm:px-6 sm:py-2.5 shadow-2xl">
          {/* Previous Turn */}
          <button
            onClick={handlePrevTurn}
            disabled={currentTurnIndex <= 0}
            className="p-1.5 rounded-full text-slate-400 hover:text-white disabled:opacity-30 transition"
            title="Previous Statement"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Primary Play/Pause Debate */}
          <button
            onClick={() => {
              if (isAudioPlaying) {
                onPauseMessageAudio();
              } else if (messages.length > 0) {
                const target = activePlayingMessage || messages[currentTurnIndex] || messages[0];
                onPlayMessageAudio(target, true);
              } else if (debate?.status === 'idle') {
                onStartDebate(debate.id);
              }
            }}
            className={`flex items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs font-black tracking-wide text-white shadow-lg transition active:scale-95 ${
              isAudioPlaying
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-950'
            }`}
          >
            {isAudioPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{messages.length > 0 ? 'PLAY AUDIO' : 'COMMENCE'}</span>
              </>
            )}
          </button>

          {/* Next Turn */}
          <button
            onClick={handleNextTurn}
            disabled={currentTurnIndex >= messages.length - 1}
            className="p-1.5 rounded-full text-slate-400 hover:text-white disabled:opacity-30 transition"
            title="Next Statement"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Step Next Turn (Interactive Mode) */}
          {debate?.mode === 'interactive' && debate?.status !== 'completed' && (
            <button
              onClick={() => onStepDebate(debate.id)}
              className="flex items-center gap-1 rounded-full bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition"
              title="Generate Next Turn"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Next Turn</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Drawer Toggles: Transcript */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'transcript' ? null : 'transcript')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeDrawer === 'transcript'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Transcript</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono">
              {messages.length}
            </span>
          </button>

          {/* Drawer Toggles: Community Vote */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'vote' ? null : 'vote')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeDrawer === 'vote'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Vote className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Vote</span>
          </button>

          {/* Drawer Toggles: Audience Q&A */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'qa' ? null : 'qa')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeDrawer === 'qa'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-950'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Q&A</span>
          </button>

          {/* Drawer Toggles: Live Acoustic Visualizer */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'visualizer' ? null : 'visualizer')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeDrawer === 'visualizer'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visualizer</span>
          </button>

          {/* Quick Exit to Debates List */}
          {onNavigateView && (
            <button
              onClick={() => onNavigateView('list')}
              className="p-1.5 rounded-full text-slate-400 hover:text-white transition"
              title="All Debates Directory"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-full text-slate-400 hover:text-white transition"
            title="Share Debate Link"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 6. SLIDE-OVER DRAWERS: TRANSCRIPT / VOTING / Q&A         */}
      {/* ======================================================== */}
      {activeDrawer && (
        <aside className="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[460px] bg-slate-950/95 border-l border-slate-800 shadow-2xl backdrop-blur-2xl flex flex-col transition-transform animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              {activeDrawer === 'transcript' && <FileText className="h-4 w-4 text-cyan-400" />}
              {activeDrawer === 'vote' && <Vote className="h-4 w-4 text-amber-400" />}
              {activeDrawer === 'qa' && <Users className="h-4 w-4 text-indigo-400" />}
              {activeDrawer === 'visualizer' && <Activity className="h-4 w-4 text-emerald-400" />}
              <h3 className="font-extrabold text-sm sm:text-base text-white uppercase tracking-wider">
                {activeDrawer === 'transcript' && 'Full Debate Transcript'}
                {activeDrawer === 'vote' && 'Audience Verdict & Voting'}
                {activeDrawer === 'qa' && 'Audience Cross-Examination'}
                {activeDrawer === 'visualizer' && 'Live Acoustic Spectrogram & Voice Telemetry'}
              </h3>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body: TRANSCRIPT */}
          {activeDrawer === 'transcript' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No statements recorded yet. Click "PLAY AUDIO" or "COMMENCE" to begin.
                </div>
              ) : (
                messages.map((turn, idx) => {
                  const isCurrent = turn.id === activePlayingMessageId;
                  const isD1 = turn.speakerSide === 'debater1' || turn.persona === 'believer';
                  return (
                    <div
                      key={turn.id}
                      onClick={() => onPlayMessageAudio(turn, true)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isCurrent
                          ? isD1
                            ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-950/50'
                            : 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/50'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-[11px]">
                        <span
                          className={`font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isD1 ? 'text-blue-400' : 'text-rose-400'
                          }`}
                        >
                          {isCurrent && isAudioPlaying && (
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                          )}
                          {turn.speakerName}
                        </span>
                        <div className="flex items-center gap-2">
                          {isCurrent && isAudioPlaying && (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                              LIVE VOICE SYNC
                            </span>
                          )}
                          <span className="text-slate-500 font-mono">Turn #{idx + 1}</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                        {turn.rawText}
                      </p>
                      {isCurrent && isAudioPlaying && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/85 border border-slate-700/80 text-xs shadow-inner">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 block mb-0.5">
                            ACTIVE SPOKEN SUBTITLE:
                          </span>
                          <p className="text-white font-semibold italic leading-relaxed">
                            "{activeSpokenSentence}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Drawer Body: COMMUNITY VOTING */}
          {activeDrawer === 'vote' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Cast Your Audience Ballot
                </h4>
                <p className="text-xs text-slate-300">
                  Which position demonstrated superior logical coherence, evidence, and rhetorical rigor?
                </p>
              </div>

              {/* Vote Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVoteSubmit('debater1')}
                  disabled={isSubmittingVote}
                  className="p-4 rounded-2xl bg-blue-950/60 border border-blue-500/50 hover:bg-blue-900/60 text-center transition group active:scale-95"
                >
                  <span className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition">
                    {d1Votes}
                  </span>
                  <span className="text-xs font-black uppercase text-blue-300 mt-1 block">
                    {debater1.name}
                  </span>
                </button>

                <button
                  onClick={() => handleVoteSubmit('debater2')}
                  disabled={isSubmittingVote}
                  className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 hover:bg-rose-900/60 text-center transition group active:scale-95"
                >
                  <span className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition">
                    {d2Votes}
                  </span>
                  <span className="text-xs font-black uppercase text-rose-300 mt-1 block">
                    {debater2.name}
                  </span>
                </button>
              </div>

              {/* Optional Reasoning */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Reasoning Note (Optional)
                </label>
                <textarea
                  value={voteReasoning}
                  onChange={e => setVoteReasoning(e.target.value)}
                  placeholder="Explain what convinced you..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {userVotedPersona && (
                <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/40 p-3 text-center text-xs text-emerald-300">
                  ✓ Your vote has been officially tallied in the arena.
                </div>
              )}
            </div>
          )}

          {/* Drawer Body: AUDIENCE Q&A */}
          {activeDrawer === 'qa' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
              <div className="space-y-3 overflow-y-auto mb-4">
                <div className="text-xs text-slate-400">
                  Submit cross-examination questions to be addressed by the AI debaters.
                </div>
                {debate?.questions && debate.questions.length > 0 ? (
                  debate.questions.map(q => (
                    <div key={q.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-bold text-slate-400">{q.authorName}</span>
                        <span className="uppercase">{q.status}</span>
                      </div>
                      <p className="text-slate-200">"{q.questionText}"</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-600 text-xs">
                    No audience questions submitted yet. Be the first to ask!
                  </div>
                )}
              </div>

              {/* Submission Form */}
              <form onSubmit={handleQuestionSubmit} className="space-y-2 pt-3 border-t border-slate-800">
                {qSubmittedMessage && (
                  <div className="text-xs text-emerald-400 font-bold mb-1">
                    ✓ Question submitted to debate moderator.
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Your Name / Handle"
                  value={questionAuthor}
                  onChange={e => setQuestionAuthor(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <textarea
                  placeholder="Pose a cross-examination question..."
                  rows={2}
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingQ || questionText.trim().length < 5}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 py-2 text-xs font-bold text-white transition shadow-md shadow-indigo-950"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Question</span>
                </button>
              </form>
            </div>
          )}

          {/* Drawer Body: LIVE ACOUSTIC SPECTROGRAM & TELEMETRY */}
          {activeDrawer === 'visualizer' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Active Vocal Resonator & Signal Analysis
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time Web Audio API signal processing directly sampling the speaker's vocal track through the connected AnalyserNode.
                </p>
              </div>

              {/* High-Resolution Expanded Canvas Visualizer */}
              <div className="space-y-3">
                <AudioVisualizerCanvas
                  analyserNode={effectiveAnalyserNode}
                  isPlaying={isAudioPlaying}
                  activeSpeakerSide={activeSpeakerSide}
                  speakerName={
                    activeSpeakerSide === 'debater1'
                      ? debater1.name
                      : activeSpeakerSide === 'debater2'
                      ? debater2.name
                      : 'Standby / Room Tone'
                  }
                  accentColor={
                    activeSpeakerSide === 'debater1'
                      ? d1Theme.primary
                      : activeSpeakerSide === 'debater2'
                      ? d2Theme.primary
                      : '#10b981'
                  }
                  secondaryColor={
                    activeSpeakerSide === 'debater1'
                      ? '#38bdf8'
                      : activeSpeakerSide === 'debater2'
                      ? '#f97316'
                      : '#34d399'
                  }
                  height={180}
                  initialMode="dual"
                  showControls={true}
                  showTelemetry={true}
                  className="w-full border-slate-700/80 shadow-2xl"
                />
              </div>

              {/* Acoustic Calibration & Profile Specs */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Voice Synthesis Calibration
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">
                      {debater1.name} (Left)
                    </span>
                    <div className="text-slate-200 font-mono text-[11px] space-y-0.5">
                      <div>Voice: {debater1.voiceName || 'Fenrir'}</div>
                      <div className="truncate" title={debater1.ttsModelId || 'gemini-3.8-flash-lite-tts'}>
                        TTS: {debater1.ttsModelId || 'gemini-3.8-flash-lite-tts'}
                      </div>
                      <div className="text-slate-400 text-[10px]">Speed: {debater1.voiceSpeed || 1.0}x</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">
                      {debater2.name} (Right)
                    </span>
                    <div className="text-slate-200 font-mono text-[11px] space-y-0.5">
                      <div>Voice: {debater2.voiceName || 'Kore'}</div>
                      <div className="truncate" title={debater2.ttsModelId || 'gemini-3.8-flash-lite-tts'}>
                        TTS: {debater2.ttsModelId || 'gemini-3.8-flash-lite-tts'}
                      </div>
                      <div className="text-slate-400 text-[10px]">Speed: {debater2.voiceSpeed || 1.0}x</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
