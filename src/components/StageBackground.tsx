import React from 'react';
import { AccentColor } from '../types';

interface StageBackgroundProps {
  activeSpeakerSide: 'debater1' | 'debater2' | null;
  debater1Color?: AccentColor;
  debater2Color?: AccentColor;
  isSpeaking: boolean;
  isLive?: boolean;
}

const SPOTLIGHT_COLORS: Record<string, { from: string; via: string; floor: string }> = {
  cyan: { from: 'from-cyan-400/25', via: 'via-cyan-500/10', floor: 'bg-cyan-500/30' },
  amber: { from: 'from-amber-400/25', via: 'via-amber-500/10', floor: 'bg-amber-500/30' },
  emerald: { from: 'from-emerald-400/25', via: 'via-emerald-500/10', floor: 'bg-emerald-500/30' },
  purple: { from: 'from-purple-400/25', via: 'via-purple-500/10', floor: 'bg-purple-500/30' },
  rose: { from: 'from-rose-400/25', via: 'via-rose-500/10', floor: 'bg-rose-500/30' },
  blue: { from: 'from-blue-400/25', via: 'via-blue-500/10', floor: 'bg-blue-500/30' },
  indigo: { from: 'from-indigo-400/25', via: 'via-indigo-500/10', floor: 'bg-indigo-500/30' },
  orange: { from: 'from-orange-400/25', via: 'via-orange-500/10', floor: 'bg-orange-500/30' },
};

