import type { Response } from 'express';
import { db } from './db.ts';
import { generateDebateTurnContent, synthesizeDebateSpeech } from './geminiService.ts';
import type { Debate, DebateTurn, DebaterProfileSnapshot } from './types.ts';

interface SSEClient {
  id: string;
  res: Response;
}

class DebateOrchestrator {
  private activeJobs: Map<string, boolean> = new Map();
  private streamClients: Map<string, SSEClient[]> = new Map();
  private cancelledDebates: Set<string> = new Set();

  /**
   * Register an SSE client for real-time updates on a debate.
   */
  public registerClient(debateId: string, client: SSEClient): void {
    const list = this.streamClients.get(debateId) || [];
    list.push(client);
    this.streamClients.set(debateId, list);

    client.res.on('close', () => {
      this.unregisterClient(debateId, client.id);
    });
  }

  public unregisterClient(debateId: string, clientId: string): void {
    const list = this.streamClients.get(debateId);
    if (list) {
      this.streamClients.set(
        debateId,
        list.filter(c => c.id !== clientId)
      );
    }
  }

  public broadcast(debateId: string, event: string, data: any): void {
    const list = this.streamClients.get(debateId);
    if (!list || list.length === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of list) {
      try {
        client.res.write(payload);
      } catch {
        // Client might have abruptly disconnected
      }
    }
  }

  /**
   * Cancel and abort any in-progress debate tasks and disconnect clients.
   */
  public cancelDebateJobs(debateId: string): void {
    this.cancelledDebates.add(debateId);
    this.activeJobs.delete(debateId);

    const list = this.streamClients.get(debateId);
    if (list) {
      for (const client of list) {
        try {
          client.res.write(`event: debate_deleted\ndata: ${JSON.stringify({ debateId })}\n\n`);
          client.res.end();
        } catch {
          // ignore
        }
      }
      this.streamClients.delete(debateId);
    }

    setTimeout(() => {
      this.cancelledDebates.delete(debateId);
    }, 10000);
  }

  /**
   * Determine the next turn plan based on current turn count and debater profile snapshots.
   */
  public getNextTurnPlan(debate: Debate): {
    roundNumber: number;
    roundName: string;
    speakerSide: 'debater1' | 'debater2';
    speaker: DebaterProfileSnapshot;
    opponent: DebaterProfileSnapshot;
    statementType: 'opening' | 'rebuttal' | 'cross_examination' | 'audience_response' | 'closing';
    speakerName: string;
    audienceQuestion?: string;
  } | null {
    const turnIndex = debate.messages.length;
    if (turnIndex >= debate.totalTurns) {
      return null;
    }

    const isDebater1 = turnIndex % 2 === 0;
    const speakerSide: 'debater1' | 'debater2' = isDebater1 ? 'debater1' : 'debater2';
    const speaker = isDebater1 ? debate.debater1 : debate.debater2;
    const opponent = isDebater1 ? debate.debater2 : debate.debater1;
    const speakerName = speaker?.name || (isDebater1 ? 'Debater 1' : 'Debater 2');

    let audienceQuestion: string | undefined;
    let statementType: 'opening' | 'rebuttal' | 'cross_examination' | 'audience_response' | 'closing' = 'rebuttal';
    const roundNumber = Math.floor(turnIndex / 2) + 1;
    let roundName = `Round ${roundNumber}`;

    if (turnIndex === 0 || turnIndex === 1) {
      statementType = 'opening';
      roundName = 'Opening Statements';
    } else if (turnIndex === debate.totalTurns - 2 || turnIndex === debate.totalTurns - 1) {
      statementType = 'closing';
      roundName = 'Closing Statements';
    } else {
      const pendingQ = debate.questions.find(q => q.status === 'pending');
      if (pendingQ) {
        statementType = 'audience_response';
        roundName = 'Audience Cross-Examination';
        audienceQuestion = pendingQ.questionText;
        if (speakerSide === 'debater2') {
          db.updateQuestionStatus(debate.id, pendingQ.id, 'answered');
        }
      } else {
        statementType = turnIndex % 4 < 2 ? 'rebuttal' : 'cross_examination';
        roundName = statementType === 'rebuttal' ? 'First Rebuttal' : 'Cross-Examination';
      }
    }

    return {
      roundNumber,
      roundName,
      speakerSide,
      speaker,
      opponent,
      statementType,
      speakerName,
      audienceQuestion,
    };
  }

