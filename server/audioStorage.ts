import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const AUDIO_DIR = path.join(DATA_DIR, 'audio_cache');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

export interface CachedAudioMeta {
  audioId: string;
  filePath: string;
  fileSizeBytes: number;
  durationSeconds: number;
  mimeType: string;
  createdAt: string;
}

/**
 * Generates a stable cache key for speech audio based on text, voice, model and persona.
 */
export function computeAudioCacheKey(persona: string, voiceName: string, text: string): string {
  return crypto.createHash('sha256').update(`${persona}:${voiceName}:${text.trim()}`).digest('hex');
}

/**
 * Validates and converts any raw PCM or malformed audio buffer into a standards-compliant
 * 24kHz 16-bit mono WAV buffer with correct RIFF and data chunk headers.
 */
export function ensureValidWavBuffer(
  rawBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  if (!rawBuffer || rawBuffer.length === 0) {
    return Buffer.alloc(44);
  }

  // Check if buffer already has a RIFF WAVE container
  if (
    rawBuffer.length >= 12 &&
    rawBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    rawBuffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    // Clone buffer so we can verify and fix chunk lengths if needed
    const buf = Buffer.from(rawBuffer);
    const expectedRiffSize = buf.length - 8;
    buf.writeUInt32LE(expectedRiffSize, 4);

    // Scan for 'data' chunk
    let offset = 12;
    let foundData = false;

    while (offset + 8 <= buf.length) {
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);

      if (chunkId === 'data') {
        foundData = true;
        const actualRemainingData = buf.length - (offset + 8);
        // If declared chunkSize is 0 or smaller than actual audio bytes, fix it!
        if (chunkSize === 0 || chunkSize < actualRemainingData) {
          buf.writeUInt32LE(actualRemainingData, offset + 4);
        }
        break;
      }

      // Advance to next chunk (chunks are word-aligned in RIFF)
      const paddedSize = chunkSize + (chunkSize % 2);
      offset += 8 + paddedSize;
    }

    if (foundData) {
      return buf;
    }
  }

  // If not a valid WAV container or data chunk was missing, wrap raw PCM with standard 44-byte header
  const pcmData = rawBuffer;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Checks if audio for the given cache key already exists on disk.
 */
export function getExistingCachedAudio(cacheKey: string): CachedAudioMeta | null {
  const filePath = path.join(AUDIO_DIR, `${cacheKey}.wav`);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    // Ignore corrupt or zero-byte cached audio
    if (stats.size <= 44) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
      return null;
    }
    // 24kHz, 16-bit mono = 48,000 bytes/sec + 44 byte header
    const pcmBytes = Math.max(0, stats.size - 44);
    const duration = +(pcmBytes / 48000).toFixed(2);
    return {
      audioId: cacheKey,
      filePath,
      fileSizeBytes: stats.size,
      durationSeconds: Math.max(1, duration),
      mimeType: 'audio/wav',
      createdAt: stats.birthtime.toISOString(),
    };
  }
  return null;
}

/**
 * Saves a WAV audio buffer to the cache directory after verifying WAV integrity.
 */
export function saveAudioFile(cacheKey: string, audioBuffer: Buffer): CachedAudioMeta {
  const filePath = path.join(AUDIO_DIR, `${cacheKey}.wav`);
  const validatedBuffer = ensureValidWavBuffer(audioBuffer);
  fs.writeFileSync(filePath, validatedBuffer);
  const stats = fs.statSync(filePath);
  const pcmBytes = Math.max(0, stats.size - 44);
  const duration = +(pcmBytes / 48000).toFixed(2);

  return {
    audioId: cacheKey,
    filePath,
    fileSizeBytes: stats.size,
    durationSeconds: Math.max(1, duration),
    mimeType: 'audio/wav',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the audio file stream or buffer for HTTP response.
 */
export function getAudioFilePath(audioId: string): string | null {
  // Sanitize filename to prevent directory traversal
  const safeId = path.basename(audioId);
  const filePath = path.join(AUDIO_DIR, `${safeId}.wav`);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
