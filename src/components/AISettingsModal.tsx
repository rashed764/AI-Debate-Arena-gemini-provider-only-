import React, { useState, useEffect } from 'react';
import {
  Key,
  Cpu,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Search,
  BrainCircuit,
  Lock,
  Play,
  RotateCcw,
  Plus,
  Edit2,
  User,
  Palette,
  Power,
  Globe,
  Layers,
  ArrowRightLeft,
  Server
} from 'lucide-react';
import {
  DebaterProfilePublic,
  AccentColor,
  AIConfigPublic,
  AIProvider,
  ProviderModelInfo
} from '../types';

interface AISettingsProps {
  isAdmin: boolean;
  openAdminModal: () => void;
  onRefreshConfigs: () => Promise<void>;
  atheistConfig?: AIConfigPublic;
  believerConfig?: AIConfigPublic;
  adminToken: string;
}

interface ProviderMeta {
  id: AIProvider;
  name: string;
  badge: string;
  desc: string;
  colorBorder: string;
  colorBg: string;
  colorText: string;
  defaultModel: string;
  defaultTtsModel: string;
  defaultVoice: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Recommended • Free Tier',
    desc: 'Multimodal intelligence with high-fidelity speech synthesis & free tier options',
    colorBorder: 'border-cyan-500',
    colorBg: 'bg-cyan-950/60 text-cyan-200',
    colorText: 'text-cyan-400',
    defaultModel: 'gemini-3.8-flash',
    defaultTtsModel: 'gemini-3.8-flash-lite-tts',
    defaultVoice: 'Fenrir',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'GPT-4o & TTS-1',
    desc: 'Flagship reasoning models with natural conversational studio voice synthesis',
    colorBorder: 'border-emerald-500',
    colorBg: 'bg-emerald-950/60 text-emerald-200',
    colorText: 'text-emerald-400',
    defaultModel: 'gpt-4o',
    defaultTtsModel: 'tts-1',
    defaultVoice: 'onyx',
  },
  {
    id: 'groq',
    name: 'Groq (LPU)',
    badge: '500+ tok/s Ultra-Fast',
    desc: 'Ultra-low latency open-weights models (Llama 3.3 70B, DeepSeek R1 Distill)',
    colorBorder: 'border-amber-500',
    colorBg: 'bg-amber-950/60 text-amber-200',
    colorText: 'text-amber-400',
    defaultModel: 'llama-3.3-70b-versatile',
    defaultTtsModel: 'gemini-3.8-flash-lite-tts',
    defaultVoice: 'Fenrir',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Universal Access',
    desc: 'Unified gateway to Claude 3.7 Sonnet, DeepSeek R1, GPT-4o, and hundreds more',
    colorBorder: 'border-purple-500',
    colorBg: 'bg-purple-950/60 text-purple-200',
    colorText: 'text-purple-400',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    defaultTtsModel: 'gemini-3.8-flash-lite-tts',
    defaultVoice: 'Fenrir',
  },
];

const DEFAULT_PROVIDER_MODELS: Record<
  AIProvider,
  {
    text: Array<{ id: string; name: string; isRecommended?: boolean }>;
    tts: Array<{ id: string; name: string; isRecommended?: boolean }>;
    voices: Array<{ id: string; desc: string }>;
  }
