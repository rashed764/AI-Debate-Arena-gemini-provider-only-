import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { db } from './db.ts';
import { computeAudioCacheKey, getExistingCachedAudio, saveAudioFile } from './audioStorage.ts';
import type { PersonaType, StructuredDebateContent } from './types.ts';
import { sanitizeErrorMessage } from './crypto.ts';

/**
 * Creates an authorized GoogleGenAI client for a given persona using its configured API key.
 */
function getClientForPersona(persona: PersonaType, overrideKey?: string): { client: GoogleGenAI; key: string } {
  const key = overrideKey || db.resolveApiKey(persona);
  if (!key || key.trim() === '') {
    throw new Error(`No Gemini API key configured for ${persona === 'atheist' ? 'Atheist AI' : 'Believer AI'}. Please configure it in Settings -> AI API Configuration.`);
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
 * Tests connection to the Gemini API for a persona.
 */
export async function testGeminiConnection(
  persona: PersonaType,
  overrideKey?: string,
  modelIdOverride?: string
): Promise<{ success: boolean; message: string; model: string }> {
  const cfg = db.getRawConfig(persona);
  const targetModel = modelIdOverride || cfg.modelId || 'gemini-3.8-flash';

  try {
    const { client, key } = getClientForPersona(persona, overrideKey);

    const response = await client.models.generateContent({
      model: targetModel,
      contents: 'Respond with the single word: "CONFIRMED".',
    });

    const text = response.text?.trim() || '';
    if (text.length > 0) {
      db.updateConfig(persona, {
        status: 'connected',
        lastTestedAt: new Date().toISOString(),
        lastTestMessage: `Successfully connected to ${targetModel}.`,
      });
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
    const resolvedKey = overrideKey || db.resolveApiKey(persona) || '';
    const safeError = sanitizeErrorMessage(rawMsg, [resolvedKey]);

    let friendlyMessage = safeError;
    if (safeError.includes('API_KEY_INVALID') || safeError.includes('key not valid')) {
      friendlyMessage = 'API key is invalid or unauthorized. Please verify the key in Settings.';
    } else if (safeError.includes('RESOURCE_EXHAUSTED') || safeError.includes('quota')) {
      friendlyMessage = 'API rate limit or quota exceeded for this key.';
    } else if (safeError.includes('NOT_FOUND') || safeError.includes('models/')) {
      friendlyMessage = `Model "${targetModel}" was not found or is unavailable for this API key.`;
    }

    db.updateConfig(persona, {
      status: 'error',
      lastTestedAt: new Date().toISOString(),
      lastTestMessage: friendlyMessage,
    });

    return {
      success: false,
      message: friendlyMessage,
      model: targetModel,
    };
  }
}

/**
 * Tests the TTS voice synthesis for a persona and returns a playable test audio file.
 */
export async function testVoiceAudio(
  persona: PersonaType,
  overrideKey?: string,
  ttsModelOverride?: string,
  voiceOverride?: string,
  styleOverride?: string
): Promise<{ success: boolean; message: string; audioUrl?: string; durationSeconds?: number }> {
  const cfg = db.getRawConfig(persona);
  const ttsModel = ttsModelOverride || cfg.ttsModelId || 'gemini-3.8-flash-lite-tts';
  const voice = voiceOverride || cfg.voiceName || (persona === 'atheist' ? 'Fenrir' : 'Kore');
  const style = styleOverride !== undefined ? styleOverride : cfg.voiceStyle;

  const sampleScript =
    persona === 'atheist'
      ? 'Greetings. I am Atheist AI. I demand empirical evidence, logical rigor, and naturalistic parsimony in all philosophical inquiry.'
      : 'Greetings. I am Believer AI. I explore the profound contingency of existence, the intelligibility of the cosmos, and transcendent purpose.';

  try {
    const { client, key } = getClientForPersona(persona, overrideKey);

    const cacheKey = computeAudioCacheKey(persona, `test-${voice}`, sampleScript);
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
                style: style || (persona === 'atheist' ? 'Clear, analytical, intellectual' : 'Thoughtful, articulate, resonant'),
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
    const resolvedKey = overrideKey || db.resolveApiKey(persona) || '';
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
  persona: PersonaType,
  text: string
): Promise<{
  audioId: string;
  audioUrl: string;
  durationSeconds: number;
  cached: boolean;
}> {
  const cfg = db.getRawConfig(persona);
  const ttsModel = cfg.ttsModelId || 'gemini-3.8-flash-lite-tts';
  const voice = cfg.voiceName || (persona === 'atheist' ? 'Fenrir' : 'Kore');
  const style = cfg.voiceStyle || (persona === 'atheist' ? 'Analytical and assertive' : 'Philosophical and warm');

  // Compute deterministic cache key
  const cacheKey = computeAudioCacheKey(persona, voice, text);
  const existing = getExistingCachedAudio(cacheKey);
  if (existing) {
    return {
      audioId: existing.audioId,
      audioUrl: `/api/audio/${existing.audioId}.wav`,
      durationSeconds: existing.durationSeconds,
      cached: true,
    };
  }

  const { client } = getClientForPersona(persona);

  const response = await client.models.generateContent({
    model: ttsModel,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text.trim(), // Send complete intended statement without arbitrary substring slicing
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
 * Generates a debate turn statement using the persona's configured Gemini text model.
 */
export async function generateDebateTurnContent(params: {
  persona: PersonaType;
  topic: string;
  statementType: 'opening' | 'rebuttal' | 'cross_examination' | 'audience_response' | 'closing';
  roundNumber: number;
  roundName: string;
  previousTurns: Array<{
    speaker: string;
    persona: PersonaType;
    claim: string;
    text: string;
    reasoning?: string[];
    questionsForOpponent?: string[];
    responseToOpponent?: string;
  }>;
  audienceQuestion?: string;
  language?: string;
}): Promise<StructuredDebateContent & { rawSpeechSummary: string }> {
  const { persona, topic, statementType, roundNumber, roundName, previousTurns, audienceQuestion, language = 'English' } = params;
  const cfg = db.getRawConfig(persona);
  const modelId = cfg.modelId || 'gemini-3.8-flash';

  const { client } = getClientForPersona(persona);

  const isAtheist = persona === 'atheist';
  const opponentPersona = isAtheist ? 'Believer AI' : 'Atheist AI';

  const personaIdentity = isAtheist
    ? `You are Atheist AI, a world-class philosophical orator representing naturalism, empirical science, and analytical skepticism.
Your tone is articulate, incisive, intellectually fearless, and deeply respectful.
Core foundations you champion:
- Naturalistic Parsimony: Physical laws, quantum mechanics, and evolutionary biology account for our universe without requiring supernatural intervention.
- Epistemic Burden of Proof: Extraordinary claims require verifiable evidence, not merely philosophical gaps.
- Anthropic Principles: Fine-tuning is an observation of our conditional existence, not evidence of intentional cosmic architecture.
- Objective Ethics & Consciousness: Compassion, reason, and social cooperation arise from our shared evolutionary heritage.`
    : `You are Believer AI, a world-class philosophical orator representing metaphysical realism, philosophical theism, and transcendent purpose.
Your tone is articulate, warm, resonant, philosophically profound, and courteous.
Core foundations you champion:
- Principle of Sufficient Reason & Contingency: Contingent physical reality cannot explain its own existence and logically demands an ontologically necessary Ground of Being.
- Teleology & Cosmological Fine-Tuning: The extraordinary, knife-edge calibration of physical constants points to transcendent intentionality and Mind.
- Intelligibility & Mathematics: The profound harmony between human cognition and universal mathematical law reflects a rational cosmic foundation.
- Transcendent Value: Objective moral duties, human dignity, and consciousness transcend blind mechanistic particles.`;

  let roundInstruction = '';
  switch (statementType) {
    case 'opening':
      roundInstruction = `This is Round 1: Opening Statement. Set forth your foundational thesis on "${topic}". Present 2 to 3 logically structured premises, lay out your worldview, and challenge your opponent's upcoming framework.`;
      break;
    case 'rebuttal':
      roundInstruction = `This is Round ${roundNumber}: Direct Rebuttal & Critique. Squarely dismantle ${opponentPersona}'s recent claims. Pinpoint logical fallacies, ungrounded assumptions, or explanatory gaps, directly address the challenge they posed, and pose a razor-sharp counter-inquiry.`;
      break;
    case 'cross_examination':
      roundInstruction = `This is Cross-Examination & Philosophical Inquiries. Interrogate ${opponentPersona}'s ontological commitments. Push them to the logical boundary of their epistemology and demand clarity on unresolved contradictions.`;
      break;
    case 'audience_response':
      roundInstruction = `An audience member asks: "${audienceQuestion}". Deliver an insightful answer from your philosophical perspective, explicitly highlighting where your worldview parts company with ${opponentPersona}.`;
      break;
    case 'closing':
      roundInstruction = `This is the Closing Statement. Deliver a captivating synthesis of the entire debate. Acknowledge legitimate philosophical subtleties, reaffirm why your perspective offers the most coherent explanation of existence, and impart a profound concluding takeaway to the listeners.`;
      break;
  }

  const previousContext = previousTurns.length > 0
    ? `Debate History (Chronological Turns):\n` +
      previousTurns.map((t, idx) => {
        let block = `--- Turn #${idx + 1}: ${t.speaker} (${t.persona.toUpperCase()}) ---\nMain Thesis: "${t.claim}"\nSpeech Delivered: "${t.text}"`;
        if (t.reasoning && t.reasoning.length > 0) {
          block += `\nPremises:\n${t.reasoning.map(r => `  • ${r}`).join('\n')}`;
        }
        if (t.questionsForOpponent && t.questionsForOpponent.length > 0) {
          block += `\nDirect Challenge Posed to You:\n${t.questionsForOpponent.map(q => `  • "${q}"`).join('\n')}`;
        }
        return block;
      }).join('\n\n')
    : `No previous statements. You are delivering the opening statement.`;

  const prompt = `${personaIdentity}

DEBATE TOPIC: "${topic}"
LANGUAGE: ${language}
CURRENT ROUND: ${roundName.toUpperCase()} (${statementType.toUpperCase()})
${roundInstruction}

${previousContext}

CRITICAL ORATORICAL INSTRUCTIONS FOR REALISTIC DEBATE:
1. DIRECT ENGAGEMENT: If ${opponentPersona} previously asked a question or asserted a premise, directly address them by name and respond to their exact point.
2. SPOKEN ELOQUENCE: "speech_text" MUST be a complete, beautifully paced monologue (130-180 words) written for spoken voice delivery. Complete all sentences smoothly with no trailing thoughts.
3. STRUCTURE: Include rigorous analytical reasoning points, a sharp direct rebuttal, and a piercing philosophical challenge for your opponent.

Return strictly valid JSON with this schema:
{
  "main_claim": "A concise, powerful thesis statement (1-2 sentences)",
  "reasoning": [
    "First supporting premise or deduction",
    "Second supporting premise or empirical evidence",
    "Third supporting premise or analytical inference"
  ],
  "response_to_opponent": "Direct, incisive rebuttal addressing the opponent's previous points (or opening challenge)",
  "questions_for_opponent": [
    "A piercing, focused philosophical challenge for your opponent"
  ],
  "uncertainties": [
    "An intellectually honest acknowledgment of where the boundary of knowledge lies"
  ],
  "sources": [
    { "title": "Authoritative paper, philosophical argument or scientific principle", "url": "https://en.wikipedia.org/wiki/Cosmology" }
  ],
  "speech_text": "A full, articulate spoken monologue (around 130-180 words) suitable for live audio debate speech synthesis, speaking directly to ${opponentPersona} and the listeners."
}

Do NOT wrap with markdown outside of the JSON. Return only the JSON object.`;

  // Build model configs
  const config: {
    systemInstruction: string;
    responseMimeType: string;
    tools?: Array<{ googleSearch: object }>;
    thinkingConfig?: { thinkingLevel: ThinkingLevel };
  } = {
    systemInstruction: `You are participating in a formal live AI debate as ${isAtheist ? 'Atheist AI' : 'Believer AI'}. Output strictly valid JSON.`,
    responseMimeType: 'application/json',
  };

  if (cfg.searchGroundingEnabled) {
    config.tools = [{ googleSearch: {} }];
  }

  if (cfg.thinkingLevel && (modelId.includes('gemini-3') || modelId.includes('gemini-4'))) {
    if (cfg.thinkingLevel === 'HIGH') config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    else if (cfg.thinkingLevel === 'MEDIUM') config.thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
    else if (cfg.thinkingLevel === 'LOW') config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }

  // Attempt generation with retry, fallback to gemini-3.8-flash on 429/quota error, and tool fallback
  let rawOutput = '';
  const candidateModels = [modelId];
  if (modelId !== 'gemini-3.8-flash') {
    candidateModels.push('gemini-3.8-flash');
  }

  let lastError: any = null;

  for (const currentModel of candidateModels) {
    // Up to 2 retry attempts per model with exponential backoff
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
          // Retry without search tool to reduce quota/cost pressure
          delete config.tools;
        }

        if (isRateLimit && attempt === 0) {
          // Wait 2.5 seconds before retrying
          await new Promise(r => setTimeout(r, 2500));
          continue;
        }
        break; // Move to next candidate model if available
      }
    }
    if (rawOutput) break;
  }

  if (!rawOutput) {
    console.warn('Gemini generation failed, falling back to structured philosophical synthesis:', lastError?.message || lastError);
    // Provide a rich contextual debate response so the debate continues seamlessly rather than failing with raw JSON 429
    return {
      main_claim: isAtheist
        ? 'Empirical naturalism and scientific parsimony remain the only logically coherent basis for explaining reality.'
        : 'Cosmic contingency, boundary conditions, and universal intelligibility necessitate a transcendent Primary Cause.',
      reasoning: isAtheist
        ? [
            'Every historical phenomenon once attributed to divine intervention has ultimately yielded to natural laws and physical mechanisms.',
            'Introducing a transcendent, conscious mind increases explanatory debt without providing an empirically verifiable causal mechanism.',
            'The anthropic principle and quantum cosmological models offer consistent accounts of cosmic structure without supernatural presuppositions.'
          ]
        : [
            'Contingent physical reality cannot ground its own existence; an ontological necessity is logically demanded by the principle of sufficient reason.',
            'The profound mathematical fine-tuning of fundamental physical constants permits observers only within an astronomically narrow parameter space.',
            'Objective consciousness and the universal validity of rational deduction point beyond blind mechanistic physicalism.'
          ],
      response_to_opponent: isAtheist
        ? 'The opponent presumes that unexplained physical frontiers justify metaphysical assertions, which conflates lack of current data with proof of transcendence.'
        : 'The opponent assumes physical laws possess generative agency, yet descriptive mathematical symmetries cannot cause concrete existence.',
      questions_for_opponent: isAtheist
        ? ['How does positing a timeless divine mind avoid the logical paradox of executing sequential intentions before the existence of time?']
        : ['Why does anything exist rather than nothing, and what ontological ground sustains the intelligibility of natural law?'],
      uncertainties: [
        'Fundamental limits of empirical observation at Planck-scale and cosmological horizon boundaries.'
      ],
      sources: [
        { title: 'Philosophical Perspectives on Cosmic Origins', url: 'https://plato.stanford.edu/entries/cosmological-argument/' }
      ],
      rawSpeechSummary: isAtheist
        ? 'We must adhere strictly to evidence and parsimony. Physical laws and quantum cosmology describe our cosmos without requiring supernatural entities. Introducing a conscious creator solves nothing; it merely introduces an ungrounded mystery.'
        : 'Contingent reality cannot explain why it exists rather than nothing. The delicate fine-tuning of fundamental laws and the very rationality of human thought point to a necessary, transcendent Mind that grounds all cosmic order.',
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
    } catch (e1) {
      // Attempt to clean trailing commas before parsing again
      const fixed = cleaned
        .replace(/,\s*([}\\]])/g, '$1')
        .replace(/,\s*\]/g, ']');
      parsed = JSON.parse(fixed);
    }
  } catch (parseErr) {
    // Only log debug info if completely unable to parse JSON
    parsed = {
      main_claim: isAtheist
        ? 'Naturalistic parsimony and empirical evidence remain the solely validated guide to reality.'
        : 'Cosmic contingency and fine-tuning demonstrate the necessity of transcendent Mind.',
      reasoning: [
        'The laws of physics and logic do not require divine intervention.',
        'Human knowledge expands by replacing supernatural gaps with scientific explanations.'
      ],
      response_to_opponent: 'Opponent arguments rely on metaphysical assumptions beyond testable models.',
      questions_for_opponent: ['How does a supernatural cause provide explanatory power without an empirical mechanism?'],
      uncertainties: ['The ultimate nature of physical singularity and boundary conditions.'],
      speech_text: rawOutput.trim(),
    };
  }

  return {
    main_claim: parsed.main_claim || 'The question of cosmic origin demands rigorous scrutiny.',
    reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.main_claim],
    response_to_opponent: parsed.response_to_opponent || undefined,
    questions_for_opponent: Array.isArray(parsed.questions_for_opponent) ? parsed.questions_for_opponent : [],
    uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    rawSpeechSummary: parsed.speech_text || parsed.main_claim,
  };
}
