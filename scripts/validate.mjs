// Checks every question file before a build: shape, ids, references, and that each text to complete
// is copied exactly from the verse. Prints how many questions each chapter has per age and type.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../content/', import.meta.url).pathname;
const BOOKS = { '1-samuel': '1sa', '2-samuel': '2sa' };
const AGES = ['sub12', '12-13', '14-15', '16-17', '18+'];
const TYPES = ['tf', 'one', 'match', 'fill', 'multi'];
const TARGET = 3;

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

function checkQuestion(q, where, text) {
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
      if (q.pairs.some((p) => !Array.isArray(p) || p.length !== 2 || !p[0]?.trim() || !p[1]?.trim())) err(w, 'pereche greșită');
      if (new Set(q.pairs.map((p) => p[0])).size !== q.pairs.length) err(w, 'stânga se repetă');
      if (new Set(q.pairs.map((p) => p[1])).size !== q.pairs.length) err(w, 'dreapta se repetă');
      break;
    case 'fill': {
      const blanks = q.q.split('___').length - 1;
      if (!blanks) { err(w, 'lipsește ___'); break; }
      if (!Array.isArray(q.a) || q.a.length !== blanks) { err(w, `${blanks} spații dar ${q.a?.length} răspunsuri`); break; }
      if (q.a.some((x) => typeof x !== 'string' || !x.trim())) err(w, 'răspuns gol');
      let i = 0;
      const full = flat(q.q.replace(/___/g, () => q.a[i++]));
      const source = flat(cited.join(' '));
      if (cited.length && !source.includes(full)) err(w, `textul completat nu apare exact în ${q.ref}:\n    ${full}`);
      break;
    }
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
    const counts = Object.fromEntries(AGES.map((a) => [a, Object.fromEntries(TYPES.map((t) => [t, 0]))]));
    for (const q of file.questions) {
      const m = /^(\w+)\.(\d+)\.(sub12|12-13|14-15|16-17|18\+)\.(\d+)$/.exec(q.id ?? '');
      if (!m) { err(where, `id greșit "${q.id}"`); continue; }
      if (m[1] !== abbr || Number(m[2]) !== file.ch || m[3] !== q.age) err(where, `id ${q.id} nu se potrivește cu cartea, capitolul sau vârsta`);
      if (seen.has(q.id)) err(where, `id dublat ${q.id}`);
      seen.add(q.id);
      if (!AGES.includes(q.age)) err(where, `vârstă necunoscută ${q.age}`);
      checkQuestion(q, where, text);
      if (counts[q.age]?.[q.t] !== undefined) counts[q.age][q.t]++;
    }
    for (const a of AGES) for (const t of TYPES) if (counts[a][t] < TARGET) warn(`${where}: ${a} are ${counts[a][t]} ${t} (ținta: ${TARGET})`);
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
      checkQuestion(q, where, text);
    }
  }
}
console.log(`\n${errors} ${errors === 1 ? 'eroare' : 'erori'}, ${warnings} ${warnings === 1 ? 'avertisment' : 'avertismente'}`);
process.exit(errors ? 1 : 0);
