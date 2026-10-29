// Checks every question file before a build: shape, ids, references, and that each text to complete
// is copied exactly from the verse. Prints how many questions each chapter has per age and type.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../content/', import.meta.url).pathname;
const BOOKS = { '1-samuel': '1sa', '2-samuel': '2sa' };
const AGES = ['sub12', '12-13', '14-15', '16-17', '18+'];
const TYPES = ['tf', 'one', 'match', 'fill', 'multi'];
// A chapter test has the shape of the final exam, for every age group: 10 true/false, 10 single answer,
// one matching of 5 pairs, 3 multiple answer (none, one or several right). No text to complete in chapters.
const TARGET = { tf: 10, one: 10, match: 1, fill: 0, multi: 3 };
const ADULT = ['14-15', '16-17', '18+'];

let errors = 0;
let warnings = 0;
const err = (where, msg) => { errors++; console.error(`✗ ${where}: ${msg}`); };
const warn = (msg) => { warnings++; console.warn(`! ${msg}`); };

function parseRef(ref) {
  const out = [];
  let ch = 0;
  for (const part of ref.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(?:(\d+):)?(\d+)(?:-(?:(\d+):)?(\d+))?$/);
    if (!m) throw new Error(`referință greșită "${ref}"`);
    if (m[1]) ch = Number(m[1]);
    if (!ch) throw new Error(`referință fără capitol "${ref}"`);
    const from = Number(m[2]);
    const toCh = m[3] ? Number(m[3]) : ch;
    const to = m[4] ? Number(m[4]) : from;
    out.push({ ch, from, toCh, to });
    ch = toCh;
  }
  return out;
}

function versesOf(ref, text) {
  const out = [];
  for (const r of parseRef(ref)) {
    for (let c = r.ch; c <= r.toCh; c++) {
      const verses = text[String(c)];
      if (!verses) throw new Error(`capitolul ${c} nu există`);
      const first = c === r.ch ? r.from : 1;
      const last = c === r.toCh ? r.to : verses.length;
      if (first > last) throw new Error(`interval invers în "${ref}"`);
      for (let v = first; v <= last; v++) {
        if (!verses[v - 1]) throw new Error(`versetul ${c}:${v} nu există`);
        out.push(verses[v - 1]);
      }
    }
  }
  return out;
}

const flat = (s) => s.replace(/[„“”"«»]/g, '"').replace(/[‘’']/g, "'").replace(/\s+/g, ' ').trim();

