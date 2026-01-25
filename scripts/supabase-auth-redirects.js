#!/usr/bin/env node
/**
 * Supabase auth config: add OAuth redirect URLs and enable Apple provider.
 * Requires: SUPABASE_ACCESS_TOKEN. Optional: APPLE_SERVICES_ID, APPLE_CLIENT_SECRET.
 * PROJECT_REF as first arg (default: iinbwdrzmmcwajbmuynh).
 */

const PROJECT_REF = process.argv[2] || 'iinbwdrzmmcwajbmuynh';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const APPLE_CLIENT_ID = process.env.APPLE_SERVICES_ID || process.env.APPLE_CLIENT_ID;
const APPLE_SECRET = process.env.APPLE_CLIENT_SECRET;
const REDIRECTS = [
  'aster://auth/callback',
  'https://auth.expo.io/@asterhealth/aster-app',
];

if (!TOKEN) {
  console.error('Set SUPABASE_ACCESS_TOKEN (e.g. in .env.supabase).');
  process.exit(1);
}

const base = 'https://api.supabase.com/v1';
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function main() {
  const res = await fetch(`${base}/projects/${PROJECT_REF}/config/auth`, { headers });
  if (!res.ok) {
    console.error('GET /config/auth failed:', res.status, await res.text());
    process.exit(1);
  }
  const auth = await res.json();

  const raw = auth.uri_allow_list || '';
  const existing = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const needed = REDIRECTS.filter((u) => !existing.includes(u));
  const merged = [...existing, ...needed];
  const uriAllowList = merged.join('\n');

  const body = {
    uri_allow_list: uriAllowList,
    external_apple_enabled: true,
  };
  if (APPLE_CLIENT_ID) body.external_apple_client_id = APPLE_CLIENT_ID;
  if (APPLE_SECRET) body.external_apple_secret = APPLE_SECRET;

  const patch = await fetch(`${base}/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!patch.ok) {
    console.error('PATCH /config/auth failed:', patch.status, await patch.text());
    process.exit(1);
  }

  const logs = [];
  if (needed.length) logs.push('Added redirect URLs: ' + needed.join(', '));
  else logs.push('Redirect URLs OK.');
  logs.push('Apple provider: enabled.');
  if (APPLE_CLIENT_ID) logs.push('Apple Client ID: set.');
  if (APPLE_SECRET) logs.push('Apple Client Secret: set.');
  if (!APPLE_CLIENT_ID || !APPLE_SECRET) {
    logs.push('Add Services ID + Secret in Dashboard (or APPLE_SERVICES_ID, APPLE_CLIENT_SECRET) for Apple to work.');
  }
  console.log(logs.join(' '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
