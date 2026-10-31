// Deletes everyone's progress, keeps the accounts: users/*/progress, users/*/archive (v1) and every board entry.
// Profiles, children and reports stay. Signed in with the Firebase CLI, like migrate-supabase.mjs.
//
//   node scripts/reset-progress.mjs [--emulator]
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const PROJECT = 'candela-64d25';
const emulator = process.argv[2] === '--emulator';
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
const base = emulator ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
const db = `projects/${PROJECT}/databases/(default)`;
const call = async (path, body) => {
  const res = await fetch(`${base}/v1/${db}/documents${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

/** Names of every document of a collection (allDescendants: under any parent). */
async function names(collectionId, parent = '', allDescendants = true) {
  const out = await call(`${parent}:runQuery`, { structuredQuery: { from: [{ collectionId, allDescendants }], select: { fields: [] } } });
  return out.filter((r) => r.document).map((r) => r.document.name);
}

const progress = (await names('progress')).filter((n) => n.includes('/users/'));
const archive = (await names('archive')).filter((n) => n.includes('/users/'));
const boards = [];
for (const b of ['1-samuel', '2-samuel', 'all']) boards.push(...(await names('players', `/boards/${b}`, false)));

const all = [...progress, ...archive, ...boards];
console.log(`De șters: ${progress.length} progrese, ${archive.length} arhive v1, ${boards.length} intrări în clasamente.`);
for (let i = 0; i < all.length; i += 400) {
  await call(':commit', { writes: all.slice(i, i + 400).map((name) => ({ delete: name })) });
}
console.log('Gata.');
