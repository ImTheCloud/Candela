// Copies each account's creation date and last sign-in from Firebase Authentication onto users/{uid}
// (createdAt only where it is missing, lastSeen only when Authentication's is newer), for the admin page.
//
//   firebase auth:export auth.json --format=json --project candela-64d25
//   node scripts/backfill-dates.mjs auth.json [--emulator]
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const PROJECT = 'candela-64d25';
const [file, flag] = process.argv.slice(2);
if (!file) { console.error('Folosire: node scripts/backfill-dates.mjs <auth.json> [--emulator]'); process.exit(1); }
const emulator = flag === '--emulator';
let token = 'owner';
if (!emulator) {
  const require = createRequire(join(execSync('npm root -g').toString().trim(), 'firebase-tools', 'package.json'));
  const { requireAuth } = require('./lib/requireAuth.js');
  const { getAccessToken } = require('./lib/apiv2.js');
  const { getGlobalDefaultAccount } = require('./lib/auth.js');
  const account = getGlobalDefaultAccount();
  if (!account) throw new Error('Firebase CLI nu este conectat: rulează `firebase login`.');
  await requireAuth({ user: account.user, tokens: account.tokens });
  token = await getAccessToken();
}
const base = `${emulator ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com'}/v1/projects/${PROJECT}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const iso = (ms) => new Date(Number(ms)).toISOString();

let created = 0, seen = 0;
for (const u of JSON.parse(readFileSync(file, 'utf8')).users) {
  const res = await fetch(`${base}/users/${u.localId}`, { headers });
  if (!res.ok) continue; // no profile: nothing to show on the admin page
  const f = (await res.json()).fields ?? {};
  const fields = {}, mask = [];
  if (!f.createdAt && u.createdAt) { fields.createdAt = { timestampValue: iso(u.createdAt) }; mask.push('createdAt'); created++; }
  const last = u.lastSignedInAt ? iso(u.lastSignedInAt) : null;
  if (last && (!f.lastSeen || f.lastSeen.timestampValue < last)) { fields.lastSeen = { timestampValue: last }; mask.push('lastSeen'); seen++; }
  if (!mask.length) continue;
  const q = mask.map((m) => `updateMask.fieldPaths=${m}`).join('&');
  const up = await fetch(`${base}/users/${u.localId}?${q}&currentDocument.exists=true`, { method: 'PATCH', headers, body: JSON.stringify({ fields }) });
  if (!up.ok) throw new Error(`${u.localId}: ${up.status} ${await up.text()}`);
}
console.log(`Date de creare completate: ${created}. Ultima conectare completată: ${seen}.`);
