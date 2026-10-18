import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const KEY_FILE = path.join(DATA_DIR, '.arena_master.key');

/**
 * Ensures a 32-byte master encryption key is available.
 * Uses APP_ENCRYPTION_KEY env var if provided (32-byte hex/base64/string),
 * otherwise derives and persists a local secret.
 */
function getMasterKey(): Buffer {
  const envKey = process.env.APP_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length >= 16) {
    return crypto.createHash('sha256').update(envKey.trim()).digest();
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(KEY_FILE)) {
      const raw = fs.readFileSync(KEY_FILE, 'utf-8').trim();
      if (raw.length === 64) {
        return Buffer.from(raw, 'hex');
      }
    }
    const newKey = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, newKey.toString('hex'), { mode: 0o600 });
    return newKey;
  } catch {
    // Fallback in-memory hash if fs is restricted
    return crypto.createHash('sha256').update('ai-debate-arena-fallback-salt').digest();
  }
}

const MASTER_KEY = getMasterKey();

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Format: iv_hex:tag_hex:encrypted_hex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      return '';
    }
    
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('Decryption error caught (returning empty):', err instanceof Error ? err.message : err);
    return '';
  }
}

/**
 * Safely masks an API key so only a small non-identifying suffix is visible.
 * e.g. "AIzaSyBxxxxxxxABC12" -> "••••••••••••BC12"
 */
export function maskApiKey(key?: string): string {
  if (!key || key.trim() === '') return '';
  const trimmed = key.trim();
  if (trimmed.length <= 4) return '••••';
  const suffix = trimmed.slice(-4);
  return `••••••••••••${suffix}`;
}

/**
 * Strips any sensitive API key strings or tokens from an error message.
 */
export function sanitizeErrorMessage(message: string, knownKeys: string[] = []): string {
  let clean = message || 'An unknown error occurred';
  for (const k of knownKeys) {
    if (k && k.length >= 6) {
      clean = clean.split(k).join('[PROTECTED_API_KEY]');
    }
  }
  // Generic pattern for Google API Keys: AIzaSy[A-Za-z0-9_-]{33}
  clean = clean.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[PROTECTED_API_KEY]');
  return clean;
}