function checkQuestion(q, where, text, strictFill = true) {
  const w = `${where} ${q.id ?? '(fără id)'}`;
  if (!TYPES.includes(q.t)) return err(w, `tip necunoscut "${q.t}"`);
  if (typeof q.q !== 'string' || q.q.trim().length < 8) err(w, 'textul întrebării lipsește');
  if (q.q && /\s{2,}|^\s|\s$/.test(q.q)) err(w, 'spații în plus în întrebare');
  if (q.ctx !== undefined && (typeof q.ctx !== 'string' || !q.ctx.trim())) err(w, 'context gol');
  if (q.explain !== undefined && (typeof q.explain !== 'string' || !q.explain.trim())) err(w, 'explicație goală');
  let cited = [];
  try { cited = versesOf(q.ref, text); } catch (e) { err(w, e.message); }
  const opts3 = () => {
    if (!Array.isArray(q.opts) || q.opts.length !== 3) return err(w, 'trebuie exact 3 variante');
    if (new Set(q.opts.map((o) => o.toLowerCase())).size !== 3) err(w, 'variante identice');
    if (q.opts.some((o) => typeof o !== 'string' || !o.trim())) err(w, 'variantă goală');
  };
  switch (q.t) {
    case 'tf':
      if (typeof q.a !== 'boolean') err(w, 'a trebuie să fie true sau false');
      break;
    case 'one':
      opts3();
      if (![0, 1, 2].includes(q.a)) err(w, 'a trebuie să fie 0, 1 sau 2');
      break;
    case 'multi':
      opts3();
      if (!Array.isArray(q.a) || q.a.some((x) => ![0, 1, 2].includes(x)) || new Set(q.a).size !== q.a.length) err(w, 'a trebuie să fie o listă de indici diferiți (0–2), poate fi goală');
      break;
    case 'match':
      if (!Array.isArray(q.pairs) || q.pairs.length < 3 || q.pairs.length > 5) { err(w, 'între 3 și 5 perechi'); break; }
      // chapter questions: five pairs, and never "the start of a sentence with its end" (not asked at the exam)
      if (strictFill && q.pairs.length !== 5) warn(`${w}: la asociere trebuie 5 perechi (are ${q.pairs.length})`);
      if (strictFill && /începutul|sfârșitul|continuarea|completează/i.test(q.q)) warn(`${w}: asocierea nu trebuie să fie de completat fraze`);
      if (q.pairs.some((p) => !Array.isArray(p) || p.length !== 2 || !p[0]?.trim() || !p[1]?.trim())) err(w, 'pereche greșită');
      if (new Set(q.pairs.map((p) => p[0])).size !== q.pairs.length) err(w, 'stânga se repetă');
      if (new Set(q.pairs.map((p) => p[1])).size !== q.pairs.length) err(w, 'dreapta se repetă');
      if (strictFill) {
        // each pair has its own verse: the mock exam takes one pair from each of five chapters
        if (!Array.isArray(q.refs) || q.refs.length !== q.pairs.length) err(w, 'refs: câte o referință pentru fiecare pereche');
        else for (const r of q.refs) { try { versesOf(r, text); } catch (e) { err(w, `refs ${r}: ${e.message}`); } }
      }
      break;
    case 'fill': {
      const blanks = q.q.split('___').length - 1;
      if (!blanks) { err(w, 'lipsește ___'); break; }
      if (!Array.isArray(q.a) || q.a.length !== blanks) { err(w, `${blanks} spații dar ${q.a?.length} răspunsuri`); break; }
      // chapter questions: always one missing word (past exams keep the paper as printed)
      if (strictFill && (blanks !== 1 || /\s/.test(q.a[0].trim()))) err(w, 'la completare lipsește un singur cuvânt');
      if (q.a.some((x) => typeof x !== 'string' || !x.trim())) err(w, 'răspuns gol');
      let i = 0;
      const full = flat(q.q.replace(/___/g, () => q.a[i++]));
      const source = flat(cited.join(' '));
      if (cited.length && !source.includes(full)) {
        // past exams keep the wording of the paper, which sometimes differs a little from the verse
        const msg = `textul completat nu apare exact în ${q.ref}:\n    ${full}`;
        if (strictFill) err(w, msg);
        else warn(`${w}: ${msg}`);
      }
      break;
    }
  }
}

/** Rules of the rewritten chapters that a shape check can see (the rest is in docs/qualite-questions.md). */
function checkStyle(q, w, scene) {
  if (scene && q.q.startsWith(scene)) err(w, 'scena se repetă în întrebare (e deja în fișier)');
  if (/^[^:?„]{12,}: (?!„)/.test(q.q)) warn(`${w}: pare să înceapă cu o scenă („…: ”)`);
  if ((q.q.match(/\?/g) ?? []).length > 1) err(w, 'două semne de întrebare: o singură întrebare');
  if ((q.t === 'one' || q.t === 'multi') && /\?$/.test(q.q) === false) err(w, 'enunțul trebuie să fie o întrebare (se termină cu „?”)');
  if (q.t === 'tf' && /\?$/.test(q.q)) err(w, 'adevărat/fals: o afirmație, nu o întrebare');
  if (q.opts && ADULT.includes(q.age)) {
    // the right answer may not stand out by its length
    const len = q.opts.map((o) => o.length);
    const right = q.t === 'one' ? [q.a] : q.a;
    if (right.length === 1) {
      const r = len[right[0]];
      const others = len.filter((_, i) => i !== right[0]);
      if (others.every((l) => r > l + 10) || others.every((l) => r < l - 10)) warn(`${w}: răspunsul corect se vede după lungime`);
    }
  }
}

/** Per chapter and age: true and false both well represented, right answers spread over a, b, c. */
function checkBalance(file, where) {
  for (const a of AGES) {
    const qs = file.questions.filter((q) => q.age === a);
    const tf = qs.filter((q) => q.t === 'tf');
    const yes = tf.filter((q) => q.a).length;
    if (yes < 4 || yes > 6) warn(`${where} ${a}: ${yes} adevărate din ${tf.length} (între 4 și 6)`);
    const pos = [0, 0, 0];
    for (const q of qs) if (q.t === 'one') pos[q.a]++;
    if (Math.min(...pos) < 2) warn(`${where} ${a}: răspunsurile corecte la alegere unică sunt prea des pe aceeași literă (${pos.join('/')})`);
  }
}

