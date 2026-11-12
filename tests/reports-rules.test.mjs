import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, serverTimestamp, terminate } from 'firebase/firestore';

// Run only against the local emulator; never uses a production database.
const host = process.env.FIRESTORE_EMULATOR_HOST;
test('report access, terminal decisions and read receipts are enforced by Firestore', { skip: !host }, async (t) => {
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
  const projectId = 'demo-candela-reports';
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const loaded = await fetch(`http://${host}/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rules }] } }),
  });
  assert.equal(loaded.ok, true, await loaded.text());
  const apps = [];
  const client = (uid, admin = false) => {
    const app = initializeApp({ projectId }, `${uid}-${Date.now()}`); apps.push(app);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, host.split(':')[0], Number(host.split(':')[1]), { mockUserToken: { sub: uid, admin } });
    return db;
  };
  const owner = client('reporter'), outsider = client('outsider'), admin = client('admin', true);
  const id = `report-${Date.now()}`;
  const base = { uid: 'reporter', by: 'Test Player', qid: '1sa.6.greu.301', book: '1-samuel', ch: 6, ref: '6:2', q: 'Original question', reason: 'text', note: '', done: false, status: 'pending', originalQuestion: 'original', at: serverTimestamp() };
  const deny = (promise) => assert.rejects(promise, (err) => err.code === 'permission-denied');
  try {
    await t.test('owner can submit and query own reports, other accounts cannot see them', async () => {
      await setDoc(doc(owner, 'reports', id), base);
      assert.equal((await getDoc(doc(owner, 'reports', id))).exists(), true);
      assert.ok((await getDocs(query(collection(owner, 'reports'), where('uid', '==', 'reporter')))).size > 0);
      await deny(getDoc(doc(outsider, 'reports', id)));
      await deny(getDocs(collection(owner, 'reports')));
      await deny(setDoc(doc(owner, 'reports', `${id}-spoof`), { ...base, uid: 'outsider' }));
      await deny(setDoc(doc(owner, 'reports', `${id}-fake-status`), { ...base, status: 'accepted' }));
      await deny(updateDoc(doc(owner, 'reports', id), { responseReadAt: serverTimestamp() }));
    });
    const decision = { status: 'rejected', done: true, decidedBy: 'admin', decidedAt: serverTimestamp(), responseReadAt: null };
    await t.test('only admin can decide, cannot change reporter details or delete history', async () => {
      await deny(updateDoc(doc(owner, 'reports', id), decision));
      await deny(updateDoc(doc(admin, 'reports', id), { ...decision, uid: 'outsider' }));
      await deny(deleteDoc(doc(admin, 'reports', id)));
      await updateDoc(doc(admin, 'reports', id), decision);
      await deny(updateDoc(doc(admin, 'reports', id), { ...decision, status: 'accepted', correctedQuestion: 'new', correctedText: 'New' }));
    });
    await t.test('only owner can acknowledge response, without altering the decision', async () => {
      await deny(updateDoc(doc(outsider, 'reports', id), { responseReadAt: serverTimestamp() }));
      await deny(updateDoc(doc(owner, 'reports', id), { responseReadAt: serverTimestamp(), response: 'tampered' }));
      await updateDoc(doc(owner, 'reports', id), { responseReadAt: serverTimestamp() });
      assert.ok((await getDoc(doc(owner, 'reports', id))).data().responseReadAt);
      await deny(updateDoc(doc(owner, 'reports', id), { responseReadAt: null }));
    });
    await t.test('acceptance needs no comment; a stored correction must differ; refusal cannot attach one', async () => {
      const ref = doc(admin, 'reports', `${id}-accept`);
      await setDoc(doc(owner, 'reports', `${id}-accept`), base);
      await deny(updateDoc(ref, { ...decision, response: 'Comments are no longer written.' }));
      await deny(updateDoc(ref, { ...decision, status: 'accepted', correctedQuestion: 'original', correctedText: 'No change' }));
      await deny(updateDoc(ref, { ...decision, correctedQuestion: 'new', correctedText: 'New' }));
      await updateDoc(ref, { ...decision, status: 'accepted', correctedQuestion: 'new', correctedText: 'New question' });
      await setDoc(doc(owner, 'reports', `${id}-accept-plain`), base);
      await updateDoc(doc(admin, 'reports', `${id}-accept-plain`), { ...decision, status: 'accepted' });
    });
    await t.test('legacy pending reports can receive a decision without rewriting old data', async () => {
      const { status, originalQuestion, ...legacy } = base;
      await setDoc(doc(owner, 'reports', `${id}-legacy`), legacy);
      await updateDoc(doc(admin, 'reports', `${id}-legacy`), decision);
      assert.equal((await getDoc(doc(owner, 'reports', `${id}-legacy`))).data().status, 'rejected');
    });
  } finally { await Promise.all(apps.map(async (app) => { await terminate(getFirestore(app)); await deleteApp(app); })); }
});
