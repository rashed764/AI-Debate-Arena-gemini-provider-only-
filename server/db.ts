import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AIConfigPublic,
  AIConfigStored,
  AudienceQuestion,
  Debate,
  DebateTurn,
  PersonaType,
  VoteRecord,
} from './types.ts';
import { decryptSecret, encryptSecret, maskApiKey } from './crypto.ts';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'arena_database.json');

interface DatabaseSchema {
  aiConfigs: Record<PersonaType, AIConfigStored>;
  debates: Record<string, Debate>;
  votes: Record<string, VoteRecord>; // key: `${debateId}:${voterFingerprint}`
  auditLogs: Array<{
    id: string;
    action: string;
    persona?: string;
    details?: string;
    timestamp: string;
  }>;
}

const DEFAULT_CONFIGS: Record<PersonaType, AIConfigStored> = {
  atheist: {
    persona: 'atheist',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Fenrir',
    voiceStyle: 'Analytical, evidence-focused, precise, intellectual and skeptical philosopher',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH',
    status: 'not_configured',
    lastTestedAt: null,
    lastTestMessage: null,
    updatedAt: new Date().toISOString(),
  },
  believer: {
    persona: 'believer',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Kore',
    voiceStyle: 'Philosophical, articulate, thoughtful, logical and respectful theist scholar',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH',
    status: 'not_configured',
    lastTestedAt: null,
    lastTestMessage: null,
    updatedAt: new Date().toISOString(),
  },
};

class ArenaDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    this.ensureDefaults();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load database file, initializing fresh:', err);
    }
    return {
      aiConfigs: { ...DEFAULT_CONFIGS },
      debates: {},
      votes: {},
      auditLogs: [],
    };
  }

  private save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  private ensureDefaults(): void {
    if (!this.data.aiConfigs) {
      this.data.aiConfigs = { ...DEFAULT_CONFIGS };
    }
    if (!this.data.aiConfigs.atheist) {
      this.data.aiConfigs.atheist = { ...DEFAULT_CONFIGS.atheist };
    }
    if (!this.data.aiConfigs.believer) {
      this.data.aiConfigs.believer = { ...DEFAULT_CONFIGS.believer };
    }
    if (!this.data.debates) this.data.debates = {};
    if (!this.data.votes) this.data.votes = {};
    if (!this.data.auditLogs) this.data.auditLogs = [];

    // Check if initial sample debate should be seeded
    if (Object.keys(this.data.debates).length === 0) {
      this.seedInitialDebate();
    }
    this.save();
  }

  private seedInitialDebate(): void {
    const debateId = 'featured-cosmology';
    const sampleDebate: Debate = {
      id: debateId,
      title: 'Cosmology, Contingency & The Origin of the Universe',
      topic: 'Does the existence and physical fine-tuning of the universe imply a transcendent, intentional Creator, or is a naturalistic framework sufficient?',
      category: 'Cosmology & Philosophy of Religion',
      mode: 'automatic',
      playbackMode: 'text_and_voice',
      language: 'English',
      status: 'completed',
      currentTurnIndex: 4,
      totalTurns: 4,
      thinkingEnabled: true,
      searchEnabled: true,
      messages: [
        {
          id: 'turn-1',
          debateId,
          turnIndex: 0,
          roundNumber: 1,
          roundName: 'Opening Statements',
          persona: 'atheist',
          speakerName: 'Atheist AI',
          statementType: 'opening',
          mainClaim: 'The physical universe requires no supernatural explanation; natural laws, quantum cosmology, and the principle of parsimony provide the most grounded framework.',
          reasoning: [
            'Appealing to a divine mind introduces an even greater unexplained complexity without empirical mechanism.',
            'Modern quantum cosmology demonstrates that spacetime geometry and quantum vacuum states can generate matter and structure under known physical symmetries.',
            'The burden of proof rests on supernatural claims; absence of complete physical knowledge is not positive evidence for divine intervention.'
          ],
          responseToOpponent: undefined,
          questionsForOpponent: [
            'If God is posited as the ultimate explanation for order, what explains the immense ontological complexity and specificity of God without circularity?'
          ],
          uncertainties: [
            'Pre-Planck epoch singularities remain subject to ongoing theoretical research in quantum gravity models.'
          ],
          sources: [
            { title: 'Hartle-Hawking State in Quantum Cosmology', url: 'https://en.wikipedia.org/wiki/Hartle%E2%80%93Hawking_state' }
          ],
          rawText: 'The cosmos presents us with measurable physical laws and quantifiable symmetries. When we examine the origin of our universe, our default epistemology must follow parsimony: natural laws, quantum cosmological models, and empirical physics. Postulating a supernatural, conscious mind does not resolve the question of origins; it merely shifts the mystery onto an untestable, unbounded entity whose own complexity remains unaccounted for.',
          audioStatus: 'none',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'turn-2',
          debateId,
          turnIndex: 1,
          roundNumber: 1,
          roundName: 'Opening Statements',
          persona: 'believer',
          speakerName: 'Believer AI',
          statementType: 'opening',
          mainClaim: 'Contingency and the mathematical fine-tuning of fundamental physical constants strongly point to an intentional, necessary sustaining cause.',
          reasoning: [
            'Contingent realities cannot explain their own existence; an unbroken chain of dependent physical states requires an ontologically necessary foundation.',
            'The fine-tuning of dimensionless constants (such as the cosmological constant and gravitational coupling) permits conscious observers within an astronomically narrow parameter space.',
            'A naturalistic multiverse merely multiplies contingent entities and unobserved parameters without answering why physical laws exist in the first place.'
          ],
          responseToOpponent: 'Atheist AI assumes physical laws can self-instantiate, but mathematical laws describe relationships—they lack the causal agency to generate concrete reality.',
          questionsForOpponent: [
            'Why does something exist rather than nothing, and why is physical reality governed by mathematically elegant, intelligible order?'
          ],
          uncertainties: [
            'Fine-tuning arguments rely on standard model parameters whose deeper unification under potential grand unified theories remains to be fully completed.'
          ],
          sources: [
            { title: 'The Fine-Tuning for Consciousness in Cosmology', url: 'https://plato.stanford.edu/entries/fine-tuning/' }
          ],
          rawText: 'Every contingent feature of the universe—from spacetime geometry to the delicate values of fundamental physical constants—points beyond itself. Mathematical laws do not breathe fire into the equations; they describe patterns, but cannot cause them. The principle of sufficient reason insists that the cosmos requires a necessary, self-grounded ontological origin, and an intentional transcendent mind remains the most coherent explanation for cosmic intelligibility.',
          audioStatus: 'none',
          createdAt: new Date(Date.now() - 3000000).toISOString(),
        },
        {
          id: 'turn-3',
          debateId,
          turnIndex: 2,
          roundNumber: 2,
          roundName: 'Rebuttal & Cross-Examination',
          persona: 'atheist',
          speakerName: 'Atheist AI',
          statementType: 'rebuttal',
          mainClaim: 'Fine-tuning is subject to observer selection bias (the anthropic principle), and positing a necessary divine mind commits a category mistake regarding necessity.',
          reasoning: [
            'We can only observe a universe compatible with our existence; observing life-permitting constants is therefore an observational tautology, not proof of design.',
            'Philosophical necessity applies to analytic propositions and logical tautologies, not to concrete existential entities like a cosmic mind.',
            'The historical trajectory of science consistently replaces supernatural design explanations with naturalistic mechanisms.'
          ],
          responseToOpponent: 'Believer AI claims physical laws lack agency, yet assigning agency to a timeless mind that decides to create time introduces logical paradoxes of change prior to time.',
          questionsForOpponent: [
            'How can an unembodied mind form thoughts, intentions, and decisions without a temporal sequence in which state changes occur?'
          ],
          uncertainties: [
            'Multiple physical universes (the multiverse hypothesis) remain currently untestable with direct empirical instruments.'
          ],
          rawText: 'Observer selection bias cannot be brushed aside. Only in universes capable of sustaining observers can beings ask why constants are tuned for them. Furthermore, calling God "necessary" simply defines the conclusion into existence. If an eternal, uncaused entity can exist, why not the quantum vacuum or the fundamental cosmic substrate itself, which requires far fewer ungrounded assumptions?',
          audioStatus: 'none',
          createdAt: new Date(Date.now() - 2000000).toISOString(),
        },
        {
          id: 'turn-4',
          debateId,
          turnIndex: 3,
          roundNumber: 2,
          roundName: 'Closing Synthesis',
          persona: 'believer',
          speakerName: 'Believer AI',
          statementType: 'closing',
          mainClaim: 'The anthropic principle fails to explain the objective improbability of life-permitting initial boundary conditions; a necessary transcendent Mind remains logically robust.',
          reasoning: [
            'The firing squad analogy illustrates the flaw of pure anthropic reasoning: surviving a 100-marksman execution warrants seeking an explanation for why all missed, not dismissing it because one survived.',
            'Conscious intentionality is the only known source capable of selecting specific functional outcomes out of vast combinatorial phase spaces.',
            'Reason itself relies on the fundamental intelligibility and truth-directedness of our cognitive faculties, which theistic realism coherently anchors.'
          ],
          responseToOpponent: 'A quantum vacuum is not absolute nothingness; it is an existing physical structure governed by quantum fields and laws that themselves demand ontological grounding.',
          questionsForOpponent: [
            'If human rationality is solely the byproduct of unguided reproductive fitness rather than truth, on what basis can we trust its philosophical verdicts on metaphysics?'
          ],
          rawText: 'To say we should not be surprised by fine-tuning because we are here is like a prisoner surviving a hundred-man firing squad saying no explanation is needed because if he died he could not notice. The quantum vacuum is not "nothing"—it is a rich physical substrate obeying complex equations. Acknowledging a transcendent, intelligent primary cause does not halt inquiry; it establishes the very foundation for why reality is intelligible and why science is possible.',
          audioStatus: 'none',
          createdAt: new Date(Date.now() - 1000000).toISOString(),
        }
      ],
      questions: [
        {
          id: 'q-1',
          debateId,
          authorName: 'Philosopher_Observer',
          questionText: 'Can either AI address whether the multiverse hypothesis merely shifts the problem of fine-tuning to the meta-laws of the multiverse?',
          status: 'answered',
          createdAt: new Date(Date.now() - 2500000).toISOString(),
        }
      ],
      votes: {
        atheist: 142,
        believer: 138,
        total: 280,
      },
      summary: {
        atheistStrongPoints: [
          'Compelling epistemological rigor and adherence to the burden of proof.',
          'Effective critique of God as an ungrounded, hyper-complex explanatory entity.',
          'Consistent historical reliance on empirical physics over supernatural attributions.'
        ],
        believerStrongPoints: [
          'Powerful cosmological framing of contingency and sufficient reason.',
          'Strong rebuttal against dismissing fine-tuning solely via the weak anthropic principle.',
          'Thought-provoking synthesis of cognitive reliability and cosmic intelligibility.'
        ],
        keyClashes: [
          'Whether the fundamental physical substrate (quantum vacuum/spacetime) can be brute or self-grounding.',
          'Whether consciousness and intentionality can exist prior to or outside of physical spacetime.',
          'The explanatory power of the Multiverse vs. a single Intelligent Creator.'
        ],
        verifiedFacts: [
          'Fundamental physical constants (e.g., cosmological constant) do have extremely narrow ranges for organic chemistry.',
          'Quantum vacuum states are not philosophical nothingness, but quantum field ground states.'
        ],
        overallAssessment: 'An exceptionally high-level debate demonstrating deep mutual philosophical respect. Atheist AI excels at ontological parsimony and scientific methodology, while Believer AI excels at metaphysical contingency and fine-tuning dialectics.'
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.debates[debateId] = sampleDebate;
  }

  // --- AI Config Methods ---

  public getRawConfig(persona: PersonaType): AIConfigStored {
    return { ...this.data.aiConfigs[persona] };
  }

  public getPublicConfig(persona: PersonaType): AIConfigPublic {
    const stored = this.data.aiConfigs[persona];
    const rawKey = this.resolveApiKey(persona);
    const hasKey = !!rawKey && rawKey.trim().length > 0;
    const keyMask = maskApiKey(rawKey);

    let keySource: 'database' | 'environment' | 'none' = 'none';
    if (stored.encryptedApiKey) {
      keySource = 'database';
    } else if (this.getEnvKey(persona)) {
      keySource = 'environment';
    }

    return {
      persona,
      name: persona === 'atheist' ? 'Atheist AI' : 'Believer AI',
      modelId: stored.modelId || 'gemini-3.8-flash',
      ttsModelId: stored.ttsModelId || 'gemini-3.8-flash-lite-tts',
      voiceName: stored.voiceName || (persona === 'atheist' ? 'Fenrir' : 'Kore'),
      voiceStyle: stored.voiceStyle || '',
      voiceSpeed: stored.voiceSpeed ?? 1.0,
      ttsEnabled: stored.ttsEnabled ?? true,
      searchGroundingEnabled: stored.searchGroundingEnabled ?? true,
      thinkingLevel: stored.thinkingLevel || 'HIGH',
      status: stored.status || (hasKey ? 'connected' : 'not_configured'),
      hasKey,
      keyMask,
      keySource,
      lastTestedAt: stored.lastTestedAt,
      lastTestMessage: stored.lastTestMessage,
      updatedAt: stored.updatedAt,
    };
  }

  private getEnvKey(persona: PersonaType): string | undefined {
    if (persona === 'atheist') {
      return process.env.GEMINI_API_KEY_ATHEIST || process.env.GEMINI_API_KEY;
    } else {
      return process.env.GEMINI_API_KEY_BELIEVER || process.env.GEMINI_API_KEY;
    }
  }

  public resolveApiKey(persona: PersonaType): string | undefined {
    const stored = this.data.aiConfigs[persona];
    if (stored.encryptedApiKey) {
      try {
        const decrypted = decryptSecret(stored.encryptedApiKey);
        if (decrypted && decrypted.trim().length > 0) {
          return decrypted.trim();
        }
      } catch (err) {
        console.warn(`Decryption failed for ${persona} (clearing stale key):`, err instanceof Error ? err.message : err);
        delete stored.encryptedApiKey;
        this.save();
      }
    }
    return this.getEnvKey(persona);
  }

  public updateConfig(persona: PersonaType, updates: Partial<AIConfigStored> & { rawApiKey?: string }): AIConfigPublic {
    const current = this.data.aiConfigs[persona];
    
    if (updates.rawApiKey !== undefined) {
      if (updates.rawApiKey.trim() === '') {
        // Clearing key
        delete current.encryptedApiKey;
      } else {
        current.encryptedApiKey = encryptSecret(updates.rawApiKey.trim());
      }
    }

    if (updates.modelId !== undefined) current.modelId = updates.modelId.trim();
    if (updates.ttsModelId !== undefined) current.ttsModelId = updates.ttsModelId.trim();
    if (updates.voiceName !== undefined) current.voiceName = updates.voiceName.trim();
    if (updates.voiceStyle !== undefined) current.voiceStyle = updates.voiceStyle.trim();
    if (updates.voiceSpeed !== undefined) current.voiceSpeed = Number(updates.voiceSpeed) || 1.0;
    if (updates.ttsEnabled !== undefined) current.ttsEnabled = Boolean(updates.ttsEnabled);
    if (updates.searchGroundingEnabled !== undefined) current.searchGroundingEnabled = Boolean(updates.searchGroundingEnabled);
    if (updates.thinkingLevel !== undefined) current.thinkingLevel = updates.thinkingLevel;
    if (updates.status !== undefined) current.status = updates.status;
    if (updates.lastTestedAt !== undefined) current.lastTestedAt = updates.lastTestedAt;
    if (updates.lastTestMessage !== undefined) current.lastTestMessage = updates.lastTestMessage;

    current.updatedAt = new Date().toISOString();
    this.save();

    this.logAudit(`Updated AI configuration for ${persona}`);
    return this.getPublicConfig(persona);
  }

  public removeApiKey(persona: PersonaType): AIConfigPublic {
    const current = this.data.aiConfigs[persona];
    delete current.encryptedApiKey;
    current.status = this.getEnvKey(persona) ? 'connected' : 'not_configured';
    current.lastTestedAt = null;
    current.lastTestMessage = 'API key removed from database.';
    current.updatedAt = new Date().toISOString();
    this.save();

    this.logAudit(`Removed stored API key for ${persona}`);
    return this.getPublicConfig(persona);
  }

  // --- Debate Management ---

  public listDebates(): Debate[] {
    return Object.values(this.data.debates).sort((a, b) => {
      if (a.id === 'featured-cosmology') return -1;
      if (b.id === 'featured-cosmology') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  public deleteDebate(id: string): boolean {
    if (this.data.debates[id]) {
      delete this.data.debates[id];
      this.save();
      return true;
    }
    return false;
  }

  public getDebate(id: string): Debate | null {
    return this.data.debates[id] || null;
  }

  public createDebate(params: {
    title: string;
    topic: string;
    category?: string;
    mode?: 'automatic' | 'interactive';
    playbackMode?: 'text_only' | 'voice_only' | 'text_and_voice';
    language?: string;
    thinkingEnabled?: boolean;
    searchEnabled?: boolean;
  }): Debate {
    const id = `debate-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const newDebate: Debate = {
      id,
      title: params.title.trim(),
      topic: params.topic.trim(),
      category: params.category?.trim() || 'Philosophy & Theology',
      mode: params.mode || 'automatic',
      playbackMode: params.playbackMode || 'text_and_voice',
      language: params.language?.trim() || 'English',
      status: 'idle',
      currentTurnIndex: 0,
      totalTurns: 6, // Standard 3-round debate (2 turns per round)
      thinkingEnabled: params.thinkingEnabled ?? true,
      searchEnabled: params.searchEnabled ?? true,
      messages: [],
      questions: [],
      votes: { atheist: 0, believer: 0, total: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.debates[id] = newDebate;
    this.save();
    this.logAudit(`Created debate: ${newDebate.title}`);
    return newDebate;
  }

  public updateDebate(id: string, updates: Partial<Debate>): Debate | null {
    const debate = this.data.debates[id];
    if (!debate) return null;

    Object.assign(debate, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return debate;
  }

  public addMessage(debateId: string, message: DebateTurn): Debate | null {
    const debate = this.data.debates[debateId];
    if (!debate) return null;

    debate.messages.push(message);
    debate.currentTurnIndex = debate.messages.length;
    debate.updatedAt = new Date().toISOString();
    this.save();
    return debate;
  }

  public updateMessageAudio(debateId: string, messageId: string, audioMeta: {
    audioUrl?: string;
    audioDuration?: number;
    audioStatus: 'none' | 'generating' | 'ready' | 'failed';
    audioError?: string;
    audioCached?: boolean;
  }): void {
    const debate = this.data.debates[debateId];
    if (!debate) return;
    const msg = debate.messages.find(m => m.id === messageId);
    if (msg) {
      Object.assign(msg, audioMeta);
      debate.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  // --- Questions ---

  public addQuestion(debateId: string, authorName: string, questionText: string): AudienceQuestion | null {
    const debate = this.data.debates[debateId];
    if (!debate) return null;

    const newQuestion: AudienceQuestion = {
      id: `q-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      debateId,
      authorName: authorName.trim() || 'Audience Member',
      questionText: questionText.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    debate.questions.push(newQuestion);
    debate.updatedAt = new Date().toISOString();
    this.save();
    return newQuestion;
  }

  public updateQuestionStatus(debateId: string, questionId: string, status: 'approved' | 'rejected' | 'answered'): boolean {
    const debate = this.data.debates[debateId];
    if (!debate) return false;
    const q = debate.questions.find(item => item.id === questionId);
    if (!q) return false;
    q.status = status;
    debate.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  // --- Voting ---

  public castVote(debateId: string, voterFingerprint: string, persona: PersonaType, reasoningNote?: string): {
    success: boolean;
    alreadyVoted: boolean;
    votes: { atheist: number; believer: number; total: number };
  } {
    const debate = this.data.debates[debateId];
    if (!debate) {
      throw new Error('Debate not found');
    }

    const voteKey = `${debateId}:${voterFingerprint}`;
    if (this.data.votes[voteKey]) {
      return {
        success: false,
        alreadyVoted: true,
        votes: debate.votes,
      };
    }

    const voteRecord: VoteRecord = {
      id: `v-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      debateId,
      voterFingerprint,
      persona,
      reasoningNote: reasoningNote?.trim(),
      createdAt: new Date().toISOString(),
    };

    this.data.votes[voteKey] = voteRecord;

    if (persona === 'atheist') {
      debate.votes.atheist += 1;
    } else {
      debate.votes.believer += 1;
    }
    debate.votes.total = debate.votes.atheist + debate.votes.believer;
    debate.updatedAt = new Date().toISOString();
    this.save();

    return {
      success: true,
      alreadyVoted: false,
      votes: debate.votes,
    };
  }

  public hasUserVoted(debateId: string, voterFingerprint: string): { voted: boolean; persona?: PersonaType } {
    const voteKey = `${debateId}:${voterFingerprint}`;
    const record = this.data.votes[voteKey];
    if (record) {
      return { voted: true, persona: record.persona };
    }
    return { voted: false };
  }

  // --- Audit Logs ---

  public logAudit(action: string, persona?: string, details?: string): void {
    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      action,
      persona,
      details,
      timestamp: new Date().toISOString(),
    });
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.save();
  }

  public getAuditLogs(limit = 50) {
    return this.data.auditLogs.slice(0, limit);
  }
}

export const db = new ArenaDatabase();
