/**
 * The quiz's sounds, made with Web Audio (no file to download): bell, marimba and soft filtered air tones,
 * through a small room reverb and a gentle compressor, so they sound round rather than like bare beeps.
 * Every button of the quiz has one (EVENTS below says which), with or without the voice.
 *
 * Measured on iPhone: an <audio> element takes 0.2 to 0.6 s to start a new file (and briefly freezes the page),
 * and a suspended AudioContext about a second to wake. So the sounds are rendered once into memory and played by
 * one AudioContext, woken by the first touch in the quiz and kept running while it is open: a sound starts within
 * a few milliseconds of the tap. Without the voice the page's audio stays "ambient" (it mixes with music and
 * follows the silent switch); the voice claims "playback" for itself when it is turned on.
 */

/** The palette: every sound the quiz can make */
export type Sound =
  | 'tic' | 'bois' | 'bulle' | 'goutte' | 'clochette' | 'interrupteur'
  | 'arpege' | 'descente' | 'souffle' | 'carillon' | 'page' | 'pouf';

/** What happens in the quiz, and the sound it makes */
export const EVENTS = {
  select: 'bois', // an answer is chosen (Adevărat/Fals, A/B/C, a box, a pair)
  check: 'interrupteur', // Verifică
  right: 'arpege', // the answer was right
  wrong: 'descente', // the answer was wrong
  next: 'souffle', // Mai departe
  finish: 'carillon', // Vezi rezultatul
  verse: 'page', // Versetul
  close: 'pouf', // a window is closed (×)
  voice: 'bulle', // the voice button
  speed: 'goutte', // a speed of the voice
  report: 'tic', // Semnalează
  back: 'tic', // the back arrow (asks whether to leave)
  stay: 'pouf', // Rămân
  exit: 'pouf', // Ieși
  again: 'clochette', // Reia testul
} satisfies Record<string, Sound>;
export type SfxEvent = keyof typeof EVENTS;

const buffers: { [K in Sound]?: AudioBuffer } = {};
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
    for (const [name, [len, draw]] of Object.entries(SOUNDS) as [Sound, [number, Draw]][]) {
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

/** Inside a touch: the context is made or woken, and stays running for the next sounds. */
export function armSfx(): void {
  if (typeof window === 'undefined') return;
  if (!preparing) void prepareSfx();
  if (sleep) clearTimeout(sleep);
  sleep = null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC({ latencyHint: 'interactive' });
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {}
}

/** The quiz is closed: the context sleeps and gives the phone's audio back, once the last sound is over. */
export function releaseSfx(): void {
  if (!ctx) return;
  if (sleep) clearTimeout(sleep);
  // a new quiz (Reia testul) wakes it again with its first touch, which cancels this
  sleep = setTimeout(() => {
    sleep = null;
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }, 2500);
}

function play(name: Sound, delay = 0) {
  armSfx();
  const b = buffers[name];
  if (!ctx || !b) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    src.start(delay ? ctx.currentTime + delay : 0);
  } catch {}
}

/** The sound of something that happens in the quiz. */
export function sfx(event: SfxEvent): void {
  play(EVENTS[event]);
}

/** "Verifică" pressed: its click, then the verdict right after (not on top of it). */
export function playVerdict(right: boolean): void {
  play(EVENTS.check);
  play(right ? EVENTS.right : EVENTS.wrong, 0.11);
}

/** Next question: a long soft whoosh. */
export function playNext(): void {
  sfx('next');
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

/** A tone gliding from one pitch to another (bubbles, drops, soft thumps). */
function glide(ac: BaseAudioContext, out: AudioNode, at: number, len: number, vol: number, from: number, to: number, type: OscillatorType = 'sine') {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + len);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

type Draw = (ac: BaseAudioContext, out: AudioNode) => void;
const T = 0.01;

/** Each sound: its length with the reverb tail (s), and how it is made */
const SOUNDS: Record<Sound, [number, Draw]> = {
  // a soft tick, like a fingertip on wood
  tic: [0.7, (ac, out) => {
    air(ac, out, T, 0.018, 0.16, 3200, 2600, 2.5, 0.1);
    strike(ac, out, T, 1760, 0.08, MARIMBA, { lowpass: 3000 });
  }],
  // one warm marimba note
  bois: [0.9, (ac, out) => strike(ac, out, T, 784, 0.3, MARIMBA)],
  // a round bubble rising
  bulle: [0.7, (ac, out) => glide(ac, out, T, 0.09, 0.3, 380, 950)],
  // a water drop falling
  goutte: [0.7, (ac, out) => glide(ac, out, T, 0.11, 0.28, 1500, 520)],
  // one small glass bell
  clochette: [1.4, (ac, out) => strike(ac, out, T, 1318.51, 0.22, BELL)],
  // a soft double click, like a switch
  interrupteur: [0.7, (ac, out) => {
    air(ac, out, T, 0.025, 0.12, 3000, 2500, 2, 0.1);
    air(ac, out, T + 0.045, 0.025, 0.09, 2200, 1800, 2, 0.1);
  }],
  // a golden arpeggio of bells, C E G C
  arpege: [2.1, (ac, out) => {
    [1046.5, 1318.51, 1567.98, 2093].forEach((f, k) => strike(ac, out, T + k * 0.055, f, 0.2, BELL));
  }],
  // two low, muffled wooden notes falling gently, disappointed but never harsh
  descente: [1.7, (ac, out) => {
    strike(ac, out, T, 311.13, 0.32, MARIMBA, { lowpass: 1400 }); // D#4
    strike(ac, out, T + 0.14, 233.08, 0.36, MARIMBA, { lowpass: 1100 }); // A#3
  }],
  // a long soft whoosh
  souffle: [1.6, (ac, out) => air(ac, out, T, 0.38, 0.1, 400, 5000, 1, 0.55)],
  // a little victory chime: rising bells ending on a held chord
  carillon: [2.8, (ac, out) => {
    [783.99, 1046.5, 1318.51, 1567.98].forEach((f, k) => strike(ac, out, T + k * 0.09, f, 0.18, BELL));
    [1046.5, 1318.51, 2093].forEach((f) => strike(ac, out, T + 0.42, f, 0.14, BELL));
  }],
  // a page turned: two quick paper rustles
  page: [0.9, (ac, out) => {
    air(ac, out, T, 0.12, 0.13, 900, 3500, 0.9, 0.4);
    air(ac, out, T + 0.1, 0.09, 0.08, 2500, 5000, 0.9, 0.3);
  }],
  // a soft felt thump
  pouf: [0.7, (ac, out) => {
    glide(ac, out, T, 0.14, 0.45, 190, 85);
    air(ac, out, T, 0.05, 0.05, 600, 300, 1, 0.2);
  }],
};
