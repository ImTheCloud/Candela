import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// 2 Samuel 14:16: 143 characters, about 9 s of audio
const VERSE = 'Da, împăratul va asculta pe roaba sa ca să scape din mâna celor ce caută să ne nimicească, pe mine și pe fiul meu, din moștenirea lui Dumnezeu.';

/** speech.ts in a sandbox: a fake audio element, a fake network and a clock moved by hand */
async function setup({ respond } = {}) {
  let now = 0;
  const timers = [];
  let nextId = 1;
  const addTimer = (fn, ms, every) => { const id = nextId++; timers.push({ id, fn, at: now + ms, every }); return id; };
  const clearTimer = (id) => { const k = timers.findIndex((t) => t.id === id); if (k >= 0) timers.splice(k, 1); };
  const flush = () => new Promise((r) => setImmediate(r));
  async function tick(ms) {
    const end = now + ms;
    for (;;) {
      await flush();
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > end) break;
      now = t.at;
      if (t.every) t.at += t.every; else timers.shift();
      t.fn();
    }
    now = end;
    await flush();
  }

  const fetches = [];
  const net = respond ?? (() => ({ ok: true, size: 55000 }));
  let blobs = 0;

  class FakeAudio {
    constructor() {
      this._src = ''; this.paused = true; this.ended = false; this.currentTime = 0; this.duration = NaN;
      this.playbackRate = 1; this.error = null; this.plays = []; this.pending = null;
      this.onplay = this.onplaying = this.onpause = this.onended = this.onerror = this.onloadedmetadata = null;
      audios.push(this);
    }
    get src() { return this._src; }
    set src(v) { this._src = v; this.paused = true; this.ended = false; this.currentTime = 0; this.duration = NaN; }
    removeAttribute() { this._src = ''; }
    load() {}
    pause() { if (!this.paused) { this.paused = true; this.onpause?.(); } }
    play() {
      this.plays.push(this._src);
      this.paused = false;
      return new Promise((resolve, reject) => { this.pending = { resolve, reject }; });
    }
    // what the browser would do once the file is read
    meta(duration) { this.duration = duration; this.onloadedmetadata?.(); }
    start() { this.pending?.resolve(); this.onplay?.(); this.onplaying?.(); }
    finish(at = this.duration) { this.currentTime = at; this.paused = true; this.ended = true; this.onended?.(); }
  }
  const audios = [];

  class FakeDate extends Date { static now() { return now; } }
  const context = vm.createContext({
    window: {}, navigator: {}, localStorage: { getItem: () => null, setItem() {} },
    Audio: FakeAudio, Blob, AbortController, Date: FakeDate, console: { warn() {}, error() {}, log() {} },
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    setTimeout: (fn, ms) => addTimer(fn, ms), clearTimeout: clearTimer,
    setInterval: (fn, ms) => addTimer(fn, ms, ms), clearInterval: clearTimer,
    URL: { createObjectURL: () => `blob:${++blobs}`, revokeObjectURL() {} },
    fetch: async (url, init) => {
      fetches.push({ url, init });
      const r = await net(url, fetches.length);
      if (r.hang) return new Promise(() => {});
      return { ok: r.ok, status: r.ok ? 200 : 502, blob: async () => ({ size: r.size ?? 0, type: 'audio/mpeg' }) };
    },
  });
  const source = await readFile(new URL('../src/lib/speech.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = new vm.SourceTextModule(compiled, { context });
  await m.link(() => { throw new Error('speech.ts imports nothing at run time'); });
  await m.evaluate();
  return { api: m.namespace, fetches, tick, flush, audio: () => audios[0] };
}

function listen() {
  const log = [];
  return { log, options: { onStart: () => log.push('start'), onEnd: () => log.push('end'), onError: () => log.push('error'), onPause: () => log.push('pause') } };
}

test('a verse not downloaded yet plays from the checked file, never from the network URL', async () => {
  const s = await setup();
  const l = listen();
  s.api.speakText(VERSE, l.options);
  const a = s.audio();
  // a silent clip keeps the tap's permission while the file downloads
  assert.match(a.plays[0], /^data:audio\/wav/);
  await s.tick(0);
  assert.equal(a.src, 'blob:1');
  assert.ok(a.plays.every((src) => !src.startsWith('/api/')));
  a.meta(9.2); a.start();
  a.finish();
  assert.deepEqual(l.log, ['start', 'end']);
});

test('a cut file is synthesised again and the reading goes on where it stopped (2 Samuel 14:32)', async () => {
  const s = await setup();
  await s.api.preloadText(VERSE);
  const l = listen();
  s.api.speakText(VERSE, l.options);
  const a = s.audio();
  assert.equal(a.src, 'blob:1');
  a.meta(3.5); // shorter than the text can be read: refused before it plays
  await s.tick(0);
  const fresh = s.fetches.find((f) => f.url.includes('&fresh='));
  assert.ok(fresh, 'a new copy is asked for');
  assert.equal(fresh.init.cache, 'no-store');
  assert.equal(a.src, 'blob:2');
  a.meta(9.2); a.start();
  a.finish(); // whole now
  assert.deepEqual(l.log, ['start', 'end']);
});

test('a file ending long before its text is reloaded instead of jumping to the next verse', async () => {
  const s = await setup();
  await s.api.preloadText(VERSE);
  const l = listen();
  s.api.speakText(VERSE, l.options);
  const a = s.audio();
  a.start();
  a.finish(2); // duration unknown, ended after 2 s
  assert.deepEqual(l.log, ['start']);
  await s.tick(0);
  assert.equal(a.src, 'blob:2');
  a.meta(9.2);
  assert.equal(a.currentTime, 1, 'resumes a second before the cut');
  a.start(); a.finish(9.2);
  assert.deepEqual(l.log, ['start', 'start', 'end']);
});

test('a file that never starts (2 Samuel 14:16) is reloaded, then the button is told if it still fails', async () => {
  const s = await setup({ respond: (url) => (url.includes('fresh') ? { ok: false } : { ok: true, size: 55000 }) });
  await s.api.preloadText(VERSE);
  const l = listen();
  s.api.speakText(VERSE, l.options);
  // play() neither starts nor fails
  await s.tick(9000);
  assert.ok(s.fetches.some((f) => f.url.includes('&fresh=')));
  // three new copies refused by the server, with a short wait between them: given up, never stuck "playing"
  await s.tick(10000);
  assert.equal(s.fetches.filter((f) => f.url.includes('&fresh=')).length, 3);
  assert.deepEqual(l.log, ['error']);
});

test('a frozen reading is reloaded from the position it froze at', async () => {
  const s = await setup();
  await s.api.preloadText(VERSE);
  const l = listen();
  s.api.speakText(VERSE, l.options);
  const a = s.audio();
  a.meta(9.2); a.start();
  a.currentTime = 4;
  await s.tick(10000);
  assert.equal(a.src, 'blob:2');
  a.meta(9.2);
  assert.equal(a.currentTime, 3.5);
});

test('a pause during the download waits for resume; a pause by the phone is reported', async () => {
  const s = await setup();
  const l = listen();
  s.api.speakText(VERSE, l.options);
  const a = s.audio();
  s.api.pauseSpeaking();
  await s.tick(0);
  assert.equal(a.src, 'blob:1');
  assert.equal(a.plays.length, 1, 'the file waits, the pause is kept');
  assert.equal(s.api.resumeSpeaking(), true);
  assert.equal(a.plays.length, 2);
  a.meta(9.2); a.start();
  a.currentTime = 3;
  a.pause(); // a phone call
  assert.deepEqual(l.log, ['start', 'pause']);
  await s.tick(20000);
  assert.equal(s.fetches.filter((f) => f.url.includes('&fresh=')).length, 0, 'a paused reading is not taken for a frozen one');
});

test('a newer text silences the older one', async () => {
  const s = await setup();
  const first = listen();
  const second = listen();
  s.api.speakText(VERSE, first.options);
  s.api.speakText('Capitolul 14.', second.options);
  await s.tick(0);
  const a = s.audio();
  a.meta(1.2); a.start(); a.finish();
  assert.deepEqual(first.log, []);
  assert.deepEqual(second.log, ['start', 'end']);
});