export const StageBackground: React.FC<StageBackgroundProps> = ({
  activeSpeakerSide,
  debater1Color = 'cyan',
  debater2Color = 'amber',
  isSpeaking,
}) => {
  const isDebater1Active = activeSpeakerSide === 'debater1' && isSpeaking;
  const isDebater2Active = activeSpeakerSide === 'debater2' && isSpeaking;

  const d1Light = SPOTLIGHT_COLORS[debater1Color] || SPOTLIGHT_COLORS.cyan;
  const d2Light = SPOTLIGHT_COLORS[debater2Color] || SPOTLIGHT_COLORS.amber;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. CEILING STUDIO LIGHTING TRUSS & SPOTLIGHT BEAMS */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/40 via-purple-500/30 to-amber-500/40 opacity-70" />

      {/* Left Volumetric Overhead Spotlight (Debater 1) */}
      <div
        style={{
          clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
        }}
        className={`absolute -top-10 left-[5%] sm:left-[12%] w-[220px] sm:w-[320px] h-[480px] bg-gradient-to-b ${d1Light.from} ${d1Light.via} to-transparent blur-xl transition-all duration-700 transform -rotate-12 origin-top ${
          isDebater1Active
            ? 'opacity-90 scale-105'
            : isDebater2Active
            ? 'opacity-15'
            : 'opacity-35'
        }`}
      />

      {/* Right Volumetric Overhead Spotlight (Debater 2) */}
      <div
        style={{
          clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
        }}
        className={`absolute -top-10 right-[5%] sm:right-[12%] w-[220px] sm:w-[320px] h-[480px] bg-gradient-to-b ${d2Light.from} ${d2Light.via} to-transparent blur-xl transition-all duration-700 transform rotate-12 origin-top ${
          isDebater2Active
            ? 'opacity-90 scale-105'
            : isDebater1Active
            ? 'opacity-15'
            : 'opacity-35'
        }`}
      />

      {/* 2. ATMOSPHERIC STAGE HAZE & AMBIENT AURA */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-3xl transition-all duration-1000 ${
          isDebater1Active
            ? 'bg-cyan-600/12'
            : isDebater2Active
            ? 'bg-amber-600/12'
            : 'bg-indigo-600/10'
        }`}
      />

      {/* Floating Ambient Stage Dust Particles / Micro Haze */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* 3. STAGE FLOOR SPECULAR REFLECTION LAYER */}
      <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        {/* Left Podium Floor Glow Pool */}
        <div
          className={`absolute bottom-4 left-[15%] w-64 h-16 rounded-full blur-2xl transition-opacity duration-500 ${
            isDebater1Active ? `${d1Light.floor} opacity-100` : 'bg-slate-900/20 opacity-30'
          }`}
        />

        {/* Right Podium Floor Glow Pool */}
        <div
          className={`absolute bottom-4 right-[15%] w-64 h-16 rounded-full blur-2xl transition-opacity duration-500 ${
            isDebater2Active ? `${d2Light.floor} opacity-100` : 'bg-slate-900/20 opacity-30'
          }`}
        />

        {/* Studio Center Floor Reflection Stripe */}
        <div className="absolute bottom-0 inset-x-1/4 h-1 bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
      </div>

      {/* 4. TIERED AUDITORIUM SILHOUETTE (AUDIENCE GALLERY) */}
      <div className="absolute bottom-0 inset-x-0 h-28 sm:h-32 flex flex-col justify-end overflow-hidden">
        {/* Tier 1 (Back Row - Distant Gallery, softer) */}
        <div className="relative w-full h-8 opacity-25 translate-y-2">
          <svg
            className="w-full h-full fill-slate-700"
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
          >
            <path d="
              M 0,40
              Q 20,25 40,25 Q 60,25 80,40
              Q 100,22 120,22 Q 140,22 160,40
              Q 180,26 200,26 Q 220,26 240,40
              Q 260,23 280,23 Q 300,23 320,40
              Q 340,27 360,27 Q 380,27 400,40
              Q 420,22 440,22 Q 460,22 480,40
              Q 500,26 520,26 Q 540,26 560,40
              Q 580,24 600,24 Q 620,24 640,40
              Q 660,26 680,26 Q 700,26 720,40
              Q 740,22 760,22 Q 780,22 800,40
              Q 820,25 840,25 Q 860,25 880,40
              Q 900,23 920,23 Q 940,23 960,40
              Q 980,26 1000,26 Q 1020,26 1040,40
              Q 1060,22 1080,22 Q 1100,22 1120,40
              Q 1140,25 1160,25 Q 1180,25 1200,40
              Z
            " />
          </svg>
        </div>

        {/* Tier 2 (Mid Row - Main Auditorium Gallery) */}
        <div className="relative w-full h-12 opacity-50 translate-y-1">
          <svg
            className="w-full h-full fill-slate-800"
            viewBox="0 0 1200 50"
            preserveAspectRatio="none"
          >
            <path d="
              M 0,50
              Q 25,30 50,30 Q 75,30 100,50
              Q 130,26 160,26 Q 190,26 220,50
              Q 250,32 280,32 Q 310,32 340,50
              Q 370,28 400,28 Q 430,28 460,50
              Q 490,30 520,30 Q 550,30 580,50
              Q 610,27 640,27 Q 670,27 700,50
              Q 730,31 760,31 Q 790,31 820,50
              Q 850,28 880,28 Q 910,28 940,50
              Q 970,32 1000,32 Q 1030,32 1060,50
              Q 1090,27 1120,27 Q 1150,27 1180,50
              L 1200,50 Z
            " />
          </svg>
        </div>

        {/* Tier 3 (Front Row - Direct Stage Perimeter Silhouettes) */}
        <div className="relative w-full h-14 opacity-80">
          <svg
            className="w-full h-full fill-slate-950"
            viewBox="0 0 1200 60"
            preserveAspectRatio="none"
          >
            <path d="
              M 0,60
              Q 35,34 70,34 Q 105,34 140,60
              Q 180,30 220,30 Q 260,30 300,60
              Q 340,36 380,36 Q 420,36 460,60
              Q 500,32 540,32 Q 580,32 620,60
              Q 660,35 700,35 Q 740,35 780,60
              Q 820,31 860,31 Q 900,31 940,60
              Q 980,36 1020,36 Q 1060,36 1100,60
              Q 1140,32 1170,32 Q 1190,32 1200,60
              L 1200,60 Z
            " />
          </svg>

          {/* Spectator Camera Flash Glow Sparkles */}
          <div className="absolute bottom-8 left-[18%] h-1 w-1 rounded-full bg-cyan-300 opacity-60 animate-ping" />
          <div className="absolute bottom-10 left-[42%] h-1 w-1 rounded-full bg-white opacity-40 animate-pulse delay-700" />
          <div className="absolute bottom-7 right-[32%] h-1 w-1 rounded-full bg-amber-200 opacity-50 animate-ping delay-500" />
          <div className="absolute bottom-9 right-[16%] h-1 w-1 rounded-full bg-white opacity-40 animate-pulse delay-1000" />
        </div>
      </div>
    </div>
  );
};
