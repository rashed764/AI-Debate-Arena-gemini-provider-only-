export type PersonaType = 'atheist' | 'believer';

export type DebateMode = 'automatic' | 'interactive';

export type PlaybackMode = 'text_only' | 'voice_only' | 'text_and_voice';

export type DebateStatus = 'idle' | 'generating_transcript' | 'generating_audio' | 'audio_ready' | 'in_progress' | 'paused' | 'completed' | 'error';

export type AudioGenerationStatus = 'none' | 'generating' | 'ready' | 'failed';

export interface AIConfigPublic {
  persona: PersonaType;
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

export interface AIConfigStored {
  persona: PersonaType;
  encryptedApiKey?: string;
  modelId: string;
  ttsModelId: string;
  voiceName: string;
  voiceStyle: string;
  voiceSpeed: number;
  ttsEnabled: boolean;
  searchGroundingEnabled: boolean;
  thinkingLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  status: 'not_configured' | 'connected' | 'error';
  lastTestedAt: string | null;
  lastTestMessage: string | null;
  updatedAt: string;
}

export interface StructuredDebateContent {
  main_claim: string;
  reasoning: string[];
  response_to_opponent?: string;
  questions_for_opponent?: string[];
  uncertainties?: string[];
  sources?: Array<{ title: string; url: string }>;
}

export interface DebateTurn {
  id: string;
  debateId: string;
  turnIndex: number;
  roundNumber: number;
  roundName: string;
  persona: PersonaType;
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
  atheistStrongPoints: string[];
  believerStrongPoints: string[];
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
  messages: DebateTurn[];
  questions: AudienceQuestion[];
  votes: {
    atheist: number;
    believer: number;
    total: number;
  };
  summary?: DebateSummary;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface VoteRecord {
  id: string;
  debateId: string;
  voterFingerprint: string;
  persona: PersonaType;
  reasoningNote?: string;
  createdAt: string;
}
