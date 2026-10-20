# AI Debate Arena: Universal Request & Token Optimization Plan

Reduce API call volume and token consumption across all AI providers (Gemini, OpenAI, Groq, OpenRouter) through smart prompt compaction, rolling context windows, on-demand audio generation, and request rate-limiting protection.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on your requirements:
> - **Audio Voice Synthesis Strategy**: **On-demand audio generation**. Audio will no longer be pre-generated for every turn in the background. It will be synthesized only when a user clicks "Play" on a statement or starts continuous audio playback. This immediately cuts API requests by **50%**.
> - **Prompt & Context Compression**: **Compact rolling window keeping only the last turn**. Instead of sending the full debate history of all previous rounds, turns will only receive the immediate opponent's turn to rebut plus their own core thesis. This reduces input token consumption by **60% to 75%** per turn.
> - **AI Reasoning & Search Grounding**: **Full thinking and search grounding maintained** as configured by profile, ensuring philosophical depth and factual citation quality while drastically minimizing token waste elsewhere.

---

## 1. Overview & Core Concept

Currently, a 6-turn debate generates at least **12 to 14 heavy API requests** (text generation + automatic speech synthesis per turn + debate summaries), and sends snowballing debate history (turns 1 through 5 repeated with full transcripts, premises, and questions on every call). This quickly exhausts free-tier RPM and daily quota limits across multiple API keys.

By switching to **On-Demand Speech Synthesis** and **Single-Turn Rolling Context**, the application:
1. **Halves total API calls**: Cuts background TTS calls to zero unless the user explicitly requests voice playback.
2. **Slashes prompt tokens by up to 75%**: Replaces unbounded historical transcripts with a targeted rolling exchange format.
3. **Implements Token-Efficient Speech Scripts**: Synthesizes concise 80–120 word spoken monologues instead of verbose multi-paragraph scripts when audio is requested.
4. **Protects Multi-Key Pools**: Distributes remaining requests across available keys with exponential backoff on 429 rate limits.

---

## 2. User Experience & Visual Design

### Key User Flows & Visual Indicators

1. **Debate Generation Flow (Instant & Resource-Light)**:
   - User clicks **"Start Debate"** or creates a new topic.
   - Text turns generate rapidly with zero lag or quota stalls because audio generation is decoupled.
   - Each debate card displays a subtle **"⚡ Eco / On-Demand Voice"** badge.

2. **On-Demand Audio Playback & Buffering**:
   - Each statement displays a sleek **"Play Voice"** button with duration estimation.
   - When clicked:
     - If audio is already cached, it plays instantly from disk cache.
     - If not cached, the button transitions to a spinning pulse indicator (`Synthesizing Voice...`) and generates audio on-demand via the optimized TTS pipeline.
     - In the Global Audio Bar, continuous auto-play smoothly fetches and buffers only the active statement and pre-fetches the immediate next statement without batch-requesting the whole debate.

3. **Compact Debate Turn UI**:
   - The debate podium and message feed remain visually immersive and detailed, with structured claims, reasoning points, and rebuttals clearly rendered.
   - UI displays a token-saver status meter in the footer showing estimated quota saved.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: On-Demand Voice Synthesis vs Background Pre-generation
- **Chosen Approach**: On-Demand. Spoken audio is generated only when the user presses play on a specific debater's turn or engages live listening.
- **Why**: Many users read the debate text without listening to all 6 audio tracks. Pre-generating all audio wastes 50% of the key's daily quota.
- **Alternatives Considered**: Batch pre-generation (discarded because it exhausts quotas immediately).

### Decision 2: Single-Turn Rolling Context Window
- **Chosen Approach**: Send only the opponent's immediate preceding turn plus the speaker's own original core position.
- **Why**: Debate rebuttals primarily attack the opponent's latest argument. Retaining the entire transcript of earlier rounds causes quadratic token growth ($O(N^2)$ tokens over $N$ turns).
- **Alternatives Considered**: Multi-turn history (discarded because it multiplies token consumption on later rounds).

### Decision 3: Efficient Spoken Script Length
- **Chosen Approach**: Tighten the target `speech_text` length from 180 words to a crisp, punchy 80–110 words.
- **Why**: Keeps voice synthesis fast (< 2 seconds), avoids audio generation timeouts, and lowers TTS character quota consumption.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Debate Arena Client                   │
│  - On-Demand Play Button   - Global Audio Bar (Sequential)  │
│  - Eco Mode Token Meter    - Instant Text Streaming (SSE)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Backend & Orchestrator           │
│  - executeNextTurn(): Generates structured text only       │
│  - audioStatus: 'none' (Decoupled from turn generation)     │
│  - POST /api/debates/:id/synthesize-turn/:msgId (On-demand) │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Rolling Context Engine     │ │   Key Pool & Cache Engine  │
│ - Speaker thesis (1 line)    │ │ - SHA-256 disk audio cache │
│ - Immediate opponent rebuttal│ │ - Multi-key failover pool  │
│ - Strict JSON schema         │ │ - Automatic rate limit wait│
└──────────────────────────────┘ └────────────────────────────┘
```

### Key Implementation Steps

1. **Server Orchestrator (`server/orchestrator.ts`)**:
   - Update `executeNextTurn()`: decouple audio synthesis from turn generation. Set `newMessage.audioStatus = 'none'` by default.
   - Add new endpoint `POST /api/debates/:id/turns/:turnId/play-audio` to synthesize audio only when requested.
   - Ensure `runFullAutomatic()` advances rounds smoothly without waiting on or triggering TTS requests.

2. **Prompt & Context Optimization (`server/geminiService.ts`)**:
   - Refactor `generateDebateTurnContent()`:
     - Replace full `previousTurns.map(...)` array with a **compact single-turn rolling window** (`previousTurns[previousTurns.length - 1]`).
     - Tighten JSON instructions for `speech_text` (80–110 words) and reasoning points.
     - Add prompt token compression reducing redundant prompt boilerplate.

3. **Audio Playback Engine (`src/App.tsx` & `src/components/AudioPlaybackBar.tsx`)**:
   - When user clicks play on a turn with `audioStatus === 'none'`, send an on-demand synthesis request and play as soon as ready.
   - Preserve continuous auto-advance: when a speech finishes, automatically request and stream the next turn's audio seamlessly.

4. **Settings & Creation Modal Updates**:
   - Add an **"Eco / Request Saver"** toggle in the Create Debate Modal (defaults to enabled).
   - Display key pool health and token economy tips in the AI Settings view.
