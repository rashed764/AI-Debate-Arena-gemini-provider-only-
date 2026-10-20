import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { AIProvider, ProviderModelInfo } from '../types.ts';
import type { GenerationParams, SynthesisParams, ProviderExecutionResult } from './types.ts';
import { PROVIDER_CATALOGS } from './catalog.ts';
import { sanitizeErrorMessage } from '../crypto.ts';

// Detects rate limit, quota exhaustion, or invalid auth errors for automatic failover
export function isRateLimitOrAuthError(error: unknown): boolean {
  if (!error) return false;
  const str = String(error instanceof Error ? error.message : error).toLowerCase();
  const status = (error as any)?.status || (error as any)?.statusCode || 0;

  return (
    status === 429 ||
    status === 401 ||
    status === 403 ||
    str.includes('429') ||
    str.includes('rate limit') ||
    str.includes('resource_exhausted') ||
    str.includes('quota') ||
    str.includes('insufficient_quota') ||
    str.includes('too many requests') ||
    str.includes('api_key_invalid') ||
    str.includes('unauthorized') ||
    str.includes('credit limit') ||
    str.includes('billing')
  );
}

// Executes an async task across an array of API keys with seamless failover
export async function executeWithKeyFailover<T>(
  provider: AIProvider,
  keys: string[],
  operationName: string,
  taskFn: (activeKey: string, keyIndex: number) => Promise<T>
): Promise<ProviderExecutionResult<T>> {
  const validKeys = (keys || []).map(k => k.trim()).filter(Boolean);

  if (validKeys.length === 0) {
    throw new Error(
      `No valid API key configured for provider "${provider}". Please add an API key in Settings -> AI Debater Profiles.`
    );
  }

  const failoverLogs: string[] = [];
  let switchedKeysCount = 0;

  for (let i = 0; i < validKeys.length; i++) {
    const activeKey = validKeys[i];
    const keyMask = activeKey.length > 8 ? `${activeKey.slice(0, 4)}...${activeKey.slice(-4)}` : '****';

    try {
      const data = await taskFn(activeKey, i);
      return {
        data,
        provider,
        usedKeyIndex: i,
        usedKeyMask: keyMask,
        switchedKeysCount,
        failoverLogs,
      };
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      const safeMsg = sanitizeErrorMessage(rawMsg, validKeys);
      const isRecoverable = isRateLimitOrAuthError(err);

      console.warn(
        `[KeyPoolFailover] ${provider} key #${i + 1} (${keyMask}) failed during "${operationName}": ${safeMsg}`
      );

      failoverLogs.push(`Key #${i + 1} (${keyMask}) failed: ${safeMsg}`);

      if (isRecoverable && i < validKeys.length - 1) {
        switchedKeysCount++;
        console.info(
          `[KeyPoolFailover] Rate limit or quota error detected on key #${i + 1}. Automatically failing over to backup key #${i + 2}...`
        );
        await new Promise(r => setTimeout(r, 600));
        continue;
      }

      if (i === validKeys.length - 1) {
        throw new Error(
          `All ${validKeys.length} configured ${provider.toUpperCase()} API key(s) failed. Last error: ${safeMsg}`
        );
      } else {
        throw new Error(`${provider.toUpperCase()} operation failed: ${safeMsg}`);
      }
    }
  }

  throw new Error(`Unexpected end of key pool for provider "${provider}".`);
}

// Universal Text Generation
export async function generateTextWithProvider(
  params: GenerationParams,
  key: string
): Promise<{ text: string; model: string }> {
  const { provider, modelId, systemInstruction, userPrompt, temperature = 0.7, searchGrounding = true, thinkingLevel = 'HIGH' } = params;

  if (provider === 'gemini') {
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    // Ensure valid, supported Gemini text model
    let effectiveModel = modelId || 'gemini-3.8-flash';
    if (
      effectiveModel === 'gemini-3.5-flash-lite' ||
      effectiveModel === 'gemini-3.6-flash' ||
      effectiveModel.startsWith('gemini-1.5') ||
      effectiveModel.startsWith('gemini-2.0')
    ) {
      effectiveModel = 'gemini-3.8-flash';
    }

    const isArgon = effectiveModel.includes('argon') || effectiveModel.includes('gemini-4');
    const config: any = {
      systemInstruction: systemInstruction || undefined,
      temperature,
    };

    if (isArgon && thinkingLevel) {
      config.thinkingConfig = {
        thinkingLevel: thinkingLevel === 'MINIMAL' ? ThinkingLevel.LOW : (thinkingLevel as ThinkingLevel),
      };
    }

    if (searchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await client.models.generateContent({
      model: effectiveModel,
      contents: userPrompt,
      config,
    });

    const text = response.text || '';
    if (!text.trim()) {
      throw new Error(`Received empty text from Gemini model ${effectiveModel}.`);
    }
    return { text: text.trim(), model: effectiveModel };
  }

  // OpenAI, Groq, OpenRouter share standard OpenAI chat completions format
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };

  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    headers['HTTP-Referer'] = 'https://aistudio.google.com';
    headers['X-Title'] = 'AI Debate Arena';
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: userPrompt });

  const body: any = {
    model: modelId,
    messages,
    temperature,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errBody = '';
    try {
      errBody = await res.text();
    } catch {
      // ignore
    }
    const errObj = (() => {
      try {
        return JSON.parse(errBody);
      } catch {
        return null;
      }
    })();
    const errMsg = errObj?.error?.message || errBody || `HTTP ${res.status} ${res.statusText}`;
    const err: any = new Error(errMsg);
    err.status = res.status;
    throw err;
  }

  const json: any = await res.json();
  const reply = json.choices?.[0]?.message?.content || '';
  if (!reply.trim()) {
    throw new Error(`Received empty response from ${provider} model ${modelId}.`);
  }

  return { text: reply.trim(), model: modelId };
}

