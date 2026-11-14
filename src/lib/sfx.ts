/**
 * Short game sounds for the quiz, made with Web Audio (no file to download).
 * Bell and marimba tones built from a few partials, plus soft filtered air,
 * through a small room reverb and a gentle compressor, so they sound round rather than like bare beeps.
 *
 * Measured on iPhone: an <audio> element takes 0.2 to 0.6 s to start a new file (and briefly freezes the page),
 * and a suspended AudioContext takes about a second to wake. So the sounds are rendered once into memory, and
 * one AudioContext is started by the tap that turns the voice on and kept running while the quiz is played:
 * a sound then starts within a few milliseconds of the tap. The voice keeps its own <audio> element, in the
 * "playback" session claimed before the context is made (a context alone would switch the page to "ambient").
 */

import { claimPlaybackSession } from './speech';

type Name = 'right' | 'wrong' | 'next';

const buffers: { [K in Name]?: AudioBuffer } = {};
let preparing: Promise<void> | null = null;
let ctx: AudioContext | null = null;
let sleep: ReturnType<typeof setTimeout> | null = null;

/** Renders the sounds ahead of time (call on quiz mount); safe to call often. */
export function prepareSfx(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (preparing) return preparing;
  const OAC = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OAC) return (preparing = Promise.resolve());
  preparing = (async () => {
    for (const [name, len, draw] of SOUNDS) {
      try {
        const ac: OfflineAudioContext = new OAC(2, Math.ceil(44100 * len), 44100);
        draw(ac, makeBus(ac));
        buffers[name] = await ac.startRendering();
      } catch {
        /* this sound stays silent */
      }
    }
  })();
  return preparing;
}

/** Inside a tap (the voice button, Verifică): the context is made or woken, and stays running for the next sounds. */
export function armSfx(): void {
  if (typeof window === 'undefined') return;
  if (!preparing) void prepareSfx();
  if (sleep) clearTimeout(sleep);
  sleep = null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      claimPlaybackSession();
      ctx = new AC({ latencyHint: 'interactive' });
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {}
}

/** The quiz is over or the voice is off: the context sleeps and gives the phone's audio back, once the last sound is over. */
export function releaseSfx(): void {
  if (!ctx || sleep) return;
  sleep = setTimeout(() => {
    sleep = null;
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }, 2500);
}

function play(name: Name) {
  armSfx();
  const b = buffers[name];
  if (!ctx || !b) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    src.start();
  } catch {}
}

/** dry + a little reverb, glued by a soft compressor */
function makeBus(ac: BaseAudioContext): AudioNode {
  const input = ac.createGain();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const master = ac.createGain();
  master.gain.value = 0.9;

  // a short, airy room made from decaying noise
  const len = Math.floor(ac.sampleRate * 1.1);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const verb = ac.createConvolver();
  verb.buffer = ir;
  const wet = ac.createGain();
  wet.gain.value = 0.22;
  const tone = ac.createBiquadFilter();
  tone.type = 'highshelf';
  tone.frequency.value = 6000;
  tone.gain.value = -6;

  input.connect(tone);
  tone.connect(comp);
  tone.connect(verb).connect(wet).connect(comp);
  comp.connect(master).connect(ac.destination);
  return input;
}

interface Partial { ratio: number; gain: number; decay: number }
/** A struck tone: several sine partials, each with its own fade (higher ones die first); `lowpass` muffles it. */
function strike(ac: BaseAudioContext, out: AudioNode, at: number, freq: number, vol: number, partials: Partial[], o: { lowpass?: number } = {}) {
  let dest: AudioNode = out;
  if (o.lowpass) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    f.Q.value = 0.5;
    f.connect(out);
    dest = f;
  }
  for (const p of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * p.ratio, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol * p.gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + p.decay);
    osc.connect(g).connect(dest);
    osc.start(at);
    osc.stop(at + p.decay + 0.05);
  }
}

/** Soft air: noise through a band filter sweeping from one frequency to another. */
function air(ac: BaseAudioContext, out: AudioNode, at: number, len: number, vol: number, from: number, to: number, q = 1.4, peakAt = 0.3) {
  const n = Math.floor(ac.sampleRate * len);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = q;
  band.frequency.setValueAtTime(from, at);
  band.frequency.exponentialRampToValueAtTime(to, at + len);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + len * peakAt);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(at + len + 0.02);
}

// glassy bell (celesta-like): clean fundamental, a soft octave, a shimmering inharmonic top
const BELL: Partial[] = [
  { ratio: 1, gain: 1, decay: 0.9 },
  { ratio: 2, gain: 0.35, decay: 0.5 },
  { ratio: 3.01, gain: 0.12, decay: 0.28 },
  { ratio: 5.43, gain: 0.06, decay: 0.12 },
];
// wooden marimba: warm body, the typical 4th partial knock, very short top
const MARIMBA: Partial[] = [
  { ratio: 1, gain: 1, decay: 0.42 },
  { ratio: 3.98, gain: 0.22, decay: 0.09 },
  { ratio: 9.9, gain: 0.05, decay: 0.03 },
];

type Draw = (ac: BaseAudioContext, out: AudioNode) => void;
const T = 0.01;

/** Pressing "Verifică": a soft double click, like a switch. */
const drawCheck: Draw = (ac, out) => {
  air(ac, out, T, 0.025, 0.12, 3000, 2500, 2, 0.1);
  air(ac, out, T + 0.045, 0.025, 0.09, 2200, 1800, 2, 0.1);
};
/** the verdict comes right after the click, not on top of it */
const V = T + 0.11;

const SOUNDS: [Name, number, Draw][] = [
  // the click and the verdict are one file: one play() on the tap, exact timing between them
  ['right', 2.3, (ac, out) => {
    drawCheck(ac, out);
    // a golden arpeggio of bells, C E G C
    [1046.5, 1318.51, 1567.98, 2093].forEach((f, k) => strike(ac, out, V + k * 0.055, f, 0.2, BELL));
  }],
  ['wrong', 1.9, (ac, out) => {
    drawCheck(ac, out);
    // two low, muffled wooden notes falling gently, disappointed but never harsh
    strike(ac, out, V, 311.13, 0.32, MARIMBA, { lowpass: 1400 }); // D#4
    strike(ac, out, V + 0.14, 233.08, 0.36, MARIMBA, { lowpass: 1100 }); // A#3
  }],
  // next question: a long soft whoosh
  ['next', 1.6, (ac, out) => air(ac, out, T, 0.38, 0.1, 400, 5000, 1, 0.55)],
];

/** "Verifică" pressed: the click, then the verdict. */
export function playVerdict(right: boolean) {
  play(right ? 'right' : 'wrong');
}

/** Next question: a long soft whoosh. */
export function playNext() {
  play('next');
}
