import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as signals from '@preact/signals';

// Exercise the real progress effects, controlling delayed Firestore replies.
async function setup() {
  const parent = { key: 'parent', name: 'Parent', child: false };
  const child = { key: 'child', name: 'Evelyn', child: true };
  const user = signals.signal({ uid: 'parent' });
  const players = signals.signal([parent]);
  const player = signals.signal(parent);
  const listeners = [];
  const boards = [];
  const writes = [];
  const docs = new Map();
  let releaseWrite;
  let delayWrite = false;
  const snap = (data) => ({ data: () => data, get: (key) => data?.[key] });
  const cache = new Map();
  const mocks = {
    '@preact/signals': signals,
    'firebase/firestore': {
      doc: (_, ...parts) => parts.join('/'),
      onSnapshot: (path, callback) => {
        const listener = { path, callback, active: true };
        listeners.push(listener);
        return () => { listener.active = false; };
      },
      getDoc: async (path) => snap(docs.get(path)),
      setDoc: async (path, data) => {
        writes.push({ path, data });
        if (delayWrite) await new Promise((resolve) => { releaseWrite = resolve; });
      },
      deleteDoc: async () => {},
      arrayUnion: (...items) => items,
      arrayRemove: (...items) => items,
      increment: (n) => n,
      serverTimestamp: () => 1,
    },
    './board': { writeBoard: async (...args) => { boards.push(args); } },
    './books': { BOOKS: [{ slug: '1-samuel' }] },
    './firebase': { db: {} },
    './players': { player, players, shortName: (p) => p.name },
    './session': { user },
    './store': {
      localGet: (key, fallback) => cache.get(key) ?? fallback,
      localSet: (key, value) => cache.set(key, value),
      localRemove: (key) => cache.delete(key),
    },
  };
  const source = await readFile(new URL('../src/lib/progress.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = new vm.SourceTextModule(compiled);
  await module.link((specifier) => {
    const values = mocks[specifier];
    assert.ok(values, `Unexpected dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  const deliver = (key, mastered) => {
    const path = `users/parent/progress/${key}~1-samuel`;
    const data = { mastered, wrong: [], exams: {}, stats: {} };
    docs.set(path, data);
    const listener = listeners.findLast((l) => l.active && l.path === path);
    assert.ok(listener, `No listener for ${key}`);
    listener.callback(snap(data));
  };
  return { parent, child, user, players, player, boards, writes, listeners, deliver, api: module.namespace,
    delayWrite: () => { delayWrite = true; }, releaseWrite: () => releaseWrite() };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const points = Array.from({ length: 64 }, (_, i) => `1sa.1.usor.${i}`);

test('adding a child and switching profiles never publishes the parent score for the child', async () => {
  const s = await setup();
  s.deliver('parent', points);
  await tick();
  s.players.value = [s.parent, s.child];
  await tick();
  s.player.value = s.child;
  await tick();
  assert.equal(s.api.progressLoaded('1-samuel').value, false);
  assert.ok(s.boards.filter((b) => b[2] === 'child').every((b) => b[4].length === 0), 'Parent points were published under child identity');
  s.deliver('child', []);
  await tick();
  assert.equal(s.api.progress('1-samuel').value.mastered.length, 0);
  assert.ok(s.boards.filter((b) => b[2] === 'child').every((b) => b[4].length === 0));
  s.player.value = s.parent;
  s.deliver('parent', points);
  await tick();
  assert.equal(s.api.progress('1-samuel').value.mastered.length, 64);
});

test('a quiz write completing after a switch keeps its original leaderboard identity', async () => {
  const s = await setup();
  s.deliver('parent', points);
  await tick();
  s.delayWrite();
  const save = s.api.saveQuizResult('1-samuel', [{ id: '1sa.1.usor.99', t: 'single', right: true }]);
  await tick();
  s.players.value = [s.parent, s.child];
  s.player.value = s.child;
  s.deliver('child', []);
  await tick();
  s.releaseWrite();
  await save;
  assert.equal(s.writes[0].path, 'users/parent/progress/parent~1-samuel');
  assert.ok(s.boards.filter((b) => b[2] === 'child').every((b) => b[4].length === 0), 'Pending parent quiz credited the child');
});

test('a late snapshot from the previous player cannot replace the child progress', async () => {
  const s = await setup();
  s.deliver('parent', points);
  const oldListener = s.listeners.find((l) => l.active);
  s.players.value = [s.parent, s.child];
  s.player.value = s.child;
  s.deliver('child', []);
  oldListener.callback({ data: () => ({ mastered: points }) });
  await tick();
  assert.equal(s.api.progress('1-samuel').value.mastered.length, 0);
  assert.ok(s.boards.filter((b) => b[2] === 'child').every((b) => b[4].length === 0));
});

test('switching while a quiz waits for progress cancels the save instead of writing to another player', async () => {
  const s = await setup();
  const save = s.api.saveQuizResult('1-samuel', [{ id: '1sa.1.usor.99', t: 'one', right: true }]);
  const rejected = assert.rejects(save, /player_changed/);
  s.players.value = [s.parent, s.child];
  s.player.value = s.child;
  s.deliver('child', []);
  await rejected;
  assert.equal(s.writes.length, 0);
});

test('a new child earns only their own answers and leaves the parent progress intact', async () => {
  const s = await setup();
  s.deliver('parent', points);
  s.players.value = [s.parent, s.child];
  s.player.value = s.child;
  s.deliver('child', []);
  await s.api.saveQuizResult('1-samuel', [{ id: '1sa.1.usor.99', t: 'one', right: true }]);
  const write = s.writes.at(-1);
  assert.equal(write.path, 'users/parent/progress/child~1-samuel');
  assert.deepEqual([...write.data.mastered], ['1sa.1.usor.99']);
  const board = s.boards.filter((b) => b[2] === 'child').at(-1);
  assert.deepEqual([...board[4]], ['1sa.1.usor.99']);
  s.player.value = s.parent;
  s.deliver('parent', points);
  assert.equal(s.api.progress('1-samuel').value.mastered.length, 64);
});
