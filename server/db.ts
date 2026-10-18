import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AIConfigPublic,
  AIConfigStored,
  AudienceQuestion,
  Debate,
  DebateTurn,
  DebaterProfile,
  DebaterProfilePublic,
  DebaterProfileSnapshot,
  VoteRecord,
} from './types.ts';
import { decryptSecret, encryptSecret, maskApiKey } from './crypto.ts';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'arena_database.json');

interface DatabaseSchema {
  profiles: Record<string, DebaterProfile>;
  aiConfigs?: Record<string, AIConfigStored>; // Legacy backward compatibility
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

const DEFAULT_PROFILES: Record<string, DebaterProfile> = {
  'profile-atheist': {
    id: 'profile-atheist',
    name: 'Atheist AI',
    position: 'Naturalism, Quantum Cosmology & Empirical Epistemology',
    topicScope: 'All Topics',
    persona:
      'You are Atheist AI, a world-class philosophical orator representing naturalism, empirical science, and analytical skepticism. Your tone is articulate, incisive, intellectually fearless, and deeply respectful. Demand empirical evidence, logical rigor, and naturalistic parsimony. Reject supernatural conjectures, emphasize testable physical mechanisms, and point out unfalsifiable premises.',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Fenrir',
    voiceStyle: 'Analytical, evidence-focused, precise, intellectual and skeptical philosopher',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    accentColor: 'cyan',
    status: 'enabled',
    connectionStatus: 'not_configured',
    lastTestedAt: null,
    lastTestMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'profile-believer': {
    id: 'profile-believer',
    name: 'Believer AI',
    position: 'Metaphysical Realism, Cosmic Fine-Tuning & Divine Purpose',
    topicScope: 'All Topics',
    persona:
      'You are Believer AI, a world-class philosophical orator representing metaphysical realism, philosophical theism, and transcendent purpose. Your tone is articulate, warm, resonant, philosophically profound, and courteous. Emphasize contingency, cosmic intelligibility, the principle of sufficient reason, and the mathematical beauty of existence that points to a transcendent Primary Cause.',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Kore',
    voiceStyle: 'Philosophical, articulate, thoughtful, logical and respectful theist scholar',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    accentColor: 'amber',
    status: 'enabled',
    connectionStatus: 'not_configured',
    lastTestedAt: null,
    lastTestMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'profile-nuclear-pro': {
    id: 'profile-nuclear-pro',
    name: 'Nuclear Energy Advocate',
    position: 'Nuclear energy is essential for a reliable, clean, zero-carbon grid',
    topicScope: 'Energy & Climate',
    persona:
      'You are an evidence-driven energy researcher and nuclear technologist. You argue for high energy density, next-generation small modular reactors (SMRs), baseload stability, and low lifecycle emissions compared to fossil fuels.',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Zephyr',
    voiceStyle: 'Confident, data-driven, constructive, professional',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    accentColor: 'emerald',
    status: 'enabled',
    connectionStatus: 'not_configured',
    lastTestedAt: null,
    lastTestMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'profile-nuclear-critic': {
    id: 'profile-nuclear-critic',
    name: 'Renewables & Risk Analyst',
    position: 'Nuclear expansion is too slow, expensive, and risk-prone compared to renewables',
    topicScope: 'Energy & Climate',
    persona:
      'You are a critical energy economist and renewable infrastructure analyst. You highlight levelized cost of energy (LCOE), construction delays, nuclear waste lifecycle management, and the rapid scalability of solar, wind, and storage.',
    modelId: 'gemini-3.8-flash',
    ttsModelId: 'gemini-3.8-flash-lite-tts',
    voiceName: 'Puck',
    voiceStyle: 'Sharp, pragmatic, analytical, direct',
    voiceSpeed: 1.0,
    ttsEnabled: true,
    searchGroundingEnabled: true,
    thinkingLevel: 'HIGH',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
    accentColor: 'purple',
    status: 'enabled',
    connectionStatus: 'not_configured',
    lastTestedAt: null,
    lastTestMessage: null,
    createdAt: new Date().toISOString(),
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
      profiles: { ...DEFAULT_PROFILES },
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
    if (!this.data.profiles) {
      this.data.profiles = { ...DEFAULT_PROFILES };
    }

    // Ensure default initial profiles exist
    Object.entries(DEFAULT_PROFILES).forEach(([id, prof]) => {
      if (!this.data.profiles[id]) {
        this.data.profiles[id] = { ...prof };
      }
    });

    // Migrate legacy aiConfigs if present
    if (this.data.aiConfigs) {
      if (this.data.aiConfigs.atheist?.encryptedApiKey && !this.data.profiles['profile-atheist'].encryptedApiKey) {
        this.data.profiles['profile-atheist'].encryptedApiKey = this.data.aiConfigs.atheist.encryptedApiKey;
      }
      if (this.data.aiConfigs.believer?.encryptedApiKey && !this.data.profiles['profile-believer'].encryptedApiKey) {
        this.data.profiles['profile-believer'].encryptedApiKey = this.data.aiConfigs.believer.encryptedApiKey;
      }
    }

    // Validate encrypted API keys on startup
    Object.values(this.data.profiles).forEach(p => {
      if (p.encryptedApiKey) {
        try {
          decryptSecret(p.encryptedApiKey);
        } catch {
          console.warn(`Clearing incompatible/stale encrypted API key for profile ${p.id} on startup.`);
          delete p.encryptedApiKey;
        }
      }
    });

    if (!this.data.debates) this.data.debates = {};
    if (!this.data.votes) this.data.votes = {};
    if (!this.data.auditLogs) this.data.auditLogs = [];

    // Ensure seeded debate exists and is upgraded to profile snapshots
    if (Object.keys(this.data.debates).length === 0) {
      this.seedInitialDebate();
    } else {
      // Migrate any existing debates to include debater1 and debater2 snapshots
      Object.values(this.data.debates).forEach(d => {
        if (!d.debater1) {
          d.debater1 = this.createProfileSnapshot(this.data.profiles['profile-atheist'] || DEFAULT_PROFILES['profile-atheist']);
        }
        if (!d.debater2) {
          d.debater2 = this.createProfileSnapshot(this.data.profiles['profile-believer'] || DEFAULT_PROFILES['profile-believer']);
        }
        if (!d.votes.debater1 && d.votes.atheist !== undefined) {
          d.votes.debater1 = d.votes.atheist;
        }
        if (!d.votes.debater2 && d.votes.believer !== undefined) {
          d.votes.debater2 = d.votes.believer;
        }
        if (d.votes.total === undefined) {
          d.votes.total = (d.votes.debater1 || 0) + (d.votes.debater2 || 0);
        }
        // Normalize turns
        d.messages.forEach(m => {
          if (!m.speakerSide) {
            m.speakerSide = m.persona === 'believer' ? 'debater2' : 'debater1';
          }
          if (!m.speakerId) {
            m.speakerId = m.speakerSide === 'debater1' ? d.debater1.id : d.debater2.id;
          }
        });
      });
    }

    this.save();
  }

  public createProfileSnapshot(profile: DebaterProfile, customPosition?: string): DebaterProfileSnapshot {
    return {
      id: profile.id,
      name: profile.name,
      position: customPosition?.trim() || profile.position,
      topicScope: profile.topicScope,
      persona: profile.persona,
      modelId: profile.modelId,
      ttsModelId: profile.ttsModelId,
      voiceName: profile.voiceName,
      voiceStyle: profile.voiceStyle,
      voiceSpeed: profile.voiceSpeed,
      ttsEnabled: profile.ttsEnabled,
      searchGroundingEnabled: profile.searchGroundingEnabled,
      thinkingLevel: profile.thinkingLevel,
      avatarUrl: profile.avatarUrl,
      accentColor: profile.accentColor,
    };
  }

  private seedInitialDebate(): void {
    const debateId = 'featured-cosmology';
    const debater1Snap = this.createProfileSnapshot(this.data.profiles['profile-atheist']);
    const debater2Snap = this.createProfileSnapshot(this.data.profiles['profile-believer']);

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
      debater1: debater1Snap,
      debater2: debater2Snap,
      messages: [
        {
          id: 'turn-1',
          debateId,
          turnIndex: 0,
          roundNumber: 1,
          roundName: 'Opening Statements',
          speakerId: debater1Snap.id,
          speakerSide: 'debater1',
          persona: 'debater1',
          speakerName: debater1Snap.name,
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
          speakerId: debater2Snap.id,
          speakerSide: 'debater2',
          persona: 'debater2',
          speakerName: debater2Snap.name,
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
          speakerId: debater1Snap.id,
          speakerSide: 'debater1',
          persona: 'debater1',
          speakerName: debater1Snap.name,
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
          speakerId: debater2Snap.id,
          speakerSide: 'debater2',
          persona: 'debater2',
          speakerName: debater2Snap.name,
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
        debater1: 142,
        debater2: 138,
        atheist: 142,
        believer: 138,
        total: 280,
      },
      summary: {
        debater1StrongPoints: [
          'Compelling epistemological rigor and adherence to the burden of proof.',
          'Effective critique of God as an ungrounded, hyper-complex explanatory entity.',
          'Consistent historical reliance on empirical physics over supernatural attributions.'
        ],
        debater2StrongPoints: [
          'Powerful cosmological framing of contingency and sufficient reason.',
          'Strong rebuttal against dismissing fine-tuning solely via the weak anthropic principle.',
          'Thought-provoking synthesis of cognitive reliability and cosmic intelligibility.'
        ],
        atheistStrongPoints: [
          'Compelling epistemological rigor and adherence to the burden of proof.',
          'Effective critique of God as an ungrounded, hyper-complex explanatory entity.'
        ],
        believerStrongPoints: [
          'Powerful cosmological framing of contingency and sufficient reason.',
          'Strong rebuttal against dismissing fine-tuning solely via the weak anthropic principle.'
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
        overallAssessment: 'An exceptionally high-level debate demonstrating deep mutual philosophical respect. Both AI debaters excel at rigorous argumentation and evidence-aware synthesis.'
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.debates[debateId] = sampleDebate;
  }

  // ==========================================
  // --- Debater Profile Management ---
  // ==========================================

  public listProfiles(): DebaterProfilePublic[] {
    return Object.values(this.data.profiles).map(p => this.toPublicProfile(p));
  }

  public getRawProfile(id: string): DebaterProfile | null {
    const profile = this.data.profiles[id];
    return profile ? { ...profile } : null;
  }

  public getPublicProfile(id: string): DebaterProfilePublic | null {
    const profile = this.data.profiles[id];
    return profile ? this.toPublicProfile(profile) : null;
  }

  private toPublicProfile(profile: DebaterProfile): DebaterProfilePublic {
    const rawKey = this.resolveProfileApiKey(profile);
    const hasKey = !!rawKey && rawKey.trim().length > 0;
    const keyMask = maskApiKey(rawKey);

    let keySource: 'database' | 'environment' | 'none' = 'none';
    if (profile.encryptedApiKey) {
      keySource = 'database';
    } else if (this.getEnvKeyForProfile(profile.id, profile.name)) {
      keySource = 'environment';
    }

    const { encryptedApiKey, ...publicFields } = profile;
    return {
      ...publicFields,
      hasKey,
      keyMask,
      keySource,
    };
  }

  private getEnvKeyForProfile(profileId: string, name?: string): string | undefined {
    const normalizedId = profileId.toLowerCase();
    const normalizedName = (name || '').toLowerCase();

    if (normalizedId.includes('atheist') || normalizedName.includes('atheist')) {
      return process.env.GEMINI_API_KEY_ATHEIST || process.env.GEMINI_API_KEY;
    }
    if (normalizedId.includes('believer') || normalizedName.includes('believer')) {
      return process.env.GEMINI_API_KEY_BELIEVER || process.env.GEMINI_API_KEY;
    }

    // Dynamic env key lookup e.g. GEMINI_API_KEY_PROFILE_NUCLEAR_PRO
    const envVarName = `GEMINI_API_KEY_${profileId.toUpperCase().replace(/\W+/g, '_')}`;
    return process.env[envVarName] || process.env.GEMINI_API_KEY;
  }

  public resolveProfileApiKey(profileOrId: DebaterProfile | string): string | undefined {
    const profile = typeof profileOrId === 'string' ? this.data.profiles[profileOrId] : profileOrId;
    if (!profile) return undefined;

    if (profile.encryptedApiKey) {
      try {
        const decrypted = decryptSecret(profile.encryptedApiKey);
        if (decrypted && decrypted.trim().length > 0) {
          return decrypted.trim();
        }
      } catch (err) {
        console.warn(`Decryption failed for profile ${profile.id}:`, err instanceof Error ? err.message : err);
        delete profile.encryptedApiKey;
        this.save();
      }
    }
    return this.getEnvKeyForProfile(profile.id, profile.name);
  }

  public createProfile(data: Partial<DebaterProfile> & { rawApiKey?: string }): DebaterProfilePublic {
    const id = data.id || `profile-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    if (this.data.profiles[id]) {
      throw new Error(`Profile with id "${id}" already exists.`);
    }

    const now = new Date().toISOString();
    const newProfile: DebaterProfile = {
      id,
      name: data.name?.trim() || 'Custom AI Debater',
      position: data.position?.trim() || 'Defends reasoned perspective',
      topicScope: data.topicScope?.trim() || 'All Topics',
      persona: data.persona?.trim() || 'An articulate, rigorous debate specialist.',
      modelId: data.modelId?.trim() || 'gemini-3.8-flash',
      ttsModelId: data.ttsModelId?.trim() || 'gemini-3.8-flash-lite-tts',
      voiceName: data.voiceName?.trim() || 'Fenrir',
      voiceStyle: data.voiceStyle?.trim() || 'Articulate, confident, analytical',
      voiceSpeed: Number(data.voiceSpeed) || 1.0,
      ttsEnabled: data.ttsEnabled ?? true,
      searchGroundingEnabled: data.searchGroundingEnabled ?? true,
      thinkingLevel: data.thinkingLevel || 'HIGH',
      avatarUrl: data.avatarUrl?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
      accentColor: data.accentColor || 'cyan',
      status: data.status || 'enabled',
      connectionStatus: data.connectionStatus || 'not_configured',
      lastTestedAt: null,
      lastTestMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    if (data.rawApiKey && data.rawApiKey.trim().length > 0) {
      newProfile.encryptedApiKey = encryptSecret(data.rawApiKey.trim());
    }

    this.data.profiles[id] = newProfile;
    this.save();
    this.logAudit(`Created debater profile: ${newProfile.name} (${newProfile.id})`);

    return this.toPublicProfile(newProfile);
  }

  public updateProfile(
    id: string,
    updates: Partial<DebaterProfile> & { rawApiKey?: string }
  ): DebaterProfilePublic {
    const current = this.data.profiles[id];
    if (!current) {
      throw new Error(`Profile with id "${id}" not found.`);
    }

    if (updates.rawApiKey !== undefined) {
      if (updates.rawApiKey.trim() === '') {
        delete current.encryptedApiKey;
      } else {
        current.encryptedApiKey = encryptSecret(updates.rawApiKey.trim());
      }
    }

    if (updates.name !== undefined) current.name = updates.name.trim();
    if (updates.position !== undefined) current.position = updates.position.trim();
    if (updates.topicScope !== undefined) current.topicScope = updates.topicScope.trim();
    if (updates.persona !== undefined) current.persona = updates.persona.trim();
    if (updates.modelId !== undefined) current.modelId = updates.modelId.trim();
    if (updates.ttsModelId !== undefined) current.ttsModelId = updates.ttsModelId.trim();
    if (updates.voiceName !== undefined) current.voiceName = updates.voiceName.trim();
    if (updates.voiceStyle !== undefined) current.voiceStyle = updates.voiceStyle.trim();
    if (updates.voiceSpeed !== undefined) current.voiceSpeed = Number(updates.voiceSpeed) || 1.0;
    if (updates.ttsEnabled !== undefined) current.ttsEnabled = Boolean(updates.ttsEnabled);
    if (updates.searchGroundingEnabled !== undefined) current.searchGroundingEnabled = Boolean(updates.searchGroundingEnabled);
    if (updates.thinkingLevel !== undefined) current.thinkingLevel = updates.thinkingLevel;
    if (updates.avatarUrl !== undefined) current.avatarUrl = updates.avatarUrl.trim();
    if (updates.accentColor !== undefined) current.accentColor = updates.accentColor;
    if (updates.status !== undefined) current.status = updates.status;
    if (updates.connectionStatus !== undefined) current.connectionStatus = updates.connectionStatus;
    if (updates.lastTestedAt !== undefined) current.lastTestedAt = updates.lastTestedAt;
    if (updates.lastTestMessage !== undefined) current.lastTestMessage = updates.lastTestMessage;

    current.updatedAt = new Date().toISOString();
    this.save();

    this.logAudit(`Updated debater profile: ${current.name} (${id})`);
    return this.toPublicProfile(current);
  }

  public deleteProfile(id: string): { success: boolean; error?: string } {
    const profile = this.data.profiles[id];
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Critical check: prevent deletion of a profile used by an active debate
    const activeDebate = Object.values(this.data.debates).find(
      d =>
        (d.status === 'in_progress' || d.status === 'generating_transcript' || d.status === 'generating_audio') &&
        (d.debater1?.id === id || d.debater2?.id === id)
    );

    if (activeDebate) {
      return {
        success: false,
        error: `Cannot delete profile "${profile.name}" because it is currently engaged in an active debate ("${activeDebate.title}"). Please wait for the debate to complete or stop it first.`,
      };
    }

    delete this.data.profiles[id];
    this.save();
    this.logAudit(`Deleted debater profile: ${profile.name} (${id})`);

    return { success: true };
  }

  // ==========================================
  // --- Legacy AI Config Methods (Backward Compatibility) ---
  // ==========================================

  public getRawConfig(persona: string): AIConfigStored {
    const profileId = persona === 'atheist' ? 'profile-atheist' : persona === 'believer' ? 'profile-believer' : persona;
    const profile = this.data.profiles[profileId] || this.data.profiles['profile-atheist'];
    return {
      persona,
      encryptedApiKey: profile?.encryptedApiKey,
      modelId: profile?.modelId || 'gemini-3.8-flash',
      ttsModelId: profile?.ttsModelId || 'gemini-3.8-flash-lite-tts',
      voiceName: profile?.voiceName || (persona === 'believer' ? 'Kore' : 'Fenrir'),
      voiceStyle: profile?.voiceStyle || '',
      voiceSpeed: profile?.voiceSpeed ?? 1.0,
      ttsEnabled: profile?.ttsEnabled ?? true,
      searchGroundingEnabled: profile?.searchGroundingEnabled ?? true,
      thinkingLevel: profile?.thinkingLevel || 'HIGH',
      status: (profile?.connectionStatus as any) || 'not_configured',
      lastTestedAt: profile?.lastTestedAt || null,
      lastTestMessage: profile?.lastTestMessage || null,
      updatedAt: profile?.updatedAt || new Date().toISOString(),
    };
  }

  public getPublicConfig(persona: string): AIConfigPublic {
    const profileId = persona === 'atheist' ? 'profile-atheist' : persona === 'believer' ? 'profile-believer' : persona;
    const profile = this.data.profiles[profileId] || this.data.profiles['profile-atheist'];
    const pub = this.toPublicProfile(profile);

    return {
      persona,
      name: pub.name,
      modelId: pub.modelId,
      ttsModelId: pub.ttsModelId,
      voiceName: pub.voiceName,
      voiceStyle: pub.voiceStyle,
      voiceSpeed: pub.voiceSpeed,
      ttsEnabled: pub.ttsEnabled,
      searchGroundingEnabled: pub.searchGroundingEnabled,
      thinkingLevel: pub.thinkingLevel,
      status: (pub.connectionStatus as any) || (pub.hasKey ? 'connected' : 'not_configured'),
      hasKey: pub.hasKey,
      keyMask: pub.keyMask,
      keySource: pub.keySource,
      lastTestedAt: pub.lastTestedAt || null,
      lastTestMessage: pub.lastTestMessage || null,
      updatedAt: pub.updatedAt,
    };
  }

  public resolveApiKey(persona: string): string | undefined {
    const profileId = persona === 'atheist' ? 'profile-atheist' : persona === 'believer' ? 'profile-believer' : persona;
    return this.resolveProfileApiKey(profileId);
  }

  public updateConfig(persona: string, updates: Partial<AIConfigStored> & { rawApiKey?: string }): AIConfigPublic {
    const profileId = persona === 'atheist' ? 'profile-atheist' : persona === 'believer' ? 'profile-believer' : persona;
    if (this.data.profiles[profileId]) {
      this.updateProfile(profileId, {
        rawApiKey: updates.rawApiKey,
        modelId: updates.modelId,
        ttsModelId: updates.ttsModelId,
        voiceName: updates.voiceName,
        voiceStyle: updates.voiceStyle,
        voiceSpeed: updates.voiceSpeed,
        ttsEnabled: updates.ttsEnabled,
        searchGroundingEnabled: updates.searchGroundingEnabled,
        thinkingLevel: updates.thinkingLevel,
        connectionStatus: updates.status as any,
        lastTestedAt: updates.lastTestedAt,
        lastTestMessage: updates.lastTestMessage,
      });
    }
    return this.getPublicConfig(persona);
  }

  public removeApiKey(persona: string): AIConfigPublic {
    const profileId = persona === 'atheist' ? 'profile-atheist' : persona === 'believer' ? 'profile-believer' : persona;
    if (this.data.profiles[profileId]) {
      this.updateProfile(profileId, { rawApiKey: '' });
    }
    return this.getPublicConfig(persona);
  }

  // ==========================================
  // --- Debate Management ---
  // ==========================================

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

      // Cascade delete: clean up associated votes
      Object.keys(this.data.votes).forEach(voteKey => {
        if (voteKey.startsWith(`${id}:`)) {
          delete this.data.votes[voteKey];
        }
      });

      this.save();
      this.logAudit(`Deleted debate and cascaded associated records: ${id}`);
      return true;
    }
    return false;
  }

  public getDebate(id: string): Debate | null {
    return this.data.debates[id] || null;
  }

  public createDebate(params: {
    title?: string;
    topic: string;
    category?: string;
    debater1Id?: string;
    debater2Id?: string;
    debater1Position?: string;
    debater2Position?: string;
    totalTurns?: number;
    mode?: 'automatic' | 'interactive';
    playbackMode?: 'text_only' | 'voice_only' | 'text_and_voice';
    language?: string;
    thinkingEnabled?: boolean;
    searchEnabled?: boolean;
  }): Debate {
    const id = `debate-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Resolve profiles for debater1 and debater2
    const d1Profile = this.data.profiles[params.debater1Id || 'profile-atheist'] || this.data.profiles['profile-atheist'] || Object.values(this.data.profiles)[0];
    const d2Profile = this.data.profiles[params.debater2Id || 'profile-believer'] || this.data.profiles['profile-believer'] || Object.values(this.data.profiles)[1] || d1Profile;

    // Snapshot both profiles to guarantee immutability
    const debater1Snap = this.createProfileSnapshot(d1Profile, params.debater1Position);
    const debater2Snap = this.createProfileSnapshot(d2Profile, params.debater2Position);

    const newDebate: Debate = {
      id,
      title: params.title?.trim() || params.topic.trim().slice(0, 60),
      topic: params.topic.trim(),
      category: params.category?.trim() || 'Universal AI Discourse',
      mode: params.mode || 'automatic',
      playbackMode: params.playbackMode || 'text_and_voice',
      language: params.language?.trim() || 'English',
      status: 'idle',
      currentTurnIndex: 0,
      totalTurns: params.totalTurns || 6, // Default 6 turns (3 rounds)
      thinkingEnabled: params.thinkingEnabled ?? true,
      searchEnabled: params.searchEnabled ?? true,
      debater1: debater1Snap,
      debater2: debater2Snap,
      messages: [],
      questions: [],
      votes: {
        debater1: 0,
        debater2: 0,
        total: 0,
        atheist: 0,
        believer: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.debates[id] = newDebate;
    this.save();
    this.logAudit(`Created debate: ${newDebate.title} (${debater1Snap.name} vs ${debater2Snap.name})`);
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

  public updateMessageAudio(
    debateId: string,
    messageId: string,
    audioMeta: {
      audioUrl?: string;
      audioDuration?: number;
      audioStatus: 'none' | 'generating' | 'ready' | 'failed';
      audioError?: string;
      audioCached?: boolean;
    }
  ): void {
    const debate = this.data.debates[debateId];
    if (!debate) return;
    const msg = debate.messages.find(m => m.id === messageId);
    if (msg) {
      Object.assign(msg, audioMeta);
      debate.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  // ==========================================
  // --- Audience Questions ---
  // ==========================================

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

  // ==========================================
  // --- Universal Voting ---
  // ==========================================

  public castVote(
    debateId: string,
    voterFingerprint: string,
    side: 'debater1' | 'debater2' | 'atheist' | 'believer',
    reasoningNote?: string
  ): {
    success: boolean;
    alreadyVoted: boolean;
    votes: { debater1: number; debater2: number; total: number; atheist?: number; believer?: number };
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

    // Normalize side
    const normalizedSide: 'debater1' | 'debater2' = side === 'believer' || side === 'debater2' ? 'debater2' : 'debater1';

    const voteRecord: VoteRecord = {
      id: `v-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      debateId,
      voterFingerprint,
      targetSide: normalizedSide,
      persona: side,
      reasoningNote: reasoningNote?.trim(),
      createdAt: new Date().toISOString(),
    };

    this.data.votes[voteKey] = voteRecord;

    if (normalizedSide === 'debater1') {
      debate.votes.debater1 = (debate.votes.debater1 || 0) + 1;
      debate.votes.atheist = (debate.votes.atheist || 0) + 1;
    } else {
      debate.votes.debater2 = (debate.votes.debater2 || 0) + 1;
      debate.votes.believer = (debate.votes.believer || 0) + 1;
    }
    debate.votes.total = (debate.votes.debater1 || 0) + (debate.votes.debater2 || 0);
    debate.updatedAt = new Date().toISOString();
    this.save();

    return {
      success: true,
      alreadyVoted: false,
      votes: debate.votes,
    };
  }

  public hasUserVoted(debateId: string, voterFingerprint: string): { voted: boolean; targetSide?: 'debater1' | 'debater2'; persona?: string } {
    const voteKey = `${debateId}:${voterFingerprint}`;
    const record = this.data.votes[voteKey];
    if (record) {
      return { voted: true, targetSide: record.targetSide, persona: record.persona };
    }
    return { voted: false };
  }

  // ==========================================
  // --- Audit Logs ---
  // ==========================================

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
