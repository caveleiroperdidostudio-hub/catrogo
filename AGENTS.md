# Base44 Setup Notes — Catrogo

## Stack
- **Framework**: TanStack Start (React 19 + Vite 7 SSR) via `@lovable.dev/vite-tanstack-config`
- **Package manager**: Bun (bun.lock + bunfig.toml) — `bun install && bun run dev`
- **Backend**: Supabase (remote, hosted at `*.supabase.co`) — no local DB needed
- **Build/deploy target**: Cloudflare Workers (wrangler.jsonc) — but dev uses Vite dev server only

## Running the app
```
docker compose -f docker-compose.base44.yml up -d
```
- Dev server: `vite dev --host 0.0.0.0 --port 3000` (Vite HMR, live source)
- Health check: `curl http://localhost:3000/`
- The app renders an auth/login page at `/auth` when no session exists

## Environment variables
- `.env` (in repo) has public Supabase credentials: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **user-provided secret**, needed for server-side Supabase operations (admin client in `src/integrations/supabase/client.server.ts`). Not required to boot; the auth page renders without it. Delivered via `/run/base44/app.env`.
- AI keys (`LOVABLE_API_KEY`, `OPENAI_API_KEY`, `JARVIS_AI_URL`, `JARVIS_API_KEY`, `JARVIS_MODEL`) — optional, checked for presence at runtime
- `ONESIGNAL_REST_API_KEY` — optional, for push notifications

## Quirks
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config` which bundles TanStack Start, React, Tailwind, Cloudflare, and sandbox detection plugins — do NOT add these manually (causes duplicate plugin errors)
- `src/server.ts` is the SSR entry (wraps TanStack Start's server entry with error handling)
- `src/start.ts` configures the TanStack Start instance with Supabase auth middleware
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed bare in compose for Vite host allowlisting
