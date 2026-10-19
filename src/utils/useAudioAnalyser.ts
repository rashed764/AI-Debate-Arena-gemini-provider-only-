import { useEffect, useRef, useState } from 'react';

export interface AudioAnalysis {
  frequencyData: number[]; // 16 normalized values (0 to 100)
  volumeLevel: number;     // 0 to 100
  isVoiceActive: boolean;
  analyserNode: AnalyserNode | null;
  audioContext: AudioContext | null;
}

interface AudioGraph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}

// Global cache ensures only ONE MediaElementSourceNode is created per HTMLAudioElement
// preventing Web Audio InvalidStateError and audio cutoff
const audioGraphMap = new WeakMap<HTMLAudioElement, AudioGraph>();
let sharedAudioContext: AudioContext | null = null;

export function getOrCreateAudioGraph(audioElement: HTMLAudioElement): AudioGraph | null {
  try {
    if (audioGraphMap.has(audioElement)) {
      return audioGraphMap.get(audioElement)!;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass();
    }

    const ctx = sharedAudioContext;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128; // 64 frequency bins for rich visualizer resolution
    analyser.smoothingTimeConstant = 0.8;

    // Check if element has a cached source node attached
    let source = (audioElement as any).__mediaElementSourceNode as MediaElementAudioSourceNode | undefined;
    if (!source) {
      source = ctx.createMediaElementSource(audioElement);
      (audioElement as any).__mediaElementSourceNode = source;
    }

    source.connect(analyser);
    analyser.connect(ctx.destination);

    const graph: AudioGraph = { ctx, analyser, source };
    audioGraphMap.set(audioElement, graph);
    return graph;
  } catch (err) {
    // If the element was already attached on an existing context, recover safely
    console.debug('Web Audio API attach note:', err);
    if (sharedAudioContext) {
      const analyser = sharedAudioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      return { ctx: sharedAudioContext, analyser, source: (audioElement as any).__mediaElementSourceNode };
    }
    return null;
  }
}

export function useAudioAnalyser(
  audioElement: HTMLAudioElement | null,
  isPlaying: boolean,
  isMuted: boolean
): AudioAnalysis {
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const [analysis, setAnalysis] = useState<AudioAnalysis>({
    frequencyData: new Array(16).fill(0),
    volumeLevel: 0,
    isVoiceActive: false,
    analyserNode: null,
    audioContext: null,
  });

  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    const setup = () => {
      const graph = getOrCreateAudioGraph(audioElement);
      if (graph) {
        graphRef.current = graph;
        analyserRef.current = graph.analyser;
        setAnalyserNode(graph.analyser);
        setAudioContext(graph.ctx);

        if (graph.ctx.state === 'suspended') {
          graph.ctx.resume().catch(() => {});
        }
      }
    };

    const handleUserInteraction = () => {
      setup();
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };

    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });

    if (isPlaying) {
      setup();
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

      const currentAnalyser = analyserRef.current || graphRef.current?.analyser || null;
      const currentCtx = graphRef.current?.ctx || null;

      if (currentCtx && currentCtx.state === 'suspended' && isPlaying) {
        currentCtx.resume().catch(() => {});
      }

      if (!isPlaying || isMuted) {
        setAnalysis({
          frequencyData: new Array(16).fill(0),
          volumeLevel: 0,
          isVoiceActive: false,
          analyserNode: currentAnalyser,
          audioContext: currentCtx,
        });
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (currentAnalyser) {
        const bufferLength = currentAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        currentAnalyser.getByteFrequencyData(dataArray);

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
        const hasSound = avgVolume > 3;

        setAnalysis({
          frequencyData: bars,
          volumeLevel: avgVolume,
          isVoiceActive: hasSound,
          analyserNode: currentAnalyser,
          audioContext: currentCtx,
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
          analyserNode: null,
          audioContext: null,
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
  }, [isPlaying, isMuted, analyserNode, audioContext]);

  return analysis;
}
