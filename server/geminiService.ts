import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { db } from './db.ts';
import { computeAudioCacheKey, getExistingCachedAudio, saveAudioFile } from './audioStorage.ts';
import type { DebaterProfileSnapshot, StructuredDebateContent } from './types.ts';
import { sanitizeErrorMessage } from './crypto.ts';

/**
 * Creates an authorized GoogleGenAI client for a given profile or persona using its configured API key.
 */
function getClientForProfile(profileOrId: DebaterProfileSnapshot | string, overrideKey?: string): { client: GoogleGenAI; key: string } {
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
 * Tests connection to the Gemini API for a profile or persona.
 */
export async function testGeminiConnection(
  profileOrId: string,
  overrideKey?: string,
  modelIdOverride?: string
): Promise<{ success: boolean; message: string; model: string }> {
  let targetModel = modelIdOverride;
  const raw = db.getRawProfile(profileOrId);
  if (!targetModel) {
    targetModel = raw?.modelId || 'gemini-3.8-flash';
  }

  try {
    const { client } = getClientForProfile(profileOrId, overrideKey);

    const response = await client.models.generateContent({
      model: targetModel,
      contents: 'Respond with the single word: "CONFIRMED".',
    });

    const text = response.text?.trim() || '';
    if (text.length > 0) {
      if (raw) {
        db.updateProfile(raw.id, {
          connectionStatus: 'connected',
          lastTestedAt: new Date().toISOString(),
          lastTestMessage: `Successfully connected to ${targetModel}.`,
        });
      }
      return {
        success: true,
        message: `Successfully connected to model "${targetModel}". Gemini API key is valid and responsive.`,
        model: targetModel,
      };
    } else {
      throw new Error('Received an empty response from Gemini API.');
    }
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const resolvedKey = overrideKey || (raw ? db.resolveProfileApiKey(raw) : db.resolveApiKey(profileOrId)) || '';
    const safeError = sanitizeErrorMessage(rawMsg, [resolvedKey]);

    let friendlyMessage = safeError;
    if (safeError.includes('API_KEY_INVALID') || safeError.includes('key not valid')) {
      friendlyMessage = 'API key is invalid or unauthorized. Please verify the key in Settings.';
    } else if (safeError.includes('RESOURCE_EXHAUSTED') || safeError.includes('quota')) {
      friendlyMessage = 'API rate limit or quota exceeded for this key.';
    } else if (safeError.includes('NOT_FOUND') || safeError.includes('models/')) {
      friendlyMessage = `Model "${targetModel}" was not found or is unavailable for this API key.`;
    }

    if (raw) {
      db.updateProfile(raw.id, {
        connectionStatus: 'error',
        lastTestedAt: new Date().toISOString(),
        lastTestMessage: friendlyMessage,
      });
    }

    return {
      success: false,
      message: friendlyMessage,
      model: targetModel,
    };
  }
}

/**
 * Tests the TTS voice synthesis for a profile and returns a playable test audio file.
 */
export async function testVoiceAudio(
  profileOrId: string,
  overrideKey?: string,
  ttsModelOverride?: string,
  voiceOverride?: string,
  styleOverride?: string
): Promise<{ success: boolean; message: string; audioUrl?: string; durationSeconds?: number }> {
  const raw = db.getRawProfile(profileOrId);
  const ttsModel = ttsModelOverride || raw?.ttsModelId || 'gemini-3.8-flash-lite-tts';
  const voice = voiceOverride || raw?.voiceName || 'Fenrir';
  const style = styleOverride !== undefined ? styleOverride : raw?.voiceStyle || 'Clear and articulate';
  const debaterName = raw?.name || 'AI Debater';

  const sampleScript = `Greetings. I am ${debaterName}. I am ready to engage in rigorous, evidence-based debate with intellectual precision and persuasive rhetoric.`;

  try {
    const { client } = getClientForProfile(profileOrId, overrideKey);

    const cacheKey = computeAudioCacheKey(debaterName, `test-${voice}`, sampleScript);
    const existing = getExistingCachedAudio(cacheKey);
    if (existing) {
      return {
        success: true,
        message: `Voice audio test ready using voice "${voice}" on model "${ttsModel}".`,
        audioUrl: `/api/audio/${existing.audioId}.wav`,
        durationSeconds: existing.durationSeconds,
      };
    }

    const response = await client.models.generateContent({
      model: ttsModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: sampleScript,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Data) {
      throw new Error('TTS service returned no audio data in response.');
    }

    const wavBuffer = Buffer.from(base64Data, 'base64');
    const saved = saveAudioFile(cacheKey, wavBuffer);

    return {
      success: true,
      message: `Voice audio test successfully generated with voice "${voice}" on "${ttsModel}".`,
      audioUrl: `/api/audio/${saved.audioId}.wav`,
      durationSeconds: saved.durationSeconds,
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const resolvedKey = overrideKey || (raw ? db.resolveProfileApiKey(raw) : db.resolveApiKey(profileOrId)) || '';
    const safeError = sanitizeErrorMessage(rawMsg, [resolvedKey]);
    return {
      success: false,
      message: `Voice test failed: ${safeError}`,
    };
  }
}

/**
 * Synthesizes speech for an actual debate statement and caches the WAV file.
 */
export async function synthesizeDebateSpeech(
  speakerProfileOrSide: DebaterProfileSnapshot | string,
  text: string,
  options?: {
    voiceName?: string;
    ttsModelId?: string;
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

  const voice = options?.voiceName || profile?.voiceName || 'Fenrir';
  const ttsModel = options?.ttsModelId || profile?.ttsModelId || 'gemini-3.8-flash-lite-tts';
  const style = options?.voiceStyle || profile?.voiceStyle || 'Analytical, clear, persuasive';
  const speakerKey = profile ? profile.id : String(speakerProfileOrSide);

  // Compute deterministic cache key
  const cacheKey = computeAudioCacheKey(speakerKey, voice, text);
  const existing = getExistingCachedAudio(cacheKey);
  if (existing) {
    return {
      audioId: existing.audioId,
      audioUrl: `/api/audio/${existing.audioId}.wav`,
      durationSeconds: existing.durationSeconds,
      cached: true,
    };
  }

  const { client } = getClientForProfile(speakerProfileOrSide, options?.overrideKey);

  const response = await client.models.generateContent({
    model: ttsModel,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text.trim(),
            speechMetadata: {
              style,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Data) {
    throw new Error('TTS service returned empty audio data.');
  }

  const wavBuffer = Buffer.from(base64Data, 'base64');
  const saved = saveAudioFile(cacheKey, wavBuffer);

  return {
    audioId: saved.audioId,
    audioUrl: `/api/audio/${saved.audioId}.wav`,
    durationSeconds: saved.durationSeconds,
    cached: false,
  };
}

/**
 * Generates an all-topics debate turn statement using the debater profile's configured model and persona.
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

  const modelId = speaker.modelId || 'gemini-3.8-flash';
  const { client } = getClientForProfile(speaker);

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

  const config: {
    systemInstruction: string;
    responseMimeType: string;
    tools?: Array<{ googleSearch: object }>;
    thinkingConfig?: { thinkingLevel: ThinkingLevel };
  } = {
    systemInstruction: `You are participating in a formal live AI debate as ${speaker.name}. Output strictly valid JSON.`,
    responseMimeType: 'application/json',
  };

  if (speaker.searchGroundingEnabled) {
    config.tools = [{ googleSearch: {} }];
  }

  if (speaker.thinkingLevel && (modelId.includes('gemini-3') || modelId.includes('gemini-4'))) {
    if (speaker.thinkingLevel === 'HIGH') config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    else if (speaker.thinkingLevel === 'MEDIUM') config.thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
    else if (speaker.thinkingLevel === 'LOW') config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }

  let rawOutput = '';
  const candidateModels = [modelId];
  if (modelId !== 'gemini-3.8-flash') {
    candidateModels.push('gemini-3.8-flash');
  }

  let lastError: any = null;

  for (const currentModel of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: currentModel,
          contents: prompt,
          config,
        });
        rawOutput = response.text?.trim() || '';
        if (rawOutput) break;
      } catch (err: unknown) {
        lastError = err;
        const msg = String(err);
        const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');

        if (isRateLimit && config.tools) {
          delete config.tools;
        }

        if (isRateLimit && attempt === 0) {
          await new Promise(r => setTimeout(r, 2500));
          continue;
        }
        break;
      }
    }
    if (rawOutput) break;
  }

  if (!rawOutput) {
    console.warn('Gemini generation failed, using structured dialectical fallback:', lastError?.message || lastError);
    return {
      main_claim: `${speaker.name} affirms that ${speaker.position} provides the most robust explanation on "${topic}".`,
      reasoning: [
        `First, empirical and logical scrutiny directly supports ${speaker.position}.`,
        `Second, the counter-arguments advanced by ${opponent.name} rely on presuppositions that cannot withstand rigorous interrogation.`,
        `Third, when we evaluate overall coherence, ${speaker.position} accounts for observed data with minimal ungrounded assumptions.`
      ],
      response_to_opponent: `${opponent.name} fails to account for critical counter-evidence and overextends the explanatory reach of "${opponent.position}".`,
      questions_for_opponent: [
        `How does ${opponent.name} reconcile the core contradictions inherent in defending "${opponent.position}" against contrary evidence?`
      ],
      uncertainties: [
        'Nuanced boundary conditions and open empirical frontiers under active inquiry.'
      ],
      sources: [
        { title: `Foundations of Debate on ${topic}`, url: 'https://en.wikipedia.org' }
      ],
      rawSpeechSummary: `${opponent.name}, while I appreciate your articulation, the core premises of your position cannot withstand scrutiny. ${speaker.position} remains the most coherent, evidence-aligned framework for understanding ${topic}. We must ground our deductions in rigorous proof rather than unverified assertions.`,
    };
  }

  let parsed: any = null;

  try {
    const cleaned = rawOutput
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const fixed = cleaned
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/,\s*\]/g, ']');
      parsed = JSON.parse(fixed);
    }
  } catch {
    parsed = {
      main_claim: `${speaker.name} defends ${speaker.position}.`,
      reasoning: [
        `Rigorous adherence to systematic deduction supports ${speaker.position}.`,
        `Alternative positions fail to provide consistent explanatory power.`
      ],
      response_to_opponent: `Opponent's arguments leave pivotal questions unaddressed.`,
      questions_for_opponent: [`What verifiable evidence resolves this contradiction?`],
      uncertainties: ['Frontiers of empirical measurement.'],
      speech_text: rawOutput.trim(),
    };
  }

  return {
    main_claim: parsed.main_claim || `${speaker.name} argues that ${speaker.position}.`,
    reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.main_claim],
    response_to_opponent: parsed.response_to_opponent || undefined,
    questions_for_opponent: Array.isArray(parsed.questions_for_opponent) ? parsed.questions_for_opponent : [],
    uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    rawSpeechSummary: parsed.speech_text || parsed.main_claim,
  };
}
