// Moves v1 accounts (Supabase) into Firebase. Run it once for testing and again on switch-over day:
// it only adds or refreshes what came from v1 and never removes what players did in v2.
//
//   node scripts/migrate-supabase.mjs <export.json> [--emulator]
//
// export.json is made by scripts/export-supabase.sh. The Firebase CLI must be installed and signed in.
// Writes: auth-import.json next to the export (for `firebase auth:import`), then the Firestore documents:
//   users/{uid}                      name, email, isParent, hidden, admin (birthYear is asked in v2)
//   users/{uid}/players/{childId}    each child of a parent
//   users/{uid}/progress/{key}~1-samuel   v1 highlights, added to the v2 ones
//   users/{uid}/archive/{key}~1-samuel-v1 questions mastered in v1 (those questions were rewritten)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const PROJECT = 'candela-64d25';
const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error('Folosire: node scripts/migrate-supabase.mjs <export.json> [--emulator]');
  process.exit(1);
}
const emulator = flag === '--emulator';
const data = JSON.parse(readFileSync(file, 'utf8'));

// 1. Firebase Auth: same uid, email and bcrypt password hash, so everyone keeps their password.
const profiles = new Map(data.profiles.map((p) => [p.id, p]));
const authFile = join(dirname(file), 'auth-import.json');
writeFileSync(authFile, JSON.stringify({
  users: data.users.map((u) => ({
    localId: u.id,
    email: u.email,
    emailVerified: true,
    passwordHash: Buffer.from(u.hash).toString('base64'),
    displayName: profiles.get(u.id)?.name,
    createdAt: String(Date.parse(u.createdAt)),
  })),
}), { mode: 0o600 });
const env = emulator ? { ...process.env, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' } : process.env;
execSync(`firebase auth:import "${authFile}" --hash-algo=BCRYPT --project ${PROJECT}`, { stdio: 'inherit', env });

// 2. Firestore, through the REST API with the Firebase CLI's own sign-in (or the emulator).
const require = createRequire(join(execSync('npm root -g').toString().trim(), 'firebase-tools', 'package.json'));
let token = 'owner';
if (!emulator) {
  const { requireAuth } = require('./lib/requireAuth.js');
  const { getAccessToken } = require('./lib/apiv2.js');
  const { getGlobalDefaultAccount } = require('./lib/auth.js');
  const account = getGlobalDefaultAccount();
  if (!account) throw new Error('Firebase CLI nu este conectat: rulează `firebase login`.');
  await requireAuth({ user: account.user, tokens: account.tokens });
  token = await getAccessToken();
}
const base = emulator ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
const root = `projects/${PROJECT}/databases/(default)/documents`;

const value = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  if (typeof v === 'object') return { mapValue: { fields: fields(v) } };
  return { stringValue: String(v) };
};
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, value(v)]));

/** Sets only the given fields (the rest of the document stays as it is in v2). */
const setFields = (path, o) => ({ update: { name: `${root}/${path}`, fields: fields(o) }, updateMask: { fieldPaths: Object.keys(o) } });
/** Adds values to an array field without duplicates. */
const addToArray = (path, field, values) => ({
  update: { name: `${root}/${path}`, fields: {} },
  updateMask: { fieldPaths: [] },
  updateTransforms: [{ fieldPath: field, appendMissingElements: { values: values.map(value) } }],
});

const writes = [];
const admins = new Set(data.admins);
for (const p of data.profiles) {
  if (p.parentId) {
    writes.push(setFields(`users/${p.parentId}/players/${p.id}`, { name: p.name.split(' ')[0], hidden: p.hidden, createdAt: new Date(p.createdAt) }));
  } else {
    const u = data.users.find((x) => x.id === p.id);
    writes.push(setFields(`users/${p.id}`, {
      name: p.name, email: u?.email ?? null, isParent: p.isParent, hidden: p.hidden,
      createdAt: new Date(p.createdAt), migratedFromV1: true, ...(admins.has(p.id) ? { admin: true } : {}),
    }));
  }
}
const owner = (id) => profiles.get(id)?.parentId ?? id;
const byPlayer = (rows) => rows.reduce((m, r) => m.set(r.user, [...(m.get(r.user) ?? []), r]), new Map());
for (const [id, rows] of byPlayer(data.highlights)) {
  writes.push(addToArray(`users/${owner(id)}/progress/${id}~1-samuel`, 'marks', rows.map((r) => `${r.ch}:${r.v}`)));
}
for (const [id, rows] of byPlayer(data.mastered)) {
  writes.push(setFields(`users/${owner(id)}/archive/${id}~1-samuel-v1`, { mastered: rows.map((r) => r.qid), count: rows.length, exportedAt: new Date(data.exportedAt) }));
}

for (let i = 0; i < writes.length; i += 400) {
  const res = await fetch(`${base}/v1/${root}:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: writes.slice(i, i + 400) }),
  });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
}
console.log(`Firestore: ${writes.length} documente scrise (${data.users.length} conturi, ${data.profiles.filter((p) => p.parentId).length} copii).`);
