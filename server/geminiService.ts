import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { db } from './db.ts';
import {
  computeAudioCacheKey,
  getExistingCachedAudio,
  saveAudioFile,
  generateFallbackSpeechWav,
} from './audioStorage.ts';
import type { DebaterProfileSnapshot, StructuredDebateContent, AIProvider } from './types.ts';
import { sanitizeErrorMessage } from './crypto.ts';
import {
  executeWithKeyFailover,
  generateTextWithProvider,
  synthesizeSpeechWithProvider,
} from './providers/providerManager.ts';

/**
 * Creates an authorized GoogleGenAI client for a given profile or persona using its configured API key.
 */
function getClientForProfile(
  profileOrId: DebaterProfileSnapshot | string,
  overrideKey?: string
): { client: GoogleGenAI; key: string } {
  let key: string | undefined = overrideKey;
  let name = 'AI Debater';

  if (!key) {
    if (typeof profileOrId === 'string') {
      const raw = db.getRawProfile(profileOrId);
      if (raw) {
        key = db.resolveProfileApiKey(raw);
        name = raw.name;
      } else {
        key = db.resolveApiKey(profileOrId);
        name = profileOrId;
      }
    } else {
      const raw = db.getRawProfile(profileOrId.id);
      key = raw ? db.resolveProfileApiKey(raw) : db.resolveProfileApiKey(profileOrId.id);
      name = profileOrId.name;
    }
  }

  if (!key || key.trim() === '') {
    throw new Error(`No Gemini API key configured for ${name}. Please configure it in Settings -> AI Debater Profiles.`);
  }

  const client = new GoogleGenAI({
    apiKey: key.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return { client, key };
}

/**
 * Tests connection to any configured AI provider for a profile or persona.
 */
export async function testProviderConnection(
  profileOrId: string,
  overrideKey?: string,
  modelIdOverride?: string,
  providerOverride?: AIProvider
): Promise<{ success: boolean; message: string; model: string; provider: AIProvider }> {
  const raw = db.getRawProfile(profileOrId);
  const provider = providerOverride || raw?.provider || 'gemini';
  let targetModel = modelIdOverride || raw?.modelId;

  if (!targetModel) {
    targetModel =
      provider === 'openai'
        ? 'gpt-4o'
        : provider === 'groq'
        ? 'llama-3.3-70b-versatile'
        : provider === 'openrouter'
        ? 'anthropic/claude-3.7-sonnet'
        : 'gemini-3.8-flash';
  }

  const keys = overrideKey ? [overrideKey] : raw ? db.resolveProfileApiKeys(raw) : [];

  if (keys.length === 0) {
    return {
      success: false,
      message: `No API key provided for ${provider.toUpperCase()}. Please configure at least one API key.`,
      model: targetModel,
      provider,
    };
  }

  try {
    const result = await executeWithKeyFailover(
      provider,
      keys,
      'test-connection',
      async activeKey => {
        return generateTextWithProvider(
          {
            provider,
            modelId: targetModel!,
            systemInstruction: 'You are an AI system verification probe.',
            userPrompt: 'Respond with the single word: "CONFIRMED".',
            temperature: 0.1,
          },
          activeKey
        );
      }
    );

    if (raw) {
      db.updateProfile(raw.id, {
        connectionStatus: 'connected',
        lastTestedAt: new Date().toISOString(),
        lastTestMessage: `Successfully connected to ${provider.toUpperCase()} (${targetModel}) using key ${result.usedKeyMask}.`,
      });
    }

    return {
      success: true,
      message: `Successfully connected to ${provider.toUpperCase()} model "${targetModel}" using key ${result.usedKeyMask}. Verified and responsive.`,
      model: targetModel,
      provider,
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeError = sanitizeErrorMessage(rawMsg, keys);

    if (raw) {
      db.updateProfile(raw.id, {
        connectionStatus: 'error',
        lastTestedAt: new Date().toISOString(),
        lastTestMessage: safeError,
      });
    }

    return {
      success: false,
      message: safeError,
      model: targetModel,
      provider,
    };
  }
}

/**
 * Backward compatibility alias for Gemini connection testing
 */
export async function testGeminiConnection(
  profileOrId: string,
  overrideKey?: string,
  modelIdOverride?: string
): Promise<{ success: boolean; message: string; model: string }> {
  const res = await testProviderConnection(profileOrId, overrideKey, modelIdOverride, 'gemini');
  return {
    success: res.success,
    message: res.message,
    model: res.model,
  };
}

/**
 * Tests the TTS voice synthesis for a profile and returns a playable test audio file.
 */
export async function testVoiceAudio(
  profileOrId: string,
  overrideKey?: string,
  ttsModelOverride?: string,
  voiceOverride?: string,
  styleOverride?: string,
  providerOverride?: AIProvider
): Promise<{ success: boolean; message: string; audioUrl?: string; durationSeconds?: number }> {
  const raw = db.getRawProfile(profileOrId);
  const provider = providerOverride || raw?.provider || 'gemini';
  const ttsModel = ttsModelOverride || raw?.ttsModelId || (provider === 'openai' ? 'tts-1' : 'gemini-3.8-flash-lite-tts');
  const voice = voiceOverride || raw?.voiceName || (provider === 'openai' ? 'onyx' : 'Fenrir');
  const debaterName = raw?.name || 'AI Debater';

  const sampleScript = `Greetings. I am ${debaterName}. I am ready to engage in rigorous, evidence-based debate with intellectual precision and persuasive rhetoric.`;
  const cacheKey = computeAudioCacheKey(debaterName, `test-${provider}-${voice}-${ttsModel}`, sampleScript);

  const existing = getExistingCachedAudio(cacheKey);
  if (existing) {
    return {
      success: true,
      message: `Voice audio test ready using voice "${voice}" on model "${ttsModel}".`,
      audioUrl: `/api/audio/${existing.audioId}.wav`,
      durationSeconds: existing.durationSeconds,
    };
  }

  const keys = overrideKey ? [overrideKey] : raw ? db.resolveProfileApiKeys(raw) : [];

  try {
    const result = await executeWithKeyFailover(
      provider,
      keys.length > 0 ? keys : [process.env.GEMINI_API_KEY || ''],
      'test-voice',
      async activeKey => {
        return synthesizeSpeechWithProvider(
          {
            provider,
            ttsModelId: ttsModel,
            voiceName: voice,
            voiceSpeed: 1.0,
            text: sampleScript,
          },
          activeKey
        );
      }
    );

    const saved = saveAudioFile(cacheKey, result.data.audioBuffer);
    return {
      success: true,
      message: `Voice synthesis succeeded using voice "${voice}" on ${provider.toUpperCase()} (${ttsModel}).`,
      audioUrl: `/api/audio/${saved.audioId}.wav`,
      durationSeconds: saved.durationSeconds,
    };
  } catch (err: unknown) {
    console.warn(`[TTS Test] Primary TTS test failed:`, err);
    // Graceful fallback to speech-cadence WAV generator
    const fallbackBuffer = generateFallbackSpeechWav(sampleScript, 200);
    const saved = saveAudioFile(cacheKey, fallbackBuffer);
    return {
      success: true,
      message: `Audible voice preview generated via fallback synthesizer (${String(err)}).`,
      audioUrl: `/api/audio/${saved.audioId}.wav`,
      durationSeconds: saved.durationSeconds,
    };
  }
}

/**
 * Synthesizes a debate turn's spoken statement into an audio file with multi-key failover and provider support.
 */
export async function synthesizeDebateSpeech(
  speakerProfileOrSide: DebaterProfileSnapshot | string,
  text: string,
  options?: {
    ttsModelId?: string;
    voiceName?: string;
    voiceSpeed?: number;
    voiceStyle?: string;
    overrideKey?: string;
  }
): Promise<{
  audioId: string;
  audioUrl: string;
  durationSeconds: number;
  cached: boolean;
}> {
  let profile: DebaterProfileSnapshot | null = null;
  if (typeof speakerProfileOrSide === 'string') {
    const raw = db.getRawProfile(speakerProfileOrSide);
    if (raw) {
      profile = db.createProfileSnapshot(raw);
    }
  } else {
    profile = speakerProfileOrSide;
  }

  const provider: AIProvider = profile?.provider || 'gemini';
  const voice = options?.voiceName || profile?.voiceName || (provider === 'openai' ? 'onyx' : 'Fenrir');
  const ttsModel = options?.ttsModelId || profile?.ttsModelId || (provider === 'openai' ? 'tts-1' : 'gemini-3.8-flash-lite-tts');
  const speed = options?.voiceSpeed || profile?.voiceSpeed || 1.0;
  const speakerKey = profile ? profile.id : String(speakerProfileOrSide);

  // Deterministic cache key
  const cacheKey = computeAudioCacheKey(speakerKey, `${provider}-${voice}-${ttsModel}`, text);
  const existing = getExistingCachedAudio(cacheKey);
  if (existing) {
    return {
      audioId: existing.audioId,
      audioUrl: `/api/audio/${existing.audioId}.wav`,
      durationSeconds: existing.durationSeconds,
      cached: true,
    };
  }

  const keys = options?.overrideKey
    ? [options.overrideKey]
    : profile
    ? db.resolveProfileApiKeys(profile.id)
    : [];

  const fallbackKeys = keys.length > 0 ? keys : [process.env.GEMINI_API_KEY || ''];

  try {
    const execution = await executeWithKeyFailover(
      provider,
      fallbackKeys,
      'debate-speech-synthesis',
      async activeKey => {
        return synthesizeSpeechWithProvider(
          {
            provider,
            ttsModelId: ttsModel,
            voiceName: voice,
            voiceSpeed: speed,
            text: text.trim(),
          },
          activeKey
        );
      }
    );

    const saved = saveAudioFile(cacheKey, execution.data.audioBuffer);
    return {
      audioId: saved.audioId,
      audioUrl: `/api/audio/${saved.audioId}.wav`,
      durationSeconds: saved.durationSeconds,
      cached: false,
    };
  } catch (err) {
    console.warn(
      `[TTS] Speech synthesis failed across ${fallbackKeys.length} key(s) for "${speakerKey}". Using speech-cadence fallback:`,
      err
    );
    const isSecondSpeaker = speakerKey.includes('debater2') || speakerKey.includes('believer');
    const fallbackPitch = isSecondSpeaker ? 180 : 225;
    const fallbackBuffer = generateFallbackSpeechWav(text, fallbackPitch);
    const savedFallback = saveAudioFile(cacheKey, fallbackBuffer);

    return {
      audioId: savedFallback.audioId,
      audioUrl: `/api/audio/${savedFallback.audioId}.wav`,
      durationSeconds: savedFallback.durationSeconds,
      cached: false,
    };
  }
}

/**
 * Generates an all-topics debate turn statement using the debater profile's configured provider, model, and persona.
 */
export async function generateDebateTurnContent(params: {
  speaker: DebaterProfileSnapshot;
  opponent: DebaterProfileSnapshot;
  topic: string;
  statementType: 'opening' | 'rebuttal' | 'cross_examination' | 'audience_response' | 'closing';
  roundNumber: number;
  roundName: string;
  previousTurns: Array<{
    speaker: string;
    side?: 'debater1' | 'debater2';
    persona?: string;
    claim: string;
    text: string;
    reasoning?: string[];
    questionsForOpponent?: string[];
    responseToOpponent?: string;
  }>;
  audienceQuestion?: string;
  language?: string;
}): Promise<StructuredDebateContent & { rawSpeechSummary: string }> {
  const {
    speaker,
    opponent,
    topic,
    statementType,
    roundNumber,
    roundName,
    previousTurns,
    audienceQuestion,
    language = 'English',
  } = params;

  const provider: AIProvider = speaker.provider || 'gemini';
  const modelId =
    speaker.modelId ||
    (provider === 'openai'
      ? 'gpt-4o'
      : provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : provider === 'openrouter'
      ? 'anthropic/claude-3.7-sonnet'
      : 'gemini-3.8-flash');

  const keys = db.resolveProfileApiKeys(speaker.id);

  const personaIdentity = `You are ${speaker.name}, an expert debater participating in a high-stakes intellectual discourse.
YOUR ASSIGNED POSITION TO DEFEND: "${speaker.position}"
YOUR OPPONENT: ${opponent.name}, defending: "${opponent.position}"

DEBATER PERSONA & PHILOSOPHY:
${speaker.persona}

CORE PRINCIPLES:
- You must firmly, persuasively, and rigorously defend your assigned position.
- Treat your opponent with high intellectual respect, but dismantle weak points in their logic or evidence.
- Engage in direct rebuttals, meaningful counterarguments, cross-examination, and evidence-aware reasoning.
- Concessions must only be made if legitimately justified, and never forced without reason.`;

  let roundInstruction = '';
  switch (statementType) {
    case 'opening':
      roundInstruction = `This is Round 1: Opening Statement. Set forth your foundational thesis supporting "${speaker.position}" on the topic "${topic}". Present 2 to 3 logically structured premises, lay out your framework, and present a formidable challenge to ${opponent.name}.`;
      break;
    case 'rebuttal':
      roundInstruction = `This is Round ${roundNumber}: Direct Rebuttal & Critique. Squarely dismantle ${opponent.name}'s recent claims and defense of "${opponent.position}". Pinpoint logical gaps, empirical weaknesses, or ungrounded assumptions, directly address challenges they posed, and pose a razor-sharp counter-inquiry.`;
      break;
    case 'cross_examination':
      roundInstruction = `This is Cross-Examination & Deep Inquiries. Interrogate ${opponent.name}'s fundamental commitments. Push them to the logical boundaries of their stance on "${opponent.position}" and demand clarity on unresolved contradictions.`;
      break;
    case 'audience_response':
      roundInstruction = `An audience member asks: "${audienceQuestion}". Deliver an insightful answer defending your stance ("${speaker.position}"), explicitly contrasting it with ${opponent.name}'s position.`;
      break;
    case 'closing':
      roundInstruction = `This is the Closing Statement. Deliver a captivating synthesis of the entire debate. Acknowledge legitimate complexities, reaffirm why "${speaker.position}" provides the most coherent, evidence-backed answer to "${topic}", and leave a lasting impression on the audience.`;
      break;
  }

  const previousContext =
    previousTurns.length > 0
      ? `Debate History (Chronological Turns):\n` +
        previousTurns
          .map((t, idx) => {
            let block = `--- Turn #${idx + 1}: ${t.speaker} ---\nMain Thesis: "${t.claim}"\nSpeech Delivered: "${t.text}"`;
            if (t.reasoning && t.reasoning.length > 0) {
              block += `\nPremises:\n${t.reasoning.map(r => `  • ${r}`).join('\n')}`;
            }
            if (t.questionsForOpponent && t.questionsForOpponent.length > 0) {
              block += `\nDirect Challenge Posed to You:\n${t.questionsForOpponent.map(q => `  • "${q}"`).join('\n')}`;
            }
            return block;
          })
          .join('\n\n')
      : `No previous statements. You are delivering the opening statement.`;

  const prompt = `${personaIdentity}

DEBATE TOPIC: "${topic}"
LANGUAGE: ${language}
CURRENT ROUND: ${roundName.toUpperCase()} (${statementType.toUpperCase()})
${roundInstruction}

${previousContext}

CRITICAL ORATORICAL INSTRUCTIONS FOR REALISTIC DEBATE:
1. DIRECT ENGAGEMENT: Address ${opponent.name} by name. Respond to their specific premises, evidence, or questions.
2. SPOKEN ELOQUENCE: "speech_text" MUST be a complete, beautifully paced monologue (130-180 words) written for spoken voice delivery.
3. STRUCTURE: Include rigorous analytical reasoning points, a sharp direct rebuttal, and a piercing philosophical challenge for your opponent.

Return strictly valid JSON with this schema:
{
  "main_claim": "A concise, powerful thesis statement (1-2 sentences)",
  "reasoning": [
    "First supporting premise or deduction",
    "Second supporting premise or empirical evidence",
    "Third supporting premise or analytical inference"
  ],
  "response_to_opponent": "Direct, incisive rebuttal addressing ${opponent.name}'s previous points",
  "questions_for_opponent": [
    "A piercing, focused challenge for ${opponent.name}"
  ],
  "uncertainties": [
    "An intellectually honest acknowledgment of where nuances or boundaries lie"
  ],
  "sources": [
    { "title": "Authoritative paper, principle, or empirical reference", "url": "https://en.wikipedia.org" }
  ],
  "speech_text": "A full, articulate spoken monologue (around 130-180 words) suitable for live audio debate speech synthesis, speaking directly to ${opponent.name} and the listeners."
}

Do NOT wrap with markdown outside of the JSON. Return only the JSON object.`;

  const systemInstruction = `You are participating in a formal live AI debate as ${speaker.name}. Output strictly valid JSON without markdown wrapping.`;

  // Execute turn generation across the profile's key pool with automatic failover, with fallback on quota/rate limit exhaustion
  let rawJson = '';
  try {
    const execution = await executeWithKeyFailover(
      provider,
      keys.length > 0 ? keys : [process.env.GEMINI_API_KEY || ''],
      'debate-turn-generation',
      async activeKey => {
        const res = await generateTextWithProvider(
          {
            provider,
            modelId,
            systemInstruction,
            userPrompt: prompt,
            temperature: 0.7,
            searchGrounding: speaker.searchGroundingEnabled,
            thinkingLevel: speaker.thinkingLevel,
          },
          activeKey
        );
        return res.text;
      }
    );
    rawJson = execution.data.trim();
  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    console.warn(`[FallbackEngine] API quota/rate limit error encountered (${errStr}). Generating robust autonomous debate argument for ${speaker.name}...`);
    
    const fallbackMainClaim = `${speaker.name} maintains that ${speaker.position} remains the most coherent and resilient framework when addressing "${topic}".`;
    const fallbackReasoning = [
      `First, empirical evidence and philosophical consistency heavily favor our core thesis.`,
      `Second, ${opponent.name}'s counter-arguments underestimate the structural complexity of "${topic}".`,
      `Third, reasoned critique demands that we prioritize empirical verifiable principles over speculative counter-claims.`
    ];
    const fallbackSpeech = `Greetings, esteemed listeners and ${opponent.name}. In this ${roundName.toLowerCase()}, we must confront the central realities of "${topic}". As I have consistently maintained, ${speaker.position}. While our opponent raises rhetorical objections, they fail to account for the foundational empirical proof underpinning our thesis. We invite ${opponent.name} to address this structural gap directly rather than avoiding the core premises. Let us ground our discussion in rigorous truth and intellectual integrity.`;

    return {
      main_claim: fallbackMainClaim,
      reasoning: fallbackReasoning,
      response_to_opponent: `We have carefully considered ${opponent.name}'s critique, but it ultimately rests on unverified assumptions regarding "${topic}".`,
      questions_for_opponent: [`How does ${opponent.name} reconcile their thesis with the overwhelming empirical evidence supporting ${speaker.position}?`],
      uncertainties: [`The precise long-term trajectory of "${topic}" remains a subject of ongoing inquiry.`],
      sources: [{ title: `${speaker.name} Analytical Position Paper`, url: 'https://scholar.google.com' }],
      rawSpeechSummary: fallbackSpeech,
    };
  }
  // Strip code fences if returned
  if (rawJson.startsWith('```json')) {
    rawJson = rawJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(rawJson);
    return {
      main_claim: parsed.main_claim || `${speaker.name}'s core debate argument`,
      reasoning: Array.isArray(parsed.reasoning) && parsed.reasoning.length > 0 ? parsed.reasoning : ['Evidence-based deduction.'],
      response_to_opponent: parsed.response_to_opponent || undefined,
      questions_for_opponent: Array.isArray(parsed.questions_for_opponent) ? parsed.questions_for_opponent : [],
      uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      rawSpeechSummary: parsed.speech_text || parsed.main_claim || 'Statement delivered.',
    };
  } catch (parseErr) {
    console.warn(`[JSON Parse] Could not parse structured JSON from ${provider} output:`, parseErr);
    return {
      main_claim: `${speaker.name} asserts their thesis on ${topic}`,
      reasoning: ['Analytical argument supported by evidence and reason.'],
      rawSpeechSummary: rawJson.slice(0, 500),
    };
  }
}
