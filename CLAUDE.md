# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Origami AI turns PDF slide decks into narrated videos, entirely in the browser: PDF extraction → LLM-written narration script → local TTS (Kokoro.js) → FFmpeg.wasm rendering to MP4, all client-side via WebGPU. It also does screen recording with auto-zoom, MP4 scene analysis, an AI assistant chat, a "Shorts" video generator (Pollinations image/video + TTS captions), a Voice Studio (`/voice`, text → on-device TTS → MP3), and a File Studio (`/convert`, in-browser image/audio conversion and compression). The Express server (`server.ts`) exists almost entirely to proxy calls to cloud LLM/image APIs so secret keys never reach the client bundle — it is not a typical CRUD backend.

## Commands

```bash
npm run dev       # Express + Vite dev server with HMR, http://localhost:3006 (script sets PORT=3006; server.ts defaults to 3000 if PORT is unset)
npm run build     # Production build (vite build) -> dist/
npm run preview   # vite preview of dist/ — static only: no /api proxy routes and no COOP/COEP headers
npm run typecheck # tsc --build across the four project references in tsconfig.json (app, node, server, functions)
npm run lint      # eslint . — lints .js/.ts/.tsx with typescript-eslint + react-hooks rules
npm run check     # typecheck + lint in parallel (concurrently); silent apart from script banners when clean
npm run stop      # Kill whatever is on port 3006
npm run pages:dev # Run via Wrangler (Cloudflare Pages) instead of the Express server
```

There is no test suite in this repo; `npm run check` is the verification gate. `tsc --build` is incremental (`.tsbuildinfo` files), so a clean re-run can finish almost instantly — use `npx tsc --build --force` to force a full re-check. To run the real production server locally: `npm run build && NODE_ENV=production npx tsx server.ts`.

Do not open `index.html` directly or bypass the dev server — FFmpeg.wasm/SharedArrayBuffer require the COOP/COEP headers that `npm run dev` (or the production server) sets. See `TROUBLESHOOTING.md` for header details.

## Architecture

### Dual server runtime — keep in sync manually

The proxy API exists in **two parallel implementations** that must be kept behaviorally identical:

- `server.ts` — Express app, used by `npm run dev`, Docker, and any Node host. Also mounts Vite in middleware mode for dev, and serves `dist/` in production.
- `functions/api/**` — Cloudflare Pages Functions, used when deployed to Cloudflare Pages (`wrangler.toml`, `npm run pages:dev`). Each file exports an `onRequestPost`/`onRequestGet` handler mirroring one Express route.

Routes that exist in both, and must stay matched when you change one:
- `POST /api/llm/chat` ↔ `functions/api/llm/chat.ts`
- `POST /api/llm/analyze-video` ↔ `functions/api/llm/analyze-video.ts`
- `POST /api/llm/analyze-issue` ↔ `functions/api/llm/analyze-issue.ts`
- `POST /api/pollinations/image` ↔ `functions/api/pollinations/image.ts`
- `POST /api/pollinations/video` ↔ `functions/api/pollinations/video.ts`
- `POST /api/verify-turnstile` ↔ `functions/api/verify-turnstile.ts`
- `GET /api/music-preview/:filename` ↔ `functions/api/music-preview/[filename].ts`

If you add or change a server API route, update both sides. `functions/utils.ts` holds shared helpers for the Pages Functions side (e.g. `base64ToUint8Array`); the Express side inlines equivalents in `server.ts`.

### API key routing (client key vs. server proxy)

This is the core security model of the app — preserve it when touching LLM/Pollinations code:

