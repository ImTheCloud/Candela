import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { signal, effect } from '@preact/signals';

test('notification counts reset per account and ignore stale subscriptions', async () => {
  const user = signal(undefined), profile = signal(null), profileLoaded = signal(false);
  const listeners = [], storage = new Map();
  let dispose;
  const watch = (kind, uid, cb) => { const l = { kind, uid, cb, stopped: false }; listeners.push(l); return () => { l.stopped = true; }; };
  const mocks = {
    '@preact/signals': { signal, effect: (fn) => { dispose = effect(fn); return dispose; } },
    './messages': { watchOpenMessagesCount: (cb) => watch('messages', null, cb) },
    './reports': { watchOpenCount: (cb) => watch('reports', null, cb), watchUnreadCount: (uid, cb) => watch('replies', uid, cb) },
    './session': { user, profile, profileLoaded },
    './store': { localSet: (key, value) => storage.set(key, value) },
  };
  const source = await readFile(new URL('../src/lib/notifications.ts', import.meta.url), 'utf8');
  const m = new vm.SourceTextModule(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  await m.link((name) => new vm.SyntheticModule(Object.keys(mocks[name]), function () { for (const [k, v] of Object.entries(mocks[name])) this.setExport(k, v); }));
  await m.evaluate();
  const send = (kind, count) => listeners.findLast(l => !l.stopped && l.kind === kind).cb(count);
  try {
    user.value = { uid: 'admin' }; profile.value = { admin: true }; profileLoaded.value = true;
    send('reports', 3); send('messages', 2); send('replies', 1);
    assert.equal(storage.get('acctN'), 6);
    send('replies', 0); assert.equal(storage.get('acctN'), 5);
    const late = listeners.filter(l => !l.stopped);
    user.value = null; profileLoaded.value = false; profile.value = null;
    assert.equal(storage.get('acctN'), 0);
    user.value = { uid: 'player' }; profileLoaded.value = true;
    late.forEach(l => l.cb(99));
    assert.equal(storage.get('acctN'), 0);
    assert.equal(m.namespace.notifications.value.uid, 'player');
    assert.deepEqual(listeners.filter(l => !l.stopped).map(l => l.kind), ['replies']);
    send('replies', 2); assert.equal(storage.get('acctN'), 2);
    send('replies', 0); assert.equal(storage.get('acctN'), 0);
    assert.equal(storage.get('acctHref'), undefined);
  } finally { dispose(); }
});
