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
  Power
} from 'lucide-react';
import { DebaterProfilePublic, AccentColor, AIConfigPublic } from '../types';

interface AISettingsProps {
  isAdmin: boolean;
  openAdminModal: () => void;
  onRefreshConfigs: () => Promise<void>;
  atheistConfig?: AIConfigPublic;
  believerConfig?: AIConfigPublic;
  adminToken: string;
}

const AVAILABLE_TEXT_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Default Recommended - Ultra Fast, Free tier available)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (High Performance, Free tier available)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Lightweight, Free tier available)' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (High Throughput)' },
  { id: 'gemini-4-argon', name: 'Gemini 4 Argon (High Thinking & Complex Reasoning, Paid Tier)' },
];

const AVAILABLE_TTS_MODELS = [
  { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.8 Flash Lite TTS (Recommended Low Latency)' },
  { id: 'gemini-3.8-flash-tts', name: 'Gemini 3.8 Flash TTS (High Fidelity Voice Design)' },
];

const AVAILABLE_VOICES = [
  { id: 'Fenrir', desc: 'Authoritative, sharp, deep, analytical' },
  { id: 'Kore', desc: 'Articulate, warm, resonant, thoughtful' },
  { id: 'Puck', desc: 'Energetic, expressive, distinct' },
  { id: 'Charon', desc: 'Grounded, contemplative, measured' },
  { id: 'Zephyr', desc: 'Smooth, intellectual, balanced' },
];

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

export const AISettingsView: React.FC<AISettingsProps> = ({
  isAdmin,
  openAdminModal,
  onRefreshConfigs,
}) => {
  const [profiles, setProfiles] = useState<DebaterProfilePublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Form State for editing / creating
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formName, setFormName] = useState('');
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
  const [rawApiKeyInput, setRawApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

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

  // Load profiles
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
        // Default to first profile if none selected
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
    setFormPosition(p.position);
    setFormTopicScope(p.topicScope || 'All Topics');
    setFormPersona(p.persona || '');
    setFormStatus(p.status);
    setFormModelId(p.modelId || 'gemini-3.8-flash');
    setFormTtsModelId(p.ttsModelId || 'gemini-3.8-flash-lite-tts');
    setFormVoiceName(p.voiceName || 'Fenrir');
    setFormVoiceStyle(p.voiceStyle || '');
    setFormVoiceSpeed(p.voiceSpeed ?? 1.0);
    setFormTtsEnabled(p.ttsEnabled ?? true);
    setFormSearchGrounding(p.searchGroundingEnabled ?? true);
    setFormThinkingLevel(p.thinkingLevel || 'HIGH');
    setFormAvatarUrl(p.avatarUrl || '');
    setFormAccentColor(p.accentColor || 'cyan');
    setRawApiKeyInput('');
    setShowApiKey(false);
    setModelTestResult(null);
    setVoiceTestResult(null);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedProfileId(null);
    setFormName('');
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
    setRawApiKeyInput('');
    setShowApiKey(false);
    setModelTestResult(null);
    setVoiceTestResult(null);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

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

    const payload = {
      name: formName.trim(),
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
      rawApiKey: rawApiKeyInput.trim() !== '' ? rawApiKeyInput.trim() : undefined,
    };

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
          ? `Created profile "${data.profile?.name}" successfully!`
          : `Updated profile "${data.profile?.name}" successfully!`
      );
      setRawApiKeyInput('');
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

  // Test Model Connection
  const handleTestModel = async () => {
    if (!selectedProfileId && !isCreatingNew) return;
    setTestingModel(true);
    setModelTestResult(null);

    try {
      const targetId = selectedProfileId || 'profile-atheist';
      const res = await fetch(`/api/profiles/${targetId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeyOverride: rawApiKeyInput.trim() || undefined,
          modelIdOverride: formModelId,
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

  // Test Voice TTS
  const handleTestVoice = async () => {
    if (!selectedProfileId && !isCreatingNew) return;
    setTestingVoice(true);
    setVoiceTestResult(null);

    try {
      const targetId = selectedProfileId || 'profile-atheist';
      const res = await fetch(`/api/profiles/${targetId}/test-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeyOverride: rawApiKeyInput.trim() || undefined,
          ttsModelOverride: formTtsModelId,
          voiceOverride: formVoiceName,
          styleOverride: formVoiceStyle,
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

  // Delete Profile
  const confirmDeleteProfile = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/profiles/${profileToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete profile.');
      }
      setProfileToDelete(null);
      await fetchProfiles();
      setSelectedProfileId(null);
      handleStartCreateNew();
      await onRefreshConfigs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <Cpu className="h-7 w-7 text-cyan-400" />
              <span>Configurable AI Debater Profiles</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Create, configure, test, and manage reusable AI debaters across any topic, model, stance, voice, and appearance.
            </p>
          </div>

          <button
            onClick={handleStartCreateNew}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-950 hover:opacity-90 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Profile</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Profiles List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
            <span>SAVED PROFILES ({profiles.length})</span>
            <button onClick={fetchProfiles} className="hover:text-white flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-2">
            {profiles.map(p => {
              const isSelected = p.id === selectedProfileId && !isCreatingNew;
              return (
                <div
                  key={p.id}
                  onClick={() => selectProfile(p)}
                  className={`group relative cursor-pointer rounded-2xl border p-3.5 transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-cyan-400 bg-slate-900 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar preview */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                      <img src={p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 ${
                          p.status === 'enabled' ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-white truncate group-hover:text-cyan-300 transition">
                          {p.name}
                        </h4>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase ${
                            p.status === 'enabled'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {p.position}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>{p.modelId}</span>
                        <span>•</span>
                        <span>{p.voiceName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Profile Editor & Form */}
        <div className="lg:col-span-8">
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6"
          >
            {/* Header: Title & Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-cyan-400" />
                  <span>{isCreatingNew ? 'Create New AI Debater Profile' : `Edit Profile: ${formName || 'Untitled'}`}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure personality, model credentials, speech parameters, and stage appearance.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Toggle */}
                <button
                  type="button"
                  onClick={() => setFormStatus(formStatus === 'enabled' ? 'disabled' : 'enabled')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    formStatus === 'enabled'
                      ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border border-slate-700 text-slate-400'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{formStatus === 'enabled' ? 'Profile Enabled' : 'Profile Disabled'}</span>
                </button>

                {/* Delete Button (only if editing existing) */}
                {!isCreatingNew && selectedProfile && (
                  <button
                    type="button"
                    onClick={() => setProfileToDelete(selectedProfile)}
                    className="flex items-center gap-1 rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Success / Error Messages */}
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

            {/* Section 1: Identity & Assigned Position */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <User className="h-4 w-4" />
                <span>1. Debater Identity &amp; Position</span>
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
                  placeholder="e.g. Supports nuclear energy as essential for low-carbon grid stability..."
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
                  placeholder="Define expertise, oratorical tone, core premises, and guidelines..."
                  value={formPersona}
                  onChange={e => setFormPersona(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Section 2: Gemini API & Model Configuration */}
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Key className="h-4 w-4" />
                <span>2. Gemini API Credential &amp; Model Configuration</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Dedicated Gemini API Key (Encrypted At Rest)
                  </label>
                  {selectedProfile?.hasKey && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Configured ({selectedProfile.keyMask}) via {selectedProfile.keySource}</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={selectedProfile?.hasKey ? 'Enter new key to update, or leave blank to keep existing' : 'Paste Gemini API key (AIzaSy...)'}
                    value={rawApiKeyInput}
                    onChange={e => setRawApiKeyInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Stored securely with AES-256-GCM encryption. Never sent plaintext to browsers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Text Generation Model
                  </label>
                  <select
                    value={formModelId}
                    onChange={e => setFormModelId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {AVAILABLE_TEXT_MODELS.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Deep Thinking Level
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

                {/* Test Connection Button */}
                <button
                  type="button"
                  onClick={handleTestModel}
                  disabled={testingModel}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-800 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{testingModel ? 'Testing Connection...' : 'Test Gemini Model'}</span>
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

            {/* Section 3: Voice & Speech Synthesis */}
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Volume2 className="h-4 w-4" />
                <span>3. Voice &amp; TTS Synthesis Configuration</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Gemini TTS Model
                  </label>
                  <select
                    value={formTtsModelId}
                    onChange={e => setFormTtsModelId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {AVAILABLE_TTS_MODELS.map(m => (
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
                    {AVAILABLE_VOICES.map(v => (
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

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTtsEnabled}
                    onChange={e => setFormTtsEnabled(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Enable 24kHz Studio Audio Synthesis for this profile</span>
                </label>

                <button
                  type="button"
                  onClick={handleTestVoice}
                  disabled={testingVoice}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-slate-800 transition"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{testingVoice ? 'Generating Sample...' : 'Test Voice Audio'}</span>
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {voiceTestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                      )}
                      <span>{voiceTestResult.message}</span>
                    </div>

                    {voiceTestResult.audioUrl && (
                      <audio controls src={voiceTestResult.audioUrl} className="h-7 w-48" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Visual Theme & Avatar */}
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Palette className="h-4 w-4" />
                <span>4. Visual Theme, Accent Lighting &amp; Avatar</span>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">
                  Stage Lighting &amp; LED Accent Color:
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {ACCENT_COLORS.map(c => {
                    const isSelected = formAccentColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormAccentColor(c.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? `${c.border} bg-slate-900 text-white ring-2 ring-white/20`
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${c.bg}`} />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Presets & URL */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">
                  Avatar Image URL:
                </label>
                <input
                  type="url"
                  placeholder="Paste direct image URL (https://...)"
                  value={formAvatarUrl}
                  onChange={e => setFormAvatarUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />

                <div className="mt-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Preset Avatars:</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {PRESET_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormAvatarUrl(av.url)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:border-cyan-500/40 hover:text-white transition"
                      >
                        <img src={av.url} alt={av.label} className="h-4 w-4 rounded-full object-cover" />
                        <span>{av.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="border-t border-slate-800 pt-5 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-7 py-3 text-xs font-bold text-white shadow-xl shadow-cyan-950 hover:opacity-90 transition active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{saving ? 'Saving Profile...' : isCreatingNew ? 'Create AI Profile' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950 border border-rose-800/40">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Debater Profile</h3>
                <p className="text-xs text-rose-300">Remove configured debater identity</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete profile <strong className="text-white">"{profileToDelete.name}"</strong>?
            </p>

            <p className="mt-2 text-[11px] text-slate-400">
              Note: Profiles currently engaged in active running debates cannot be deleted until the debate concludes.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/60 p-2.5 text-xs text-rose-200">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProfile}
                disabled={deleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-950 transition active:scale-95 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