- Only `VITE_`-prefixed env vars (`VITE_LLM_API_KEY`, `VITE_LLM_BASE_URL`, `VITE_LLM_MODEL`, `VITE_POLLINATIONS_API_KEY`, `VITE_TURNSTILE_SITE_KEY`) are baked into the client bundle by Vite. Never add a new `VITE_`-prefixed secret without understanding it becomes public.
- In production there is normally no client-side key. `src/services/aiService.ts` detects the absence of a client key and routes calls through the server proxy endpoints above instead of calling the provider directly.
- The server reads `LLM_API_KEY` (falls back to `VITE_LLM_API_KEY` for convenience) via `process.env`, never exposing it to responses sent to the browser.
- Pollinations has the same split: the user's own key — normally an OAuth `sk_...` access token — is stored per-user in `GlobalSettings.pollinationsApiKey` via IndexedDB (`src/services/storage.ts`) and resolved by `resolvePollinationsKey()` in `src/services/pollinationsService.ts`. With no (or an expired) user key, calls go through `/api/pollinations/image` and `/api/pollinations/video`, which use the server-only `POLLINATIONS_API_KEY`. `VITE_POLLINATIONS_API_KEY` is a local-dev convenience that ends up in the public bundle — never put an `sk_` key there in a real deployment.
- `src/services/pollinationsAuth.ts` + `src/pages/PollinationsCallbackPage.tsx` implement the OAuth-style flow: the app's `pk_...` publishable App Key (`POLLINATIONS_CLIENT_ID`, safe to embed) is exchanged for a per-user `sk_...` token stored client-side; treat this token like any other secret when logging or serializing state.
- **Turnstile & Firebase**: The frontend uses Cloudflare Turnstile for bot protection. Its site key is `VITE_TURNSTILE_SITE_KEY` (public); its secret key (`TURNSTILE_SECRET_KEY`) is kept in `.env` (ignored from git) and used by `/api/verify-turnstile` for backend verification. Firebase config keys (`src/config/firebase.ts`) are intentionally public. Be careful when updating CSP headers in `server.ts` to ensure `challenges.cloudflare.com` and `apis.google.com` remain allowed.

### Client-side compute — WebGPU workers

Heavy AI work runs in Web Workers, not the main thread:
- `src/services/webLlmService.ts` + `src/services/webLlm.worker.ts` — local LLM inference via `@mlc-ai/web-llm`, gated by `checkWebGPUSupport()`. WebLLM is **never** eagerly initialized on app start (eager init caused tab instability on some systems); `initWebLLM()` only runs from user-initiated paths — the setup/download flows, Global Settings, the Assistant page, and Shorts generation.
- `src/services/tts.worker.ts` + `src/services/ttsService.ts` — Kokoro.js TTS, quantization is user-selectable (`q8` quality vs `q4` speed).
- `src/services/ffmpegLoader.ts` + `src/services/BrowserVideoRenderer.ts` / `ShortsVideoRenderer.ts` — FFmpeg.wasm rendering. `@ffmpeg/ffmpeg` and `@ffmpeg/util` are excluded from Vite's dep pre-bundling (`vite.config.ts`) and get their own chunk.
- Heavy downloads (TTS model, FFmpeg core, WebLLM model) are serialized to run **one at a time**, coordinated through `src/context/BackgroundDownloadContext.tsx` / `src/components/BackgroundDownloadProvider.tsx` — see the comment there ("Downloads run strictly one at a time: TTS -> FFmpeg -> WebLLM"). `src/components/NotificationProvider.tsx` has a second download path (`handleDownloadAssets`) that follows the same order; keep the two in step.

### State, Persistence, & Authentication

- `src/services/storage.ts` wraps IndexedDB (`getDB()`, `DB_NAME`/`DB_VERSION`) — this is where `GlobalSettings`, local project data, and Assistant chat sessions live. 
- **Cloud Persistence & Auth**: `src/config/firebase.ts` and `src/services/cloudStorage.ts` implement optional cloud saving. Users can sign up/in using Firebase Auth (Email/Password or Google Sign-In, protected by Cloudflare Turnstile). Authenticated users can save their PDF and Shorts projects to Firebase Storage (with metadata in Firestore), allowing them to sync work across devices.
- `src/services/projectArchiveService.ts` implements the `.origami` portable project format (export/import slides, media, audio, settings as a local archive file).
- App-wide UI state (modals, background downloads, auth state) is provided via React Context (`src/context/`), not a global store library.
- **Deploying `firestore.rules`/`storage.rules`**: the `mcp__firebase__firebase_deploy` MCP tool has been observed to report `"status":"success"` without actually uploading/releasing the new ruleset — verified by round-tripping a diff through `firebase_get_security_rules` and seeing it come back unchanged. Don't trust that tool for rules deploys; use the real CLI directly instead: `npx firebase-tools@latest deploy --only firestore:rules,storage` (note: `storage`, not `storage:rules` — the `service:target` form only resolves against a named target registered via `firebase target:apply`, which this project doesn't use; passing `storage:rules` here fails with "Could not find rules for the following storage targets: rules"). After deploying, confirm with `mcp__firebase__firebase_get_security_rules` (that read path is reliable) rather than trusting the deploy tool's own status.

