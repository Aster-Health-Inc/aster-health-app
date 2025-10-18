// generate-apple-secret.js
import { SignJWT, importPKCS8 } from 'jose';

// FILL THESE:
const TEAM_ID   = 'MSG4552C8A';                 // e.g. 1A2B3C4D5E
const KEY_ID    = 'G9WDSD7KY5';                  // e.g. AB12CD34EF
const CLIENT_ID = 'com.aster.healthapp.auth';     // your Service ID
const P8 = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgjiPMql19vM4I6iak
OdBunW6BzwuFeadiPjsEX1QGWuygCgYIKoZIzj0DAQehRANCAARJsb74Lou9Vl+l
PpbVPzdP4n5e9ewaTN5KgV5zS8t8eB74nOakThPStiB+stsDAx0cCdI6h69lpq5g
0TTMbFsh
-----END PRIVATE KEY-----`;

const ALG = 'ES256';
const NOW = Math.floor(Date.now() / 1000);
const SIX_MONTHS = 60 * 60 * 24 * 180; // ~180 days (max allowed)

const payload = {
  iss: TEAM_ID,
  iat: NOW,
  exp: NOW + SIX_MONTHS,
  aud: 'https://appleid.apple.com',
  sub: CLIENT_ID,
};

const run = async () => {
  const privateKey = await importPKCS8(P8, ALG);
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG, kid: KEY_ID, typ: 'JWT' })
    .sign(privateKey);

  console.log('\nApple OAuth Client Secret (paste this into Supabase):\n');
  console.log(jwt + '\n');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
