import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const original = { id: '1sa.6.greu.301', t: 'tf', age: 'greu', ref: '6:2', q: 'Enunț vechi.', a: true, book: '1-samuel', ch: 6, cite: [] };
const corrected = { ...original, q: 'Enunț corectat.' };

async function setup() {
  const user = { value: { uid: 'admin' } };
  const writes = [];
  const cache = new Map();
  let current = corrected;
  let report = { id: 'report', uid: 'player', qid: original.id, q: original.q, ref: '6:2', book: '1-samuel', ch: 6, done: false };
  const context = vm.createContext({ fetch: async () => ({ ok: true, json: async () => ({ questions: [current] }) }) });
  const mocks = {
    'firebase/firestore': {
      addDoc: async (path, data) => writes.push({ path, data }),
      collection: (_, path) => path, doc: (_, ...p) => p.join('/'),
      onSnapshot: () => () => {}, query: (...p) => p, where: (...p) => p,
      serverTimestamp: () => 'server-time',
      updateDoc: async (path, data) => writes.push({ path, data }),
      runTransaction: async (_, fn) => fn({
        get: async () => ({ exists: () => true, id: report.id, data: () => report }),
        update: (path, data) => { writes.push({ path, data }); report = { ...report, ...data }; },
      }),
    },
    './firebase': { db: {} }, './session': { user },
    './store': { localGet: (key, fallback) => cache.get(key) ?? fallback, localSet: (key, value) => cache.set(key, value) },
  };
  const modules = new Map();
  async function load(name) {
    if (modules.has(name)) return modules.get(name);
    if (mocks[name]) {
      const values = mocks[name];
      const m = new vm.SyntheticModule(Object.keys(values), function () { for (const [k, v] of Object.entries(values)) this.setExport(k, v); }, { context });
      modules.set(name, m); return m;
    }
    const source = await readFile(new URL(`../src/lib/${name.replace('./', '')}.ts`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const m = new vm.SourceTextModule(compiled, { context });
    modules.set(name, m); await m.link(load); return m;
  }
  const service = await load('./reports'); await service.evaluate();
  return { api: service.namespace, model: modules.get('./report-model').namespace, writes, user, cache,
    get report() { return report; }, setReport: (r) => { report = { ...report, ...r }; }, setCurrent: (q) => { current = q; } };
}

test('rejecting a report saves one response without fetching or changing the question', async () => {
  const s = await setup();
  await s.api.decideReport(s.report, 'rejected', 'Explicație.');
  assert.equal(s.writes.length, 1);
  assert.equal(s.writes[0].path, 'reports/report');
  assert.equal(s.report.status, 'rejected');
  assert.equal(s.report.correctedQuestion, undefined);
  assert.equal(s.model.isUnread(s.report), true);
});

test('accepting retains the actual published correction and rejects duplicate decisions', async () => {
  const s = await setup();
  await s.api.decideReport(s.report, 'accepted', 'Am corectat formularea.', corrected);
  assert.equal(s.report.status, 'accepted');
  assert.equal(s.report.correctedQuestion, s.model.questionSnapshot(corrected));
  assert.match(s.report.correctedText, /Enunț corectat/);
  await assert.rejects(s.api.decideReport(s.report, 'rejected', 'Altă decizie.'), /report_decided/);
  assert.equal(s.writes.length, 1);
});

test('an unchanged question cannot be accepted, including legacy reports', async () => {
  const s = await setup(); s.setCurrent(original);
  await assert.rejects(s.api.decideReport(s.report, 'accepted', 'Corectat.', original), /question_unchanged/);
  s.setReport({ originalQuestion: s.model.questionSnapshot(original) });
  await assert.rejects(s.api.decideReport(s.report, 'accepted', 'Corectat.', original), /question_unchanged/);
  assert.equal(s.writes.length, 0);
});

test('an answer-only correction is detected, but quiz runtime changes are ignored', async () => {
  const s = await setup(); s.setReport({ originalQuestion: s.model.questionSnapshot(original) });
  assert.equal(s.model.hasCorrection(s.report, { ...original, cite: [['6:2', 'other']] }), false);
  const answerCorrection = { ...original, a: false }; s.setCurrent(answerCorrection);
  await s.api.decideReport(s.report, 'accepted', 'Am corectat răspunsul.', answerCorrection);
  assert.match(s.report.correctedText, /Fals/);
});

test('a question changed after review must be reviewed again before acceptance', async () => {
  const s = await setup(); s.setCurrent({ ...corrected, a: false });
  await assert.rejects(s.api.decideReport(s.report, 'accepted', 'Corectat.', corrected), /question_changed/);
  assert.equal(s.writes.length, 0);
});

test('only opening the owner response marks it read; legacy history has no false notifications', async () => {
  const s = await setup();
  assert.equal(s.model.reportStatus({ done: true }), 'legacy');
  assert.equal(s.model.isUnread({ done: true }), false);
  s.setReport({ done: true, status: 'accepted', responseReadAt: null });
  await s.api.markResponseRead(s.report); assert.equal(s.writes.length, 0);
  s.user.value = { uid: 'player' };
  await s.api.markResponseRead(s.report);
  assert.deepEqual(Object.keys(s.writes[0].data), ['responseReadAt']);
  assert.equal(s.model.isUnread({ ...s.report, responseReadAt: 'server-time' }), false);
});

test('submission snapshots and duplicate hints are isolated by signed-in account', async () => {
  const s = await setup();
  await s.api.sendReport(original, 'text', 'Note', 'Player');
  assert.equal(s.api.alreadyReported(original.id), true);
  assert.equal(s.writes[0].data.status, 'pending');
  assert.equal(s.writes[0].data.originalQuestion, s.model.questionSnapshot(original));
  s.user.value = { uid: 'other' };
  assert.equal(s.api.alreadyReported(original.id), false);
});
