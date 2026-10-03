#!/bin/sh
# Base44 dev entrypoint for CatroGo.
#
# Supabase credentials are NOT kept in the repo: the user provides them as platform
# secrets (see .base44/environment.json) and the platform delivers them to
# /run/base44/app.env, which docker compose mounts through `env_file`.
#
# Vite only reads VITE_* variables from .env files, while the SSR / server-function
# code reads the un-prefixed SUPABASE_* names. This script bridges both from the
# single source of truth (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY) so the
# dashboard values are never duplicated or shadowed in docker-compose.base44.yml.
set -e

bun install

if [ -n "$VITE_SUPABASE_URL" ] && [ -n "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
  PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-$(printf '%s' "$VITE_SUPABASE_URL" | sed -E 's#^https?://([^.]+)\..*$#\1#')}"
  {
    printf 'VITE_SUPABASE_URL=%s\n' "$VITE_SUPABASE_URL"
    printf 'VITE_SUPABASE_PUBLISHABLE_KEY=%s\n' "$VITE_SUPABASE_PUBLISHABLE_KEY"
    printf 'VITE_SUPABASE_PROJECT_ID=%s\n' "$PROJECT_ID"
  } > .env.local
  export SUPABASE_URL="$VITE_SUPABASE_URL"
  export SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY"
  echo "[catrogo] Supabase credentials loaded from the platform env (project: $PROJECT_ID)"
else
  echo "[catrogo] No platform Supabase credentials yet — falling back to the repo .env"
fi

exec bun run dev -- --host 0.0.0.0 --port 3000