> = {
  gemini: {
    text: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Default Recommended - Ultra Fast, Free Tier)', isRecommended: true },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest (Stable Auto-Updating)' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (High Throughput)' },
      { id: 'gemini-4-argon', name: 'Gemini 4 Argon (High Thinking & Complex Reasoning, Paid Tier)' },
    ],
    tts: [
      { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.8 Flash Lite TTS (Recommended Low Latency, Free Tier)', isRecommended: true },
      { id: 'gemini-3.8-flash-tts', name: 'Gemini 3.8 Flash TTS (High Fidelity Speech & Screenplay)' },
    ],
    voices: [
      { id: 'Fenrir', desc: 'Authoritative, sharp, deep, analytical' },
      { id: 'Kore', desc: 'Articulate, warm, resonant, thoughtful' },
      { id: 'Puck', desc: 'Energetic, expressive, distinct' },
      { id: 'Charon', desc: 'Grounded, contemplative, measured' },
      { id: 'Zephyr', desc: 'Smooth, intellectual, balanced' },
      { id: 'Aoede', desc: 'Melodic, engaging, eloquent' },
    ],
  },
  openai: {
    text: [
      { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal Intelligence)', isRecommended: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cost Efficient)' },
      { id: 'o3-mini', name: 'o3-mini (High-Speed Reasoning & Math/Logic)' },
      { id: 'o1', name: 'o1 (Deep Deliberation & Complex Philosophical Proofs)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
    tts: [
      { id: 'tts-1', name: 'OpenAI TTS-1 (Standard Natural Speech)' },
      { id: 'tts-1-hd', name: 'OpenAI TTS-1-HD (Studio High Definition)' },
    ],
    voices: [
      { id: 'onyx', desc: 'Deep, resonant, masculine, commanding' },
      { id: 'alloy', desc: 'Neutral, balanced, articulate' },
      { id: 'echo', desc: 'Warm, measured, steady delivery' },
      { id: 'fable', desc: 'British accent, expressive, theatrical' },
      { id: 'nova', desc: 'Energetic, warm, clear, feminine' },
      { id: 'shimmer', desc: 'Clear, soft, intellectual' },
    ],
  },
  groq: {
    text: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Recommended - 500+ tok/s)', isRecommended: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra Fast Sub-second)' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B (High Reasoning)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k Context)' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
    ],
    tts: [
      { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.8 Flash Lite TTS (Paired Ultra-Fast Speech)' },
      { id: 'tts-1', name: 'OpenAI TTS-1 (Cross-Provider Studio Audio)' },
    ],
    voices: [
      { id: 'Fenrir', desc: 'Authoritative, sharp, resonant' },
      { id: 'Kore', desc: 'Articulate, warm, thoughtful' },
      { id: 'onyx', desc: 'Deep, resonant, commanding' },
      { id: 'Zephyr', desc: 'Smooth, intellectual, balanced' },
      { id: 'nova', desc: 'Energetic, warm, clear' },
    ],
  },
  openrouter: {
    text: [
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (Hybrid Reasoning & Nuance)', isRecommended: true },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Open Reasoning Benchmark)' },
      { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o (via OpenRouter)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
      { id: 'google/gemini-2.0-flash-001', name: 'Google Gemini 2.0 Flash (via OpenRouter)' },
    ],
    tts: [
      { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.8 Flash Lite TTS (Universal Debater Voice)' },
      { id: 'tts-1', name: 'OpenAI TTS-1 (Cross-Provider Speech)' },
    ],
    voices: [
      { id: 'Fenrir', desc: 'Authoritative, sharp, resonant' },
      { id: 'Kore', desc: 'Articulate, warm, thoughtful' },
      { id: 'onyx', desc: 'Deep, resonant, commanding' },
      { id: 'Zephyr', desc: 'Smooth, intellectual, balanced' },
      { id: 'nova', desc: 'Energetic, warm, clear' },
    ],
  },
};

