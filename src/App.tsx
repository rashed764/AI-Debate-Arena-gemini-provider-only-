import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DebateArena } from './components/DebateArena';
import { DebateList } from './components/DebateList';
import { AISettingsView } from './components/AISettingsModal';
import { CreateDebateModal } from './components/CreateDebateModal';
import { ProviderManager } from './components/ProviderManager';
import { AudioPlaybackBar } from './components/AudioPlaybackBar';
import { AIConfigPublic, DebaterProfilePublic, Debate, DebateTurn, PersonaType, PlaybackMode } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'arena' | 'list' | 'settings'>('arena');
  const [debates, setDebates] = useState<Debate[]>([]);
  const [profiles, setProfiles] = useState<DebaterProfilePublic[]>([]);
  const [activeDebateId, setActiveDebateId] = useState<string | null>(null);
  const [activeDebate, setActiveDebate] = useState<Debate | null>(null);

  // Legacy configuration state
  const [atheistConfig, setAtheistConfig] = useState<AIConfigPublic | undefined>();
  const [believerConfig, setBelieverConfig] = useState<AIConfigPublic | undefined>();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProviderManagerOpen, setIsProviderManagerOpen] = useState(false);

  // Admin authentication (open access)
  const [adminToken] = useState<string>('open_access');

  // User voting status
  const [userVotedPersona, setUserVotedPersona] = useState<string | null>(null);

  // Global Audio Controller State
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('text_and_voice');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [speed, setSpeed] = useState(1.0);
  const [activePlayingMessageId, setActivePlayingMessageId] = useState<string | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<PersonaType | null>(null);
  const [currentStatementTitle, setCurrentStatementTitle] = useState('');
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [waitingForMessageId, setWaitingForMessageId] = useState<string | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Mutable refs to prevent stale closures in audio event handlers & SSE callbacks
  const activeDebateRef = useRef<Debate | null>(activeDebate);
  activeDebateRef.current = activeDebate;

  const playbackModeRef = useRef<PlaybackMode>(playbackMode);
  playbackModeRef.current = playbackMode;

  const autoPlayEnabledRef = useRef<boolean>(autoPlayEnabled);
  autoPlayEnabledRef.current = autoPlayEnabled;

  const isAudioPlayingRef = useRef<boolean>(isAudioPlaying);
  isAudioPlayingRef.current = isAudioPlaying;

  const activePlayingMessageIdRef = useRef<string | null>(activePlayingMessageId);
  activePlayingMessageIdRef.current = activePlayingMessageId;

  const speedRef = useRef<number>(speed);
  speedRef.current = speed;

  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const waitingForMessageIdRef = useRef<string | null>(waitingForMessageId);
  waitingForMessageIdRef.current = waitingForMessageId;

  // Audio Playback Engine
  const playTurnAudio = (turn: DebateTurn, enableAutoContinuation = true) => {
    if (!turn.audioUrl || !audioElementRef.current) return;
    if (playbackModeRef.current === 'text_only') return;

    setAutoPlayEnabled(enableAutoContinuation);
    autoPlayEnabledRef.current = enableAutoContinuation;

    // Stop current playback cleanly so voices never overlap
    audioElementRef.current.pause();
    audioElementRef.current.src = turn.audioUrl;
    audioElementRef.current.playbackRate = speedRef.current;
    audioElementRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;

    setActivePlayingMessageId(turn.id);
    activePlayingMessageIdRef.current = turn.id;
    setActiveSpeaker(turn.speakerSide || (turn.persona === 'believer' ? 'debater2' : 'debater1'));
    setCurrentStatementTitle(`${turn.speakerName}: ${turn.mainClaim.slice(0, 55)}...`);
    setWaitingForMessageId(null);
    waitingForMessageIdRef.current = null;

    audioElementRef.current
      .play()
      .then(() => {
        setIsAudioPlaying(true);
        isAudioPlayingRef.current = true;
        setAutoplayBlocked(false);
      })
      .catch(err => {
        console.warn('Audio playback prevented or interrupted:', err);
        setIsAudioPlaying(false);
        isAudioPlayingRef.current = false;
        if (err?.name === 'NotAllowedError' || String(err).includes('play() failed') || String(err).includes('user gesture')) {
          setAutoplayBlocked(true);
        }
      });
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
    isAudioPlayingRef.current = false;
    setActiveSpeaker(null);

    if (!autoPlayEnabledRef.current || playbackModeRef.current === 'text_only') {
      return;
    }

    const debate = activeDebateRef.current;
    if (!debate) return;

    const currentId = activePlayingMessageIdRef.current;
    const currentIndex = debate.messages.findIndex(m => m.id === currentId);
    const nextIndex = currentIndex + 1;

    if (nextIndex < debate.messages.length) {
      const nextTurn = debate.messages[nextIndex];
      if (nextTurn.audioStatus === 'ready' && nextTurn.audioUrl) {
        // Continuous sequencing: immediately play next statement
        playTurnAudio(nextTurn, true);
      } else if (nextTurn.audioStatus === 'generating') {
        // Next voice turn is in-progress: wait for SSE audio_ready
        setWaitingForMessageId(nextTurn.id);
        waitingForMessageIdRef.current = nextTurn.id;
        setCurrentStatementTitle(`Buffering speech for ${nextTurn.speakerName}...`);
      } else if (nextTurn.audioStatus === 'failed') {
        // Audio failed: pause briefly then continue queue safely
        setCurrentStatementTitle(`Audio unavailable for ${nextTurn.speakerName}. Advancing...`);
        setTimeout(() => {
          const d = activeDebateRef.current;
          if (d && nextIndex + 1 < d.messages.length) {
            playTurnAudio(d.messages[nextIndex + 1], true);
          }
        }, 3000);
      }
    } else {
      // Reached the end of available messages
      if (debate.status === 'in_progress') {
        setWaitingForMessageId('NEXT_TURN');
        waitingForMessageIdRef.current = 'NEXT_TURN';
        setCurrentStatementTitle('Awaiting next turn in debate...');
      } else {
        setCurrentStatementTitle('Debate speech complete.');
        setActivePlayingMessageId(null);
        activePlayingMessageIdRef.current = null;
      }
    }
  };

  // Callback ref for event listeners to avoid stale closures
  const callbacksRef = useRef({
    onEnded: handleAudioEnded,
    onError: (e: any) => {
      console.warn('Audio element error:', e);
      setIsAudioPlaying(false);
      isAudioPlayingRef.current = false;
      setActiveSpeaker(null);
    },
  });
  callbacksRef.current.onEnded = handleAudioEnded;

  // Initial Audio Element Setup
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioElementRef.current = audio;

    const onEndedListener = () => callbacksRef.current.onEnded();
    const onErrorListener = (e: any) => callbacksRef.current.onError(e);

    audio.addEventListener('ended', onEndedListener);
    audio.addEventListener('error', onErrorListener);

    return () => {
      audio.removeEventListener('ended', onEndedListener);
      audio.removeEventListener('error', onErrorListener);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update volume and playback rate
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = isMuted ? 0 : volume;
      audioElementRef.current.playbackRate = speed;
    }
  }, [volume, isMuted, speed]);

  // Load debates and profiles on start
  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Failed to load debater profiles:', err);
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/ai-config');
      if (res.ok) {
        const data = await res.json();
        setAtheistConfig(data.atheist);
        setBelieverConfig(data.believer);
      }
    } catch (err) {
      console.error('Failed to load AI configs:', err);
    }
    await fetchProfiles();
  };

  const fetchDebates = async () => {
    try {
      const res = await fetch('/api/debates');
      if (res.ok) {
        const data = await res.json();
        setDebates(data.debates || []);
        if (!activeDebateId && data.debates?.length > 0) {
          setActiveDebateId(data.debates[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load debates:', err);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchDebates();
  }, []);

  // Fetch full details of active debate & user vote
  useEffect(() => {
    if (!activeDebateId) return;

    fetch(`/api/debates/${activeDebateId}`)
      .then(res => res.json())
      .then(data => {
        if (data.debate) {
          setActiveDebate(data.debate);
          setPlaybackMode(data.debate.playbackMode || 'text_and_voice');
        }
      })
      .catch(console.error);

    // Check user vote
    fetch(`/api/debates/${activeDebateId}/user-vote`)
      .then(res => res.json())
      .then(data => {
        if (data.voted) setUserVotedPersona(data.targetSide || data.persona || null);
        else setUserVotedPersona(null);
      })
      .catch(() => setUserVotedPersona(null));
  }, [activeDebateId]);

  // SSE Real-Time Updates Subscription
  useEffect(() => {
    if (!activeDebateId) return;

    const eventSource = new EventSource(`/api/debates/${activeDebateId}/stream`);

    eventSource.addEventListener('message_created', (event: MessageEvent) => {
      const newTurn: DebateTurn = JSON.parse(event.data);
      setActiveDebate(prev => {
        if (!prev) return prev;
        const exists = prev.messages.some(m => m.id === newTurn.id);
        if (exists) return prev;
        return {
          ...prev,
          messages: [...prev.messages, newTurn],
          currentTurnIndex: prev.messages.length + 1,
        };
      });
    });

    eventSource.addEventListener('audio_ready', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setActiveDebate(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(m =>
            m.id === data.messageId
              ? {
                  ...m,
                  audioUrl: data.audioUrl,
                  audioDuration: data.duration,
                  audioStatus: 'ready',
                  audioCached: data.cached,
                }
              : m
          ),
        };
      });

      // Automatic playback continuation
      const pMode = playbackModeRef.current;
      const autoPlay = autoPlayEnabledRef.current;
      const isPlaying = isAudioPlayingRef.current;
      const currentId = activePlayingMessageIdRef.current;
      const waitingId = waitingForMessageIdRef.current;

      if (pMode !== 'text_only' && autoPlay) {
        const debate = activeDebateRef.current;
        if (!debate) return;

        const msgIndex = debate.messages.findIndex(m => m.id === data.messageId);
        if (msgIndex === -1) return;
        const msg = debate.messages[msgIndex];

        const isWaitingForThis = waitingId === data.messageId || waitingId === 'NEXT_TURN';
        let isNextInSequence = false;

        if (!isPlaying) {
          if (!currentId) {
            isNextInSequence = msgIndex === 0;
          } else {
            const currentIdx = debate.messages.findIndex(m => m.id === currentId);
            isNextInSequence = msgIndex === currentIdx + 1;
          }
        }

        if (isWaitingForThis || isNextInSequence) {
          setWaitingForMessageId(null);
          waitingForMessageIdRef.current = null;
          playTurnAudio({ ...msg, audioUrl: data.audioUrl, audioStatus: 'ready' }, true);
        }
      }
    });

    eventSource.addEventListener('audio_failed', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setActiveDebate(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(m =>
            m.id === data.messageId
              ? {
                  ...m,
                  audioStatus: 'failed',
                  audioError: data.error,
                }
              : m
          ),
        };
      });
    });

    eventSource.addEventListener('vote_updated', (event: MessageEvent) => {
      const updatedVotes = JSON.parse(event.data);
      setActiveDebate(prev => (prev ? { ...prev, votes: updatedVotes } : prev));
    });

    eventSource.addEventListener('question_submitted', (event: MessageEvent) => {
      const q = JSON.parse(event.data);
      setActiveDebate(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: [q, ...prev.questions.filter(item => item.id !== q.id)],
        };
      });
    });

    eventSource.addEventListener('debate_completed', () => {
      setActiveDebate(prev => (prev ? { ...prev, status: 'completed' } : prev));
      fetchDebates();
    });

    eventSource.addEventListener('debate_paused', () => {
      setActiveDebate(prev => (prev ? { ...prev, status: 'paused' } : prev));
    });

    eventSource.addEventListener('debate_resumed', () => {
      setActiveDebate(prev => (prev ? { ...prev, status: 'in_progress' } : prev));
    });

    return () => {
      eventSource.close();
    };
  }, [activeDebateId]);

  // Audio Control Handlers
  const handleTogglePlayPause = () => {
    if (!audioElementRef.current) return;
    if (isAudioPlaying) {
      audioElementRef.current.pause();
      setIsAudioPlaying(false);
      isAudioPlayingRef.current = false;
      setAutoPlayEnabled(false);
      autoPlayEnabledRef.current = false;
    } else {
      setAutoPlayEnabled(true);
      autoPlayEnabledRef.current = true;
      if (activePlayingMessageId && activeDebate) {
        const msg = activeDebate.messages.find(m => m.id === activePlayingMessageId);
        if (msg && audioElementRef.current.src) {
          audioElementRef.current
            .play()
            .then(() => {
              setIsAudioPlaying(true);
              isAudioPlayingRef.current = true;
              setAutoplayBlocked(false);
            })
            .catch(console.warn);
          return;
        }
      }
      const available = activeDebate?.messages.filter(m => m.audioStatus === 'ready' && m.audioUrl);
      if (available && available.length > 0) {
        playTurnAudio(available[0], true);
      }
    }
  };

  const handleReplayCurrent = () => {
    if (audioElementRef.current && activePlayingMessageId) {
      audioElementRef.current.currentTime = 0;
      audioElementRef.current
        .play()
        .then(() => {
          setIsAudioPlaying(true);
          isAudioPlayingRef.current = true;
          setAutoPlayEnabled(true);
          autoPlayEnabledRef.current = true;
          setAutoplayBlocked(false);
        })
        .catch(console.warn);
    }
  };

  const handleUnlockAudio = () => {
    setAutoplayBlocked(false);
    setAutoPlayEnabled(true);
    autoPlayEnabledRef.current = true;

    if (audioElementRef.current) {
      const debate = activeDebateRef.current;
      const currentId = activePlayingMessageIdRef.current;
      const currentMsg = debate?.messages.find(m => m.id === currentId);

      if (currentMsg && currentMsg.audioUrl) {
        playTurnAudio(currentMsg, true);
      } else {
        const readyMsg = debate?.messages.find(m => m.audioStatus === 'ready' && m.audioUrl);
        if (readyMsg) {
          playTurnAudio(readyMsg, true);
        }
      }
    }
  };

  const handleChangePlaybackMode = (mode: PlaybackMode) => {
    setPlaybackMode(mode);
    playbackModeRef.current = mode;
    if (mode === 'text_only') {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setIsAudioPlaying(false);
      isAudioPlayingRef.current = false;
      setActiveSpeaker(null);
      setAutoPlayEnabled(false);
      autoPlayEnabledRef.current = false;
    } else {
      setAutoPlayEnabled(true);
      autoPlayEnabledRef.current = true;
    }
  };

  // Arena Controller API handlers
  const handleStartDebate = async (id: string) => {
    const res = await fetch(`/api/debates/${id}/start`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to start debate');
      if (data.missing) {
        setCurrentView('settings');
      }
    } else {
      setActiveDebate(prev => (prev ? { ...prev, status: 'in_progress' } : prev));
    }
  };

  const handleStepDebate = async (id: string) => {
    const res = await fetch(`/api/debates/${id}/step`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to execute next turn');
    }
  };

  const handlePauseDebate = async (id: string) => {
    await fetch(`/api/debates/${id}/pause`, { method: 'POST' });
    setActiveDebate(prev => (prev ? { ...prev, status: 'paused' } : prev));
  };

  const handleResumeDebate = async (id: string) => {
    await fetch(`/api/debates/${id}/resume`, { method: 'POST' });
    setActiveDebate(prev => (prev ? { ...prev, status: 'in_progress' } : prev));
  };

  const handleStopDebate = async (id: string) => {
    await fetch(`/api/debates/${id}/stop`, { method: 'POST' });
    setActiveDebate(prev => (prev ? { ...prev, status: 'completed' } : prev));
  };

  const handleCastVote = async (side: 'debater1' | 'debater2', note?: string) => {
    if (!activeDebateId) return;
    const res = await fetch(`/api/debates/${activeDebateId}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side, reasoningNote: note }),
    });
    const data = await res.json();
    if (res.ok) {
      setUserVotedPersona(side);
      setActiveDebate(prev => (prev ? { ...prev, votes: data.votes } : prev));
    } else {
      alert(data.error || 'Vote could not be processed');
    }
  };

  const handleAddQuestion = async (authorName: string, text: string) => {
    if (!activeDebateId) return;
    await fetch(`/api/debates/${activeDebateId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, questionText: text }),
    });
  };

  const handleRetryAudio = async (messageId: string) => {
    if (!activeDebateId) return;
    await fetch(`/api/debates/${activeDebateId}/retry-audio/${messageId}`, {
      method: 'POST',
    });
  };

  const handleCreateDebate = async (debateData: any) => {
    const res = await fetch('/api/debates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debateData),
    });
    const data = await res.json();
    if (res.ok && data.debate) {
      await fetchDebates();
      setActiveDebateId(data.debate.id);
      setActiveDebate(data.debate);
      setCurrentView('arena');
    } else {
      alert(data.error || 'Failed to create debate');
    }
  };

  const handleDeleteDebate = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/debates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDebates(prev => prev.filter(d => d.id !== id));
        if (activeDebateId === id) {
          const remaining = debates.filter(d => d.id !== id);
          if (remaining.length > 0) {
            setActiveDebateId(remaining[0].id);
          } else {
            setActiveDebateId(null);
            setActiveDebate(null);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete debate:', err);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar (rendered when browsing directory or settings) */}
      {currentView !== 'arena' && (
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          openCreateModal={() => setIsCreateModalOpen(true)}
          openAdminModal={() => {}}
          openProviderManager={() => setIsProviderManagerOpen(true)}
          isAdmin={true}
          onLogoutAdmin={() => {}}
          profiles={profiles}
          activeDebater1Name={activeDebate?.debater1?.name}
          activeDebater2Name={activeDebate?.debater2?.name}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'arena' && (
          <DebateArena
            debate={activeDebate}
            onStartDebate={handleStartDebate}
            onStepDebate={handleStepDebate}
            onPauseDebate={handlePauseDebate}
            onResumeDebate={handleResumeDebate}
            onStopDebate={handleStopDebate}
            onCastVote={handleCastVote}
            onAddQuestion={handleAddQuestion}
            onRetryAudio={handleRetryAudio}
            userVotedPersona={userVotedPersona}
            playbackMode={playbackMode}
            onChangePlaybackMode={handleChangePlaybackMode}
            activePlayingMessageId={activePlayingMessageId}
            onPlayMessageAudio={turn => playTurnAudio(turn, true)}
            onPauseMessageAudio={() => {
              audioElementRef.current?.pause();
              setIsAudioPlaying(false);
              isAudioPlayingRef.current = false;
            }}
            isAudioPlaying={isAudioPlaying}
            autoplayBlocked={autoplayBlocked}
            onUnlockAudio={handleUnlockAudio}
            audioElement={audioElementRef.current}
            onNavigateView={setCurrentView}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {currentView === 'list' && (
          <DebateList
            debates={debates}
            onSelectDebate={id => {
              setActiveDebateId(id);
              setCurrentView('arena');
            }}
            onDeleteDebate={handleDeleteDebate}
            openCreateModal={() => setIsCreateModalOpen(true)}
            openSettings={() => setCurrentView('settings')}
          />
        )}

        {currentView === 'settings' && (
          <AISettingsView
            isAdmin={true}
            openAdminModal={() => {}}
            onRefreshConfigs={fetchConfigs}
            atheistConfig={atheistConfig}
            believerConfig={believerConfig}
            adminToken={adminToken}
          />
        )}
      </main>

      {/* Floating Audio Playback Controller Bar (for non-arena views) */}
      {currentView !== 'arena' && (
        <AudioPlaybackBar
          playbackMode={playbackMode}
          onChangePlaybackMode={handleChangePlaybackMode}
          isPlaying={isAudioPlaying}
          isMuted={isMuted}
          volume={volume}
          speed={speed}
          activeSpeaker={activeSpeaker}
          currentStatementTitle={currentStatementTitle}
          onTogglePlayPause={handleTogglePlayPause}
          onToggleMute={() => setIsMuted(!isMuted)}
          onChangeVolume={setVolume}
          onChangeSpeed={setSpeed}
          onReplayCurrent={handleReplayCurrent}
          hasPlayableAudio={!!activeDebate?.messages.some(m => m.audioStatus === 'ready')}
          autoplayBlocked={autoplayBlocked}
          onUnlockAudio={handleUnlockAudio}
        />
      )}

      {/* Modals */}
      <CreateDebateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateDebate}
        profiles={profiles}
      />

      <ProviderManager
        isOpen={isProviderManagerOpen}
        onClose={() => setIsProviderManagerOpen(false)}
      />
    </div>
  );
}
