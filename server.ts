import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import { testGeminiConnection, testVoiceAudio, synthesizeDebateSpeech } from './server/geminiService.ts';
import { orchestrator } from './server/orchestrator.ts';
import { getAudioFilePath } from './server/audioStorage.ts';
import type { PersonaType } from './server/types.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory admin session storage
const validAdminSessions = new Set<string>();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  next();
}

// ----------------------------------------------------
// AI Settings Endpoints (Open Access)
// ----------------------------------------------------

app.post('/api/admin/login', (req: Request, res: Response) => {
  const token = `adm_open_${Date.now()}`;
  res.json({ success: true, token, message: 'Admin system removed; access open.' });
});

app.get('/api/admin/check-auth', (req: Request, res: Response) => {
  res.json({ authenticated: true });
});

app.post('/api/admin/logout', (req: Request, res: Response) => {
  res.json({ success: true });
});

// ----------------------------------------------------
// AI API Settings (Separate for Atheist and Believer)
// ----------------------------------------------------

app.get('/api/admin/ai-config', (req: Request, res: Response) => {
  // Public configs contain masked keys and configuration status, never raw keys
  const atheist = db.getPublicConfig('atheist');
  const believer = db.getPublicConfig('believer');
  res.json({ atheist, believer });
});

app.put('/api/admin/ai-config/:persona', (req: Request, res: Response) => {
  const persona = req.params.persona as PersonaType;
  if (persona !== 'atheist' && persona !== 'believer') {
    res.status(400).json({ error: 'Invalid persona. Must be atheist or believer.' });
    return;
  }

  const {
    rawApiKey,
    modelId,
    ttsModelId,
    voiceName,
    voiceStyle,
    voiceSpeed,
    ttsEnabled,
    searchGroundingEnabled,
    thinkingLevel,
  } = req.body;

  const updated = db.updateConfig(persona, {
    rawApiKey: typeof rawApiKey === 'string' ? rawApiKey : undefined,
    modelId,
    ttsModelId,
    voiceName,
    voiceStyle,
    voiceSpeed,
    ttsEnabled,
    searchGroundingEnabled,
    thinkingLevel,
  });

  res.json({ success: true, config: updated });
});

app.post('/api/admin/ai-config/:persona/test', async (req: Request, res: Response) => {
  const persona = req.params.persona as PersonaType;
  if (persona !== 'atheist' && persona !== 'believer') {
    res.status(400).json({ error: 'Invalid persona. Must be atheist or believer.' });
    return;
  }

  const { apiKeyOverride, modelIdOverride } = req.body;
  const result = await testGeminiConnection(persona, apiKeyOverride, modelIdOverride);
  res.json(result);
});

app.post('/api/admin/ai-config/:persona/test-voice', async (req: Request, res: Response) => {
  const persona = req.params.persona as PersonaType;
  if (persona !== 'atheist' && persona !== 'believer') {
    res.status(400).json({ error: 'Invalid persona. Must be atheist or believer.' });
    return;
  }

  const { apiKeyOverride, ttsModelOverride, voiceOverride, styleOverride } = req.body;
  const result = await testVoiceAudio(persona, apiKeyOverride, ttsModelOverride, voiceOverride, styleOverride);
  res.json(result);
});

app.delete('/api/admin/ai-config/:persona', (req: Request, res: Response) => {
  const persona = req.params.persona as PersonaType;
  if (persona !== 'atheist' && persona !== 'believer') {
    res.status(400).json({ error: 'Invalid persona. Must be atheist or believer.' });
    return;
  }

  const updated = db.removeApiKey(persona);
  res.json({ success: true, message: `Removed stored API key for ${persona}`, config: updated });
});

app.get('/api/admin/audit-logs', (req: Request, res: Response) => {
  const logs = db.getAuditLogs(100);
  res.json({ logs });
});

// ----------------------------------------------------
// Debate Endpoints
// ----------------------------------------------------

