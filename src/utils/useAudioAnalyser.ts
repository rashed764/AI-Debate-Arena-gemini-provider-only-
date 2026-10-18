import { useEffect, useRef, useState } from 'react';

export interface AudioAnalysis {
  frequencyData: number[]; // 16 normalized values (0 to 100)
  volumeLevel: number;     // 0 to 100
  isVoiceActive: boolean;
}

export function useAudioAnalyser(
  audioElement: HTMLAudioElement | null,
  isPlaying: boolean,
  isMuted: boolean
): AudioAnalysis {
  const [analysis, setAnalysis] = useState<AudioAnalysis>({
    frequencyData: new Array(16).fill(0),
    volumeLevel: 0,
    isVoiceActive: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isAttachedRef = useRef(false);

  useEffect(() => {
    if (!audioElement) return;

    const setupAudioContext = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;
          audioContextRef.current = new AudioContextClass();
        }

        const ctx = audioContextRef.current;
        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64; // Yields 32 frequency bins
          analyser.smoothingTimeConstant = 0.75;
          analyserRef.current = analyser;
        }

        if (!sourceNodeRef.current && !isAttachedRef.current) {
          try {
            const source = ctx.createMediaElementSource(audioElement);
            source.connect(analyserRef.current);
            analyserRef.current.connect(ctx.destination);
            sourceNodeRef.current = source;
            isAttachedRef.current = true;
          } catch (attachErr) {
            // In case media element is already connected or restricted
            console.debug('MediaElementSource attach fallback:', attachErr);
          }
        }

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch (err) {
        console.debug('Web Audio API initialization note:', err);
      }
    };

    const handleUserInteraction = () => {
      setupAudioContext();
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };

    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });

    if (isPlaying) {
      setupAudioContext();
    }

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [audioElement, isPlaying]);

  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      if (!isPlaying || isMuted) {
        setAnalysis({
          frequencyData: new Array(16).fill(0),
          volumeLevel: 0,
          isVoiceActive: false,
        });
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const analyser = analyserRef.current;
      if (analyser && isAttachedRef.current) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Map to 16 display bars
        const bars: number[] = [];
        let total = 0;
        const step = Math.max(1, Math.floor(bufferLength / 16));

        for (let i = 0; i < 16; i++) {
          const idx = Math.min(i * step, bufferLength - 1);
          const rawVal = dataArray[idx] || 0;
          const normalized = Math.min(100, Math.round((rawVal / 255) * 100));
          bars.push(normalized);
          total += normalized;
        }

        const avgVolume = Math.round(total / 16);
        const hasSound = avgVolume > 4;

        setAnalysis({
          frequencyData: bars,
          volumeLevel: avgVolume,
          isVoiceActive: hasSound,
        });
      } else {
        // Fallback: Generates an organic speech-like waveform modulation while audio is actively playing
        const time = Date.now() / 150;
        const bars: number[] = [];
        let total = 0;

        for (let i = 0; i < 16; i++) {
          const wave = Math.sin(time + i * 0.45) * 0.5 + 0.5;
          const harmonic = Math.cos(time * 1.5 + i * 0.8) * 0.3 + 0.3;
          const height = Math.min(95, Math.max(8, Math.round((wave * 0.65 + harmonic * 0.35) * 85)));
          bars.push(height);
          total += height;
        }

        setAnalysis({
          frequencyData: bars,
          volumeLevel: Math.round(total / 16),
          isVoiceActive: true,
        });
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isMuted]);

  return analysis;
}
