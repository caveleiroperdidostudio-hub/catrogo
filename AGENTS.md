# Base44 Setup Notes — CatroGo

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

## Navigation (5 tabs)
- **Chat** — conversations, groups, calls, statuses
- **IA** — CatroGo AI assistant
- **Explorar** — hub for Mods, Selos, Museu, Novidades
- **Ctrg OS** — assinatura, QR/Copia e Cola Pix (R$ 15,63/mês) e painel de aprovação do dono
- **Perfil** — profile + settings (account, privacy, appearance, etc.)
- Conditional tabs: Natal (events), Equipe (staff), Comandos (owner only)

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
- Brand is standardized as **CATROGO** (not "Cosmos Chat" or "Catrogo")
- "Cosmos" is a visual theme name, not a product name
- Hand-written `backdrop-filter` in `src/styles.css` is rewritten by the CSS pipeline to `-webkit-backdrop-filter` only, which current Chrome does not support. Use Tailwind utilities (`@apply backdrop-blur-3xl backdrop-saturate-150`) instead — those emit both properties and actually blur.

## Ctrg UI (gratuita) e Ctrg OS (paga)
- `src/lib/ctrg-ui.tsx` is the source of truth: `uiLabel()` names the experiences, `isPro` / `isOs` decides access.
- Ctrg UI is the free experience; Ctrg OS is the paid one (R$ 15,63/month). The owner (`OWNER_EMAIL` in `src/lib/auth-context.tsx`) and staff (`supabase.rpc("is_staff")`) get Ctrg OS for free.
- The **Glass UI** theme lives in `src/styles.css` under `[data-ctrg-skin="glass"]` and is only applied when `isOs` is true.
- Pix: `src/lib/pix.ts` builds the BR Code (Copia e Cola) in the browser with the amount already embedded; the QR uses `qrcode.react`. Payment confirmation is still manual (owner approval panel) — there is no bank webhook.
- `supabase/migrations/20261003000000_ctrg_os_glass_ui.sql` registers UI version 4.1 and the new feature flags; it must be applied to the Supabase project.

## Known environment issue (2026-10-03)
- The Supabase project `avulwcgqbfntffeyrzgs` no longer resolves (NXDOMAIN at supabase.co's authoritative nameservers). Without it there is no login and no data: the app opens straight on `/auth` and every `*.supabase.co` request fails.
- The authenticated screens (Perfil → Configurações, Ctrg OS) CANNOT be verified in the preview until this is fixed. Update `.env` with the URL/publishable key of the working project.
