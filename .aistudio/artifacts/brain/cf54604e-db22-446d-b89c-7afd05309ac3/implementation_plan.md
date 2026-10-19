# Implementation Plan: Multi-Provider AI Architecture, Key Pooling Failover & Dynamic Model Selection

## 1. Architecture & Structural Decisions

### Provider Abstraction & Multi-Key Pooling
- **Supported Providers**:
  - `gemini`: Google Gemini via `@google/genai` (Gemini 3.8 Flash, 3.6 Flash, 4 Argon, Gemini TTS)
  - `openai`: OpenAI API (GPT-4o, GPT-4o-mini, o3-mini, TTS-1, TTS-1-HD)
  - `groq`: Groq High-Speed API (Llama 3.3 70B, Llama 3.1 8B, Mixtral)
  - `openrouter`: OpenRouter Universal Gateway (Claude 3.7 Sonnet, DeepSeek R1, GPT-4o, etc.)
- **Multi-API Key Pool & Automatic Failover**:
  - Each Debater Profile can store an array of encrypted API keys (`keys: string[]`).
  - An intelligent execution runner iterates through keys sequentially.
  - On receiving HTTP 429 (`RESOURCE_EXHAUSTED`, rate limit exceeded, quota exceeded, or key unauthorized), the runner automatically rotates to the next available backup key in real time.
  - Failover is completely transparent to the live debate arena—SSE events notify the client of seamless failover without interrupting playback or turn generation.
- **Dynamic Model Catalog & Live API Discovery**:
  - A comprehensive built-in catalog of verified text generation and TTS models per provider.
  - Dedicated endpoint `GET /api/providers/:provider/models?apiKey=...` that calls the provider's `/models` endpoint to discover newly available models dynamically for the user's account.
  - Built-in TTS models and voice choices that adapt to the selected provider (Gemini voices Fenrir, Kore, Puck, Charon, Zephyr; OpenAI voices alloy, echo, fable, onyx, nova, shimmer).

---

## 2. Frontend Design & Visual Blueprint

### Debater Profile Configuration in `AISettingsModal.tsx`
- **Provider Selector Strip**:
  - High-contrast segmented provider selector with clear branding (Gemini, OpenAI, Groq, OpenRouter).
  - Clean unboxed metadata badges (`Active`, `Connected`, `Keys: 2`) adhering to the zero-pill discipline.
- **Multi-Key Pool Management UI**:
  - Displays configured keys with masked format (e.g., `sk-proj...9f2a`) and role tags (`Primary`, `Backup 1`, `Backup 2`).
  - `+ Add Backup API Key` button allowing multiple keys per provider.
  - Key testing button for each key with status indicators (Valid, Rate-Limited, Invalid).
- **Intelligent Model Selection**:
  - Text generation dropdown pre-populated with verified models for the selected provider.
  - `Fetch Live Models from API` button with loading spinner to pull all models authorized on the user's key.
  - Dynamic model search / filter input for easy navigation when provider has dozens of models.
- **Provider-Aware TTS & Voice Selection**:
  - TTS Model selector dynamically lists available TTS engines (e.g. `gemini-3.8-flash-lite-tts`, `openai-tts-1`, `openai-tts-1-hd`).
  - Voice picker updates with authentic voices for that provider.
  - Live voice preview test button to audition the speech synthesis directly within the profile editor.

---

## 3. Concrete Implementation Steps

### Step 1: Type Definitions & Database Schema Updates
- Update `/src/types.ts` and `/server/types.ts`:
  - Add `AIProvider = 'gemini' | 'openai' | 'groq' | 'openrouter'`.
  - Add `provider: AIProvider` to `DebaterProfile` and `DebaterProfileSnapshot`.
  - Support `apiKeys: string[]` / `encryptedApiKeys: string[]` in profile storage.
  - Add `activeKeyIndex?: number` and `keyStatuses?: Array<{ keyMask: string; status: 'active' | 'rate_limited' | 'error' }>`.
- Update `/server/db.ts`:
  - Extend profile creation, update, and resolution methods to store and resolve arrays of encrypted keys.
  - Default existing profiles to `provider: 'gemini'`.

### Step 2: Multi-Provider Backend Adapter & Failover Runner
- Create `/server/providers/`:
  - `types.ts`: Universal interfaces for text generation options, turn prompts, and TTS synthesis.
  - `catalog.ts`: Preloaded catalog of verified models and voices for Gemini, OpenAI, Groq, OpenRouter.
  - `providerManager.ts`:
    - Core `executeWithFailover<T>(provider, keys, taskFn)` helper.
    - Rate-limit detection (`status === 429`, `code === 'RESOURCE_EXHAUSTED'`, `error.type === 'insufficient_quota'`).
    - Multi-provider text generation handler for debate statements.
    - Multi-provider TTS synthesis handler returning standard audio WAV/MP3 buffers.
  - Live model discovery function querying provider endpoints (`/v1/models` or Gemini `models.list`).

### Step 3: Express API Endpoints in `server.ts`
- `GET /api/providers`: Returns supported providers, preloaded models, and default TTS voices.
- `GET /api/providers/:provider/models`: Fetches live models using the provided API key or saved profile key.
- `POST /api/providers/test-key`: Tests an individual key for text generation and checks quota/validity.
- `POST /api/providers/test-voice`: Tests TTS speech generation using the selected provider, key, and voice.
- Update `/api/profiles` create & update endpoints to accept `provider`, `rawApiKeys: string[]`, `modelId`, `ttsModelId`, and `voiceName`.

### Step 4: Integration with `orchestrator.ts`
- Connect debate turn generation and audio synthesis to the multi-provider manager with automatic key failover.
- If key #1 triggers 429 during a live debate round, fail over to key #2 instantly and emit an SSE status update (`key_failover`) so the UI displays seamless recovery without interrupting the debate.

### Step 5: Settings & Profile Management UI in `AISettingsModal.tsx`
- Build the Provider selection controls and dynamic model dropdowns.
- Implement the Multi-API Key list editor with add, remove, test, and show/hide capabilities.
- Integrate the dynamic model discovery button ("Fetch Live Models").
- Update the voice tester and model tester to pass the active provider and key pool.

---

## 4. Verification & Acceptance Tests

1. **Provider Switching**:
   - Selecting `Gemini`, `OpenAI`, `Groq`, or `OpenRouter` immediately updates the available text models and TTS options.
2. **Multi-Key Failover**:
   - Add two keys to a profile: Key 1 (or mock exhausted key) and Key 2.
   - Verify that when Key 1 triggers 429, Key 2 is automatically invoked and the debate turn completes successfully.
3. **Dynamic Model Fetch**:
   - Test "Fetch Live Models" with an API key and verify that live models from the provider are fetched and selectable.
4. **Debate Arena Execution**:
   - Run a live debate with one debater on Gemini and another on OpenAI/Groq/OpenRouter.
   - Verify statements are generated, audio is synthesized, and the visualizer and subtitles operate smoothly.
5. **Applet Compilation & Linting**:
   - Run `compile_applet` and `lint_applet` to verify zero TypeScript errors and clean production build.
