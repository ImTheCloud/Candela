// Finds single and multiple answer questions whose wrong options are too easy to rule out.
// A wrong option is "anchored" when most of its words come from the chapter text (names, places, things that
// really are in the story); a wrong option made of words the chapter never uses ("câți sunt", "de unde sunt")
// can be ruled out without having read anything. Usage: node scripts/qualite/ancrage.mjs [book] [level…]
import fs from 'fs';

const book = process.argv[2] ?? '2-samuel';
const ages = process.argv.slice(3).length ? process.argv.slice(3) : ['mediu', 'greu'];
// what each level must have: how many wrong options anchored in the chapter (docs/niveluri.md)
const NEED = { usor: 0, mediu: 2, greu: 2 };
const text = JSON.parse(fs.readFileSync(`content/${book}/text-cornilescu.json`, 'utf8'));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set('lor cei cel cea din sub pe din dar iar mai nici sau ale ani ceva '+'care cand cum unde dupa pentru prin peste spre catre fara despre dintre langa inainte inapoi doar numai toata toate totul tot toti este sunt era erau fost avea aveau lui sale sau sale acest aceasta acel aceea acolo aici mult multe foarte decat cele cel cea celor alte alta altul niciun nicio nimic'.split(' '));
const words = (s) => norm(s).match(/[a-z]+/g)?.filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.slice(0, 5)) ?? [];

let flagged = 0;
let total = 0;
for (const f of fs.readdirSync(`content/${book}/intrebari`).sort()) {
  const file = JSON.parse(fs.readFileSync(`content/${book}/intrebari/${f}`, 'utf8'));
  const vocab = new Set(words((text[String(file.ch)] ?? []).join(' ')));
  for (const q of file.questions) {
    if (!ages.includes(q.age) || (q.t !== 'one' && q.t !== 'multi')) continue;
    total++;
    const right = q.t === 'one' ? [q.a] : q.a;
    const score = (o) => { const w = words(o); return w.length ? w.filter((x) => vocab.has(x)).length / w.length : 0; };
    const wrong = q.opts.map((o, i) => ({ o, i, s: score(o) })).filter((x) => !right.includes(x.i));
    const anchored = wrong.filter((x) => x.s >= 0.5).length;
    if (anchored < Math.min(NEED[q.age], wrong.length)) {
      flagged++;
      console.log(`${q.id} ${q.q}\n    ${q.opts.map((o, i) => `${right.includes(i) ? '*' : ' '}${o} (${score(o).toFixed(1)})`).join(' | ')}`);
    }
  }
}
console.log(`\n${flagged} din ${total} întrebări au variante greșite prea ușor de eliminat`);
