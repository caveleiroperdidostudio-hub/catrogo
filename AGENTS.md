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

## Environment variables (Supabase credentials)
- Source of truth: the **platform secrets** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (declared in `.base44/environment.json`), delivered to `/run/base44/app.env` and mounted by compose. The repo `.env` still holds the OLD project's values and is only a fallback.
- `.base44/start-dev.sh` (the compose `command`) bridges them at startup: it writes `.env.local` (gitignored) with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` (derived from the URL host) for Vite, and exports `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` for the SSR middleware (`src/integrations/supabase/auth-middleware.ts`) and server code. Vite does not read these from `process.env`, so `.env.local` is what makes the dashboard values win.
- `VITE_SUPABASE_PROJECT_ID` is also used to build the `jarvis-ai` edge-function URL in `src/features/chat/ChatView.tsx` — the project ref must match the URL.
- `SUPABASE_SERVICE_ROLE_KEY` — optional secret, only for the admin client (`src/integrations/supabase/client.server.ts`). Not required to boot nor to log in.
- Add/update these on the Base44 **Secrets page**; never hardcode them in `docker-compose.base44.yml`.
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
- Shared `ctrg-*` control classes let the Ctrg OS skin apply liquid-glass depth and motion without changing feature logic.
- Pix: `src/lib/pix.ts` builds the BR Code (Copia e Cola) in the browser with the amount already embedded; the QR uses `qrcode.react`. Payment confirmation is still manual (owner approval panel) — there is no bank webhook.
- `supabase/migrations/20261003000000_ctrg_os_glass_ui.sql` registers UI version 4.1 and the new feature flags; it must be applied to the Supabase project.

## Known environment issue (2026-10-03)
- The old Supabase project `avulwcgqbfntffeyrzgs` is gone: NXDOMAIN at supabase.co's authoritative nameservers. Every `*.supabase.co` request from the browser fails, so **login and signup error out** (the `/auth` page itself renders fine, and the console shows failed `rest/v1` calls to that host).
- The user created a NEW Supabase project but skipped providing its credentials. Until `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` are set on the Base44 Secrets page, the app keeps pointing at the dead host and auth cannot be verified — the authenticated screens (Perfil → Configurações, Ctrg OS) stay unverifiable.
- The new project is still EMPTY once connected: the 30 SQL files in `supabase/migrations/` must be applied in filename order (they create `profiles`, the signup trigger, RLS policies, feature flags, Ctrg UI/OS seeds). Without them login may work but the app has no tables.
- Also check the new project's Auth settings: add the preview origin (`https://3000-$BASE44_PUBLIC_HOST_SUFFIX`) to the redirect allowlist, and note that with "Confirm email" ON, signup returns no session until the address is confirmed.

## Glass Lens Dock (showcase público)
- Rota pública `/glass` (sem login — útil porque o Supabase morto impede autenticar) renderiza `src/features/glass/GlassLensDock.tsx`, isolado em fundo preto: cápsula de vidro com ícone de grade, botão "+" e botão de três pontos.
- A lente é uma cópia ampliada da camada de ícones (`.glass-dock__world`) dentro de um bloco `overflow: hidden`, alinhada por transformação em tempo real (origem em `x + lensW/2`). O layout real nunca muda.
- A mola é um integrador massa-mola-amortecedor em `requestAnimationFrame` (stiffness 150 / damping 15), não um bezier — por isso há overshoot elástico.
- Estilos em `src/styles.css` (bloco "Glass Lens Dock"). O `backdrop-filter` vem de utilitários Tailwind (`@apply backdrop-blur-*`), nunca escrito à mão (ver a peculiaridade acima).
