import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import {
  testGeminiConnection,
  testProviderConnection,
  testVoiceAudio,
  synthesizeDebateSpeech,
} from './server/geminiService.ts';
import { PROVIDER_CATALOGS } from './server/providers/catalog.ts';
import { fetchLiveProviderModels } from './server/providers/providerManager.ts';
import type { AIProvider } from './server/types.ts';
import { orchestrator } from './server/orchestrator.ts';
import { getAudioFilePath } from './server/audioStorage.ts';
import { getMediaFilePath } from './server/mediaStorage.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// AI Settings & Admin Auth (Open Access)
// ----------------------------------------------------

app.post('/api/admin/login', (req: Request, res: Response) => {
  const token = `adm_open_${Date.now()}`;
  res.json({ success: true, token, message: 'Admin access open.' });
});

app.get('/api/admin/check-auth', (req: Request, res: Response) => {
  res.json({ authenticated: true });
});

app.post('/api/admin/logout', (req: Request, res: Response) => {
  res.json({ success: true });
});

// ----------------------------------------------------
// Debater Profile Endpoints
// ----------------------------------------------------

app.get('/api/profiles', (req: Request, res: Response) => {
  const profiles = db.listProfiles();
  res.json({ profiles });
});

app.post('/api/profiles', (req: Request, res: Response) => {
  const {
    name,
    provider,
    position,
    topicScope,
    persona,
    modelId,
    ttsModelId,
    voiceName,
    voiceStyle,
    voiceSpeed,
    ttsEnabled,
    searchGroundingEnabled,
    thinkingLevel,
    avatarUrl,
    accentColor,
    status,
    rawApiKey,
    rawApiKeys,
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Debater profile display name is required.' });
    return;
  }
  if (!position || typeof position !== 'string' || position.trim() === '') {
    res.status(400).json({ error: 'Debate side / position is required.' });
    return;
  }

  try {
    const created = db.createProfile({
      name: name.trim(),
      provider: provider || 'gemini',
      position: position.trim(),
      topicScope: topicScope?.trim() || 'All Topics',
      persona: persona?.trim() || 'An articulate, rigorous debate specialist.',
      modelId: modelId?.trim() || 'gemini-3.8-flash',
      ttsModelId: ttsModelId?.trim() || 'gemini-3.8-flash-lite-tts',
      voiceName: voiceName?.trim() || 'Fenrir',
      voiceStyle: voiceStyle?.trim() || 'Analytical and confident',
      voiceSpeed: Number(voiceSpeed) || 1.0,
      ttsEnabled: ttsEnabled ?? true,
      searchGroundingEnabled: searchGroundingEnabled ?? true,
      thinkingLevel: thinkingLevel || 'HIGH',
      avatarUrl: avatarUrl?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
      accentColor: accentColor || 'cyan',
      status: status || 'enabled',
      rawApiKey: typeof rawApiKey === 'string' && rawApiKey.trim() !== '' ? rawApiKey.trim() : undefined,
      rawApiKeys: Array.isArray(rawApiKeys) ? rawApiKeys : undefined,
    });
    res.status(201).json({ success: true, profile: created });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

app.get('/api/profiles/:id', (req: Request, res: Response) => {
  const profile = db.getPublicProfile(req.params.id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ profile });
});

app.put('/api/profiles/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateProfile(req.params.id, req.body);
    res.json({ success: true, profile: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

app.delete('/api/profiles/:id', (req: Request, res: Response) => {
  const result = db.deleteProfile(req.params.id);
  if (!result.success) {
    res.status(409).json({ error: result.error || 'Failed to delete profile.' });
    return;
  }
  res.json({ success: true, message: 'Profile deleted successfully.' });
});

app.post('/api/profiles/:id/test', async (req: Request, res: Response) => {
  const { apiKeyOverride, modelIdOverride, providerOverride } = req.body;
  const result = await testProviderConnection(req.params.id, apiKeyOverride, modelIdOverride, providerOverride);
  res.json(result);
});

app.post('/api/profiles/:id/test-voice', async (req: Request, res: Response) => {
  const { apiKeyOverride, ttsModelOverride, voiceOverride, styleOverride, providerOverride } = req.body;
  const result = await testVoiceAudio(req.params.id, apiKeyOverride, ttsModelOverride, voiceOverride, styleOverride, providerOverride);
  res.json(result);
});

// ----------------------------------------------------
// AI Providers & Dynamic Model Discovery Endpoints
// ----------------------------------------------------

app.get('/api/providers', (req: Request, res: Response) => {
  res.json({
    providers: PROVIDER_CATALOGS,
  });
});

app.get('/api/providers/:provider/models', async (req: Request, res: Response) => {
  const provider = req.params.provider as AIProvider;
  let apiKey = (req.query.apiKey as string) || '';
  const profileId = (req.query.profileId as string) || '';

  if (!apiKey && profileId) {
    const profile = db.getRawProfile(profileId);
    if (profile) {
      apiKey = db.resolveProfileApiKey(profile) || '';
    }
  }

  const models = await fetchLiveProviderModels(provider, apiKey);
  res.json({ provider, models });
});

app.post('/api/providers/test-connection', async (req: Request, res: Response) => {
  const { provider, apiKey, modelId } = req.body;
  if (!provider) {
    res.status(400).json({ error: 'Provider is required' });
    return;
  }
  const result = await testProviderConnection('direct-test', apiKey, modelId, provider as AIProvider);
  res.json(result);
});

app.post('/api/providers/test-voice', async (req: Request, res: Response) => {
  const { provider, apiKey, ttsModelId, voiceName } = req.body;
  if (!provider) {
    res.status(400).json({ error: 'Provider is required' });
    return;
  }
  const result = await testVoiceAudio('direct-test', apiKey, ttsModelId, voiceName, undefined, provider as AIProvider);
  res.json(result);
});

// ----------------------------------------------------
// Legacy AI API Settings Routes (Backward Compatibility)
// ----------------------------------------------------

app.get('/api/admin/ai-config', (req: Request, res: Response) => {
  const atheist = db.getPublicConfig('atheist');
  const believer = db.getPublicConfig('believer');
  res.json({ atheist, believer });
});

app.put('/api/admin/ai-config/:persona', (req: Request, res: Response) => {
  const persona = req.params.persona;
  const updated = db.updateConfig(persona, req.body);
  res.json({ success: true, config: updated });
});

app.post('/api/admin/ai-config/:persona/test', async (req: Request, res: Response) => {
  const { apiKeyOverride, modelIdOverride } = req.body;
  const result = await testGeminiConnection(req.params.persona, apiKeyOverride, modelIdOverride);
  res.json(result);
});

app.post('/api/admin/ai-config/:persona/test-voice', async (req: Request, res: Response) => {
  const { apiKeyOverride, ttsModelOverride, voiceOverride, styleOverride } = req.body;
  const result = await testVoiceAudio(req.params.persona, apiKeyOverride, ttsModelOverride, voiceOverride, styleOverride);
  res.json(result);
});

app.delete('/api/admin/ai-config/:persona', (req: Request, res: Response) => {
  const updated = db.removeApiKey(req.params.persona);
  res.json({ success: true, message: `Removed stored API key for ${req.params.persona}`, config: updated });
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
    debater1: d.debater1,
    debater2: d.debater2,
    messageCount: d.messages.length,
    votes: d.votes,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
  res.json({ debates });
});

app.post('/api/debates', (req: Request, res: Response) => {
  const {
    title,
    topic,
    category,
    debater1Id,
    debater2Id,
    debater1Position,
    debater2Position,
    totalTurns,
    mode,
    playbackMode,
    language,
    thinkingEnabled,
    searchEnabled,
  } = req.body;

  if (!topic || topic.trim() === '') {
    res.status(400).json({ error: 'Debate topic is required.' });
    return;
  }

  try {
    const created = db.createDebate({
      title: title || topic.slice(0, 60),
      topic,
      category,
      debater1Id,
      debater2Id,
      debater1Position,
      debater2Position,
      totalTurns: Number(totalTurns) || 6,
      mode,
      playbackMode,
      language,
      thinkingEnabled,
      searchEnabled,
    });

    res.status(201).json({ success: true, debate: created });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

app.get('/api/debates/:id', (req: Request, res: Response) => {
  const debate = db.getDebate(req.params.id);
  if (!debate) {
    res.status(404).json({ error: 'Debate not found' });
    return;
  }
  res.json({ debate });
});

app.delete('/api/debates/:id', (req: Request, res: Response) => {
  const debateId = req.params.id;
  const existing = db.getDebate(debateId);
  if (!existing) {
    res.status(404).json({ error: 'Debate not found' });
    return;
  }

  // Abort running background processes and notify connected SSE clients
  orchestrator.cancelDebateJobs(debateId);

  // Permanently delete debate and cascaded data
  const deleted = db.deleteDebate(debateId);
  if (deleted) {
    res.json({ success: true, message: 'Debate and associated data permanently deleted.' });
  } else {
    res.status(500).json({ error: 'Failed to delete debate.' });
  }
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

  // Verify that required API keys or environment fallbacks exist for both debaters
  const d1Key = db.resolveProfileApiKey(debate.debater1.id);
  const d2Key = db.resolveProfileApiKey(debate.debater2.id);

  if (!d1Key || !d2Key) {
    res.status(400).json({
      error: `Missing Gemini API configuration for one or both debaters (${debate.debater1.name}: ${d1Key ? 'OK' : 'MISSING'}, ${debate.debater2.name}: ${d2Key ? 'OK' : 'MISSING'}). Please configure them in Settings -> AI Debater Profiles.`,
      missing: {
        debater1: !d1Key,
        debater2: !d2Key,
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

// On-Demand and retry audio synthesis for a message
app.post([
  '/api/debates/:id/retry-audio/:messageId',
  '/api/debates/:id/synthesize-audio/:messageId',
  '/api/debates/:id/turns/:messageId/play-audio',
], async (req: Request, res: Response) => {
  const { id, messageId } = req.params;
  try {
    const audioResult = await orchestrator.synthesizeTurnAudio(id, messageId);
    res.json({ success: true, audioUrl: audioResult.audioUrl, duration: audioResult.durationSeconds, cached: audioResult.cached });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
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
  const { voterFingerprint, side, persona, reasoningNote } = req.body;
  const target = (side || persona) as 'debater1' | 'debater2' | 'atheist' | 'believer';

  if (!target) {
    res.status(400).json({ error: 'Invalid vote selection. Side or debater must be specified.' });
    return;
  }

  const fingerprint = voterFingerprint || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous_guest';

  try {
    const result = db.castVote(req.params.id, fingerprint, target, reasoningNote);
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

  res.setHeader('Access-Control-Allow-Origin', '*');
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
// Media (Video / Image) Storage & Streaming Endpoints
// ----------------------------------------------------

app.get('/api/media/:mediaFile', (req: Request, res: Response) => {
  const mediaFile = req.params.mediaFile;
  const filePath = getMediaFilePath(mediaFile);
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).send('Media file not found');
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.mp4' ? 'video/mp4' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'application/octet-stream';

  const range = req.headers.range;
  if (range && contentType.startsWith('video/')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentType,
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
