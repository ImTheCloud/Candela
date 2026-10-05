const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEXT = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', '1-samuel', 'text-cornilescu.json'), 'utf8'));
const MAX_PER_LEVEL = 20;

function norm(s) {
  return s.normalize('NFD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function parseRef(ref, ch) {
  const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) return null;
  return [+m[1], +m[2], +(m[3] || m[2])];
}

function check(ch) {
  const p = path.join(ROOT, 'content', '1-samuel', 'intrebari', `ch${String(ch).padStart(2, '0')}.json`);
  const errs = [], warns = [];
  let d;
  try {
    d = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return { errs: [`cannot load: ${e.message}`], warns, stats: {} };
  }
  const nv = (TEXT[String(ch)] || []).length;
  const seen = {};
  const stats = {};
  if (d.ch !== ch) errs.push('ch field mismatch');

  for (const mode of ['easy', 'hard']) {
    const qs = d[mode];
    if (!Array.isArray(qs)) { errs.push(`${mode} missing`); continue; }
    const types = {};
    qs.forEach((q, i) => {
      const tag = `${mode}[${i}]`;
      const t = q.t;
      types[t] = (types[t] || 0) + 1;
      const ref = q.ref || '';
      const r = parseRef(ref, ch);
      if (!r) { errs.push(`${tag} bad ref '${ref}'`); return; }
      const [c, a, b] = r;
      if (c !== ch || a < 1 || b > nv || b < a) {
        errs.push(`${tag} ref out of range ${ref} (chapter has ${nv} verses)`);
      }
      const key = norm(q.q + ' ' + JSON.stringify(q.pairs || q.opts || '')).join(' ');
      if (seen[key]) errs.push(`${tag} duplicate of ${seen[key]}`);
      seen[key] = tag;
      if (!q.q) errs.push(`${tag} empty q`);

      if (t === 'tf') {
        if (typeof q.a !== 'boolean') errs.push(`${tag} tf needs bool a`);
      } else if (t === 'one') {
        const o = q.opts || [];
        if (o.length !== 3 || typeof q.a !== 'number' || q.a < 0 || q.a >= o.length) {
          errs.push(`${tag} one: exactly 3 opts and valid index a`);
        }
        if (new Set(o).size !== o.length) errs.push(`${tag} duplicate opts`);
      } else if (t === 'multi') {
        const o = q.opts || [];
        const a_ = q.a;
        if (o.length !== 3 || !Array.isArray(a_) || a_.some(x => typeof x !== 'number' || x < 0 || x >= o.length) || new Set(a_).size !== a_.length) {
          errs.push(`${tag} multi: exactly 3 opts and list a of valid indices`);
        }
        if (new Set(o).size !== o.length) errs.push(`${tag} duplicate opts`);
      } else if (t === 'match') {
        const pairs = q.pairs || [];
        if (pairs.length !== 3 || pairs.some(x => !Array.isArray(x) || x.length !== 2)) {
          errs.push(`${tag} match: exactly 3 pairs [left, right]`);
        }
        if (new Set(pairs.map(x => x[0])).size !== pairs.length || new Set(pairs.map(x => x[1])).size !== pairs.length) {
          errs.push(`${tag} match: lefts/rights must be unique`);
        }
      } else if (t === 'fill') {
        const ans = q.a;
        const txt = q.q || '';
        if (!Array.isArray(ans) || !ans.length) { errs.push(`${tag} fill needs list a`); return; }
        const blanks = (txt.match(/___/g) || []).length;
        if (blanks !== ans.length) { errs.push(`${tag} fill: blanks ___ count != answers`); return; }
        let full = txt;
        for (const w of ans) full = full.replace('___', w);
        const verses = (r && c === ch && b <= nv) ? TEXT[String(ch)].slice(a - 1, b).join(' ') : '';
        const fn = norm(full).join(' ');
        const vn = norm(verses).join(' ');
        if (!vn.includes(fn)) {
          errs.push(`${tag} fill text not found verbatim in ${ref}: '${full}'`);
        }
      } else {
        errs.push(`${tag} unknown type ${t}`);
      }
    });

    if (qs.length > MAX_PER_LEVEL) warns.push(`${mode}: ${qs.length} questions, keep at most ${MAX_PER_LEVEL}`);
    stats[mode] = { count: qs.length, types };
    for (const t of ['tf', 'one', 'multi', 'match', 'fill']) {
      if ((types[t] || 0) < 2) warns.push(`${mode}: only ${types[t] || 0} of type ${t}`);
    }
  }

  return { errs, warns, stats };
}

let bad = 0;
const chs = process.argv.slice(2).map(Number).filter(Boolean).length
  ? process.argv.slice(2).map(Number).filter(Boolean)
  : Array.from({ length: 31 }, (_, i) => i + 1);

for (const ch of chs) {
  const { errs, warns, stats } = check(ch);
  const stStr = Object.entries(stats).map(([m, s]) => `${m} ${s.count} ${JSON.stringify(s.types)}`).join(', ');
  if (errs.length || warns.length) {
    console.log(`== ch${ch}: ${stStr}`);
    for (const x of errs) console.log('  ERROR', x);
    for (const x of warns) console.log('  warn ', x);
  }
  bad += errs.length;
}

if (bad > 0) {
  console.error(`Validation failed with ${bad} error(s).`);
  process.exit(1);
} else {
  console.log(`All ${chs.length} chapters validated successfully!`);
}