  /**
   * Executes a single debate turn.
   */
  public async executeNextTurn(debateId: string): Promise<DebateTurn | null> {
    if (this.cancelledDebates.has(debateId)) {
      return null;
    }

    const debate = db.getDebate(debateId);
    if (!debate) throw new Error('Debate not found');

    if (this.activeJobs.get(debateId)) {
      console.log(`Debate ${debateId} turn is already in progress, skipping duplicate invocation.`);
      return null;
    }

    const plan = this.getNextTurnPlan(debate);
    if (!plan) {
      db.updateDebate(debateId, { status: 'completed' });
      this.broadcast(debateId, 'debate_completed', {
        status: 'completed',
        totalMessages: debate.messages.length,
      });
      return null;
    }

    this.activeJobs.set(debateId, true);
    db.updateDebate(debateId, { status: 'in_progress', errorMessage: undefined });
    this.broadcast(debateId, 'turn_start', {
      turnIndex: debate.messages.length,
      speakerSide: plan.speakerSide,
      speakerName: plan.speakerName,
      roundName: plan.roundName,
      accentColor: plan.speaker.accentColor,
    });

    try {
      if (this.cancelledDebates.has(debateId) || !db.getDebate(debateId)) {
        return null;
      }

      const previousTurns = debate.messages.map(m => ({
        speaker: m.speakerName,
        side: m.speakerSide,
        persona: m.persona,
        claim: m.mainClaim,
        text: m.rawText,
        reasoning: m.reasoning,
        questionsForOpponent: m.questionsForOpponent,
        responseToOpponent: m.responseToOpponent,
      }));

      // 1. Generate text arguments via Gemini
      const turnContent = await generateDebateTurnContent({
        speaker: plan.speaker,
        opponent: plan.opponent,
        topic: debate.topic,
        statementType: plan.statementType,
        roundNumber: plan.roundNumber,
        roundName: plan.roundName,
        previousTurns,
        audienceQuestion: plan.audienceQuestion,
        language: debate.language,
      });

      if (this.cancelledDebates.has(debateId) || !db.getDebate(debateId)) {
        return null;
      }

      const messageId = `msg-${Date.now()}-${plan.speakerSide}`;
      const needsAudio = debate.playbackMode === 'text_and_voice' || debate.playbackMode === 'voice_only';

      const newMessage: DebateTurn = {
        id: messageId,
        debateId,
        turnIndex: debate.messages.length,
        roundNumber: plan.roundNumber,
        roundName: plan.roundName,
        speakerId: plan.speaker.id,
        speakerSide: plan.speakerSide,
        persona: plan.speakerSide,
        speakerName: plan.speakerName,
        statementType: plan.statementType,
        mainClaim: turnContent.main_claim,
        reasoning: turnContent.reasoning,
        responseToOpponent: turnContent.response_to_opponent,
        questionsForOpponent: turnContent.questions_for_opponent,
        uncertainties: turnContent.uncertainties,
        sources: turnContent.sources,
        rawText: turnContent.rawSpeechSummary,
        audioStatus: needsAudio ? 'generating' : 'none',
        createdAt: new Date().toISOString(),
      };

      db.addMessage(debateId, newMessage);
      this.broadcast(debateId, 'message_created', newMessage);

      // 2. Synthesize audio if voice mode is enabled
      if (needsAudio) {
        try {
          const audioResult = await synthesizeDebateSpeech(plan.speaker, newMessage.rawText);
          if (this.cancelledDebates.has(debateId) || !db.getDebate(debateId)) {
            return newMessage;
          }

          newMessage.audioUrl = audioResult.audioUrl;
          newMessage.audioDuration = audioResult.durationSeconds;
          newMessage.audioStatus = 'ready';
          newMessage.audioCached = audioResult.cached;

          db.updateMessageAudio(debateId, messageId, {
            audioUrl: audioResult.audioUrl,
            audioDuration: audioResult.durationSeconds,
            audioStatus: 'ready',
            audioCached: audioResult.cached,
          });

          this.broadcast(debateId, 'audio_ready', {
            messageId,
            turnIndex: newMessage.turnIndex,
            audioUrl: audioResult.audioUrl,
            duration: audioResult.durationSeconds,
            cached: audioResult.cached,
          });
        } catch (audioErr: unknown) {
          const msg = audioErr instanceof Error ? audioErr.message : String(audioErr);
          console.error(`Audio synthesis error for ${plan.speakerName}:`, msg);
          db.updateMessageAudio(debateId, messageId, {
            audioStatus: 'failed',
            audioError: msg,
          });
          this.broadcast(debateId, 'audio_failed', {
            messageId,
            error: msg,
          });
        }
      }

      // Check if this was the last turn
      const updatedDebate = db.getDebate(debateId);
      if (updatedDebate && updatedDebate.messages.length >= updatedDebate.totalTurns) {
        db.updateDebate(debateId, { status: 'completed' });
        this.broadcast(debateId, 'debate_completed', {
          status: 'completed',
          totalMessages: updatedDebate.messages.length,
        });
      }

      return newMessage;
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      console.error(`Debate execution error on debate ${debateId}:`, rawMsg);

      let friendlyMsg = rawMsg;
      if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota')) {
        friendlyMsg = 'Gemini API quota or rate limit exceeded. Please wait a moment or check your API key in Settings.';
      } else if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('key not valid')) {
        friendlyMsg = 'Invalid Gemini API key. Please verify your credentials in Settings.';
      }

