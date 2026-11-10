# AGENTS.md

Origami AI is a browser-first React 19 app: PDF/Shorts → narrated MP4 using WebLLM, Kokoro TTS, and FFmpeg.wasm. `server.ts` is mostly a proxy for LLM/Pollinations/Turnstile/music calls plus static hosting — not a CRUD backend.

`CLAUDE.md` has deeper architecture notes, but its commands are stale (it says port 3000 and that ESLint only covers `.js`). Trust `package.json` and this file for commands.

## Commands

- Node **>= 22.16** (`package.json` `engines`; Docker uses `node:22`). README/CONTRIBUTING's 20.19 is outdated.
- `npm run dev` — Express + Vite HMR. The script sets `PORT=3006`; open **http://localhost:3006**. `npm run stop` kills 3006. Override with `PORT=3100 npm run dev`.
- `npm run check` — `tsc --build` + ESLint concurrently. Run this before handoff.
- `npm run typecheck` — builds all four TS projects (app, Vite config, server, `functions/`). `npm run build` is Vite-only and **does not typecheck**; a green build can still have TS errors.
- `npm run lint` — ESLint covers `.ts`/`.tsx`. Ignores `chrome-extension/`, `public/`, `dist/`, `functions/dist/`. `no-console` is a warning; only `console.warn`/`console.error` are allowed.
- `npm run pages:dev` — Wrangler/Cloudflare Pages runtime; no Express server.
- `npm run preview` — static Vite preview only; it does **not** serve `/api/*`. Use `NODE_ENV=production npx tsx server.ts` or Docker to exercise the production Express path.
- No test runner and no tests. Do not automate or screenshot the app in a browser (existing repo policy); verify with `npm run check` and code reasoning, and hand visual checks back to the user.
- No CI is tracked (`.github/` is gitignored).

## Two server runtimes — keep in sync

- `server.ts` (Express: dev, Docker, Node hosts) and `functions/api/**` (Cloudflare Pages Functions) are parallel implementations. Changing an API route means changing both sides.
- Paired routes: `POST /api/llm/chat`, `/api/llm/analyze-video`, `/api/llm/analyze-issue`, `/api/pollinations/image`, `/api/pollinations/video`, `/api/verify-turnstile`, and `GET /api/music-preview/:filename` ↔ `functions/api/music-preview/[filename].ts`.
- The Express side also has CORS allowlisting, a 100-req/15-min `/api/` rate limit, and JSON body-error handling. The Pages Functions do not mirror these; don't assume behavior carries over.
- `functions/utils.ts` holds helpers shared by Functions (e.g. Workers-compatible base64 decoding).

## Security / isolation

- COOP `same-origin` + COEP `credentialless` are required for `SharedArrayBuffer` and multithreaded FFmpeg. They are set in `server.ts` **and** `public/_headers` (Cloudflare Pages). CSP is duplicated in both files too — update both when adding an external origin.
- Opening `index.html` directly breaks FFmpeg/workers; always go through `npm run dev`, the production server, or Pages.
- Only `VITE_*` env vars are bundled into the client — any new one is public. Server-only: `LLM_API_KEY` (falls back to `VITE_LLM_API_KEY`), `POLLINATIONS_API_KEY`, `TURNSTILE_SECRET_KEY`; Pages Functions receive them via `env`. `.env` is gitignored.
- Firebase web config in `src/config/firebase.ts` is intentionally public. Pollinations `pk_...` keys are client-safe; `sk_...` tokens are secrets.
- With no client key, `src/services/aiService.ts` and the Pollinations services fall back to `/api/*` so secrets stay server-side. Preserve this split.

## Codebase shape

- Single npm package. `src/App.tsx` (~2k lines) owns the main PDF→video state and all `BrowserRouter` routes at the bottom; new primary-flow features belong in `src/components/` or hooks, not in `App.tsx`.
- Two render paths share TTS/FFmpeg: PDF→video (`pdfService` → `aiService` → `ttsService` → `BrowserVideoRenderer`) and Shorts (`shortsScriptService` → Pollinations → `ShortsVideoRenderer`).
- Heavy compute lives in Web Workers (`webLlm.worker.ts`, `tts.worker.ts`) and FFmpeg.wasm. Do not eagerly initialize WebLLM on startup (historical tab instability), and keep heavy model downloads serialized TTS → FFmpeg → WebLLM (`App.tsx`).
- App state: IndexedDB via `src/services/storage.ts`; React Context (`src/context/`) instead of a store library; optional Firebase Auth/Firestore/Storage for cloud sync.
- `chrome-extension/` is standalone and loaded unpacked; it is excluded from tsc, ESLint, and the Vite build.

## Conventions

- TypeScript strict plus `noUnusedLocals`/`noUnusedParameters`: unused variables fail typecheck. Avoid `any`; prefer `unknown` with type guards.
- Functional components with hooks; 2-space indent; semicolons.
- When changing security headers, CORS, rate limits, or a server route, reconcile `server.ts`, `public/_headers`, and the `functions/api` twin where applicable.

## Deploy notes

- Cloudflare Pages uses `wrangler.toml` with `dist` as output; `functions/` routes map directly to `/api/*`.
- Docker (`docker compose up --build`) serves on **3000**. `server.ts` statically imports `vite`, so production images must keep devDependencies (the Dockerfile does).
- Firebase rules: the Firebase MCP deploy tool has reported success without deploying. Use `npx firebase-tools@latest deploy --only firestore:rules,storage` (note `storage`, not `storage:rules`) and verify with a rules read. `.firebaserc` is empty, so pass `--project origami-511e0` if the CLI asks.
