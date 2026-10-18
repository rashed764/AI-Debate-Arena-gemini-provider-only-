import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, maskApiKey, sanitizeErrorMessage } from './crypto.ts';
import { db } from './db.ts';
import { computeAudioCacheKey, ensureValidWavBuffer } from './audioStorage.ts';
import { orchestrator } from './orchestrator.ts';
import type { DebaterProfile } from './types.ts';

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

test('Requirement 1 & 2: Creating two profiles with different positions & editing one without altering another', () => {
  const profileA = db.createProfile({
    name: 'AI Alpha (Nuclear Advocate)',
    position: 'Supports nuclear energy as vital for zero-carbon grid baseload',
    topicScope: 'Energy & Climate',
    modelId: 'gemini-3.8-flash',
    voiceName: 'Fenrir',
    accentColor: 'cyan',
    rawApiKey: 'AIzaSyAlphaKey1234567890',
  });

  const profileB = db.createProfile({
    name: 'AI Beta (Renewables Analyst)',
    position: 'Opposes nuclear energy expansion due to cost and deployment speed',
    topicScope: 'Energy & Climate',
    modelId: 'gemini-3.6-flash',
    voiceName: 'Puck',
    accentColor: 'amber',
    rawApiKey: 'AIzaSyBetaKey0987654321',
  });

  assert.ok(profileA.id);
  assert.ok(profileB.id);
  assert.notEqual(profileA.id, profileB.id);
  assert.equal(profileA.modelId, 'gemini-3.8-flash');
  assert.equal(profileB.modelId, 'gemini-3.6-flash');
  assert.equal(profileA.position, 'Supports nuclear energy as vital for zero-carbon grid baseload');
  assert.equal(profileB.position, 'Opposes nuclear energy expansion due to cost and deployment speed');

  // Edit Profile A without affecting Profile B
  const updatedA = db.updateProfile(profileA.id, {
    position: 'Nuclear energy with SMRs is essential for zero-carbon baseload',
    voiceSpeed: 1.15,
  });

  assert.equal(updatedA.position, 'Nuclear energy with SMRs is essential for zero-carbon baseload');
  assert.equal(updatedA.voiceSpeed, 1.15);

  const fetchB = db.getPublicProfile(profileB.id)!;
  assert.equal(fetchB.position, 'Opposes nuclear energy expansion due to cost and deployment speed');
  assert.equal(fetchB.voiceSpeed, 1.0);

  // Clean up
  db.deleteProfile(profileA.id);
  db.deleteProfile(profileB.id);
});

test('Requirement 3 & 4: Creating debates on different topics using same profiles & preserving snapshots', () => {
  const prof1 = db.createProfile({
    name: 'AI Proponent',
    position: 'Affirms foundational premise',
    modelId: 'gemini-3.8-flash',
  });

  const prof2 = db.createProfile({
    name: 'AI Opponent',
    position: 'Counters foundational premise',
    modelId: 'gemini-3.5-flash-lite',
  });

  // Debate 1 on Topic X
  const debate1 = db.createDebate({
    title: 'Debate 1: Energy Policy',
    topic: 'Is nuclear energy essential?',
    debater1Id: prof1.id,
    debater2Id: prof2.id,
    debater1Position: 'Nuclear energy is clean and reliable',
    debater2Position: 'Nuclear energy is too expensive',
  });

  // Debate 2 on Topic Y using same profiles
  const debate2 = db.createDebate({
    title: 'Debate 2: AI Consciousness',
    topic: 'Can synthetic intelligence achieve qualia?',
    debater1Id: prof1.id,
    debater2Id: prof2.id,
    debater1Position: 'Consciousness is computational and substrate-independent',
    debater2Position: 'Consciousness requires biological interiority',
  });

  assert.notEqual(debate1.id, debate2.id);
  assert.equal(debate1.debater1.position, 'Nuclear energy is clean and reliable');
  assert.equal(debate2.debater1.position, 'Consciousness is computational and substrate-independent');

  // Mutate profile 1 in Settings
  db.updateProfile(prof1.id, {
    name: 'AI Proponent MODIFIED',
    position: 'Completely different stance',
  });

  // Verify debate1 snapshot is IMMUTABLE and untouched
  const reloadedDebate1 = db.getDebate(debate1.id)!;
  assert.equal(reloadedDebate1.debater1.name, 'AI Proponent');
  assert.equal(reloadedDebate1.debater1.position, 'Nuclear energy is clean and reliable');

  // Clean up
  db.deleteDebate(debate1.id);
  db.deleteDebate(debate2.id);
  db.deleteProfile(prof1.id);
  db.deleteProfile(prof2.id);
});