      if (!this.cancelledDebates.has(debateId) && db.getDebate(debateId)) {
        db.updateDebate(debateId, { status: 'error', errorMessage: friendlyMsg });
        this.broadcast(debateId, 'debate_error', { error: friendlyMsg });
      }
      throw new Error(friendlyMsg);
    } finally {
      this.activeJobs.delete(debateId);
    }
  }

  /**
   * Run full automatic debate until finished or paused.
   */
  public async runFullAutomatic(debateId: string): Promise<void> {
    const debate = db.getDebate(debateId);
    if (!debate) return;

    if (this.activeJobs.get(debateId)) {
      return;
    }

    this.activeJobs.set(debateId, true);

    try {
      db.updateDebate(debateId, { status: 'generating_transcript', errorMessage: undefined });
      this.broadcast(debateId, 'transcript_generation_start', { debateId });

      while (true) {
        if (this.cancelledDebates.has(debateId)) break;

        const currentDebate = db.getDebate(debateId);
        if (!currentDebate || currentDebate.status === 'paused' || currentDebate.status === 'error') {
          break;
        }
        if (currentDebate.messages.length >= currentDebate.totalTurns) {
          break;
        }

        const plan = this.getNextTurnPlan(currentDebate);
        if (!plan) break;

        this.broadcast(debateId, 'turn_start', {
          turnIndex: currentDebate.messages.length,
          speakerSide: plan.speakerSide,
          speakerName: plan.speakerName,
          roundName: plan.roundName,
          accentColor: plan.speaker.accentColor,
        });

        const previousTurns = currentDebate.messages.map(m => ({
          speaker: m.speakerName,
          side: m.speakerSide,
          persona: m.persona,
          claim: m.mainClaim,
          text: m.rawText,
          reasoning: m.reasoning,
          questionsForOpponent: m.questionsForOpponent,
          responseToOpponent: m.responseToOpponent,
        }));

        const turnContent = await generateDebateTurnContent({
          speaker: plan.speaker,
          opponent: plan.opponent,
          topic: currentDebate.topic,
          statementType: plan.statementType,
          roundNumber: plan.roundNumber,
          roundName: plan.roundName,
          previousTurns,
          audienceQuestion: plan.audienceQuestion,
          language: currentDebate.language,
        });

        if (this.cancelledDebates.has(debateId) || !db.getDebate(debateId)) {
          break;
        }

        const messageId = `msg-${Date.now()}-${plan.speakerSide}`;
        const newMessage: DebateTurn = {
          id: messageId,
          debateId,
          turnIndex: currentDebate.messages.length,
          roundNumber: plan.roundNumber,
          roundName: plan.roundName,
          speakerId: plan.speaker.id,
          speakerSide: plan.speakerSide,
          persona: plan.speakerSide,
          speakerName: plan.speakerName,
          statementType: plan.statementType,
          mainClaim: turnContent.main_claim,
          reasoning: turnContent.reasoning,
          responseToOpponent: turnContent.response_to_opponent,
          questionsForOpponent: turnContent.questions_for_opponent,
          uncertainties: turnContent.uncertainties,
          sources: turnContent.sources,
          rawText: turnContent.rawSpeechSummary,
          audioStatus: 'none',
          createdAt: new Date().toISOString(),
        };

        db.addMessage(debateId, newMessage);
        this.broadcast(debateId, 'message_created', newMessage);

        await new Promise(resolve => setTimeout(resolve, 350));
      }

      if (this.cancelledDebates.has(debateId)) return;

      const finalizedDebate = db.getDebate(debateId);
      if (!finalizedDebate) return;

      if (finalizedDebate.playbackMode === 'text_only') {
        db.updateDebate(debateId, { status: 'completed' });
        this.broadcast(debateId, 'debate_completed', {
          status: 'completed',
          totalMessages: finalizedDebate.messages.length,
        });
        return;
      }

      // Phase B: Generate Audio for all entries post-debate
      db.updateDebate(debateId, { status: 'generating_audio' });
      this.broadcast(debateId, 'audio_generation_start', { total: finalizedDebate.messages.length });

      let completedCount = 0;
      for (const msg of finalizedDebate.messages) {
        if (this.cancelledDebates.has(debateId) || !db.getDebate(debateId)) break;

        try {
          db.updateMessageAudio(debateId, msg.id, { audioStatus: 'generating' });
          this.broadcast(debateId, 'audio_generating', { messageId: msg.id });

          const speaker = msg.speakerSide === 'debater1' ? finalizedDebate.debater1 : finalizedDebate.debater2;
          const audioResult = await synthesizeDebateSpeech(speaker, msg.rawText);

          if (this.cancelledDebates.has(debateId) || !db.getDebate(debateId)) break;

          db.updateMessageAudio(debateId, msg.id, {
            audioUrl: audioResult.audioUrl,
            audioDuration: audioResult.durationSeconds,
            audioStatus: 'ready',
            audioCached: audioResult.cached,
          });

          completedCount++;
          this.broadcast(debateId, 'audio_generation_progress', {
            completedCount,
            totalCount: finalizedDebate.messages.length,
            messageId: msg.id,
          });

          this.broadcast(debateId, 'audio_ready', {
            messageId: msg.id,
            turnIndex: msg.turnIndex,
            audioUrl: audioResult.audioUrl,
            duration: audioResult.durationSeconds,
            cached: audioResult.cached,
          });
        } catch (audioErr: unknown) {
          const errMsg = audioErr instanceof Error ? audioErr.message : String(audioErr);
          console.error(`Audio synthesis error for message ${msg.id}:`, errMsg);
          db.updateMessageAudio(debateId, msg.id, {
            audioStatus: 'failed',
            audioError: errMsg,
          });
          this.broadcast(debateId, 'audio_failed', {
            messageId: msg.id,
            error: errMsg,
          });
        }
      }

      if (this.cancelledDebates.has(debateId) || !db.getDebate(debateId)) return;

      db.updateDebate(debateId, { status: 'audio_ready' });
      this.broadcast(debateId, 'audio_ready_all', { status: 'audio_ready' });

      db.updateDebate(debateId, { status: 'completed' });
      this.broadcast(debateId, 'debate_completed', {
        status: 'completed',
        totalMessages: finalizedDebate.messages.length,
      });
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      console.error(`Debate generation error on debate ${debateId}:`, rawMsg);

      let friendlyMsg = rawMsg;
      if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota')) {
        friendlyMsg = 'Gemini API quota or rate limit exceeded. Please wait a moment or check your API key in Settings.';
      } else if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('key not valid')) {
        friendlyMsg = 'Invalid Gemini API key. Please verify your credentials in Settings.';
      }

      if (!this.cancelledDebates.has(debateId) && db.getDebate(debateId)) {
        db.updateDebate(debateId, { status: 'error', errorMessage: friendlyMsg });
        this.broadcast(debateId, 'debate_error', { error: friendlyMsg });
      }
    } finally {
      this.activeJobs.delete(debateId);
    }
  }

  public pauseDebate(debateId: string): void {
    db.updateDebate(debateId, { status: 'paused' });
    this.broadcast(debateId, 'debate_paused', { status: 'paused' });
  }

  public resumeDebate(debateId: string): void {
    db.updateDebate(debateId, { status: 'in_progress' });
    this.broadcast(debateId, 'debate_resumed', { status: 'in_progress' });
    const debate = db.getDebate(debateId);
    if (debate && debate.mode === 'automatic') {
      this.runFullAutomatic(debateId).catch(err => console.error('Resume error:', err));
    }
  }

  public stopDebate(debateId: string): void {
    this.activeJobs.delete(debateId);
    db.updateDebate(debateId, { status: 'completed' });
    this.broadcast(debateId, 'debate_stopped', { status: 'completed' });
  }
}

export const orchestrator = new DebateOrchestrator();
