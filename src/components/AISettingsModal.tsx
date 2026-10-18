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
  RotateCcw
} from 'lucide-react';
import { AIConfigPublic, PersonaType } from '../types';

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
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Deprecated / Legacy - Auto-routes to replacement)' },
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

export const AISettingsView: React.FC<AISettingsProps> = ({
  isAdmin,
  openAdminModal,
  onRefreshConfigs,
  atheistConfig,
  believerConfig,
  adminToken,
}) => {
  // Local state for Atheist AI form
  const [atheistKeyInput, setAtheistKeyInput] = useState('');
  const [showAtheistKey, setShowAtheistKey] = useState(false);
  const [atheistModel, setAtheistModel] = useState(atheistConfig?.modelId || 'gemini-3.8-flash');
  const [atheistTtsModel, setAtheistTtsModel] = useState(atheistConfig?.ttsModelId || 'gemini-3.8-flash-lite-tts');
  const [atheistVoice, setAtheistVoice] = useState(atheistConfig?.voiceName || 'Fenrir');
  const [atheistStyle, setAtheistStyle] = useState(atheistConfig?.voiceStyle || 'Analytical, evidence-focused, precise, skeptical philosopher');
  const [atheistSpeed, setAtheistSpeed] = useState(atheistConfig?.voiceSpeed ?? 1.0);
  const [atheistTtsEnabled, setAtheistTtsEnabled] = useState(atheistConfig?.ttsEnabled ?? true);
  const [atheistSearch, setAtheistSearch] = useState(atheistConfig?.searchGroundingEnabled ?? true);
  const [atheistThinking, setAtheistThinking] = useState(atheistConfig?.thinkingLevel || 'HIGH');

  // Local state for Believer AI form
  const [believerKeyInput, setBelieverKeyInput] = useState('');
  const [showBelieverKey, setShowBelieverKey] = useState(false);
  const [believerModel, setBelieverModel] = useState(believerConfig?.modelId || 'gemini-3.8-flash');
  const [believerTtsModel, setBelieverTtsModel] = useState(believerConfig?.ttsModelId || 'gemini-3.8-flash-lite-tts');
  const [believerVoice, setBelieverVoice] = useState(believerConfig?.voiceName || 'Kore');
  const [believerStyle, setBelieverStyle] = useState(believerConfig?.voiceStyle || 'Philosophical, articulate, thoughtful, logical theologian');
  const [believerSpeed, setBelieverSpeed] = useState(believerConfig?.voiceSpeed ?? 1.0);
  const [believerTtsEnabled, setBelieverTtsEnabled] = useState(believerConfig?.ttsEnabled ?? true);
  const [believerSearch, setBelieverSearch] = useState(believerConfig?.searchGroundingEnabled ?? true);
  const [believerThinking, setBelieverThinking] = useState(believerConfig?.thinkingLevel || 'HIGH');

  // Testing & Status state
  const [testingAtheist, setTestingAtheist] = useState(false);
  const [testingAtheistVoice, setTestingAtheistVoice] = useState(false);
  const [atheistAudioSampleUrl, setAtheistAudioSampleUrl] = useState<string | null>(null);
  const [atheistFeedback, setAtheistFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  const [testingBeliever, setTestingBeliever] = useState(false);
  const [testingBelieverVoice, setTestingBelieverVoice] = useState(false);
  const [believerAudioSampleUrl, setBelieverAudioSampleUrl] = useState<string | null>(null);
  const [believerFeedback, setBelieverFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  const [savingAtheist, setSavingAtheist] = useState(false);
  const [savingBeliever, setSavingBeliever] = useState(false);

  // Sync initial configs
  useEffect(() => {
    if (atheistConfig) {
      setAtheistModel(atheistConfig.modelId);
      setAtheistTtsModel(atheistConfig.ttsModelId);
      setAtheistVoice(atheistConfig.voiceName);
      setAtheistStyle(atheistConfig.voiceStyle);
      setAtheistSpeed(atheistConfig.voiceSpeed);
      setAtheistTtsEnabled(atheistConfig.ttsEnabled);
      setAtheistSearch(atheistConfig.searchGroundingEnabled);
      setAtheistThinking(atheistConfig.thinkingLevel);
    }
  }, [atheistConfig]);

  useEffect(() => {
    if (believerConfig) {
      setBelieverModel(believerConfig.modelId);
      setBelieverTtsModel(believerConfig.ttsModelId);
      setBelieverVoice(believerConfig.voiceName);
      setBelieverStyle(believerConfig.voiceStyle);
      setBelieverSpeed(believerConfig.voiceSpeed);
      setBelieverTtsEnabled(believerConfig.ttsEnabled);
      setBelieverSearch(believerConfig.searchGroundingEnabled);
      setBelieverThinking(believerConfig.thinkingLevel);
    }
  }, [believerConfig]);

  // Handle Save
  const handleSave = async (persona: PersonaType) => {
    if (!isAdmin) {
      openAdminModal();
      return;
    }

    if (persona === 'atheist') {
      setSavingAtheist(true);
      setAtheistFeedback(null);
      try {
        const res = await fetch('/api/admin/ai-config/atheist', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            rawApiKey: atheistKeyInput.trim() !== '' ? atheistKeyInput.trim() : undefined,
            modelId: atheistModel,
            ttsModelId: atheistTtsModel,
            voiceName: atheistVoice,
            voiceStyle: atheistStyle,
            voiceSpeed: atheistSpeed,
            ttsEnabled: atheistTtsEnabled,
            searchGroundingEnabled: atheistSearch,
            thinkingLevel: atheistThinking,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setAtheistFeedback({ success: true, message: 'Atheist AI configuration saved successfully!' });
          setAtheistKeyInput('');
          await onRefreshConfigs();
        } else {
          setAtheistFeedback({ success: false, message: data.error || 'Failed to save configuration.' });
        }
      } catch (err) {
        setAtheistFeedback({ success: false, message: 'Network error saving configuration.' });
      } finally {
        setSavingAtheist(false);
      }
    } else {
      setSavingBeliever(true);
      setBelieverFeedback(null);
      try {
        const res = await fetch('/api/admin/ai-config/believer', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            rawApiKey: believerKeyInput.trim() !== '' ? believerKeyInput.trim() : undefined,
            modelId: believerModel,
            ttsModelId: believerTtsModel,
            voiceName: believerVoice,
            voiceStyle: believerStyle,
            voiceSpeed: believerSpeed,
            ttsEnabled: believerTtsEnabled,
            searchGroundingEnabled: believerSearch,
            thinkingLevel: believerThinking,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setBelieverFeedback({ success: true, message: 'Believer AI configuration saved successfully!' });
          setBelieverKeyInput('');
          await onRefreshConfigs();
        } else {
          setBelieverFeedback({ success: false, message: data.error || 'Failed to save configuration.' });
        }
      } catch (err) {
        setBelieverFeedback({ success: false, message: 'Network error saving configuration.' });
      } finally {
        setSavingBeliever(false);
      }
    }
  };

  // Handle Test Text Connection
  const handleTestConnection = async (persona: PersonaType) => {
    if (!isAdmin) {
      openAdminModal();
      return;
    }

    if (persona === 'atheist') {
      setTestingAtheist(true);
      setAtheistFeedback(null);
      try {
        const res = await fetch('/api/admin/ai-config/atheist/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            apiKeyOverride: atheistKeyInput.trim() || undefined,
            modelIdOverride: atheistModel,
          }),
        });
        const data = await res.json();
        setAtheistFeedback({ success: data.success, message: data.message });
        await onRefreshConfigs();
      } catch (err) {
        setAtheistFeedback({ success: false, message: 'Connection test request failed.' });
      } finally {
        setTestingAtheist(false);
      }
    } else {
      setTestingBeliever(true);
      setBelieverFeedback(null);
      try {
        const res = await fetch('/api/admin/ai-config/believer/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            apiKeyOverride: believerKeyInput.trim() || undefined,
            modelIdOverride: believerModel,
          }),
        });
        const data = await res.json();
        setBelieverFeedback({ success: data.success, message: data.message });
        await onRefreshConfigs();
      } catch (err) {
        setBelieverFeedback({ success: false, message: 'Connection test request failed.' });
      } finally {
        setTestingBeliever(false);
      }
    }
  };

  // Handle Test Voice Synthesis
  const handleTestVoice = async (persona: PersonaType) => {
    if (!isAdmin) {
      openAdminModal();
      return;
    }

    if (persona === 'atheist') {
      setTestingAtheistVoice(true);
      setAtheistAudioSampleUrl(null);
      try {
        const res = await fetch('/api/admin/ai-config/atheist/test-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            apiKeyOverride: atheistKeyInput.trim() || undefined,
            ttsModelOverride: atheistTtsModel,
            voiceOverride: atheistVoice,
            styleOverride: atheistStyle,
          }),
        });
        const data = await res.json();
        if (data.success && data.audioUrl) {
          setAtheistAudioSampleUrl(data.audioUrl);
          setAtheistFeedback({ success: true, message: data.message });
        } else {
          setAtheistFeedback({ success: false, message: data.message });
        }
      } catch (err) {
        setAtheistFeedback({ success: false, message: 'Voice test request failed.' });
      } finally {
        setTestingAtheistVoice(false);
      }
    } else {
      setTestingBelieverVoice(true);
      setBelieverAudioSampleUrl(null);
      try {
        const res = await fetch('/api/admin/ai-config/believer/test-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            apiKeyOverride: believerKeyInput.trim() || undefined,
            ttsModelOverride: believerTtsModel,
            voiceOverride: believerVoice,
            styleOverride: believerStyle,
          }),
        });
        const data = await res.json();
        if (data.success && data.audioUrl) {
          setBelieverAudioSampleUrl(data.audioUrl);
          setBelieverFeedback({ success: true, message: data.message });
        } else {
          setBelieverFeedback({ success: false, message: data.message });
        }
      } catch (err) {
        setBelieverFeedback({ success: false, message: 'Voice test request failed.' });
      } finally {
        setTestingBelieverVoice(false);
      }
    }
  };

  // Handle Remove Key
  const handleRemoveKey = async (persona: PersonaType) => {
    if (!isAdmin) {
      openAdminModal();
      return;
    }
    if (!window.confirm(`Are you sure you want to remove the stored API key for ${persona === 'atheist' ? 'Atheist AI' : 'Believer AI'}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/ai-config/${persona}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        await onRefreshConfigs();
        if (persona === 'atheist') {
          setAtheistFeedback({ success: true, message: 'Atheist API key removed from secure storage.' });
        } else {
          setBelieverFeedback({ success: true, message: 'Believer API key removed from secure storage.' });
        }
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-950/80 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-800/50">
              MANDATORY CORE CONFIGURATION
            </span>
            <span className="text-xs text-slate-400">Settings → AI API &amp; Voice Configuration</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Dual AI Engine &amp; Voice Settings
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure independent Gemini API keys, LLM models, and distinct Gemini TTS speech synthesis for both Atheist AI and Believer AI.
          </p>
        </div>

        {/* Admin Badge */}
        <div>
          {isAdmin ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Admin Mode Active (Editing Enabled)</span>
            </div>
          ) : (
            <button
              onClick={openAdminModal}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3.5 py-2 text-xs font-medium text-amber-300 hover:bg-amber-900/40 transition"
            >
              <Lock className="h-4 w-4 text-amber-400" />
              <span>Unlock Admin Mode to Save Keys</span>
            </button>
          )}
        </div>
      </div>

      {/* Security Architecture Callout */}
      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white">Server-Authoritative Secret Encryption (AES-256-GCM)</p>
          <p className="mt-0.5 text-slate-400">
            Keys entered below are encrypted at rest on the server and are <span className="text-cyan-300">never transmitted to the frontend bundle or GET responses</span>.
            If environment variables are configured on the host, they serve as initial deployment fallbacks.
          </p>
        </div>
      </div>

      {/* Two Independent Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ========================================================== */}
        {/* PANEL A: ATHEIST AI                                       */}
        {/* ========================================================== */}
        <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl shadow-cyan-950/20">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-extrabold text-sm">
                A
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Atheist AI</span>
                  <span className="text-xs rounded bg-cyan-950 px-2 py-0.5 text-cyan-400 border border-cyan-500/30">
                    Electric Blue
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Analytical, skeptical, evidence-focused persona</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${atheistConfig?.hasKey ? 'bg-cyan-400' : 'bg-rose-500'}`} />
              <span className="font-medium text-slate-300 capitalize">
                {atheistConfig?.hasKey ? atheistConfig.status : 'Not Configured'}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {/* Gemini API Key */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Gemini API Key</span>
                </label>
                {atheistConfig?.hasKey && (
                  <span className="text-[11px] text-cyan-400">
                    Active: <code className="font-mono">{atheistConfig.keyMask}</code> ({atheistConfig.keySource})
                  </span>
                )}
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showAtheistKey ? 'text' : 'password'}
                  placeholder={atheistConfig?.hasKey ? 'Enter new key to replace stored key...' : 'AIzaSy...'}
                  value={atheistKeyInput}
                  onChange={e => setAtheistKeyInput(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowAtheistKey(!showAtheistKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  title={showAtheistKey ? 'Hide key' : 'Show key'}
                >
                  {showAtheistKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Text Generation Model */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>Text Generation Model ID</span>
              </label>
              <select
                value={atheistModel}
                onChange={e => setAtheistModel(e.target.value)}
                disabled={!isAdmin}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
              >
                {AVAILABLE_TEXT_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Grounding & Thinking Level */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Search className="h-3 w-3 text-cyan-400" />
                    <span>Search Grounding</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={atheistSearch}
                    onChange={e => setAtheistSearch(e.target.checked)}
                    disabled={!isAdmin}
                    className="h-4 w-4 rounded accent-cyan-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Uses Google Search tool for current empirical facts</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <BrainCircuit className="h-3 w-3 text-cyan-400" />
                  <span>Thinking Level</span>
                </span>
                <select
                  value={atheistThinking}
                  onChange={e => setAtheistThinking(e.target.value as any)}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                >
                  <option value="HIGH">HIGH (Deep Reasoning)</option>
                  <option value="MEDIUM">MEDIUM (Balanced)</option>
                  <option value="LOW">LOW (Fast)</option>
                  <option value="MINIMAL">MINIMAL</option>
                </select>
              </div>
            </div>

            {/* TTS Voice Configuration Subsection */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                  <span>Speech Synthesis (TTS)</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <span>TTS Enabled</span>
                  <input
                    type="checkbox"
                    checked={atheistTtsEnabled}
                    onChange={e => setAtheistTtsEnabled(e.target.checked)}
                    disabled={!isAdmin}
                    className="h-4 w-4 rounded accent-cyan-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">TTS Model ID</label>
                  <select
                    value={atheistTtsModel}
                    onChange={e => setAtheistTtsModel(e.target.value)}
                    disabled={!isAdmin}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  >
                    {AVAILABLE_TTS_MODELS.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Assigned Voice</label>
                  <select
                    value={atheistVoice}
                    onChange={e => setAtheistVoice(e.target.value)}
                    disabled={!isAdmin}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
                  >
                    {AVAILABLE_VOICES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.id} — {v.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Speaking Style Instruction</label>
                <input
                  type="text"
                  value={atheistStyle}
                  onChange={e => setAtheistStyle(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g. Analytical, clear, intellectual"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Playback Speed: {atheistSpeed.toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.1"
                  value={atheistSpeed}
                  onChange={e => setAtheistSpeed(parseFloat(e.target.value))}
                  disabled={!isAdmin}
                  className="w-32 accent-cyan-500"
                />
              </div>

              {/* Playable Voice Test Player */}
              {atheistAudioSampleUrl && (
                <div className="mt-2 rounded-lg border border-cyan-500/40 bg-slate-900 p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs text-cyan-300 font-medium">Test Audio Sample Ready:</span>
                  </div>
                  <audio controls src={atheistAudioSampleUrl} className="h-8 max-w-[220px]" />
                </div>
              )}
            </div>

            {/* Feedback Message */}
            {atheistFeedback && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  atheistFeedback.success
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                }`}
              >
                {atheistFeedback.message}
              </div>
            )}

            {/* Actions for Atheist AI */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleTestConnection('atheist')}
                disabled={testingAtheist || !isAdmin}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingAtheist ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestVoice('atheist')}
                disabled={testingAtheistVoice || !isAdmin}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/60 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition disabled:opacity-50"
              >
                <Volume2 className={`h-3.5 w-3.5 ${testingAtheistVoice ? 'animate-pulse' : ''}`} />
                <span>{testingAtheistVoice ? 'Synthesizing...' : 'Test Voice Audio'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave('atheist')}
                disabled={savingAtheist || !isAdmin}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-950 hover:bg-cyan-500 transition disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{savingAtheist ? 'Saving...' : 'Save Configuration'}</span>
              </button>

              {atheistConfig?.hasKey && (
                <button
                  type="button"
                  onClick={() => handleRemoveKey('atheist')}
                  disabled={!isAdmin}
                  title="Remove stored key"
                  className="ml-auto rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* PANEL B: BELIEVER AI                                       */}
        {/* ========================================================== */}
        <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl shadow-amber-950/20">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950 border border-amber-500/40 text-amber-400 font-extrabold text-sm">
                B
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Believer AI</span>
                  <span className="text-xs rounded bg-amber-950 px-2 py-0.5 text-amber-400 border border-amber-500/30">
                    Radiant Gold
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Philosophical, articulate, theistic perspective</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${believerConfig?.hasKey ? 'bg-amber-400' : 'bg-rose-500'}`} />
              <span className="font-medium text-slate-300 capitalize">
                {believerConfig?.hasKey ? believerConfig.status : 'Not Configured'}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {/* Gemini API Key */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Gemini API Key</span>
                </label>
                {believerConfig?.hasKey && (
                  <span className="text-[11px] text-amber-400">
                    Active: <code className="font-mono">{believerConfig.keyMask}</code> ({believerConfig.keySource})
                  </span>
                )}
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showBelieverKey ? 'text' : 'password'}
                  placeholder={believerConfig?.hasKey ? 'Enter new key to replace stored key...' : 'AIzaSy...'}
                  value={believerKeyInput}
                  onChange={e => setBelieverKeyInput(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowBelieverKey(!showBelieverKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  title={showBelieverKey ? 'Hide key' : 'Show key'}
                >
                  {showBelieverKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Text Generation Model */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-amber-400" />
                <span>Text Generation Model ID</span>
              </label>
              <select
                value={believerModel}
                onChange={e => setBelieverModel(e.target.value)}
                disabled={!isAdmin}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
              >
                {AVAILABLE_TEXT_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Grounding & Thinking Level */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Search className="h-3 w-3 text-amber-400" />
                    <span>Search Grounding</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={believerSearch}
                    onChange={e => setBelieverSearch(e.target.checked)}
                    disabled={!isAdmin}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Uses Google Search tool for philosophical literature</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <BrainCircuit className="h-3 w-3 text-amber-400" />
                  <span>Thinking Level</span>
                </span>
                <select
                  value={believerThinking}
                  onChange={e => setBelieverThinking(e.target.value as any)}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                >
                  <option value="HIGH">HIGH (Deep Reasoning)</option>
                  <option value="MEDIUM">MEDIUM (Balanced)</option>
                  <option value="LOW">LOW (Fast)</option>
                  <option value="MINIMAL">MINIMAL</option>
                </select>
              </div>
            </div>

            {/* TTS Voice Configuration Subsection */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Volume2 className="h-4 w-4 text-amber-400" />
                  <span>Speech Synthesis (TTS)</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <span>TTS Enabled</span>
                  <input
                    type="checkbox"
                    checked={believerTtsEnabled}
                    onChange={e => setBelieverTtsEnabled(e.target.checked)}
                    disabled={!isAdmin}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">TTS Model ID</label>
                  <select
                    value={believerTtsModel}
                    onChange={e => setBelieverTtsModel(e.target.value)}
                    disabled={!isAdmin}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  >
                    {AVAILABLE_TTS_MODELS.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Assigned Voice</label>
                  <select
                    value={believerVoice}
                    onChange={e => setBelieverVoice(e.target.value)}
                    disabled={!isAdmin}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
                  >
                    {AVAILABLE_VOICES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.id} — {v.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Speaking Style Instruction</label>
                <input
                  type="text"
                  value={believerStyle}
                  onChange={e => setBelieverStyle(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g. Philosophical, articulate, resonant"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Playback Speed: {believerSpeed.toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.1"
                  value={believerSpeed}
                  onChange={e => setBelieverSpeed(parseFloat(e.target.value))}
                  disabled={!isAdmin}
                  className="w-32 accent-amber-500"
                />
              </div>

              {/* Playable Voice Test Player */}
              {believerAudioSampleUrl && (
                <div className="mt-2 rounded-lg border border-amber-500/40 bg-slate-900 p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-amber-400 animate-pulse" />
                    <span className="text-xs text-amber-300 font-medium">Test Audio Sample Ready:</span>
                  </div>
                  <audio controls src={believerAudioSampleUrl} className="h-8 max-w-[220px]" />
                </div>
              )}
            </div>

            {/* Feedback Message */}
            {believerFeedback && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  believerFeedback.success
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                }`}
              >
                {believerFeedback.message}
              </div>
            )}

            {/* Actions for Believer AI */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleTestConnection('believer')}
                disabled={testingBeliever || !isAdmin}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/60 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-900/60 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingBeliever ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestVoice('believer')}
                disabled={testingBelieverVoice || !isAdmin}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/60 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition disabled:opacity-50"
              >
                <Volume2 className={`h-3.5 w-3.5 ${testingBelieverVoice ? 'animate-pulse' : ''}`} />
                <span>{testingBelieverVoice ? 'Synthesizing...' : 'Test Voice Audio'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave('believer')}
                disabled={savingBeliever || !isAdmin}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-950 hover:bg-amber-500 transition disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{savingBeliever ? 'Saving...' : 'Save Configuration'}</span>
              </button>

              {believerConfig?.hasKey && (
                <button
                  type="button"
                  onClick={() => handleRemoveKey('believer')}
                  disabled={!isAdmin}
                  title="Remove stored key"
                  className="ml-auto rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