### Two video pipelines

1. **PDF → narrated video** (main flow): Actions-menu "Upload PDF…" (in `App.tsx`) → `pdfService.ts` (extraction, via `pdfjs-dist`) → `aiService.ts` (script generation) → `ttsService.ts` → `SlideEditor.tsx` / `ZoomTimelineEditor.tsx` → `BrowserVideoRenderer.ts` (FFmpeg.wasm render).
2. **Shorts** (`src/pages/ShortsPage.tsx`, `src/components/shorts/ShortsComposer.tsx`): script generation (`shortsScriptService.ts`) → Pollinations image/video generation (`pollinationsService.ts`, `pollinationsVideoService.ts`) → captions (`shortsCaptions.ts`) → `ShortsVideoRenderer.ts`. Project state shape lives in `shortsProject.ts`.

Both pipelines converge on the same TTS and FFmpeg-based rendering services rather than duplicating them.

### Routing

Client routing is `react-router`'s `BrowserRouter` defined at the bottom of `src/App.tsx`. `MainApp` (the root component, also in `App.tsx`) handles the primary PDF→video flow at `/` — with no project open, `/` redirects to the `/studios` picker (the app's landing page; its Slide Studio card opens the editor via `/?editor=1`). Other flows (`/account`, `/library`, `/assistant`, `/issue-reporter`, `/shorts`, `/voice`, `/convert`, `/pollinations-callback`, `/privacy`, `/terms`, `/license`) are separate page components under `src/pages/` (`SceneAlignmentPage.tsx` is not a route; `MainApp` renders it as an overlay). `App.tsx` is large (~2000 lines) and owns most of the primary-flow state — prefer extracting new primary-flow features into `src/components/` rather than growing it further.

### Screen recording

`src/hooks/useScreenRecorder.ts` drives capture; cinematic auto-zoom on idle (>2s) is generated afterwards from the recorded telemetry by `src/utils/inactivityDetection.ts` + `src/utils/autoZoomGeneration.ts`. `src/services/browserExtensionBridge.ts` talks to the optional Chrome extension (`chrome-extension/`, built separately, see `chrome-extension/README.md`) for richer cursor/DOM telemetry; there is an in-page fallback when the extension isn't installed, so don't assume its presence.

## Testing constraints

- Headless browser screenshots are allowed for visual/layout fixes: use the cached Playwright Chromium (`~/.cache/ms-playwright`) against `npm run dev`, with any throwaway scripts kept outside the repo. Don't add Playwright/Puppeteer as a project dependency, and don't automate flows that hit paid/cloud APIs, auth, or large model downloads.
- Otherwise, verify changes with `npm run check` (typecheck + lint), reading the code, and reasoning about control flow.
- If a change needs interactive verification beyond screenshots (e.g. WebGPU, TTS, rendering), say so explicitly and hand that step back to the user.

## Conventions

- TypeScript strict mode throughout (`strict: true` in every tsconfig). The app, node and server projects also set `noUnusedLocals`/`noUnusedParameters` (`functions/tsconfig.json` does not), so unused vars are compile errors, not lint warnings (ESLint's `no-unused-vars`/`@typescript-eslint/no-unused-vars` are turned off since `tsc` covers them).
- Avoid `any`; prefer `unknown` with type guards. (ESLint's `no-explicit-any` is off, so this is convention only — some existing code, e.g. `functions/api/*` handler `context` params, still uses `any`.)
- Functional React components with hooks only.
- 2-space indentation, semicolons required.
- Server code (`server.ts`, `functions/**`) always mirrors CSP/CORS/rate-limiting behavior between the Express and Pages Functions implementations — see the "Dual server runtime" section above before changing security headers or limits in only one place.