import type { AIProvider, ProviderModelInfo, ProviderVoiceInfo } from '../types.ts';

export interface GenerationParams {
  provider: AIProvider;
  modelId: string;
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  searchGrounding?: boolean;
  thinkingLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
}

export interface SynthesisParams {
  provider: AIProvider;
  ttsModelId: string;
  voiceName: string;
  voiceSpeed?: number;
  text: string;
}

export interface ProviderExecutionResult<T> {
  data: T;
  provider: AIProvider;
  usedKeyIndex: number;
  usedKeyMask: string;
  switchedKeysCount: number;
  failoverLogs: string[];
}

export interface ProviderModelCatalog {
  provider: AIProvider;
  name: string;
  description: string;
  requiresKey: boolean;
  defaultTextModel: string;
  defaultTtsModel: string;
  defaultVoice: string;
  textModels: ProviderModelInfo[];
  ttsModels: ProviderModelInfo[];
  voices: ProviderVoiceInfo[];
}
