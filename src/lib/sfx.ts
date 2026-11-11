/**
 * Short game sounds for the quiz, made on the fly with Web Audio (no file to download).
 * Bell and marimba tones built from a few partials, plus soft filtered air,
 * through a small room reverb and a gentle compressor, so they sound round rather than like bare beeps.
 */

let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;

function audio(): { ac: AudioContext; out: AudioNode } | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      bus = makeBus(ctx);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return { ac: ctx, out: bus! };
  } catch {
    return null;
  }
}

/** dry + a little reverb, glued by a soft compressor */
function makeBus(ac: AudioContext): AudioNode {
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
function strike(at: number, freq: number, vol: number, partials: Partial[], o: { lowpass?: number } = {}) {
  const a = audio();
  if (!a) return;
  const { ac, out } = a;
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
function air(at: number, len: number, vol: number, from: number, to: number, q = 1.4, peakAt = 0.3) {
  const a = audio();
  if (!a) return;
  const { ac, out } = a;
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

const now = () => (ctx ? ctx.currentTime : 0) + 0.015;

/** Right answer: a golden arpeggio of bells, C E G C. */
export function playRight() {
  if (!audio()) return;
  const t = now();
  [1046.5, 1318.51, 1567.98, 2093].forEach((f, k) => strike(t + k * 0.055, f, 0.2, BELL));
}

/** Wrong answer: two low, muffled wooden notes falling gently, disappointed but never harsh. */
export function playWrong() {
  if (!audio()) return;
  const t = now();
  strike(t, 311.13, 0.32, MARIMBA, { lowpass: 1400 }); // D#4
  strike(t + 0.14, 233.08, 0.36, MARIMBA, { lowpass: 1100 }); // A#3
}

/** Pressing "Verifică": a soft double click, like a switch. */
export function playCheck() {
  if (!audio()) return;
  const t = now();
  air(t, 0.025, 0.12, 3000, 2500, 2, 0.1);
  air(t + 0.045, 0.025, 0.09, 2200, 1800, 2, 0.1);
}

/** Next question: a long soft whoosh. */
export function playNext() {
  if (!audio()) return;
  air(now(), 0.38, 0.1, 400, 5000, 1, 0.55);
}
