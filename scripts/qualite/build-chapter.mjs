// Writes content/{book}/intrebari/chNN.json from a chapter written in the short form below (see docs/fonctionnement.md).
//
//   scene: La Țiclag, când David află de moartea lui Saul
//   ## sub12                                      (then 10 tf, 10 one, 1 match, 3 multi, in any order)
//   tf + 1:1 | David s-a întors la Țiclag.         (+ true, - false)
//   one 1:2 | Cine a venit din tabăra lui Saul? | *un tânăr amalecit | un preot | un frate al lui David
//   multi 1:11 | Ce au făcut David și oamenii lui? | *au plâns | *au postit | au cântat      (no * at all: none is right)
//   match 1:1-27 | Asociază fiecare persoană cu ce a făcut.
//   = Saul | s-a sprijinit în suliță | 1:6                 (five lines: left | right | verse)
//
// The right answer is marked with *. Options are shuffled (the same way each time, from the id), so the letter of the
// right answer does not depend on the order written; for single answers it goes to a, b and c in turn. Ids: book.chapter.age.301 and up, in the order written.
import fs from 'fs';

const [book, chArg, src] = process.argv.slice(2);
if (!book || !chArg || !src) { console.error('node scripts/qualite/build-chapter.mjs 2-samuel 1 sursa.txt'); process.exit(1); }
const ABBR = { '1-samuel': '1sa', '2-samuel': '2sa' }[book];
const ch = Number(chArg);
const lines = fs.readFileSync(src, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'));

function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507), h = Math.imul(h ^ (h >>> 13), 3266489909), (h ^= h >>> 16) >>> 0) / 4294967296);
}
function shuffled(opts, id) {
  const rnd = seeded(id);
  const idx = opts.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.map((i) => opts[i]);
}
const fix = (s) => s.replace(/\s+/g, ' ').trim();

let scene = '';
let age = '';
const n = {};
const slots = {};
const questions = [];
let match = null;
for (const line of lines) {
  if (line.startsWith('scene:')) { scene = fix(line.slice(6)); continue; }
  if (line.startsWith('## ')) { age = line.slice(3).trim(); continue; }
  if (line.startsWith('= ')) {
    const [l, r, ref] = line.slice(2).split('|').map(fix);
    if (!match || !ref) throw new Error(`pereche fără asociere sau fără verset: ${line}`);
    match.pairs.push([l, r]);
    match.refs.push(ref);
    continue;
  }
  const m = /^(tf [+-]|one|multi|match) (\S+) \| (.*)$/.exec(line);
  if (!m) throw new Error(`rând necunoscut: ${line}`);
  if (!age) throw new Error('lipsește ## vârsta');
  n[age] = (n[age] ?? 300) + 1;
  const id = `${ABBR}.${ch}.${age}.${n[age]}`;
  const [kind, ref, rest] = [m[1], m[2], m[3]];
  const parts = rest.split('|').map(fix);
  if (kind.startsWith('tf')) { questions.push({ id, age, t: 'tf', ref, q: parts[0], a: kind.endsWith('+') }); continue; }
  if (kind === 'match') { match = { id, age, t: 'match', ref, q: parts[0], pairs: [], refs: [] }; questions.push(match); continue; }
  const [q, ...raw] = parts;
  let opts = shuffled(raw.map((o) => ({ text: o.replace(/^\*/, '').trim(), right: o.startsWith('*') })), id);
  if (kind === 'one') {
    // the right answer goes to a, b and c in turn (in a mixed order), so no letter is the usual one
    slots[age] ??= shuffled([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2], `${ABBR}.${ch}.${age}`);
    const at = slots[age].shift() ?? 0;
    const wrong = opts.filter((o) => !o.right);
    opts = [...wrong];
    opts.splice(at, 0, raw.map((o) => ({ text: o.replace(/^\*/, '').trim(), right: o.startsWith('*') })).find((o) => o.right));
  }
  const right = opts.map((o, i) => (o.right ? i : -1)).filter((i) => i >= 0);
  if (kind === 'one' && right.length !== 1) throw new Error(`o singură variantă corectă: ${line}`);
  questions.push({ id, age, t: kind, ref, q, opts: opts.map((o) => o.text), a: kind === 'one' ? right[0] : right });
}

const ORDER = ['tf', 'one', 'match', 'multi'];
const AGES = ['sub12', '12-13', '14-15', '16-17', '18+'];
questions.sort((a, b) => AGES.indexOf(a.age) - AGES.indexOf(b.age) || ORDER.indexOf(a.t) - ORDER.indexOf(b.t));
const out = `content/${book}/intrebari/ch${String(ch).padStart(2, '0')}.json`;
fs.writeFileSync(out, JSON.stringify({ ch, scene, reviewed: false, questions }, null, 1) + '\n');
console.log(out, questions.length, 'întrebări');
