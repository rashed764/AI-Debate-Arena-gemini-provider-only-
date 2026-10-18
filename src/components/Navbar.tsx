import React from 'react';
import { Shield, Sparkles, Sliders, Plus, Volume2, Lock, Unlock } from 'lucide-react';
import { AIConfigPublic } from '../types';

interface NavbarProps {
  currentView: 'arena' | 'list' | 'settings';
  setCurrentView: (view: 'arena' | 'list' | 'settings') => void;
  openCreateModal: () => void;
  openAdminModal: () => void;
  isAdmin: boolean;
  onLogoutAdmin: () => void;
  atheistConfig?: AIConfigPublic;
  believerConfig?: AIConfigPublic;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  openCreateModal,
  openAdminModal,
  isAdmin,
  onLogoutAdmin,
  atheistConfig,
  believerConfig,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('list')}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-cyan-950/50">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-white text-base sm:text-lg">
                  AI DEBATE <span className="text-cyan-400">ARENA</span>
                </span>
                <span className="hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300 sm:inline-block">
                  LIVING STONE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Atheist AI vs Believer AI • Dual Gemini Voice</p>
            </div>
          </button>
        </div>

        {/* Center Persona Status Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {/* Atheist AI Status */}
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${atheistConfig?.hasKey ? 'bg-cyan-400 animate-ping' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${atheistConfig?.hasKey ? 'bg-cyan-500' : 'bg-rose-500'}`} />
            </span>
            <span className="font-semibold text-cyan-300">Atheist AI:</span>
            <span className="text-slate-300">{atheistConfig?.hasKey ? atheistConfig.modelId : 'Not Configured'}</span>
            <span className="text-cyan-400/80 font-mono text-[11px]">({atheistConfig?.voiceName || 'Fenrir'})</span>
          </div>

          <span className="text-slate-600 font-bold">VS</span>

          {/* Believer AI Status */}
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${believerConfig?.hasKey ? 'bg-amber-400 animate-ping' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${believerConfig?.hasKey ? 'bg-amber-500' : 'bg-rose-500'}`} />
            </span>
            <span className="font-semibold text-amber-300">Believer AI:</span>
            <span className="text-slate-300">{believerConfig?.hasKey ? believerConfig.modelId : 'Not Configured'}</span>
            <span className="text-amber-400/80 font-mono text-[11px]">({believerConfig?.voiceName || 'Kore'})</span>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setCurrentView('list')}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
              currentView === 'list'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            Debates
          </button>

          <button
            onClick={() => setCurrentView('arena')}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
              currentView === 'arena'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            Live Arena
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
              currentView === 'settings'
                ? 'bg-indigo-600/80 text-white'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI &amp; Voice Settings</span>
            <span className="sm:hidden">Settings</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Debate</span>
          </button>
        </div>
      </div>
    </header>
  );
};