// Universal Speech Synthesis (TTS)
export async function synthesizeSpeechWithProvider(
  params: SynthesisParams,
  key: string
): Promise<{ audioBuffer: Buffer; contentType: string }> {
  const { provider, ttsModelId, voiceName, voiceSpeed = 1.0, text } = params;

  // OpenAI native TTS
  if (provider === 'openai' || ttsModelId.startsWith('tts-') || ttsModelId.includes('openai')) {
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const chosenVoice = validVoices.includes(voiceName.toLowerCase()) ? voiceName.toLowerCase() : 'onyx';
    const chosenModel = ttsModelId.includes('hd') ? 'tts-1-hd' : 'tts-1';

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        input: text,
        voice: chosenVoice,
        speed: Math.min(2.0, Math.max(0.5, voiceSpeed)),
        response_format: 'mp3',
      }),
    });

    if (!res.ok) {
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {
        // ignore
      }
      const err: any = new Error(`OpenAI TTS Error (${res.status}): ${errBody}`);
      err.status = res.status;
      throw err;
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      contentType: 'audio/mpeg',
    };
  }

  // Google Gemini native TTS
  const client = new GoogleGenAI({
    apiKey: key,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  // Ensure valid, supported Gemini TTS model (gemini-3.8-flash-lite-tts or gemini-3.8-flash-tts)
  let effectiveTtsModel = ttsModelId || 'gemini-3.8-flash-lite-tts';
  if (
    effectiveTtsModel === 'gemini-3.5-flash-tts' ||
    effectiveTtsModel === 'gemini-3.1-flash-lite-tts' ||
    !effectiveTtsModel.includes('3.8')
  ) {
    effectiveTtsModel = 'gemini-3.8-flash-lite-tts';
  }

  // Prebuilt Gemini voices: Puck, Charon, Kore, Fenrir, Zephyr
  const allowedGeminiVoices = ['Fenrir', 'Kore', 'Puck', 'Charon', 'Zephyr', 'Aoede'];
  const effectiveVoice = allowedGeminiVoices.includes(voiceName) ? voiceName : 'Fenrir';

  const response = await client.models.generateContent({
    model: effectiveTtsModel,
    contents: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: effectiveVoice,
          },
        },
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
      const pcmBuffer = Buffer.from(part.inlineData.data || '', 'base64');
      // If already has RIFF header (Unary WAV format from Gemini 3.8 TTS default), use directly
      const isAlreadyWav = pcmBuffer.length >= 4 && pcmBuffer.subarray(0, 4).toString('ascii') === 'RIFF';
      const wavBuffer = isAlreadyWav ? pcmBuffer : convertPcmToWav(pcmBuffer, 24000, 1, 16);
      return {
        audioBuffer: wavBuffer,
        contentType: 'audio/wav',
      };
    }
  }

  throw new Error('No audio stream returned from Gemini TTS model.');
}

// Helper to convert raw 16-bit PCM to standard playable RIFF WAV
function convertPcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

// Live Model Discovery
export async function fetchLiveProviderModels(
  provider: AIProvider,
  apiKey: string
): Promise<ProviderModelInfo[]> {
  const key = (apiKey || '').trim();
  if (!key) {
    return PROVIDER_CATALOGS[provider]?.textModels || [];
  }

  try {
    if (provider === 'gemini') {
      const client = new GoogleGenAI({ apiKey: key });
      const pager = await client.models.list();
      const models: ProviderModelInfo[] = [];

      for await (const m of pager) {
        const id = m.name?.replace(/^models\//, '') || '';
        if (id && (id.includes('flash') || id.includes('pro') || id.includes('argon') || id.includes('gemini'))) {
          const isTts = id.includes('tts');
          models.push({
            id,
            name: `${m.displayName || id}${isTts ? ' (Voice TTS)' : ''}`,
            provider: 'gemini',
            type: isTts ? 'tts' : 'text',
            description: m.description || undefined,
            isRecommended: id === 'gemini-3.8-flash' || id === 'gemini-3.8-flash-lite-tts',
          });
        }
      }

      return models.length > 0 ? models : PROVIDER_CATALOGS.gemini.textModels;
    }

    let url = 'https://api.openai.com/v1/models';
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };

    if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/models';
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/models';
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to query ${provider} models: HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const rawList = Array.isArray(data.data) ? data.data : [];

    const models: ProviderModelInfo[] = rawList
      .filter((m: any) => m && m.id && typeof m.id === 'string')
      .map((m: any) => {
        const id = m.id;
        const isTts = id.includes('tts');
        return {
          id,
          name: m.name || id,
          provider,
          type: isTts ? 'tts' : 'text',
          description: m.description || undefined,
          isRecommended: id.includes('gpt-4o') || id.includes('llama-3.3-70b') || id.includes('claude-3.7'),
        };
      });

    return models.length > 0 ? models : PROVIDER_CATALOGS[provider].textModels;
  } catch (err) {
    console.warn(`Failed to dynamically fetch models from ${provider}:`, err);
    return PROVIDER_CATALOGS[provider]?.textModels || [];
  }
}
