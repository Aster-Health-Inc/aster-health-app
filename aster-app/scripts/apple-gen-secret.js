/**
 * Generate Apple Client Secret (JWT) for Supabase Auth.
 * Run from aster-app: node scripts/apple-gen-secret.js
 *
 * Required:
 *   APPLE_KEY_ID     Key ID from Apple Developer → Keys (your Sign in with Apple key)
 *   APPLE_P8_PATH    Path to the .p8 file (e.g. ./AuthKey_XXXXXXXXXX.p8)
 *
 * Optional (defaults for Aster):
 *   TEAM_ID          Apple Team ID (default: MSG4552C8A)
 *   APPLE_SERVICES_ID  Services ID / Client ID (default: com.asterhealthinc.app.signin)
 *
 * Example:
 *   APPLE_KEY_ID=XXXXXXXXXX APPLE_P8_PATH=./AuthKey_XXXXXXXXXX.p8 node scripts/apple-gen-secret.js
 *
 * Or with --p8:
 *   APPLE_KEY_ID=XXX node scripts/apple-gen-secret.js --p8 /path/to/AuthKey_XXX.p8
 *
 * Copy the printed JWT into Supabase → Authentication → Providers → Apple → Client Secret.
 * Rotate every 6 months (Apple requirement for OAuth).
 */

const { SignJWT } = require('jose');
const { createPrivateKey } = require('crypto');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const teamId = process.env.TEAM_ID || 'MSG4552C8A';
const keyId = process.env.APPLE_KEY_ID;
const servicesId =
  process.env.APPLE_SERVICES_ID ||
  process.env.APPLE_CLIENT_ID ||
  'com.asterhealthinc.app.signin';

let p8Path = process.env.APPLE_P8_PATH;
const idx = process.argv.indexOf('--p8');
if (idx !== -1 && process.argv[idx + 1]) p8Path = process.argv[idx + 1];

if (!keyId || !p8Path) {
  console.error(
    'Usage: APPLE_KEY_ID=<key> APPLE_P8_PATH=/path/to/AuthKey_XXX.p8 [TEAM_ID=] [APPLE_SERVICES_ID=] node scripts/apple-gen-secret.js'
  );
  console.error(
    '   Or: node scripts/apple-gen-secret.js --p8 /path/to/AuthKey_XXX.p8  (APPLE_KEY_ID in env)'
  );
  process.exit(1);
}

(async () => {
  const p8 = readFileSync(resolve(p8Path), 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 180; // 6 months

  const secret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(servicesId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(createPrivateKey(p8.replace(/\\n/g, '\n')));

  console.log('Apple Client Secret (JWT). Valid 6 months; rotate before expiry.\n');
  console.log(secret);
})();