const ACCENT_COLORS: Array<{ id: AccentColor; label: string; bg: string; border: string }> = [
  { id: 'cyan', label: 'Electric Blue / Cyan', bg: 'bg-cyan-500', border: 'border-cyan-400' },
  { id: 'amber', label: 'Warm Gold / Amber', bg: 'bg-amber-500', border: 'border-amber-400' },
  { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-500', border: 'border-emerald-400' },
  { id: 'purple', label: 'Cosmic Purple', bg: 'bg-purple-500', border: 'border-purple-400' },
  { id: 'rose', label: 'Crimson Rose', bg: 'bg-rose-500', border: 'border-rose-400' },
  { id: 'blue', label: 'Royal Blue', bg: 'bg-blue-500', border: 'border-blue-400' },
  { id: 'indigo', label: 'Deep Indigo', bg: 'bg-indigo-500', border: 'border-indigo-400' },
  { id: 'orange', label: 'Solar Orange', bg: 'bg-orange-500', border: 'border-orange-400' },
];

const PRESET_AVATARS = [
  { label: 'Analytical Scholar', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop' },
  { label: 'Philosophical Theologian', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop' },
  { label: 'Energy Researcher', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop' },
  { label: 'Policy Analyst', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop' },
  { label: 'Scientific Specialist', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop' },
  { label: 'Futurist Ethicist', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop' },
];

interface KeyPoolSlot {
  id: string;
  key: string;
  mask?: string;
  isExisting?: boolean;
  show?: boolean;
  testResult?: { success?: boolean; message?: string } | null;
  testing?: boolean;
}

export const AISettingsView: React.FC<AISettingsProps> = ({
  isAdmin,
  openAdminModal,
  onRefreshConfigs,
}) => {
  const [profiles, setProfiles] = useState<DebaterProfilePublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Form State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<AIProvider>('gemini');
  const [formPosition, setFormPosition] = useState('');
  const [formTopicScope, setFormTopicScope] = useState('All Topics');
  const [formPersona, setFormPersona] = useState('');
  const [formStatus, setFormStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [formModelId, setFormModelId] = useState('gemini-3.8-flash');
  const [formTtsModelId, setFormTtsModelId] = useState('gemini-3.8-flash-lite-tts');
  const [formVoiceName, setFormVoiceName] = useState('Fenrir');
  const [formVoiceStyle, setFormVoiceStyle] = useState('Analytical, evidence-focused, precise');
  const [formVoiceSpeed, setFormVoiceSpeed] = useState(1.0);
  const [formTtsEnabled, setFormTtsEnabled] = useState(true);
  const [formSearchGrounding, setFormSearchGrounding] = useState(true);
  const [formThinkingLevel, setFormThinkingLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL'>('HIGH');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formAccentColor, setFormAccentColor] = useState<AccentColor>('cyan');

  // Multi-API Key Pool State
  const [formKeySlots, setFormKeySlots] = useState<KeyPoolSlot[]>([
    { id: 'k-0', key: '', show: false }
  ]);

  // Dynamic Live Models State
  const [liveFetchedModels, setLiveFetchedModels] = useState<Record<AIProvider, ProviderModelInfo[]>>({
    gemini: [],
    openai: [],
    groq: [],
    openrouter: [],
  });
  const [fetchingLiveModels, setFetchingLiveModels] = useState(false);
  const [liveFetchMessage, setLiveFetchMessage] = useState<string | null>(null);

  // Testing Feedback
  const [testingModel, setTestingModel] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [testingVoice, setTestingVoice] = useState(false);
  const [voiceTestResult, setVoiceTestResult] = useState<{ success?: boolean; message?: string; audioUrl?: string } | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Delete State
  const [profileToDelete, setProfileToDelete] = useState<DebaterProfilePublic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch debater profiles from server
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
        if (!selectedProfileId && data.profiles.length > 0 && !isCreatingNew) {
          selectProfile(data.profiles[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load debater profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const selectProfile = (p: DebaterProfilePublic) => {
    setIsCreatingNew(false);
    setSelectedProfileId(p.id);
    setFormName(p.name);
    const prov = p.provider || 'gemini';
    setFormProvider(prov);
    setFormPosition(p.position);
    setFormTopicScope(p.topicScope || 'All Topics');
    setFormPersona(p.persona || '');
    setFormStatus(p.status);
    setFormModelId(p.modelId || DEFAULT_PROVIDER_MODELS[prov].text[0].id);
    setFormTtsModelId(p.ttsModelId || DEFAULT_PROVIDER_MODELS[prov].tts[0].id);
    setFormVoiceName(p.voiceName || DEFAULT_PROVIDER_MODELS[prov].voices[0].id);
    setFormVoiceStyle(p.voiceStyle || '');
    setFormVoiceSpeed(p.voiceSpeed ?? 1.0);
    setFormTtsEnabled(p.ttsEnabled ?? true);
    setFormSearchGrounding(p.searchGroundingEnabled ?? true);
    setFormThinkingLevel(p.thinkingLevel || 'HIGH');
    setFormAvatarUrl(p.avatarUrl || '');
    setFormAccentColor(p.accentColor || 'cyan');

    // Build multi-key pool representation from saved profile
    const existingMasks = p.keyMasks && p.keyMasks.length > 0 ? p.keyMasks : p.keyMask && p.keyMask !== 'Not configured' ? [p.keyMask] : [];

    if (existingMasks.length > 0) {
      setFormKeySlots(
        existingMasks.map((m, idx) => ({
          id: `k-exist-${idx}`,
          key: '',
          mask: m,
          isExisting: true,
          show: false,
        }))
      );
    } else {
      setFormKeySlots([{ id: `k-${Date.now()}`, key: '', isExisting: false, show: false }]);
    }

    setModelTestResult(null);
    setVoiceTestResult(null);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    setLiveFetchMessage(null);
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedProfileId(null);
    setFormName('');
    setFormProvider('gemini');
    setFormPosition('');
    setFormTopicScope('All Topics');
    setFormPersona('An articulate, evidence-driven debater specializing in rigorous analysis and reasoned discourse.');
    setFormStatus('enabled');
    setFormModelId('gemini-3.8-flash');
    setFormTtsModelId('gemini-3.8-flash-lite-tts');
    setFormVoiceName('Zephyr');
    setFormVoiceStyle('Clear, professional, confident');
    setFormVoiceSpeed(1.0);
    setFormTtsEnabled(true);
    setFormSearchGrounding(true);
    setFormThinkingLevel('HIGH');
    setFormAvatarUrl(PRESET_AVATARS[2].url);
    setFormAccentColor('emerald');
    setFormKeySlots([{ id: `k-${Date.now()}`, key: '', isExisting: false, show: false }]);
    setModelTestResult(null);
    setVoiceTestResult(null);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    setLiveFetchMessage(null);
  };

  // Switch Provider and update default models & voices seamlessly
  const handleSelectProvider = (newProvider: AIProvider) => {
    setFormProvider(newProvider);
    const cat = DEFAULT_PROVIDER_MODELS[newProvider];
    setFormModelId(cat.text[0].id);
    setFormTtsModelId(cat.tts[0].id);
    setFormVoiceName(cat.voices[0].id);
    setModelTestResult(null);
    setVoiceTestResult(null);
    setLiveFetchMessage(null);
  };

  // Add extra backup key slot
  const handleAddKeySlot = () => {
    setFormKeySlots(prev => [
      ...prev,
      { id: `k-slot-${Date.now()}-${prev.length}`, key: '', isExisting: false, show: false }
    ]);
  };

  // Remove key slot
  const handleRemoveKeySlot = (index: number) => {
    if (formKeySlots.length <= 1) {
      setFormKeySlots([{ id: `k-${Date.now()}`, key: '', isExisting: false, show: false }]);
      return;
    }
    setFormKeySlots(prev => prev.filter((_, i) => i !== index));
  };

  // Update key text
  const handleKeyChange = (index: number, newKey: string) => {
    setFormKeySlots(prev =>
      prev.map((slot, i) => (i === index ? { ...slot, key: newKey, testResult: null } : slot))
    );
  };

  // Toggle key visibility
  const handleToggleKeyVisibility = (index: number) => {
    setFormKeySlots(prev =>
      prev.map((slot, i) => (i === index ? { ...slot, show: !slot.show } : slot))
    );
  };

  // Test an individual key from the pool
  const handleTestIndividualKey = async (index: number) => {
    const slot = formKeySlots[index];
    const keyToTest = slot.key.trim();
    if (!keyToTest && !slot.isExisting) return;

    setFormKeySlots(prev =>
      prev.map((s, i) => (i === index ? { ...s, testing: true, testResult: null } : s))
    );

    try {
      const res = await fetch('/api/providers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formProvider,
          apiKey: keyToTest || undefined,
          modelId: formModelId,
        }),
      });
      const data = await res.json();
      setFormKeySlots(prev =>
        prev.map((s, i) => (i === index ? { ...s, testing: false, testResult: data } : s))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormKeySlots(prev =>
        prev.map((s, i) => (i === index ? { ...s, testing: false, testResult: { success: false, message: msg } } : s))
      );
    }
  };

  // Fetch Live Models dynamically from Provider API
  const handleFetchLiveModels = async () => {
    setFetchingLiveModels(true);
    setLiveFetchMessage(null);

    const primaryKey = formKeySlots.find(s => s.key.trim().length > 0)?.key.trim() || '';

    try {
      const queryParam = primaryKey ? `?apiKey=${encodeURIComponent(primaryKey)}` : selectedProfileId ? `?profileId=${selectedProfileId}` : '';
      const res = await fetch(`/api/providers/${formProvider}/models${queryParam}`);
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        setLiveFetchedModels(prev => ({
          ...prev,
          [formProvider]: data.models,
        }));
        setLiveFetchMessage(`Discovered ${data.models.length} live models from ${formProvider.toUpperCase()} API.`);
      } else {
        setLiveFetchMessage(`No additional models returned. Using verified preset models for ${formProvider.toUpperCase()}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLiveFetchMessage(`Could not query live models (${msg}). Verified models are ready below.`);
    } finally {
      setFetchingLiveModels(false);
    }
  };

  // Save Debater Profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setSaveErrorMsg('Debater profile display name is required.');
      return;
    }
    if (!formPosition.trim()) {
      setSaveErrorMsg('Debater side / position is required.');
      return;
    }

    setSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    // Extract all entered keys
    const nonBlankKeys = formKeySlots.map(s => s.key.trim()).filter(Boolean);

    const payload: any = {
      name: formName.trim(),
      provider: formProvider,
      position: formPosition.trim(),
      topicScope: formTopicScope.trim() || 'All Topics',
      persona: formPersona.trim(),
      status: formStatus,
      modelId: formModelId,
      ttsModelId: formTtsModelId,
      voiceName: formVoiceName,
      voiceStyle: formVoiceStyle,
      voiceSpeed: formVoiceSpeed,
      ttsEnabled: formTtsEnabled,
      searchGroundingEnabled: formSearchGrounding,
      thinkingLevel: formThinkingLevel,
      avatarUrl: formAvatarUrl.trim(),
      accentColor: formAccentColor,
    };

    // If user provided any new keys, send them as the pool
    if (nonBlankKeys.length > 0) {
      payload.rawApiKeys = nonBlankKeys;
      payload.rawApiKey = nonBlankKeys[0];
    }

    try {
      const url = isCreatingNew ? '/api/profiles' : `/api/profiles/${selectedProfileId}`;
      const method = isCreatingNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save debater profile.');
      }

      setSaveSuccessMsg(
        isCreatingNew
          ? `Created profile "${data.profile?.name}" on ${formProvider.toUpperCase()} successfully!`
          : `Updated profile "${data.profile?.name}" successfully!`
      );
      await fetchProfiles();
      if (data.profile) {
        selectProfile(data.profile);
      }
      await onRefreshConfigs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // Test Overall Model Connection
  const handleTestModel = async () => {
    setTestingModel(true);
    setModelTestResult(null);

    const primaryKey = formKeySlots.find(s => s.key.trim().length > 0)?.key.trim() || undefined;

    try {
      const targetId = selectedProfileId || 'profile-atheist';
      const res = await fetch(`/api/profiles/${targetId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeyOverride: primaryKey,
          modelIdOverride: formModelId,
          providerOverride: formProvider,
        }),
      });
      const data = await res.json();
      setModelTestResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setModelTestResult({ success: false, message: `Test failed: ${msg}` });
    } finally {
      setTestingModel(false);
    }
  };

  // Test Overall Voice TTS
  const handleTestVoice = async () => {
    setTestingVoice(true);
    setVoiceTestResult(null);

    const primaryKey = formKeySlots.find(s => s.key.trim().length > 0)?.key.trim() || undefined;

    try {
      const targetId = selectedProfileId || 'profile-atheist';
      const res = await fetch(`/api/profiles/${targetId}/test-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeyOverride: primaryKey,
          ttsModelOverride: formTtsModelId,
          voiceOverride: formVoiceName,
          styleOverride: formVoiceStyle,
          providerOverride: formProvider,
        }),
      });
      const data = await res.json();
      setVoiceTestResult(data);

      if (data.audioUrl) {
        if (audioElement) audioElement.pause();
        const audio = new Audio(data.audioUrl);
        setAudioElement(audio);
        audio.play().catch(e => console.warn('Audio play blocked:', e));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVoiceTestResult({ success: false, message: `Voice test failed: ${msg}` });
    } finally {
      setTestingVoice(false);
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  // Active models (combine verified presets + live discovered models)
  const availableTextModels = (() => {
    const defaultList = DEFAULT_PROVIDER_MODELS[formProvider]?.text || [];
    const liveList = (liveFetchedModels[formProvider] || [])
      .filter(m => m.type !== 'tts')
      .map(m => ({ id: m.id, name: m.name, isRecommended: m.isRecommended }));

    const existingIds = new Set(defaultList.map(m => m.id));
    const combined = [...defaultList];
    for (const lm of liveList) {
      if (!existingIds.has(lm.id)) {
        combined.push(lm);
      }
    }
    return combined;
  })();

  const availableTtsModels = DEFAULT_PROVIDER_MODELS[formProvider]?.tts || DEFAULT_PROVIDER_MODELS.gemini.tts;
  const availableVoices = DEFAULT_PROVIDER_MODELS[formProvider]?.voices || DEFAULT_PROVIDER_MODELS.gemini.voices;

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* LEFT SIDEBAR: PROFILE LIST & ACTIONS */}
      <aside className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-cyan-400" />
                <span>AI Debater Profiles</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Multi-provider roster with live key failover
              </p>
            </div>
            <button
              onClick={handleStartCreateNew}
              className="flex items-center gap-1 rounded-xl bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 shadow-md transition"
              title="Create New AI Debater"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Profile Cards List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center p-6 text-xs text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2 text-cyan-400" />
                Loading AI profiles...
              </div>
            ) : profiles.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 rounded-xl border border-slate-800">
                No AI profiles found. Click "New" to create one.
              </div>
            ) : (
              profiles.map(p => {
                const isSelected = selectedProfileId === p.id && !isCreatingNew;
                const provMeta = PROVIDERS.find(pr => pr.id === (p.provider || 'gemini'));
                const keyCount = (p.keyMasks && p.keyMasks.length > 0 ? p.keyMasks.length : p.hasKey ? 1 : 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => selectProfile(p)}
                    className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                      isSelected
                        ? 'border-cyan-400/80 bg-slate-800/90 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                        : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-slate-500 m-auto mt-2" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {provMeta?.name || 'Gemini'} · {p.modelId}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            p.status === 'enabled' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {keyCount > 0 ? `${keyCount} Key${keyCount > 1 ? 's' : ''}` : 'No Key'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Global Security / Failover Note & Quota Optimization Guide */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Automatic Key Pool Failover</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Configure multiple API keys per profile. If key #1 encounters quota exhaustion or rate limits (429), backup keys seamlessly take over.
          </p>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-2.5 space-y-1 text-emerald-300">
            <span className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 text-emerald-400">
              ⚡ Eco Quota Optimizer Active
            </span>
            <ul className="text-[10px] text-emerald-300/90 list-disc pl-3.5 space-y-0.5">
              <li>On-demand audio: Audio is synthesized only when clicking play, cutting API calls by 50%+.</li>
              <li>Rolling context: Only the immediate opponent's turn is sent, slashing tokens by 75%.</li>
              <li>Concise speeches: 80–110 words keep speech synthesis ultra-fast and character-efficient.</li>
            </ul>
          </div>
        </div>
      </aside>

      {/* RIGHT CONTENT: PROFILE CONFIGURATION EDITOR */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  {isCreatingNew ? 'CREATING NEW PROFILE' : `EDITING: ${selectedProfile?.name || 'PROFILE'}`}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400">
                  Provider: <strong className="text-white uppercase">{formProvider}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                {formName || (isCreatingNew ? 'Configure New Debater' : 'Profile Settings')}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 shadow-lg shadow-cyan-950/50 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {saveSuccessMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
          {saveErrorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{saveErrorMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 1: AI PROVIDER SELECTION                        */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Server className="h-4 w-4" />
                <span>1. Select AI Provider</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Choose the engine powering this debater's logic &amp; voice
              </span>
            </div>

            {/* Provider Segmented Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PROVIDERS.map(p => {
                const isSelected = formProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p.id)}
                    className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${p.colorBorder} bg-slate-900/90 ring-2 ring-cyan-500/40 shadow-lg`
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? p.colorText : 'text-white'}`}>
                        {p.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className={`h-4 w-4 ${p.colorText}`} />
                      )}
                    </div>
                    <span className="inline-block text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40 mb-1">
                      {p.badge}
                    </span>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                      {p.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: MULTI-API KEY POOL & FAILOVER                */}
          {/* ======================================================== */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Key className="h-4 w-4" />
                <span>2. {formProvider.toUpperCase()} API Key Pool (Automatic Failover)</span>
              </div>

              <button
                type="button"
                onClick={handleAddKeySlot}
                className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-cyan-300 border border-slate-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Extra Backup Key</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter one or more API keys for <strong>{formProvider.toUpperCase()}</strong>. During live debate rounds, if key #1 hits rate limits (HTTP 429) or quota errors, the system switches to backup key #2 automatically without stalling the debate.
            </p>

            {/* List of Key Slots */}
            <div className="space-y-3">
              {formKeySlots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                        {idx === 0 ? 'KEY #1 (PRIMARY)' : `KEY #${idx + 1} (FAILOVER BACKUP)`}
                      </span>
                      {slot.isExisting && (
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Saved ({slot.mask})</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestIndividualKey(idx)}
                        disabled={slot.testing || (!slot.key.trim() && !slot.isExisting)}
                        className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline disabled:opacity-40 cursor-pointer"
                      >
                        {slot.testing ? 'Testing Key...' : 'Test Key'}
                      </button>

                      {formKeySlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKeySlot(idx)}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Remove backup key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type={slot.show ? 'text' : 'password'}
                      placeholder={
                        slot.isExisting
                          ? `Leave blank to keep existing key (${slot.mask}), or type new key to replace`
                          : formProvider === 'gemini'
                          ? 'Paste Google Gemini API Key (AIzaSy...)'
                          : formProvider === 'openai'
                          ? 'Paste OpenAI API Key (sk-proj...)'
                          : formProvider === 'groq'
                          ? 'Paste Groq API Key (gsk_...)'
                          : 'Paste OpenRouter API Key (sk-or-...)'
                      }
                      value={slot.key}
                      onChange={e => handleKeyChange(idx, e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleKeyVisibility(idx)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-white"
                    >
                      {slot.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {slot.testResult && (
                    <div
                      className={`rounded-xl border p-2 text-[11px] ${
                        slot.testResult.success
                          ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                          : 'border-rose-500/40 bg-rose-950/50 text-rose-300'
                      }`}
                    >
                      {slot.testResult.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: TEXT GENERATION MODEL SELECTION               */}
          {/* ======================================================== */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Cpu className="h-4 w-4" />
                <span>3. Text Generation Model for {formProvider.toUpperCase()}</span>
              </div>

              {/* Live Model Fetcher */}
              <button
                type="button"
                onClick={handleFetchLiveModels}
                disabled={fetchingLiveModels}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-800 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${fetchingLiveModels ? 'animate-spin' : ''}`} />
                <span>{fetchingLiveModels ? 'Discovering Models...' : 'Fetch Live Models from API'}</span>
              </button>
            </div>

            {liveFetchMessage && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-2.5 text-xs text-cyan-200">
                {liveFetchMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Select Model
                </label>
                <select
                  value={formModelId}
                  onChange={e => setFormModelId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {availableTextModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 font-mono">
                  Active Model ID: {formModelId}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Deep Thinking Level (if supported by model)
                </label>
                <select
                  value={formThinkingLevel}
                  onChange={e => setFormThinkingLevel(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="HIGH">HIGH (Deep multi-step reasoning)</option>
                  <option value="MEDIUM">MEDIUM (Balanced speed &amp; depth)</option>
                  <option value="LOW">LOW (Fast response)</option>
                  <option value="MINIMAL">MINIMAL</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSearchGrounding}
                  onChange={e => setFormSearchGrounding(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Enable Google Search Grounding for empirical fact-checking</span>
              </label>

              <button
                type="button"
                onClick={handleTestModel}
                disabled={testingModel}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-800 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{testingModel ? 'Testing Connection...' : `Test ${formProvider.toUpperCase()} Model`}</span>
              </button>
            </div>

            {modelTestResult && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  modelTestResult.success
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {modelTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span>{modelTestResult.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: VOICE & TTS SYNTHESIS CONFIGURATION           */}
          {/* ======================================================== */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Volume2 className="h-4 w-4" />
                <span>4. Voice &amp; TTS Synthesis Configuration</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formTtsEnabled}
                  onChange={e => setFormTtsEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Enable Audio Synthesis</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  TTS Engine / Model
                </label>
                <select
                  value={formTtsModelId}
                  onChange={e => setFormTtsModelId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {availableTtsModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Voice Actor
                </label>
                <select
                  value={formVoiceName}
                  onChange={e => setFormVoiceName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {availableVoices.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.id} — {v.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Speaking Style Metadata Prompt
                </label>
                <input
                  type="text"
                  placeholder="e.g. Analytical, authoritative, and sharp"
                  value={formVoiceStyle}
                  onChange={e => setFormVoiceStyle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span>Voice Playback Speed</span>
                  <span className="font-mono text-cyan-400">{formVoiceSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={formVoiceSpeed}
                  onChange={e => setFormVoiceSpeed(parseFloat(e.target.value))}
                  className="mt-3 w-full accent-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={testingVoice}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-800 transition"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{testingVoice ? 'Synthesizing Voice...' : 'Audition Voice Audio'}</span>
              </button>
            </div>

            {voiceTestResult && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  voiceTestResult.success
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {voiceTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span>{voiceTestResult.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 5: DEBATER IDENTITY & POSITION                  */}
          {/* ======================================================== */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <User className="h-4 w-4" />
              <span>5. Debater Persona &amp; Philosophical Framework</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Alpha, Solar Energy Researcher, Kantian Scholar"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Topic Scope
                </label>
                <input
                  type="text"
                  placeholder="e.g. All Topics, Energy & Climate, Bioethics"
                  value={formTopicScope}
                  onChange={e => setFormTopicScope(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">
                Debate Side / Position To Defend <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Defends cosmic contingency and metaphysical purpose against physical reductionism..."
                value={formPosition}
                onChange={e => setFormPosition(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">
                Persona &amp; Dialectical Style Description
              </label>
              <textarea
                rows={3}
                placeholder="Define expertise, oratorical tone, core premises, and argumentation guidelines..."
                value={formPersona}
                onChange={e => setFormPersona(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 6: VISUAL APPEARANCE & AVATAR                   */}
          {/* ======================================================== */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Palette className="h-4 w-4" />
              <span>6. Visual Appearance &amp; Lighting Color</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Arena Lighting Accent Color
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormAccentColor(c.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-semibold transition ${
                      formAccentColor === c.id
                        ? `${c.border} bg-slate-800 text-white shadow-md`
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${c.bg} shrink-0`} />
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Avatar Image URL (or Choose Preset)
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formAvatarUrl}
                onChange={e => setFormAvatarUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                {PRESET_AVATARS.map((pa, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormAvatarUrl(pa.url)}
                    className={`relative rounded-xl overflow-hidden border aspect-square ${
                      formAvatarUrl === pa.url ? 'border-cyan-400 ring-2 ring-cyan-500/50' : 'border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <img src={pa.url} alt={pa.label} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 shadow-lg shadow-cyan-950/50 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Debater Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
