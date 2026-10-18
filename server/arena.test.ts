import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, maskApiKey, sanitizeErrorMessage } from './crypto.ts';
import { db } from './db.ts';
import { computeAudioCacheKey, ensureValidWavBuffer } from './audioStorage.ts';
import { orchestrator } from './orchestrator.ts';

test('Encryption: encrypts and decrypts secrets accurately using AES-256-GCM', () => {
  const secret = 'AIzaSyTestKey_1234567890abcdefghijklmnopqrstuvwxyz';
  const encrypted = encryptSecret(secret);
  
  assert.notEqual(encrypted, secret);
  assert.match(encrypted, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

  const decrypted = decryptSecret(encrypted);
  assert.equal(decrypted, secret);
});

test('Key Masking: masks secrets without leaking middle characters', () => {
  assert.equal(maskApiKey('AIzaSyAbc1234XYZ9'), '••••••••••••XYZ9');
  assert.equal(maskApiKey(''), '');
  assert.equal(maskApiKey('123'), '••••');
});

test('Error Sanitization: strips sensitive API keys from error messages', () => {
  const testKey = 'AIzaSySecretApiKey9876543210';
  const rawError = `Request failed: invalid authentication token ${testKey} returned from endpoint`;
  const sanitized = sanitizeErrorMessage(rawError, [testKey]);
  
  assert.doesNotMatch(sanitized, new RegExp(testKey));
  assert.ok(sanitized.includes('[PROTECTED_API_KEY]'));
});

test('Separation of Credentials: Atheist and Believer configs are completely independent', () => {
  const originalAtheist = db.getRawConfig('atheist');
  const originalBeliever = db.getRawConfig('believer');

  try {
    const atheistKey = 'AIzaSyAtheistSecretKey_AAAA1111';
    const believerKey = 'AIzaSyBelieverSecretKey_BBBB2222';

    // 1. Update Atheist configuration
    db.updateConfig('atheist', {
      rawApiKey: atheistKey,
      modelId: 'gemini-3.8-flash',
      voiceName: 'Fenrir',
    });

    // 2. Update Believer configuration
    db.updateConfig('believer', {
      rawApiKey: believerKey,
      modelId: 'gemini-4-argon',
      voiceName: 'Kore',
    });

    // Check stored keys
    const resolvedAtheist = db.resolveApiKey('atheist');
    const resolvedBeliever = db.resolveApiKey('believer');

    assert.equal(resolvedAtheist, atheistKey);
    assert.equal(resolvedBeliever, believerKey);

    // Check public config: GET returns masked keys and NEVER plaintext
    const atheistPub = db.getPublicConfig('atheist');
    const believerPub = db.getPublicConfig('believer');

    assert.equal(atheistPub.hasKey, true);
    assert.equal(believerPub.hasKey, true);
    assert.equal(atheistPub.keyMask, '••••••••••••1111');
    assert.equal(believerPub.keyMask, '••••••••••••2222');
    assert.equal(atheistPub.modelId, 'gemini-3.8-flash');
    assert.equal(believerPub.modelId, 'gemini-4-argon');

    // Verify removing Atheist does NOT affect Believer
    db.removeApiKey('atheist');
    const atheistAfter = db.getPublicConfig('atheist');
    const believerAfter = db.getPublicConfig('believer');

    assert.equal(atheistAfter.keySource === 'database', false);
    assert.equal(db.resolveApiKey('believer'), believerKey);
  } finally {
    // Restore original configs cleanly
    db.updateConfig('atheist', {
      rawApiKey: originalAtheist.encryptedApiKey ? decryptSecret(originalAtheist.encryptedApiKey) : '',
      modelId: originalAtheist.modelId || 'gemini-3.8-flash',
      voiceName: originalAtheist.voiceName || 'Fenrir',
    });
    db.updateConfig('believer', {
      rawApiKey: originalBeliever.encryptedApiKey ? decryptSecret(originalBeliever.encryptedApiKey) : '',
      modelId: originalBeliever.modelId || 'gemini-3.8-flash',
      voiceName: originalBeliever.voiceName || 'Kore',
    });
  }
});

test('Audio Caching: cache keys are deterministic based on persona, voice and text', () => {
  const key1 = computeAudioCacheKey('atheist', 'Fenrir', 'The universe is governed by physical laws.');
  const key2 = computeAudioCacheKey('atheist', 'Fenrir', 'The universe is governed by physical laws.');
  const key3 = computeAudioCacheKey('believer', 'Kore', 'The universe is governed by physical laws.');

  assert.equal(key1, key2);
  assert.notEqual(key1, key3);
});

test('Debate Engine & Turn Planning: sequences rounds and turns correctly', () => {
  const debate = db.createDebate({
    title: 'Unit Test Debate',
    topic: 'Does mathematical order require a transcendent mind?',
    playbackMode: 'text_and_voice',
  });

  assert.equal(debate.status, 'idle');
  assert.equal(debate.messages.length, 0);

  // Turn 0: Opening Atheist
  const plan0 = orchestrator.getNextTurnPlan(debate);
  assert.ok(plan0);
  assert.equal(plan0.persona, 'atheist');
  assert.equal(plan0.statementType, 'opening');
  assert.equal(plan0.roundNumber, 1);

  // Simulate turn 0 added
  db.addMessage(debate.id, {
    id: 'test-m-0',
    debateId: debate.id,
    turnIndex: 0,
    roundNumber: 1,
    roundName: 'Opening Statements',
    persona: 'atheist',
    speakerName: 'Atheist AI',
    statementType: 'opening',
    mainClaim: 'Math is a descriptive human abstraction.',
    reasoning: ['Axioms are human constructs.'],
    rawText: 'Math is an abstraction.',
    audioStatus: 'none',
    createdAt: new Date().toISOString(),
  });

  const updatedDebate = db.getDebate(debate.id)!;
  const plan1 = orchestrator.getNextTurnPlan(updatedDebate);
  assert.ok(plan1);
  assert.equal(plan1.persona, 'believer');
  assert.equal(plan1.statementType, 'opening');
  assert.equal(plan1.roundNumber, 1);

  // Clean up test debate
  db.deleteDebate(debate.id);
});

test('Voting System: enforces one-vote per fingerprint and tallies percentages accurately', () => {
  const debate = db.createDebate({
    title: 'Voting Test Debate',
    topic: 'Free will vs Determinism',
  });

  const voterA = 'user_ip_192_168_1_50';
  const voterB = 'user_ip_192_168_1_51';

  // Voter A votes for atheist
  const vote1 = db.castVote(debate.id, voterA, 'atheist');
  assert.equal(vote1.success, true);
  assert.equal(vote1.votes.atheist, 1);
  assert.equal(vote1.votes.total, 1);

  // Duplicate vote by voter A must be rejected
  const voteDup = db.castVote(debate.id, voterA, 'believer');
  assert.equal(voteDup.success, false);
  assert.equal(voteDup.alreadyVoted, true);
  assert.equal(voteDup.votes.atheist, 1);
  assert.equal(voteDup.votes.believer, 0);

  // Voter B votes for believer
  const vote2 = db.castVote(debate.id, voterB, 'believer');
  assert.equal(vote2.success, true);
  assert.equal(vote2.votes.atheist, 1);
  assert.equal(vote2.votes.believer, 1);
  assert.equal(vote2.votes.total, 2);

  // Clean up test debate
  db.deleteDebate(debate.id);
});

test('Audio Buffer Integrity: ensureValidWavBuffer wraps raw PCM with valid WAV header', () => {
  // 1. Raw PCM buffer (e.g. 1 second of 24kHz 16-bit mono = 48,000 bytes)
  const rawPcm = Buffer.alloc(48000, 0x12);
  const wavBuffer = ensureValidWavBuffer(rawPcm, 24000, 1, 16);

  assert.equal(wavBuffer.length, 48000 + 44);
  assert.equal(wavBuffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wavBuffer.readUInt32LE(4), 48000 + 36);
  assert.equal(wavBuffer.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wavBuffer.toString('ascii', 12, 16), 'fmt ');
  assert.equal(wavBuffer.readUInt16LE(20), 1); // PCM
  assert.equal(wavBuffer.readUInt16LE(22), 1); // 1 channel
  assert.equal(wavBuffer.readUInt32LE(24), 24000); // 24000 Hz
  assert.equal(wavBuffer.toString('ascii', 36, 40), 'data');
  assert.equal(wavBuffer.readUInt32LE(40), 48000); // 48000 data bytes
});

test('Audio Buffer Integrity: fixes truncated or zero data chunk sizes in existing WAV headers', () => {
  // Create a WAV with zero-declared data chunk size (which causes browsers to stop playing early)
  const pcm = Buffer.alloc(96000, 0x34); // 2 seconds
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(0, 4); // Corrupted size
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(0, 40); // Corrupted: declared 0 data bytes!

  const corruptedWav = Buffer.concat([header, pcm]);
  const repaired = ensureValidWavBuffer(corruptedWav, 24000, 1, 16);

  assert.equal(repaired.length, 96000 + 44);
  assert.equal(repaired.readUInt32LE(4), 96000 + 36);
  assert.equal(repaired.readUInt32LE(40), 96000); // Patched to full 96000 bytes
});
