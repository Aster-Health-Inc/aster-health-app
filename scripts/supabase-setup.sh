#!/usr/bin/env bash
# Supabase: link project, add OAuth redirect URLs.
# 1) Add SUPABASE_ACCESS_TOKEN to .env.supabase (from https://supabase.com/dashboard/account/tokens)
# 2) Run: ./scripts/supabase-setup.sh   OR   bash scripts/supabase-setup.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
PROJECT_REF="iinbwdrzmmcwajbmuynh"

if [ -f .env.supabase ]; then
  set -a
  . ./.env.supabase
  set +a
fi

if [ -z "${SUPABASE_ACCESS_TOKEN}" ]; then
  echo "Missing SUPABASE_ACCESS_TOKEN."
  echo "1. Open https://supabase.com/dashboard/account/tokens"
  echo "2. Create a token, then add to .env.supabase: SUPABASE_ACCESS_TOKEN=your_token"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

echo "==> Linking project $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF" || true

echo "==> Listing projects..."
supabase projects list || true

echo "==> Updating auth config (redirect URLs + enable Apple provider)..."
node "$REPO_ROOT/scripts/supabase-auth-redirects.js" "$PROJECT_REF"

echo "==> Done. For Apple Sign In, also configure:"
echo "    - Supabase Dashboard → Authentication → Providers → Apple (enable, set Services ID + Secret)."
echo "    - Apple Developer → Services ID → Return URL: https://$PROJECT_REF.supabase.co/auth/v1/callback"
