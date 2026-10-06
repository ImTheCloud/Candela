const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SUPABASE = { url: 'https://hpmypeoszocxjjxrnbfh.supabase.co', key: 'sb_publishable_MtSGXf-G2iNiIdP0JqSm2Q_gMH_flwg' };
const BOOK = path.join(ROOT, 'content', '1-samuel');

let quiz = {};
const chFiles = fs.readdirSync(path.join(BOOK, 'intrebari')).filter(f => f.startsWith('ch') && f.endsWith('.json')).sort();
for (let file of chFiles) {
    let d = JSON.parse(fs.readFileSync(path.join(BOOK, 'intrebari', file)));
    quiz[d.ch] = { easy: d.easy, hard: d.hard };
}

let textData = JSON.parse(fs.readFileSync(path.join(BOOK, 'text-cornilescu.json')));
let text = {};
for (let k in textData) text[parseInt(k)] = textData[k];

let dump = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');

let s = fs.readFileSync(path.join(ROOT, 'src', 'app.html'), 'utf-8');
s = s.replace('/*__QUIZ__*/{}', dump(quiz)).replace('/*__TEXT__*/{}', dump(text)).replace('/*__SB__*/null', JSON.stringify(SUPABASE));

let fav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2c2 3 4 5 4 8a4 4 0 0 1-8 0c0-2 1.5-3.5 2-5 .5 1.5 1.2 2.2 2 2.5C11.6 5.5 12 4 12 2z' fill='%23B87A0B'/%3E%3Cpath d='M3 16c3 0 6-1.5 9-1.5s5 .8 9 0c-.7 3-4 5.5-9 5.5-3.5 0-7-1.5-9-4z' fill='%231E261D'/%3E%3C/svg%3E";

let n = 0;
for (let v of Object.values(quiz)) n += v.easy.length + v.hard.length;
const counts = Object.entries(quiz).map(([ch, v]) => `(${ch},${v.easy.length},${v.hard.length})`).join(',');
fs.writeFileSync(path.join(ROOT, 'supabase', 'quiz_counts.sql'),
    `insert into public.quiz_counts (ch, e, h) values ${counts}\n  on conflict (ch) do update set e = excluded.e, h = excluded.h;\n`);
let n_ro = n.toLocaleString('ro-RO');

let head = `<!doctype html><html lang="ro"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">` +
    `<meta name="theme-color" content="#F8F1E6" media="(prefers-color-scheme: light)">` +
    `<link rel="icon" href="${fav}">` +
    `<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` +
    `<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Candela">` +
    `<meta property="og:type" content="website"><meta property="og:site_name" content="Candela">` +
    `<meta property="og:url" content="https://candela-biblia.vercel.app/">` +
    `<meta property="og:image" content="https://candela-biblia.vercel.app/og.png">` +
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` +
    `<meta property="og:image:alt" content="Candela: „Candela lui Dumnezeu nu se stinsese încă.” 1 Samuel 3:3">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta property="og:title" content="Candela · Test biblic 1 Samuel">` +
    `<meta property="og:description" content="${n_ro} de întrebări din 1 Samuel (Cornilescu), nivel ușor și greu.">` +
    `<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}` +
    `body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>` +
    `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script></head><body>`;

let page = head + s + '</body></html>';
fs.writeFileSync(path.join(ROOT, 'index.html'), page);

let ver = crypto.createHash('sha1').update(page).digest('hex').substring(0, 10);
let sw = fs.readFileSync(path.join(ROOT, 'scripts', 'sw.template.js'), 'utf-8').replace('__VERSION__', ver);
fs.writeFileSync(path.join(ROOT, 'sw.js'), sw);

console.log(`index.html: ${Object.keys(quiz).length} chapters, ${n} questions`);
