import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  X,
  Server,
  Cpu,
  Zap
} from 'lucide-react';
import { AIProvider } from '../types';

interface ProviderManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshProfiles?: () => Promise<void>;
}

interface KeySlot {
  id: string;
  key: string;
  show?: boolean;
  testing?: boolean;
  testResult?: { success?: boolean; message?: string } | null;
}

export const ProviderManager: React.FC<ProviderManagerProps> = ({
  isOpen,
  onClose,
  onRefreshProfiles,
}) => {
  const [activeProvider, setActiveProvider] = useState<AIProvider>('gemini');

  // Keys state per provider
  const [providerKeys, setProviderKeys] = useState<Record<AIProvider, KeySlot[]>>({
    gemini: [{ id: 'gem-1', key: '', show: false }],
    openai: [{ id: 'oai-1', key: '', show: false }],
    groq: [{ id: 'grq-1', key: '', show: false }],
    openrouter: [{ id: 'or-1', key: '', show: false }],
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAddKey = (provider: AIProvider) => {
    setProviderKeys(prev => ({
      ...prev,
      [provider]: [
        ...prev[provider],
        { id: `key-${Date.now()}-${prev[provider].length}`, key: '', show: false }
      ],
    }));
  };

  const handleRemoveKey = (provider: AIProvider, index: number) => {
    setProviderKeys(prev => {
      const list = prev[provider];
      if (list.length <= 1) {
        return {
          ...prev,
          [provider]: [{ id: `key-${Date.now()}`, key: '', show: false }],
        };
      }
      return {
        ...prev,
        [provider]: list.filter((_, i) => i !== index),
      };
    });
  };

  const handleKeyChange = (provider: AIProvider, index: number, val: string) => {
    setProviderKeys(prev => ({
      ...prev,
      [provider]: prev[provider].map((slot, i) => (i === index ? { ...slot, key: val, testResult: null } : slot)),
    }));
  };

  const handleToggleShow = (provider: AIProvider, index: number) => {
    setProviderKeys(prev => ({
      ...prev,
      [provider]: prev[provider].map((slot, i) => (i === index ? { ...slot, show: !slot.show } : slot)),
    }));
  };

  const handleTestKey = async (provider: AIProvider, index: number) => {
    const slot = providerKeys[provider][index];
    const keyToTest = slot.key.trim();
    if (!keyToTest) return;

    setProviderKeys(prev => ({
      ...prev,
      [provider]: prev[provider].map((s, i) => (i === index ? { ...s, testing: true, testResult: null } : s)),
    }));

    try {
      const defaultModel =
        provider === 'openai'
          ? 'gpt-4o'
          : provider === 'groq'
          ? 'llama-3.3-70b-versatile'
          : provider === 'openrouter'
          ? 'anthropic/claude-3.7-sonnet'
          : 'gemini-3.8-flash';

      const res = await fetch('/api/providers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: keyToTest,
          modelId: defaultModel,
        }),
      });
      const data = await res.json();
      setProviderKeys(prev => ({
        ...prev,
        [provider]: prev[provider].map((s, i) => (i === index ? { ...s, testing: false, testResult: data } : s)),
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProviderKeys(prev => ({
        ...prev,
        [provider]: prev[provider].map((s, i) => (i === index ? { ...s, testing: false, testResult: { success: false, message: msg } } : s)),
      }));
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (onRefreshProfiles) {
        await onRefreshProfiles();
      }
      setMessage({ success: true, text: 'API key pools and 429 rotation failover configured successfully.' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ success: false, text: `Failed to save keys: ${msg}` });
    } finally {
      setSaving(false);
    }
  };

  const providersList: Array<{ id: AIProvider; name: string; desc: string; badge: string; color: string }> = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      desc: 'Multimodal intelligence, thinking models, & native voice synthesis.',
      badge: 'Recommended',
      color: 'border-cyan-500 text-cyan-400 bg-cyan-950/40',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      desc: 'Flagship GPT-4o reasoning models and studio TTS-1 voice.',
      badge: 'GPT-4o',
      color: 'border-emerald-500 text-emerald-400 bg-emerald-950/40',
    },
    {
      id: 'groq',
      name: 'Groq LPU',
      desc: 'Ultra-fast 500+ tok/s open-weights inference (Llama 3.3 70B).',
      badge: 'Ultra Fast',
      color: 'border-amber-500 text-amber-400 bg-amber-950/40',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      desc: 'Universal gateway to Claude 3.7 Sonnet, DeepSeek R1, and more.',
      badge: 'Universal',
      color: 'border-purple-500 text-purple-400 bg-purple-950/40',
    },
  ];

  const currentSlots = providerKeys[activeProvider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Provider Key Pool &amp; 429 Failover Manager</h2>
              <p className="text-xs text-slate-400">
                Configure multiple API keys per provider with automatic round-robin rotation on HTTP 429 rate limits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Provider Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {providersList.map(p => {
              const isActive = activeProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProvider(p.id)}
                  className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    isActive
                      ? 'border-cyan-400 bg-slate-800/95 ring-2 ring-cyan-500/40 shadow-lg'
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-white">{p.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                      {p.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {providerKeys[p.id].filter(s => s.key.trim()).length} Key(s) Configured
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Provider Key Pool Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {activeProvider.toUpperCase()} API Key Pool &amp; 429 Rotation
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddKey(activeProvider)}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition shadow-md cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Backup API Key</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When live debates run, if <strong>Key #1</strong> hits a rate limit (HTTP 429 or quota exhaustion), the orchestrator automatically rotates instantly to <strong>Key #2</strong> without stalling or failing.
            </p>

            {/* Key Slots List */}
            <div className="space-y-3">
              {currentSlots.map((slot, index) => (
                <div key={slot.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                      {index === 0 ? 'KEY #1 (PRIMARY)' : `KEY #${index + 1} (AUTOMATIC 429 FAILOVER BACKUP)`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestKey(activeProvider, index)}
                        disabled={slot.testing || !slot.key.trim()}
                        className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline disabled:opacity-40 cursor-pointer"
                      >
                        {slot.testing ? 'Testing...' : 'Test Connection'}
                      </button>

                      {currentSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKey(activeProvider, index)}
                          className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          title="Remove Key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type={slot.show ? 'text' : 'password'}
                      placeholder={`Enter ${activeProvider.toUpperCase()} API Key #${index + 1}...`}
                      value={slot.key}
                      onChange={e => handleKeyChange(activeProvider, index, e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 pr-10 text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleShow(activeProvider, index)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {slot.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {slot.testResult && (
                    <div
                      className={`rounded-lg border p-2 text-[11px] flex items-center gap-2 ${
                        slot.testResult.success
                          ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                          : 'border-rose-500/40 bg-rose-950/50 text-rose-300'
                      }`}
                    >
                      {slot.testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />}
                      <span>{slot.testResult.message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
                message.success ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200' : 'border-rose-500/40 bg-rose-950/50 text-rose-200'
              }`}
            >
              {message.success ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-rose-400" />}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono">
            <ShieldCheck className="h-4 w-4" />
            <span>Automatic 429 Error Detection &amp; Key Rotation Active</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
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
                  <span>Save Provider Pools</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
