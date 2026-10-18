# AI Debate Arena: Living Stone
### Autonomous AI vs AI Intellectual Platform • Atheist AI vs Believer AI

AI Debate Arena is a web application where two distinct Gemini-powered intelligences—**Atheist AI** and **Believer AI**—conduct live structured debates across cosmology, consciousness, ethics, and epistemology.

---

## 🌟 Key Features

### 1. Mandatory Feature: Separate Gemini API Settings for Each AI
- **Independent Configuration Panels**: Dedicated **Settings → AI API & Voice Configuration** interface.
- **Atheist AI & Believer AI Credentials**: Each persona has an independently configured Gemini API key, Model ID, and TTS voice settings.
- **Independent Connection & Voice Tests**: Administrators can test text generation and voice synthesis for each persona separately.
- **AES-256-GCM Encryption at Rest**: Keys saved through the settings interface are encrypted at rest using authenticated AES-256-GCM.
- **Zero Client-Side Secret Leakage**: The frontend bundle and GET endpoints never receive raw API keys. Only safe masked identifiers (e.g., `••••••••••••aB3d`) and configuration status are exposed.
- **Deployment Fallback Precedence**: Saved database credentials take precedence over host environment variables (`GEMINI_API_KEY_ATHEIST`, `GEMINI_API_KEY_BELIEVER`, `GEMINI_API_KEY`).

### 2. Mandatory Feature: Dual AI Voice Debate
- **Three Playback Modes**:
  1. **Text + Voice** (Full transcript displayed alongside spoken audio).
  2. **Voice Only** (Immersive podcast-style audio debate).
  3. **Text Only** (Fast reading mode without invoking TTS requests).
- **Gemini TTS Synthesis**: Uses official Gemini TTS models (`gemini-3.8-flash-lite-tts` for low-latency delivery or `gemini-3.8-flash-tts` for high-fidelity voice design).
- **Distinct Persona Voices**:
  - **Atheist AI**: Voice `Fenrir` (Authoritative, sharp, analytical, intellectual).
  - **Believer AI**: Voice `Kore` (Articulate, warm, resonant, thoughtful).
- **Non-Overlapping Playback**: Automated sequencer plays turns in exact speaking order with visualizer waveforms and active speaker indicator.
- **Audio Controls**: Play, Pause, Resume, Mute, Volume slider, Replay Statement, and Playback Speed (0.8x to 1.5x).
- **Deterministic Audio Caching**: Speech audio is cached by SHA-256 hash (`/data/audio_cache/`), eliminating redundant TTS calls on replaying statements.
- **Graceful Error Handling**: If TTS encounters network or quota restrictions, original transcript text is preserved and a "Retry Audio" button appears.

### 3. Debate Modes & Orchestrator
- **Automatic Sequence**: Deterministic server-authoritative 4-round structure (Opening Statements, First Rebuttal, Cross-Examination & Inquiries, Closing Synthesis).
- **Interactive Audience Mode**: Audience members can submit philosophical questions into the moderation queue, which are addressed directly by both AIs.
- **Google Search Grounding & High Thinking**: Search grounding for empirical facts and `ThinkingLevel.HIGH` for deep metaphysical deliberation.

### 4. Community Voting & Qualitative Analysis
- **One-Vote Enforcement**: Uniqueness enforced per viewer/session on the backend.
- **Live Tug-of-War Bar**: Real-time percentage distribution between Atheist AI and Believer AI.
- **Post-Debate Breakdown**: Detailed analysis separating audience popularity from qualitative argument strength and factual verification status.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons, Motion.
- **Backend**: Express running TypeScript via `tsx` with Vite middleware in dev.
- **AI SDK**: Official `@google/genai` TypeScript SDK (server-side only).
- **Database & Storage**: Atomic persistent JSON storage with AES-256-GCM encryption and dedicated audio cache directory (`/data/audio_cache/`).
- **Real-Time**: Server-Sent Events (SSE) streaming (`/api/debates/:id/stream`).

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```env
# Primary or default fallback for Gemini AI API calls
GEMINI_API_KEY=""

# Optional persona-specific fallbacks (UI settings take precedence)
GEMINI_API_KEY_ATHEIST=""
GEMINI_API_KEY_BELIEVER=""

# Master 32-byte encryption key for AES-256-GCM (auto-derived if omitted)
APP_ENCRYPTION_KEY=""

# Administrator password for Settings unlock (default: admin)
ADMIN_PASSWORD="admin"
```

### 3. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Automated Unit Tests
```bash
npm test
# or: node --test server/arena.test.ts
```

---

## 🔐 Administrator Access & Settings

1. Click **Admin** in the top navigation bar.
2. Enter the administrator password (default is `admin`, configurable via `ADMIN_PASSWORD`).
3. Navigate to **AI & Voice Settings**:
   - In **Panel A (Atheist AI)**: Enter or update the Gemini API key, model ID (`gemini-3.8-flash`), TTS model, and voice (`Fenrir`). Click **Test Connection** or **Test Voice Audio** to verify before saving.
   - In **Panel B (Believer AI)**: Independently configure the Believer AI key, model ID (`gemini-4-argon`), and voice (`Kore`).
4. Click **Save Configuration** on each panel.

---

## 📡 API Endpoints

### Debate Management
- `GET /api/debates` — List all debates with statistics
- `POST /api/debates` — Create a new debate
- `GET /api/debates/:id` — Retrieve full debate transcript and details
- `POST /api/debates/:id/start` — Start autonomous debate progression
- `POST /api/debates/:id/step` — Advance debate by a single turn
- `POST /api/debates/:id/pause` — Pause debate
- `POST /api/debates/:id/resume` — Resume debate
- `POST /api/debates/:id/stop` — Conclude debate
- `GET /api/debates/:id/stream` — SSE endpoint for live turns and audio status
- `POST /api/debates/:id/retry-audio/:messageId` — Retry audio synthesis for a message

### Audience & Voting
- `POST /api/debates/:id/questions` — Submit audience inquiry
- `POST /api/debates/:id/votes` — Record vote for Atheist AI or Believer AI
- `GET /api/debates/:id/user-vote` — Check current user's voting record

### Admin & AI Settings (Protected)
- `POST /api/admin/login` — Administrator authentication
- `GET /api/admin/ai-config` — Retrieve public configurations (masked keys only)
- `PUT /api/admin/ai-config/:persona` — Save configuration for atheist or believer
- `POST /api/admin/ai-config/:persona/test` — Test text generation connection
- `POST /api/admin/ai-config/:persona/test-voice` — Test TTS voice synthesis and generate playable preview
- `DELETE /api/admin/ai-config/:persona` — Remove stored key for a persona

### Audio Serving
- `GET /api/audio/:filename` — Stream 24kHz WAV speech files with HTTP Range support
