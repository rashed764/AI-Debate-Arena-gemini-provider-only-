import React from 'react';
import { Debate, DebateTurn, PlaybackMode } from '../types';
import { CinematicArena } from './CinematicArena';
import { useAudioAnalyser, AudioAnalysis } from '../utils/useAudioAnalyser';
import { AudioVisualizerCanvas } from './AudioVisualizerCanvas';

export interface DebateArenaProps {
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
}

export const DebateArena: React.FC<DebateArenaProps> = props => {
  // Read real-time audio analysis and AnalyserNode from useAudioAnalyser hook
  const audioAnalysis: AudioAnalysis = useAudioAnalyser(
    props.audioElement || null,
    props.isAudioPlaying,
    false
  );

  return (
    <CinematicArena
      {...props}
      analyserNode={audioAnalysis.analyserNode}
      audioAnalysis={audioAnalysis}
    />
  );
};

export { AudioVisualizerCanvas };
