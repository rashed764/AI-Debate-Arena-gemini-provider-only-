import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, BarChart3, Radio, Waves, Zap, Volume2 } from 'lucide-react';

export type VisualizerMode = 'spectrum' | 'oscilloscope' | 'dual' | 'circular';

export interface AudioVisualizerCanvasProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  activeSpeakerSide: 'debater1' | 'debater2' | null;
  speakerName?: string;
  accentColor?: string; // e.g. '#06b6d4' or '#f43f5e'
  secondaryColor?: string;
  className?: string;
  height?: number;
  initialMode?: VisualizerMode;
  showControls?: boolean;
  showTelemetry?: boolean;
}

export const AudioVisualizerCanvas: React.FC<AudioVisualizerCanvasProps> = ({
  analyserNode,
  isPlaying,
  activeSpeakerSide,
  speakerName,
  accentColor,
  secondaryColor,
  className = '',
  height = 140,
  initialMode = 'dual',
  showControls = true,
  showTelemetry = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>(initialMode);
  const [telemetry, setTelemetry] = useState({ rms: 0, db: -60, peakHz: 0 });

  // Peak caps retention for spectrum physics
  const peakCapsRef = useRef<number[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // Determine active color scheme based on active debater
  const primaryThemeColor =
    accentColor ||
    (activeSpeakerSide === 'debater1'
      ? '#06b6d4' // Cyan for Debater 1
      : activeSpeakerSide === 'debater2'
      ? '#f43f5e' // Rose/Red for Debater 2
      : '#38bdf8'); // Sky blue for general

  const secondaryThemeColor =
    secondaryColor ||
    (activeSpeakerSide === 'debater1'
      ? '#3b82f6' // Blue
      : activeSpeakerSide === 'debater2'
      ? '#f97316' // Orange
      : '#818cf8'); // Indigo

  // Canvas render animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    // Handle high DPI display
    const updateCanvasDimensions = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.floor(rect.width) || 600;
      const displayHeight = height;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);
      }
    };

    updateCanvasDimensions();
    const resizeObserver = new ResizeObserver(() => updateCanvasDimensions());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Allocate arrays for Web Audio analyser
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 64;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    // Initialize or resize peak caps
    const numBars = 48;
    if (peakCapsRef.current.length !== numBars) {
      peakCapsRef.current = new Array(numBars).fill(0);
    }

    let telemetryCounter = 0;

    const render = () => {
      if (!isRunning) return;

      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 600;
      const h = height;

      // Clear with dark cinematic gradient background
      ctx.clearRect(0, 0, width, h);

      // Background ambient subtle grid and glow
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, 'rgba(3, 7, 18, 0.4)');
      bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0.8)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, h);

      // Acquire real data from AnalyserNode if connected
      let hasRealAudio = false;
      let totalEnergy = 0;
      let maxFreqIndex = 0;
      let maxFreqVal = 0;

      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(freqData);
        analyserNode.getByteTimeDomainData(timeData);

        for (let i = 0; i < bufferLength; i++) {
          totalEnergy += freqData[i];
          if (freqData[i] > maxFreqVal) {
            maxFreqVal = freqData[i];
            maxFreqIndex = i;
          }
        }
        hasRealAudio = totalEnergy > 50;
      }

      // If speech is playing via fallback or waiting for analyser attach, synthesize speech cadence
      const time = Date.now() / 200;
      if (!hasRealAudio && isPlaying) {
        for (let i = 0; i < bufferLength; i++) {
          const mod = Math.sin(time + i * 0.25) * Math.cos(time * 0.7 + i * 0.15);
          const val = Math.max(0, Math.min(255, Math.floor((mod * 0.5 + 0.5) * 190 + Math.sin(time * 2 + i) * 35)));
          freqData[i] = val;
          timeData[i] = Math.floor(128 + Math.sin(time * 2 + (i / bufferLength) * Math.PI * 4) * 45);
          totalEnergy += val;
        }
        hasRealAudio = true;
      }

      // Telemetry computation (sampled every 6 frames)
      telemetryCounter++;
      if (telemetryCounter % 6 === 0) {
        const avgEnergy = hasRealAudio ? totalEnergy / (bufferLength * 255) : 0;
        const rmsPercent = Math.round(avgEnergy * 100);
        const decibels = Math.max(-60, Math.round(20 * Math.log10(Math.max(avgEnergy, 0.001))));
        const sampleRate = analyserNode?.context?.sampleRate || 44100;
        const peakHz = hasRealAudio ? Math.round((maxFreqIndex * (sampleRate / 2)) / bufferLength) : 0;

        setTelemetry({
          rms: rmsPercent,
          db: decibels,
          peakHz: peakHz || (hasRealAudio ? 320 : 0),
        });
      }

      // Draw depending on selected visualizer mode
      if (mode === 'spectrum' || mode === 'dual') {
        drawSpectrumBars(ctx, width, h, freqData, hasRealAudio);
      }

      if (mode === 'oscilloscope' || mode === 'dual') {
        drawOscilloscopeWave(ctx, width, h, timeData, hasRealAudio, mode === 'dual');
      }

      if (mode === 'circular') {
        drawCircularResonator(ctx, width, h, freqData, hasRealAudio);
      }

      // Center vocal beam highlight
      if (hasRealAudio) {
        drawVocalBeam(ctx, width, h);
      }

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    // 1. Draw Spectrum Equalizer Bars
    const drawSpectrumBars = (
      context: CanvasRenderingContext2D,
      w: number,
      h: number,
      frequencies: Uint8Array,
      active: boolean
    ) => {
      const barCount = 48;
      const barWidth = Math.max(2, (w / barCount) * 0.65);
      const gap = (w - barCount * barWidth) / (barCount + 1);
      const maxHeight = mode === 'dual' ? h * 0.62 : h * 0.82;
      const baseY = h - 6;

      const peaks = peakCapsRef.current;

      for (let i = 0; i < barCount; i++) {
        const freqIndex = Math.floor((i / barCount) * (frequencies.length * 0.85));
        const raw = active ? frequencies[freqIndex] || 0 : 4;
        const norm = raw / 255;
        const barHeight = Math.max(3, norm * maxHeight);

        // Update peak caps with gravity falloff
        if (barHeight > (peaks[i] || 0)) {
          peaks[i] = barHeight;
        } else {
          peaks[i] = Math.max(3, (peaks[i] || 0) - 1.2);
        }

        const x = gap + i * (barWidth + gap);
        const y = baseY - barHeight;

        // Gradient color for spectrum bars
        const barGrad = context.createLinearGradient(0, y, 0, baseY);
        barGrad.addColorStop(0, primaryThemeColor);
        barGrad.addColorStop(0.5, secondaryThemeColor);
        barGrad.addColorStop(1, 'rgba(15, 23, 42, 0.4)');

        context.fillStyle = barGrad;
        context.shadowColor = active ? primaryThemeColor : 'transparent';
        context.shadowBlur = active ? 6 : 0;

        // Draw rounded top bar
        context.beginPath();
        const r = Math.min(barWidth / 2, 3);
        context.roundRect(x, y, barWidth, barHeight, [r, r, 0, 0]);
        context.fill();
        context.shadowBlur = 0;

        // Draw floating peak caps
        if (active && peaks[i] > 6) {
          const peakY = baseY - peaks[i] - 2;
          context.fillStyle = '#ffffff';
          context.shadowColor = '#ffffff';
          context.shadowBlur = 4;
          context.fillRect(x, Math.max(2, peakY), barWidth, 2);
          context.shadowBlur = 0;
        }
      }
    };

    // 2. Draw Oscilloscope Voice Waveform
    const drawOscilloscopeWave = (
      context: CanvasRenderingContext2D,
      w: number,
      h: number,
      timeDomain: Uint8Array,
      active: boolean,
      isDual: boolean
    ) => {
      const centerY = isDual ? h * 0.32 : h * 0.5;
      const amplitude = isDual ? h * 0.28 : h * 0.44;

      context.beginPath();
      context.lineWidth = active ? 2.5 : 1.5;
      context.strokeStyle = active ? primaryThemeColor : 'rgba(100, 116, 139, 0.4)';
      context.shadowColor = active ? primaryThemeColor : 'transparent';
      context.shadowBlur = active ? 10 : 0;

      const sliceWidth = w / (timeDomain.length - 1);
      let x = 0;

      for (let i = 0; i < timeDomain.length; i++) {
        let v = (timeDomain[i] - 128) / 128; // -1 to +1
        if (!active) {
          // Subtle resting breathing wave when idle
          v = Math.sin((Date.now() / 600) + (i / timeDomain.length) * Math.PI * 2) * 0.05;
        }

        const y = centerY + v * amplitude;

        if (i === 0) {
          context.moveTo(x, y);
        } else {
          // Smooth bezier curve between audio time steps
          const prevX = (i - 1) * sliceWidth;
          const cpX = (prevX + x) / 2;
          context.quadraticCurveTo(prevX, y, cpX, y);
        }

        x += sliceWidth;
      }

      context.stroke();
      context.shadowBlur = 0;

      // Glow fill under the waveform in single oscilloscope mode
      if (!isDual && active) {
        context.lineTo(w, h);
        context.lineTo(0, h);
        context.closePath();
        const waveFill = context.createLinearGradient(0, centerY, 0, h);
        waveFill.addColorStop(0, `${primaryThemeColor}33`);
        waveFill.addColorStop(1, 'transparent');
        context.fillStyle = waveFill;
        context.fill();
      }
    };

    // 3. Draw Circular Voice Resonator
    const drawCircularResonator = (
      context: CanvasRenderingContext2D,
      w: number,
      h: number,
      frequencies: Uint8Array,
      active: boolean
    ) => {
      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = Math.min(w, h) * 0.28;
      const points = 36;

      context.save();
      context.translate(centerX, centerY);

      // Core glowing debater ring
      context.beginPath();
      context.arc(0, 0, baseRadius * 0.75, 0, Math.PI * 2);
      context.strokeStyle = active ? primaryThemeColor : 'rgba(51, 65, 85, 0.6)';
      context.lineWidth = 3;
      context.shadowColor = active ? primaryThemeColor : 'transparent';
      context.shadowBlur = active ? 12 : 0;
      context.stroke();
      context.shadowBlur = 0;

      // Radiating audio frequency spires
      context.beginPath();
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const freqIdx = Math.floor((i / points) * (frequencies.length / 2));
        const val = active ? (frequencies[freqIdx] || 0) / 255 : 0.08;
        const r = baseRadius + val * (baseRadius * 0.95);

        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;

        if (i === 0) {
          context.moveTo(px, py);
        } else {
          context.lineTo(px, py);
        }
      }
      context.closePath();
      context.lineWidth = 2;
      context.strokeStyle = secondaryThemeColor;
      context.stroke();

      // Inner pulsating voice node
      const pulse = active ? Math.sin(Date.now() / 120) * 4 + 8 : 4;
      context.beginPath();
      context.arc(0, 0, pulse, 0, Math.PI * 2);
      context.fillStyle = active ? '#ffffff' : 'rgba(148, 163, 184, 0.5)';
      context.shadowColor = '#ffffff';
      context.shadowBlur = active ? 10 : 0;
      context.fill();
      context.shadowBlur = 0;

      context.restore();
    };

    // 4. Vocal Beam Center Flare
    const drawVocalBeam = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const flare = context.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w * 0.4);
      flare.addColorStop(0, `${primaryThemeColor}26`);
      flare.addColorStop(1, 'transparent');
      context.fillStyle = flare;
      context.fillRect(0, 0, w, h);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [analyserNode, isPlaying, mode, height, primaryThemeColor, secondaryThemeColor]);

  const activeDebaterLabel =
    activeSpeakerSide === 'debater1'
      ? speakerName || 'Left Debater'
      : activeSpeakerSide === 'debater2'
      ? speakerName || 'Right Debater'
      : 'Debate Stage Ambient';

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shadow-2xl overflow-hidden ${className}`}
    >
      {/* Top Telemetry & Control Bar */}
      {(showControls || showTelemetry) && (
        <div className="flex items-center justify-between border-b border-slate-800/60 px-3.5 py-2 text-xs font-mono select-none">
          {/* Active Voice Badge */}
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: primaryThemeColor }}
              className={`h-2 w-2 rounded-full transition-transform ${
                isPlaying ? 'scale-125 shadow-[0_0_8px_currentColor]' : 'opacity-40'
              }`}
            />
            <span className="font-bold uppercase tracking-wider text-slate-200">
              {activeDebaterLabel}
            </span>
            <span className="text-slate-600">|</span>
            <span
              style={{ color: primaryThemeColor }}
              className="font-bold flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" />
              {isPlaying ? 'TRANSMITTING' : 'STANDBY'}
            </span>
          </div>

          {/* Telemetry Stats Readout */}
          {showTelemetry && (
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
              <span title="Voice Energy Level">
                RMS: <strong className="text-slate-200">{telemetry.rms}%</strong>
              </span>
              <span className="text-slate-700">·</span>
              <span title="Acoustic Decibel Threshold">
                GAIN: <strong className="text-slate-200">{telemetry.db} dB</strong>
              </span>
              <span className="text-slate-700">·</span>
              <span title="Peak Frequency Fundamental">
                PEAK: <strong className="text-slate-200">{telemetry.peakHz} Hz</strong>
              </span>
            </div>
          )}

          {/* Visualizer Mode Toggle Buttons */}
          {showControls && (
            <div className="flex items-center gap-1 bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('dual')}
                title="Dual: Spectrum & Oscilloscope"
                className={`p-1 rounded transition-colors ${
                  mode === 'dual'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMode('spectrum')}
                title="Spectrum Bars"
                className={`p-1 rounded transition-colors ${
                  mode === 'spectrum'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMode('oscilloscope')}
                title="Oscilloscope Waveform"
                className={`p-1 rounded transition-colors ${
                  mode === 'oscilloscope'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Waves className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMode('circular')}
                title="Orbital Resonator"
                className={`p-1 rounded transition-colors ${
                  mode === 'circular'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Primary Visualizer Canvas */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: '100%', height: `${height}px` }}
        />

        {/* Ambient Bottom Frequency Scale */}
        <div className="absolute bottom-1 inset-x-4 flex justify-between text-[9px] font-mono text-slate-500/70 pointer-events-none select-none">
          <span>60Hz</span>
          <span>250Hz</span>
          <span>1kHz</span>
          <span>4kHz</span>
          <span>16kHz</span>
        </div>
      </div>
    </div>
  );
};