for (const [slug, abbr] of Object.entries(BOOKS)) {
  const dir = join(ROOT, slug, 'intrebari');
  if (!existsSync(dir)) continue;
  const text = JSON.parse(readFileSync(join(ROOT, slug, 'text-cornilescu.json'), 'utf8'));
  const seen = new Set();
  const table = [];
  for (const name of readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f)).sort()) {
    const where = `${slug}/${name}`;
    let file;
    try { file = JSON.parse(readFileSync(join(dir, name), 'utf8')); } catch (e) { err(where, `JSON invalid: ${e.message}`); continue; }
    if (file.ch !== Number(name.slice(2, -5))) err(where, 'ch nu se potrivește cu numele fișierului');
    if (typeof file.reviewed !== 'boolean') err(where, 'reviewed lipsește');
    if (!Array.isArray(file.questions)) { err(where, 'questions lipsește'); continue; }
    if ((typeof file.scene !== 'string' || !file.scene.trim())) err(where, 'scene lipsește');
    const counts = Object.fromEntries(AGES.map((a) => [a, Object.fromEntries(TYPES.map((t) => [t, 0]))]));
    for (const q of file.questions) {
      const m = /^(\w+)\.(\d+)\.(sub12|12-13|14-15|16-17|18\+)\.(\d+)$/.exec(q.id ?? '');
      if (!m) { err(where, `id greșit "${q.id}"`); continue; }
      if (m[1] !== abbr || Number(m[2]) !== file.ch || m[3] !== q.age) err(where, `id ${q.id} nu se potrivește cu cartea, capitolul sau vârsta`);
      if (seen.has(q.id)) err(where, `id dublat ${q.id}`);
      seen.add(q.id);
      if (!AGES.includes(q.age)) err(where, `vârstă necunoscută ${q.age}`);
      checkQuestion(q, where, text);
      checkStyle(q, `${where} ${q.id}`, file.scene);
      if (counts[q.age]?.[q.t] !== undefined) counts[q.age][q.t]++;
    }
    for (const a of AGES) for (const t of TYPES) if (counts[a][t] !== TARGET[t]) err(where, `${a} are ${counts[a][t]} ${t} (ținta: ${TARGET[t]})`);
    checkBalance(file, where);
    table.push(`${name.padEnd(9)} ${AGES.map((a) => `${a}:${Object.values(counts[a]).reduce((x, y) => x + y, 0)}`.padEnd(9)).join(' ')} ${file.reviewed ? 'verificat' : 'neverificat'}`);
  }
  if (table.length) console.log(`\n${slug}\n${table.join('\n')}`);
}

for (const slug of Object.keys(BOOKS)) {
  const dir = join(ROOT, slug, 'examene');
  if (!existsSync(dir)) continue;
  const text = JSON.parse(readFileSync(join(ROOT, slug, 'text-cornilescu.json'), 'utf8'));
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const where = `${slug}/examene/${name}`;
    const exam = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    if (!exam.id || !exam.title || !Array.isArray(exam.questions)) { err(where, 'id, title și questions sunt obligatorii'); continue; }
    const ids = new Set();
    for (const q of exam.questions) {
      if (ids.has(q.id)) err(where, `id dublat ${q.id}`);
      ids.add(q.id);
      checkQuestion(q, where, text, false);
    }
  }
}
// Guides: every journey step is a known place and every reference exists.
for (const slug of Object.keys(BOOKS)) {
  const path = join(ROOT, slug, 'carte.json');
  if (!existsSync(path)) continue;
  const where = `${slug}/carte.json`;
  const text = JSON.parse(readFileSync(join(ROOT, slug, 'text-cornilescu.json'), 'utf8'));
  const guide = JSON.parse(readFileSync(path, 'utf8'));
  const places = new Set(guide.locuri.map((l) => l.n));
  for (const l of guide.locuri) if (typeof l.lat !== 'number' || typeof l.lng !== 'number') err(where, `${l.n}: coordonate lipsă`);
  for (const t of guide.trasee) {
    for (const st of t.s) {
      if (!places.has(st.p)) err(where, `${t.n}: locul „${st.p}" nu este în locuri`);
      try { versesOf(st.v, text); } catch (e) { err(where, `${t.n} ${st.v}: ${e.message}`); }
      if (!text[String(st.c)]) err(where, `${t.n}: capitolul ${st.c} nu există`);
    }
  }
  for (const f of guide.frize) for (const [, ch] of f.d) if (!text[String(ch)]) err(where, `${f.t}: capitolul ${ch} nu există`);
}

console.log(`\n${errors} ${errors === 1 ? 'eroare' : 'erori'}, ${warnings} ${warnings === 1 ? 'avertisment' : 'avertismente'}`);
process.exit(errors ? 1 : 0);
