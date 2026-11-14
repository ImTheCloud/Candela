/**
 * Short game sounds for the quiz, made with Web Audio (no file to download).
 * Bell and marimba tones built from a few partials, plus soft filtered air,
 * through a small room reverb and a gentle compressor, so they sound round rather than like bare beeps.
 *
 * They are rendered once, offline, into small WAV files played on the voice's own <audio> element (they are
 * heard only by someone listening to the voice). No live AudioContext is kept: on iPhone a running one switches
 * the page to an "ambient" audio session (the voice could go silent), and waking a suspended one takes about a
 * second. A second <audio> element is not used either: switching players took about a second on iPhone too.
 */

import { playCue } from './speech';

type Name = 'check' | 'right' | 'wrong' | 'next';

const urls: { [K in Name]?: string } = {};
let preparing: Promise<void> | null = null;

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
        const buf = await ac.startRendering();
        const url = URL.createObjectURL(new Blob([wav(buf)], { type: 'audio/wav' }));
        urls[name] = url;
      } catch {
        /* this sound stays silent */
      }
    }
  })();
  return preparing;
}

/** How much of a sound the next reading waits for: the whoosh is heard before the question it announces */
const HOLD: { [K in Name]?: number } = { next: 380 };

function play(name: Name) {
  if (typeof window === 'undefined') return;
  if (!preparing) void prepareSfx();
  const url = urls[name];
  if (url) playCue(url, HOLD[name]);
}

/** 16-bit PCM WAV from a rendered buffer */
function wav(b: AudioBuffer): ArrayBuffer {
  const ch = b.numberOfChannels, n = b.length, rate = b.sampleRate;
  const out = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(out);
  const str = (o: number, t: string) => { for (let k = 0; k < t.length; k++) v.setUint8(o + k, t.charCodeAt(k)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => b.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const x = Math.max(-1, Math.min(1, data[c][i]));
      v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true);
      o += 2;
    }
  }
  return out;
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
  ['check', 1.2, drawCheck],
  // next question: a long soft whoosh
  ['next', 1.6, (ac, out) => air(ac, out, T, 0.38, 0.1, 400, 5000, 1, 0.55)],
];

/** "Verifică" pressed: the click, then the verdict. */
export function playVerdict(right: boolean) {
  play(right ? 'right' : 'wrong');
}

export function playCheck() {
  play('check');
}

export function playNext() {
  play('next');
}
