export type PersonaType = string;

export type AccentColor = 'cyan' | 'amber' | 'emerald' | 'purple' | 'rose' | 'blue' | 'indigo' | 'orange';

export type DebateMode = 'automatic' | 'interactive';
export type PlaybackMode = 'text_only' | 'voice_only' | 'text_and_voice';
export type DebateStatus = 'idle' | 'generating_transcript' | 'generating_audio' | 'audio_ready' | 'in_progress' | 'paused' | 'completed' | 'error';
export type AudioGenerationStatus = 'none' | 'generating' | 'ready' | 'failed';

export interface DebaterProfile {
  id: string;
  name: string;
  position: string;
  topicScope: string;
  persona: string;
  modelId: string;
  ttsModelId: string;
  voiceName: string;
  voiceStyle: string;
  voiceSpeed: number;
  ttsEnabled: boolean;
  searchGroundingEnabled: boolean;
  thinkingLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  avatarUrl: string;
  accentColor: AccentColor;
  status: 'enabled' | 'disabled';
  connectionStatus?: 'not_configured' | 'connected' | 'error';
  lastTestedAt?: string | null;
  lastTestMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebaterProfilePublic extends DebaterProfile {
  hasKey: boolean;
  keyMask: string;
  keySource: 'database' | 'environment' | 'none';
}

export interface DebaterProfileSnapshot {
  id: string;
  name: string;
  position: string;
  topicScope?: string;
  persona: string;
  modelId: string;
  ttsModelId: string;
  voiceName: string;
  voiceStyle: string;
  voiceSpeed: number;
  ttsEnabled: boolean;
  searchGroundingEnabled: boolean;
  thinkingLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  avatarUrl: string;
  accentColor: AccentColor;
}

export interface AIConfigPublic {
  persona: string;
  name: string;
  modelId: string;
  ttsModelId: string;
  voiceName: string;
  voiceStyle: string;
  voiceSpeed: number;
  ttsEnabled: boolean;
  searchGroundingEnabled: boolean;
  thinkingLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  status: 'not_configured' | 'connected' | 'error';
  hasKey: boolean;
  keyMask: string;
  keySource: 'database' | 'environment' | 'none';
  lastTestedAt: string | null;
  lastTestMessage: string | null;
  lastTestAudioUrl?: string | null;
  updatedAt: string;
}

export interface DebateTurn {
  id: string;
  debateId: string;
  turnIndex: number;
  roundNumber: number;
  roundName: string;
  speakerId: string;
  speakerSide: 'debater1' | 'debater2';
  persona: string;
  speakerName: string;
  statementType: 'opening' | 'rebuttal' | 'cross_examination' | 'audience_response' | 'closing';
  mainClaim: string;
  reasoning: string[];
  responseToOpponent?: string;
  questionsForOpponent?: string[];
  uncertainties?: string[];
  sources?: Array<{ title: string; url: string }>;
  rawText: string;
  audioUrl?: string;
  audioDuration?: number;
  audioStatus: AudioGenerationStatus;
  audioError?: string;
  audioCached?: boolean;
  createdAt: string;
}

export interface AudienceQuestion {
  id: string;
  debateId: string;
  authorName: string;
  questionText: string;
  status: 'pending' | 'approved' | 'answered' | 'rejected';
  createdAt: string;
}

export interface DebateSummary {
  debater1StrongPoints?: string[];
  debater2StrongPoints?: string[];
  atheistStrongPoints?: string[];
  believerStrongPoints?: string[];
  keyClashes: string[];
  verifiedFacts: string[];
  overallAssessment: string;
}

export interface Debate {
  id: string;
  title: string;
  topic: string;
  category: string;
  mode: DebateMode;
  playbackMode: PlaybackMode;
  language: string;
  status: DebateStatus;
  currentTurnIndex: number;
  totalTurns: number;
  thinkingEnabled: boolean;
  searchEnabled: boolean;
  debater1: DebaterProfileSnapshot;
  debater2: DebaterProfileSnapshot;
  messages: DebateTurn[];
  questions: AudienceQuestion[];
  votes: {
    debater1: number;
    debater2: number;
    total: number;
    atheist?: number;
    believer?: number;
  };
  summary?: DebateSummary;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
