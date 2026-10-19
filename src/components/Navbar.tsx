import React from 'react';
import { Shield, Sliders, Plus, Users, Cpu, Key } from 'lucide-react';
import { AIConfigPublic, DebaterProfilePublic } from '../types';

interface NavbarProps {
  currentView: 'arena' | 'list' | 'settings';
  setCurrentView: (view: 'arena' | 'list' | 'settings') => void;
  openCreateModal: () => void;
  openAdminModal: () => void;
  openProviderManager: () => void;
  isAdmin: boolean;
  onLogoutAdmin: () => void;
  profiles?: DebaterProfilePublic[];
  activeDebater1Name?: string;
  activeDebater2Name?: string;
  activeDebater1Color?: string;
  activeDebater2Color?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  openCreateModal,
  openProviderManager,
  profiles = [],
  activeDebater1Name,
  activeDebater2Name,
}) => {
  const enabledCount = profiles.filter(p => p.status === 'enabled').length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('list')}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-90 cursor-pointer"
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
              <p className="text-[11px] text-slate-400">Universal All-Topics AI Discourse • Dual Gemini Voice</p>
            </div>
          </button>
        </div>

        {/* Center Live Debaters or Profile Badge */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {activeDebater1Name && activeDebater2Name ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-1.5 shadow-inner">
              <span className="font-bold text-cyan-300 truncate max-w-[130px]">{activeDebater1Name}</span>
              <span className="font-black text-slate-500 text-[10px]">VS</span>
              <span className="font-bold text-amber-300 truncate max-w-[130px]">{activeDebater2Name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>
                <strong className="text-white">{enabledCount || profiles.length || 4}</strong> Profiles Ready for Debates
              </span>
            </div>
          )}
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setCurrentView('list')}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer ${
              currentView === 'list'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            Debates
          </button>

          <button
            onClick={() => setCurrentView('arena')}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer ${
              currentView === 'arena'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            Live Arena
          </button>

          <button
            onClick={openProviderManager}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/55 px-3 py-1.5 text-xs sm:text-sm font-medium text-cyan-200 hover:bg-cyan-900/70 transition cursor-pointer"
            title="Manage Provider Key Pools & 429 Rotation"
          >
            <Key className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">Key Pools</span>
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer ${
              currentView === 'settings'
                ? 'bg-indigo-600/80 text-white'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Debater Profiles</span>
            <span className="sm:hidden">Profiles</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Debate</span>
          </button>
        </div>
      </div>
    </header>
  );
};
