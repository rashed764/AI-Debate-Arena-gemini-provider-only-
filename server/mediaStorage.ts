import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

export function saveMediaBuffer(buffer: Buffer, extension: string = 'mp4'): { id: string; filename: string; filePath: string } {
  const id = `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const filename = `${id}.${extension.replace(/^\./, '')}`;
  const filePath = path.join(MEDIA_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return { id, filename, filePath };
}

export function getMediaFilePath(filename: string): string | null {
  const safeFilename = path.basename(filename);
  const filePath = path.join(MEDIA_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

export { MEDIA_DIR };
