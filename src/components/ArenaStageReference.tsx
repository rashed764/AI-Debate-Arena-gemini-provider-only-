import React, { useEffect, useState } from 'react';
import { PersonaType, Debate, DebateTurn } from '../types';

interface ArenaStageReferenceProps {
  debate: Debate;
  activeSpeaker: PersonaType | null;
  isSpeaking: boolean;
  currentStatementText: string;
  activePlayingTurn: DebateTurn | null;
  audioElement?: HTMLAudioElement | null;
  onPlayFullDebate?: () => void;
  onPrevTurn?: () => void;
  onNextTurn?: () => void;
}

export const ArenaStageReference: React.FC<ArenaStageReferenceProps> = ({
  debate,
  activeSpeaker,
  isSpeaking,
  currentStatementText,
  activePlayingTurn,
  audioElement,
  onPlayFullDebate,
}) => {
  // Timer state synced to live audio element
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(120); // default 2 mins (02:00)

  useEffect(() => {
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime || 0);
      if (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
        setDuration(audioElement.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
        setDuration(audioElement.duration);
      }
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioElement]);

  // If no audio is playing but we have a turn duration, sync to it
  useEffect(() => {
    if (activePlayingTurn?.audioDuration && activePlayingTurn.audioDuration > 0) {
      setDuration(activePlayingTurn.audioDuration);
    }
  }, [activePlayingTurn]);

  // Format MM:SS for countdown
  const remainingSeconds = Math.max(0, Math.ceil(duration - currentTime));
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const timerText = isSpeaking ? formatTime(remainingSeconds) : '01:34';
  const durationText = formatTime(duration);

  // SVG circular timer calculations (radius 24)
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0.45;
  const strokeDashoffset = isSpeaking
    ? circumference * (1 - progressRatio)
    : circumference * (1 - 0.55); // aesthetic 01:34 preview position

  // Determine debater names and badge labels based on topic / persona
  // Supports Muslim vs Jewish or Atheist vs Believer dynamically
  const isInterfaith =
    debate.title.toLowerCase().includes('jewish') ||
    debate.title.toLowerCase().includes('muslim') ||
    debate.topic.toLowerCase().includes('quran') ||
    debate.topic.toLowerCase().includes('torah') ||
    debate.topic.toLowerCase().includes('covenant');

  const leftLabel = isInterfaith ? 'Muslim' : 'Atheist';
  const rightLabel = isInterfaith ? 'Jewish' : 'Believer';

  const isLeftActive = activeSpeaker === 'atheist';
  const isRightActive = activeSpeaker === 'believer';

  // Subtitle text to display in the upper floating frosted glass HUD (keep concise, never long raw paragraphs)
  const subtitleDisplay =
    activePlayingTurn?.mainClaim ||
    (currentStatementText.length > 140 ? currentStatementText.slice(0, 140) + '...' : currentStatementText) ||
    'or would he then be the God of just one people?';

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-800/90 bg-[#080a10] shadow-2xl select-none">
      {/* 16:9 Aspect Ratio Container for Broadcast Telecast Look */}
      <div className="relative w-full aspect-[16/9] min-h-[440px] max-h-[640px] overflow-hidden flex flex-col justify-between">
        {/* ======================================================== */}
        {/* 1. BACKGROUND: CURVED HORIZONTAL YELLOW DOTTED LED BARS */}
        {/* ======================================================== */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Upper Curved LED Strip Lights (Dotted Warm Amber / Yellow) */}
          <div className="absolute top-[14%] inset-x-0 flex justify-between px-6 sm:px-16 opacity-70">
            {/* Left curved LED dotted segment */}
            <div className="flex gap-2.5 sm:gap-4 items-center -rotate-3">
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            </div>

            {/* Right curved LED dotted segment */}
            <div className="flex gap-2.5 sm:gap-4 items-center rotate-3">
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="w-5 sm:w-10 h-1.5 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            </div>
          </div>

          {/* Atmospheric Audience Gallery in Soft Focus / Bokeh */}
          <div className="absolute top-[22%] inset-x-0 h-44 opacity-25 filter blur-xs flex justify-center">
            <svg
              className="w-full max-w-4xl h-full fill-slate-700/80"
              viewBox="0 0 1000 120"
              preserveAspectRatio="none"
            >
              {/* Audience heads and shoulders rows in stadium tier */}
              <g opacity="0.6">
                {Array.from({ length: 28 }).map((_, i) => (
                  <circle key={`bg-head-${i}`} cx={40 + i * 34} cy={35 + (i % 3) * 6} r={10} />
                ))}
                {Array.from({ length: 28 }).map((_, i) => (
                  <path
                    key={`bg-body-${i}`}
                    d={`M ${20 + i * 34},75 Q ${40 + i * 34},45 ${60 + i * 34},75 Z`}
                  />
                ))}
              </g>
              <g opacity="0.9">
                {Array.from({ length: 24 }).map((_, i) => (
                  <circle key={`fg-head-${i}`} cx={55 + i * 38} cy={65 + (i % 2) * 5} r={12} />
                ))}
                {Array.from({ length: 24 }).map((_, i) => (
                  <path
                    key={`fg-body-${i}`}
                    d={`M ${30 + i * 38},120 Q ${55 + i * 38},78 ${80 + i * 38},120 Z`}
                  />
                ))}
              </g>
            </svg>
          </div>

          {/* Dark Cinematic Vignette */}
          <div className="absolute inset-0 bg-radial from-transparent via-[#080a10]/60 to-[#080a10] pointer-events-none" />
        </div>

        {/* ======================================================== */}
        {/* 2. UPPER CENTER: FLOATING FROSTED-GLASS SUBTITLE HUD    */}
        {/* ======================================================== */}
        <div className="relative z-20 pt-4 sm:pt-6 px-4 flex justify-center">
          <div className="w-full max-w-lg sm:max-w-xl rounded-2xl border border-white/25 bg-slate-900/40 backdrop-blur-md px-5 py-3 shadow-2xl text-center max-h-[85px] overflow-hidden">
            <p className="text-white text-sm sm:text-base md:text-lg font-bold tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">
              "{subtitleDisplay}"
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. CENTER STAGE: HEXAGONAL PLATFORM WITH SEATED DEBATERS */}
        {/* ======================================================== */}
        <div className="relative z-10 flex-1 flex items-end justify-center pb-8 sm:pb-12 px-4">
          <div className="relative w-full max-w-3xl flex items-center justify-center">
            {/* Elevated Hexagonal Metallic Stage Deck */}
            <div
              style={{
                clipPath: 'polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)',
              }}
              className="absolute -bottom-6 w-[95%] sm:w-[90%] h-24 sm:h-28 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-t border-slate-500/50"
            >
              {/* Top Surface Specular Gloss Reflection */}
              <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-slate-400/20 to-transparent pointer-events-none" />
              {/* Bottom Rim Under-Stage Neon Light Glow */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-white to-amber-500 opacity-60 shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
            </div>

            {/* Stage Actors Layout: [Left Chair & Debater] | [Center Console] | [Right Chair & Debater] */}
            <div className="relative z-10 w-full flex items-end justify-between px-4 sm:px-10">
              {/* ---------------------------------------------------- */}
              {/* LEFT DEBATER: SEATED IN ARMCHAIR (GREEN HOODIE)     */}
              {/* ---------------------------------------------------- */}
              <div className="relative flex flex-col items-center">
                {/* Active Speaker Spotlight Aura */}
                {isLeftActive && isSpeaking && (
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none" />
                )}

                {/* Left Modern Geometric Armchair & Seated Debater SVG */}
                <div
                  className={`relative w-36 sm:w-48 h-44 sm:h-56 transition-transform duration-500 ${
                    isLeftActive && isSpeaking ? 'scale-105' : 'scale-100'
                  }`}
                >
                  <svg
                    viewBox="0 0 160 180"
                    className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]"
                  >
                    <defs>
                      <linearGradient id="chairGradLeft" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#334155" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <linearGradient id="hoodieGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#15803d" />
                      </linearGradient>
                      <linearGradient id="skinToneLeft" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fcd34d" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>

                    {/* Armchair Backrest */}
                    <polygon
                      points="20,50 110,50 120,130 15,130"
                      fill="url(#chairGradLeft)"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    {/* Left Armrest (outer) */}
                    <polygon
                      points="10,80 28,75 28,145 10,140"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1"
                    />

                    {/* Debater Torso (Green Hoodie) */}
                    <path
                      d="M 45,75 Q 70,68 95,75 L 102,125 Q 70,128 40,125 Z"
                      fill="url(#hoodieGrad)"
                    />
                    {/* AI Pendant / Necklace around neck */}
                    <circle cx="70" cy="98" r="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="70" y="100" fontSize="4" fontWeight="bold" textAnchor="middle" fill="#0f172a">
                      AI
                    </text>

                    {/* Debater Head & Styled Hair / Trimmed Beard */}
                    <circle cx="70" cy="46" r="13" fill="url(#skinToneLeft)" />
                    {/* Hair */}
                    <path
                      d="M 58,42 Q 70,26 82,40 Q 76,32 64,36 Z"
                      fill="#451a03"
                    />
                    {/* Beard */}
                    <path
                      d="M 62,48 Q 70,61 78,48 Q 70,55 62,48 Z"
                      fill="#451a03"
                    />

                    {/* Arms resting naturally on armrest & lap */}
                    <path
                      d="M 44,80 Q 30,95 42,120 L 52,122 Q 40,100 50,82 Z"
                      fill="#22c55e"
                    />
                    <path
                      d="M 94,80 Q 105,95 98,122 L 88,124 Q 96,100 88,82 Z"
                      fill="#22c55e"
                    />
                    {/* Hands */}
                    <circle cx="48" cy="122" r="5" fill="url(#skinToneLeft)" />
                    <circle cx="92" cy="124" r="5" fill="url(#skinToneLeft)" />

                    {/* Legs (Blue Jeans) & White Sneakers */}
                    <path d="M 44,124 L 46,155 L 60,155 L 62,124 Z" fill="#2563eb" />
                    <path d="M 76,124 L 78,155 L 92,155 L 94,124 Z" fill="#2563eb" />
                    {/* Sneakers */}
                    <ellipse cx="50" cy="158" rx="10" ry="4" fill="#ffffff" />
                    <ellipse cx="88" cy="158" rx="10" ry="4" fill="#ffffff" />

                    {/* Right Armrest (facing center console) */}
                    <polygon
                      points="105,75 125,80 120,140 102,142"
                      fill="#334155"
                      stroke="#64748b"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* CENTER CONSOLE: PEDESTAL & LIVE COUNTDOWN DISPLAY    */}
              {/* ---------------------------------------------------- */}
              <div className="relative flex flex-col items-center mx-2 sm:mx-6 mb-2">
                {/* Console Podium Table Body (Trapezoidal Backlit Desk) */}
                <div className="relative w-28 sm:w-36 h-28 sm:h-32 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-xl border border-slate-700/80 shadow-2xl p-2 flex flex-col items-center justify-between">
                  {/* Glowing Top Desktop Surface */}
                  <div className="w-full h-3 rounded-t-md bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 border-b border-slate-700 flex items-center justify-center">
                    <span className="w-12 h-0.5 bg-cyan-400 rounded-full opacity-60" />
                  </div>

                  {/* Front Digital Countdown Screen */}
                  <div className="relative flex-1 w-full bg-[#070b14] rounded-lg border border-slate-800 p-2 flex flex-col items-center justify-center overflow-hidden">
                    {/* Subtle Radial Backlight behind the ring */}
                    <div className="absolute inset-0 bg-radial from-amber-500/10 to-transparent pointer-events-none" />

                    {/* SVG Circular Countdown Ring */}
                    <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
                        {/* Background Track Circle */}
                        <circle
                          cx="30"
                          cy="30"
                          r={radius}
                          stroke="#1e293b"
                          strokeWidth="3.5"
                          fill="transparent"
                        />
                        {/* Dynamic Countdown Progress Stroke */}
                        <circle
                          cx="30"
                          cy="30"
                          r={radius}
                          stroke="#f97316"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300"
                        />
                      </svg>

                      {/* Digital Time Inside the Ring */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[12px] sm:text-[14px] font-black text-white font-mono tracking-tight leading-none drop-shadow-md">
                          {timerText}
                        </span>
                        <span className="text-[7px] sm:text-[8px] font-medium text-slate-400 uppercase tracking-tighter mt-0.5">
                          Duration
                        </span>
                        <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 leading-none">
                          {durationText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Console Base Floor Trim */}
                  <div className="w-[115%] h-2.5 bg-slate-800 border-t border-slate-600 rounded-b-md shadow-md" />
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* RIGHT DEBATER: SEATED IN ARMCHAIR (BLUE BLAZER)     */}
              {/* ---------------------------------------------------- */}
              <div className="relative flex flex-col items-center">
                {/* Active Speaker Spotlight Aura */}
                {isRightActive && isSpeaking && (
                  <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl animate-pulse pointer-events-none" />
                )}

                {/* Right Modern Geometric Armchair & Seated Debater SVG */}
                <div
                  className={`relative w-36 sm:w-48 h-44 sm:h-56 transition-transform duration-500 ${
                    isRightActive && isSpeaking ? 'scale-105' : 'scale-100'
                  }`}
                >
                  <svg
                    viewBox="0 0 160 180"
                    className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]"
                  >
                    <defs>
                      <linearGradient id="chairGradRight" x1="1" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#334155" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <linearGradient id="suitGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#1e3a8a" />
                      </linearGradient>
                      <linearGradient id="skinToneRight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fcd34d" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>

                    {/* Armchair Backrest */}
                    <polygon
                      points="140,50 50,50 40,130 145,130"
                      fill="url(#chairGradRight)"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    {/* Right Armrest (outer) */}
                    <polygon
                      points="150,80 132,75 132,145 150,140"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1"
                    />

                    {/* Debater Torso (Blue Blazer & White Shirt) */}
                    <path
                      d="M 115,75 Q 90,68 65,75 L 58,125 Q 90,128 120,125 Z"
                      fill="url(#suitGrad)"
                    />
                    {/* Inner White Shirt & Lapel */}
                    <polygon points="90,75 84,105 96,105" fill="#f8fafc" />
                    {/* Star of David / Lapel Pin */}
                    <circle cx="86" cy="92" r="3" fill="#38bdf8" />

                    {/* Debater Head & Kippah / Trimmed Beard */}
                    <circle cx="90" cy="46" r="13" fill="url(#skinToneRight)" />
                    {/* Kippah / Yarmulke on head */}
                    <ellipse cx="90" cy="36" rx="9" ry="4" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
                    {/* Hair */}
                    <path
                      d="M 102,42 Q 90,30 78,40 Q 84,34 96,36 Z"
                      fill="#1c1917"
                    />
                    {/* Beard */}
                    <path
                      d="M 98,48 Q 90,61 82,48 Q 90,55 98,48 Z"
                      fill="#1c1917"
                    />

                    {/* Arms resting naturally on armrest & lap */}
                    <path
                      d="M 116,80 Q 130,95 118,120 L 108,122 Q 120,100 110,82 Z"
                      fill="#1d4ed8"
                    />
                    <path
                      d="M 66,80 Q 55,95 62,122 L 72,124 Q 64,100 72,82 Z"
                      fill="#1d4ed8"
                    />
                    {/* Hands */}
                    <circle cx="112" cy="122" r="5" fill="url(#skinToneRight)" />
                    <circle cx="68" cy="124" r="5" fill="url(#skinToneRight)" />

                    {/* Legs (Black Trousers) & Black Shoes */}
                    <path d="M 116,124 L 114,155 L 100,155 L 98,124 Z" fill="#0f172a" />
                    <path d="M 84,124 L 82,155 L 68,155 L 66,124 Z" fill="#0f172a" />
                    {/* Shoes */}
                    <ellipse cx="110" cy="158" rx="10" ry="4" fill="#1e293b" />
                    <ellipse cx="72" cy="158" rx="10" ry="4" fill="#1e293b" />

                    {/* Left Armrest (facing center console) */}
                    <polygon
                      points="55,75 35,80 40,140 58,142"
                      fill="#334155"
                      stroke="#64748b"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. LOWER BAR: GLOWING CORNER BADGES & LIVING STONE SEAL  */}
        {/* ======================================================== */}
        <div className="relative z-20 pb-4 sm:pb-6 px-4 sm:px-8 flex items-center justify-between">
          {/* Bottom Left Glowing Neon Pill: e.g. "Muslim" / "Atheist" */}
          <div className="relative group cursor-default">
            <div
              className={`absolute -inset-1 rounded-full bg-emerald-500 blur-md opacity-75 group-hover:opacity-100 transition duration-300 ${
                isLeftActive && isSpeaking ? 'animate-pulse opacity-100' : ''
              }`}
            />
            <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 sm:px-6 py-2 shadow-xl shadow-emerald-950/80 border border-emerald-400">
              <span className="text-white text-sm sm:text-base font-extrabold tracking-wide drop-shadow-md">
                {leftLabel}
              </span>
            </div>
          </div>

          {/* Quick Play/Pause Center Action */}
          {onPlayFullDebate && (
            <button
              onClick={onPlayFullDebate}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1.5 text-[11px] font-bold text-slate-200 hover:text-white hover:bg-slate-800 backdrop-blur-md shadow-lg transition"
            >
              <span>{isSpeaking ? '⏸ Playing Debate' : '▶ Play Full Debate'}</span>
            </button>
          )}

          {/* Bottom Right Glowing Neon Pill & Brand Medallion */}
          <div className="flex items-center gap-3">
            {/* Right Glowing Pill: e.g. "Jewish" / "Believer" */}
            <div className="relative group cursor-default">
              <div
                className={`absolute -inset-1 rounded-full bg-amber-500 blur-md opacity-75 group-hover:opacity-100 transition duration-300 ${
                  isRightActive && isSpeaking ? 'animate-pulse opacity-100' : ''
                }`}
              />
              <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 sm:px-6 py-2 shadow-xl shadow-amber-950/80 border border-amber-300">
                <span className="text-slate-950 text-sm sm:text-base font-black tracking-wide drop-shadow-xs">
                  {rightLabel}
                </span>
              </div>
            </div>

            {/* Living Stone Feather / Flame Medallion in Corner */}
            <div
              title="Living Stone Debate Arena"
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 border-amber-400/80 bg-gradient-to-br from-amber-600 to-orange-700 shadow-[0_0_15px_rgba(245,158,11,0.5)] cursor-pointer hover:scale-105 transition"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-amber-200">
                <path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12zm-1 16.9A4.5 4.5 0 0 1 7.5 14c0-2.4 1.2-5.3 3.5-8.4 2.3 3.1 3.5 6 3.5 8.4a4.5 4.5 0 0 1-3.5 4.9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