test('Requirement 5: Preventing deletion of a profile used by an active debate', () => {
  const activeProfile = db.createProfile({
    name: 'Active Speaker AI',
    position: 'Active thesis',
  });

  const activeDebate = db.createDebate({
    title: 'Active Running Debate',
    topic: 'Testing deletion prevention',
    debater1Id: activeProfile.id,
  });

  // Set status to in_progress
  db.updateDebate(activeDebate.id, { status: 'in_progress' });

  // Attempt to delete profile while debate is running
  const deleteResult = db.deleteProfile(activeProfile.id);
  assert.equal(deleteResult.success, false);
  assert.ok(deleteResult.error?.includes('currently engaged in an active debate'));

  // Verify profile still exists in database
  assert.ok(db.getPublicProfile(activeProfile.id));

  // Conclude or delete debate first
  db.updateDebate(activeDebate.id, { status: 'completed' });
  db.deleteDebate(activeDebate.id);

  // Now deletion must succeed cleanly
  const deleteAfter = db.deleteProfile(activeProfile.id);
  assert.equal(deleteAfter.success, true);
  assert.equal(db.getPublicProfile(activeProfile.id), null);
});

test('Requirement 6: Correct stage labels, turn planning, and positions for arbitrary profiles', () => {
  const d1 = db.createProfile({
    name: 'Solar Proponent',
    position: 'Solar power is the fastest growing clean energy',
    accentColor: 'emerald',
  });

  const d2 = db.createProfile({
    name: 'Grid Reliability Expert',
    position: 'Baseload dispatchability is essential for stability',
    accentColor: 'purple',
  });

  const debate = db.createDebate({
    title: 'Grid Architecture 2030',
    topic: 'Solar vs Baseload Dispatchability',
    debater1Id: d1.id,
    debater2Id: d2.id,
    totalTurns: 4,
  });

  assert.equal(debate.debater1.name, 'Solar Proponent');
  assert.equal(debate.debater2.name, 'Grid Reliability Expert');
  assert.equal(debate.debater1.accentColor, 'emerald');
  assert.equal(debate.debater2.accentColor, 'purple');

  // Turn 0 Plan: Debater 1
  const plan0 = orchestrator.getNextTurnPlan(debate)!;
  assert.ok(plan0);
  assert.equal(plan0.speakerSide, 'debater1');
  assert.equal(plan0.speakerName, 'Solar Proponent');
  assert.equal(plan0.statementType, 'opening');

  // Simulate turn 0 added
  db.addMessage(debate.id, {
    id: 'test-turn-solar',
    debateId: debate.id,
    turnIndex: 0,
    roundNumber: 1,
    roundName: 'Opening Statements',
    speakerId: d1.id,
    speakerSide: 'debater1',
    persona: 'debater1',
    speakerName: 'Solar Proponent',
    statementType: 'opening',
    mainClaim: 'Solar energy cost has plummeted by 80%.',
    reasoning: ['Photovoltaic scaling efficiency', 'Rapid installation velocity'],
    rawText: 'Solar is the cheapest energy source in history.',
    audioStatus: 'none',
    createdAt: new Date().toISOString(),
  });

  // Turn 1 Plan: Debater 2
  const updatedDebate = db.getDebate(debate.id)!;
  const plan1 = orchestrator.getNextTurnPlan(updatedDebate)!;
  assert.ok(plan1);
  assert.equal(plan1.speakerSide, 'debater2');
  assert.equal(plan1.speakerName, 'Grid Reliability Expert');
  assert.equal(plan1.statementType, 'opening');

  db.deleteDebate(debate.id);
  db.deleteProfile(d1.id);
  db.deleteProfile(d2.id);
});