app.get('/api/debates', (req: Request, res: Response) => {
  const debates = db.listDebates().map(d => ({
    id: d.id,
    title: d.title,
    topic: d.topic,
    category: d.category,
    mode: d.mode,
    playbackMode: d.playbackMode,
    language: d.language,
    status: d.status,
    currentTurnIndex: d.currentTurnIndex,
    totalTurns: d.totalTurns,
    messageCount: d.messages.length,
    votes: d.votes,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
  res.json({ debates });
});

app.post('/api/debates', (req: Request, res: Response) => {
  const { title, topic, category, mode, playbackMode, language, thinkingEnabled, searchEnabled } = req.body;
  if (!topic || topic.trim() === '') {
    res.status(400).json({ error: 'Debate topic is required.' });
    return;
  }

  const created = db.createDebate({
    title: title || topic.slice(0, 60),
    topic,
    category,
    mode,
    playbackMode,
    language,
    thinkingEnabled,
    searchEnabled,
  });

  res.status(201).json({ success: true, debate: created });
});

app.get('/api/debates/:id', (req: Request, res: Response) => {
  const debate = db.getDebate(req.params.id);
  if (!debate) {
    res.status(404).json({ error: 'Debate not found' });
    return;
  }
  res.json({ debate });
});

app.post('/api/debates/:id/start', async (req: Request, res: Response) => {
  const debate = db.getDebate(req.params.id);
  if (!debate) {
    res.status(404).json({ error: 'Debate not found' });
    return;
  }

  if (debate.status === 'completed') {
    res.status(400).json({ error: 'Debate is already completed' });
    return;
  }

  // Verify that required keys or environment fallbacks exist
  const atheistKey = db.resolveApiKey('atheist');
  const believerKey = db.resolveApiKey('believer');
  if (!atheistKey || !believerKey) {
    res.status(400).json({
      error: 'Missing Gemini API configuration for one or both personas. Please configure them in Settings -> AI API Configuration.',
      missing: {
        atheist: !atheistKey,
        believer: !believerKey,
      },
    });
    return;
  }

  res.json({ success: true, message: 'Debate generation started' });

  // Run asynchronously
  if (debate.mode === 'automatic') {
    orchestrator.runFullAutomatic(debate.id).catch(err => {
      console.error(`Automatic debate error (${debate.id}):`, err);
    });
  } else {
    orchestrator.executeNextTurn(debate.id).catch(err => {
      console.error(`Turn execution error (${debate.id}):`, err);
    });
  }
});

app.post('/api/debates/:id/step', async (req: Request, res: Response) => {
  try {
    const turn = await orchestrator.executeNextTurn(req.params.id);
    res.json({ success: true, turn });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/debates/:id/pause', (req: Request, res: Response) => {
  orchestrator.pauseDebate(req.params.id);
  res.json({ success: true });
});

app.post('/api/debates/:id/resume', (req: Request, res: Response) => {
  orchestrator.resumeDebate(req.params.id);
  res.json({ success: true });
});

app.post('/api/debates/:id/stop', (req: Request, res: Response) => {
  orchestrator.stopDebate(req.params.id);
  res.json({ success: true });
});

// SSE Streaming Route
app.get('/api/debates/:id/stream', (req: Request, res: Response) => {
  const debateId = req.params.id;
  const debate = db.getDebate(debateId);
  if (!debate) {
    res.status(404).send('Debate not found');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  orchestrator.registerClient(debateId, { id: clientId, res });

  // Send initial state handshake
  res.write(`event: initial_state\ndata: ${JSON.stringify(debate)}\n\n`);

  // Keep alive ping every 15s
  const interval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    orchestrator.unregisterClient(debateId, clientId);
  });
});

// Retry audio synthesis for a message
app.post('/api/debates/:id/retry-audio/:messageId', async (req: Request, res: Response) => {
  const { id, messageId } = req.params;
  const debate = db.getDebate(id);
  if (!debate) {
    res.status(404).json({ error: 'Debate not found' });
    return;
  }
  const msg = debate.messages.find(m => m.id === messageId);
  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  try {
    db.updateMessageAudio(id, messageId, { audioStatus: 'generating' });
    const audioResult = await synthesizeDebateSpeech(msg.persona, msg.rawText);
    db.updateMessageAudio(id, messageId, {
      audioUrl: audioResult.audioUrl,
      audioDuration: audioResult.durationSeconds,
      audioStatus: 'ready',
      audioCached: audioResult.cached,
    });
    orchestrator.broadcast(id, 'audio_ready', {
      messageId,
      audioUrl: audioResult.audioUrl,
      duration: audioResult.durationSeconds,
      cached: audioResult.cached,
    });
    res.json({ success: true, audioUrl: audioResult.audioUrl });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    db.updateMessageAudio(id, messageId, {
      audioStatus: 'failed',
      audioError: errorMsg,
    });
    res.status(500).json({ error: errorMsg });
  }
});

// ----------------------------------------------------
// Audience Questions
// ----------------------------------------------------

app.post('/api/debates/:id/questions', (req: Request, res: Response) => {
  const { authorName, questionText } = req.body;
  if (!questionText || questionText.trim().length < 5) {
    res.status(400).json({ error: 'Question must be at least 5 characters long.' });
    return;
  }

  const question = db.addQuestion(req.params.id, authorName || 'Audience Member', questionText);
  if (!question) {
    res.status(404).json({ error: 'Debate not found' });
    return;
  }

  orchestrator.broadcast(req.params.id, 'question_submitted', question);
  res.status(201).json({ success: true, question });
});

// ----------------------------------------------------
// Voting
// ----------------------------------------------------

app.post('/api/debates/:id/votes', (req: Request, res: Response) => {
  const { voterFingerprint, persona, reasoningNote } = req.body;
  if (persona !== 'atheist' && persona !== 'believer') {
    res.status(400).json({ error: 'Invalid vote selection. Must be atheist or believer.' });
    return;
  }

  const fingerprint = voterFingerprint || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous_guest';

  try {
    const result = db.castVote(req.params.id, fingerprint, persona, reasoningNote);
    if (result.alreadyVoted) {
      res.status(409).json({ error: 'You have already voted on this debate.', votes: result.votes });
      return;
    }

    orchestrator.broadcast(req.params.id, 'vote_updated', result.votes);
    res.json({ success: true, votes: result.votes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

app.get('/api/debates/:id/user-vote', (req: Request, res: Response) => {
  const fingerprint = (req.query.fingerprint as string) || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous_guest';
  const info = db.hasUserVoted(req.params.id, fingerprint);
  res.json(info);
});

// ----------------------------------------------------
// Audio Serving Endpoint
// ----------------------------------------------------

app.get('/api/audio/:audioFile', (req: Request, res: Response) => {
  const audioFile = req.params.audioFile;
  const filePath = getAudioFilePath(audioFile.replace(/\.wav$/i, ''));
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).send('Audio file not found');
    return;
  }

  const stats = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/wav',
    });
    const fileStream = fs.createReadStream(filePath, { start, end });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': 'audio/wav',
      'Cache-Control': 'public, max-age=86400',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ----------------------------------------------------
// Vite Middleware / Static Serve Integration
// ----------------------------------------------------

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Debate Arena server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
