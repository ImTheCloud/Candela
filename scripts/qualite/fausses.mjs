// Replaces the wrong options of some questions in a chapter source, keeping the question and its right answers
// (so the id and the meaning stay). Usage: node scripts/qualite/fausses.mjs <book> <ch> <changes.json>
// changes.json: { "2sa.5.18+.311": ["new wrong option", "another one"], … } (as many as the question has wrong options)
import fs from 'fs';

const [book, ch, changes] = process.argv.slice(2);
const src = `content/${book}/sursa/ch${String(ch).padStart(2, '0')}.txt`;
const patch = JSON.parse(fs.readFileSync(changes, 'utf8'));
const lines = fs.readFileSync(src, 'utf8').split('\n');
let age = '';
const n = {};
let done = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('## ')) { age = line.slice(3).trim(); continue; }
  const m = /^(tf [+-]|one|multi|match) /.exec(line);
  if (!m) continue;
  n[age] = (n[age] ?? 300) + 1;
  const id = Object.keys(patch).find((k) => k.endsWith(`.${age}.${n[age]}`));
  if (!id) continue;
  const parts = lines[i].split(' | ');
  const wrongAt = parts.map((p, k) => (k >= 2 && !p.trim().startsWith('*') ? k : -1)).filter((k) => k > 0);
  if (wrongAt.length !== patch[id].length) throw new Error(`${id}: ${wrongAt.length} variante greșite, primite ${patch[id].length}`);
  wrongAt.forEach((k, j) => { parts[k] = patch[id][j]; });
  lines[i] = parts.join(' | ');
  done++;
}
fs.writeFileSync(src, lines.join('\n'));
console.log(src, done, 'întrebări schimbate');
if (done !== Object.keys(patch).length) throw new Error('unele id-uri nu au fost găsite');
