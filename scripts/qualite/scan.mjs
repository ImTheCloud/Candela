// Detectors for question problems. Usage: node scripts/qualite/scan.mjs <mode>
// Modes: fragments  continuation  speech  double  noscene  vague
// Each one prints the suspicious questions; a human (or an AI) reads the list and fixes the real ones
// with apply*.mjs. The detectors are keyword heuristics: they find candidates, never prove a defect.
import fs from 'fs';

const mode = process.argv[2];
const root = process.cwd() + '/content';
const questions = [];
for (const b of ['1-samuel', '2-samuel'])
  for (const f of fs.readdirSync(`${root}/${b}/intrebari`)) {
    const j = JSON.parse(fs.readFileSync(`${root}/${b}/intrebari/${f}`, 'utf8'));
    for (const q of j.questions) questions.push({ ...q, book: b, ch: j.ch });
  }
const tail = (t) => t.replace(/^[^:?]*: /, ''); // the question without its scene prefix
const rightOf = (q) => (q.t === 'one' ? [q.a] : q.a || []).map((i) => q.opts[i]);
const show = (q) => `${q.id} [${q.t}] ${q.q}${q.opts ? ' || ' + q.opts.map((o, i) => ((q.t === 'one' ? q.a === i : q.a.includes(i)) ? '*' : '') + o).join(' | ') : ''}`;

const PREP = /^(din|în|la|pe|de|cu|peste|până|după|înainte|nici|și|ca|ori|spre|fără|prin|pentru|când|dacă|care|cum|iar|sub|între|lângă|chiar|numai|doar|tot)\b/i;
const CONT = /\b(acolo|aici|până azi|până în ziua de azi|atunci|apoi|după aceea|de asemenea|la fel|amândoi)\b|^(el|ea|ei|ele|tot|toți|toate)\b/i;
const SPEECH = /\b(zis|spus|întrebat|răspuns|cerut|strigat|poruncit|mărturisit|promis|jurat|zicea|zic|spun|zice|rostit)\b/;

const rules = {
  // a right option of a multiple-choice that is only a piece of a sentence ("în mormântul lui Abner")
  fragments: (q) => q.t === 'multi' && q.a.some((i) => PREP.test(q.opts[i]) && q.opts[i].split(' ').length <= 4),
  // two right options that are the continuation of one another ("au fugit la Ghitaim" + "au locuit acolo până azi")
  continuation: (q) => q.t === 'multi' && q.a.length >= 2 && q.a.some((i) => CONT.test(q.opts[i])),
  // somebody speaks or asks and the stem does not say who/to whom
  speech: (q) => q.t !== 'fill' && q.t !== 'match' && q.t !== 'tf' && SPEECH.test(tail(q.q)) && (tail(q.q).replace(/^\S+\s/, '').match(/\b[A-ZĂÂÎȘȚ][\p{L}-]+/gu) || []).length < 1,
  // two questions in one stem
  double: (q) => q.t !== 'fill' && q.t !== 'match' && q.t !== 'tf' && ((tail(q.q).match(/\?/g) || []).length > 1 || /^(Ce|Cine|Unde|Cum|De ce)\b.*\b(și|,)\s+(ce|cine|unde|cum|de ce|cât|câți|câte|pe cine)\b/i.test(tail(q.q))),
  // no scene in front of the stem
  noscene: (q) => q.t !== 'fill' && q.t !== 'match' && !/^[^:?]*: /.test(q.q),
  // the stem names nobody and uses a definite noun with no antecedent ("capul", "omul", "femeia")
  vague: (q) => q.t !== 'fill' && q.t !== 'match' && !(tail(q.q).replace(/^\S+\s/, '').match(/\b[A-ZĂÂÎȘȚ][\p{L}-]+/gu) || []).length && /\b(omul|femeia|capul|sluga|slujitorii|copilul|împăratul|preotul|cetatea|locul|mâna|casa)\b/.test(tail(q.q)),
};
if (!rules[mode]) {
  console.error('mode: ' + Object.keys(rules).join(' | '));
  process.exit(1);
}
const hits = questions.filter(rules[mode]);
console.log(hits.length + ' candidates');
for (const q of hits) console.log(show(q));