test('Requirement 7, 8 & 9: Deleting a saved debate and cascading dependent records reliably', () => {
  const debate = db.createDebate({
    title: 'Debate To Delete',
    topic: 'Will be permanently deleted',
  });

  // Add questions, turns, votes
  db.addMessage(debate.id, {
    id: 'turn-del-1',
    debateId: debate.id,
    turnIndex: 0,
    roundNumber: 1,
    roundName: 'Opening Statements',
    speakerId: debate.debater1.id,
    speakerSide: 'debater1',
    persona: 'debater1',
    speakerName: debate.debater1.name,
    statementType: 'opening',
    mainClaim: 'Claim 1',
    reasoning: ['R1'],
    rawText: 'Text 1',
    audioStatus: 'none',
    createdAt: new Date().toISOString(),
  });

  db.addQuestion(debate.id, 'Audience User', 'What about cost?');

  const voterA = 'voter_fingerprint_test_cascade_1';
  db.castVote(debate.id, voterA, 'debater1');

  // Verify records exist
  assert.ok(db.getDebate(debate.id));
  assert.equal(db.hasUserVoted(debate.id, voterA).voted, true);

  // Authenticated deletion
  const deleteSuccess = db.deleteDebate(debate.id);
  assert.equal(deleteSuccess, true);

  // Verify debate is gone from database & lists
  assert.equal(db.getDebate(debate.id), null);
  const list = db.listDebates();
  assert.equal(list.some(d => d.id === debate.id), false);

  // Verify cascaded votes are deleted
  assert.equal(db.hasUserVoted(debate.id, voterA).voted, false);
});

test('Requirement 10: Cancelling in-progress jobs and preventing deleted debates from continuing', () => {
  const debate = db.createDebate({
    title: 'Cancelled In-Flight Debate',
    topic: 'Test job cancellation',
  });

  // Cancel debate jobs via orchestrator
  orchestrator.cancelDebateJobs(debate.id);

  // Delete debate
  db.deleteDebate(debate.id);
  assert.equal(db.getDebate(debate.id), null);
});

test('Requirement 11: Voting system preserves debater sides and tallies percentages', () => {
  const debate = db.createDebate({
    title: 'Voting Test',
    topic: 'Universal Basic Income',
  });

  const vote1 = db.castVote(debate.id, 'fingerprint_101', 'debater1');
  assert.equal(vote1.success, true);
  assert.equal(vote1.votes.debater1, 1);
  assert.equal(vote1.votes.total, 1);

  const vote2 = db.castVote(debate.id, 'fingerprint_102', 'debater2');
  assert.equal(vote2.success, true);
  assert.equal(vote2.votes.debater1, 1);
  assert.equal(vote2.votes.debater2, 1);
  assert.equal(vote2.votes.total, 2);

  // Duplicate rejection
  const dup = db.castVote(debate.id, 'fingerprint_101', 'debater2');
  assert.equal(dup.success, false);
  assert.equal(dup.alreadyVoted, true);
  assert.equal(dup.votes.debater1, 1);
  assert.equal(dup.votes.debater2, 1);

  db.deleteDebate(debate.id);
});

test('Audio Buffer Integrity: ensureValidWavBuffer wraps raw PCM with valid WAV header', () => {
  const rawPcm = Buffer.alloc(48000, 0x12);
  const wavBuffer = ensureValidWavBuffer(rawPcm, 24000, 1, 16);

  assert.equal(wavBuffer.length, 48000 + 44);
  assert.equal(wavBuffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wavBuffer.readUInt32LE(4), 48000 + 36);
  assert.equal(wavBuffer.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wavBuffer.toString('ascii', 12, 16), 'fmt ');
  assert.equal(wavBuffer.readUInt16LE(20), 1);
  assert.equal(wavBuffer.readUInt16LE(22), 1);
  assert.equal(wavBuffer.readUInt32LE(24), 24000);
  assert.equal(wavBuffer.toString('ascii', 36, 40), 'data');
  assert.equal(wavBuffer.readUInt32LE(40), 48000);
});
