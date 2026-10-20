// Writes dist/sw.js after the build: it keeps every page, chapter text, question file and font
// on the phone, so Candela opens and plays without internet once it has been opened online.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fonts only in the alphabets Romanian needs; the review pages are not for players.
const SKIP = [/cyrillic|greek|vietnamese/, /^verificare\//, /\/verificare\//, /^sw\.js$/, /^og\.png$/];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export default function serviceWorker() {
  return {
    name: 'candela-service-worker',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const out = fileURLToPath(dir);
        const files = walk(out).map((f) => relative(out, f).split('\\').join('/')).filter((f) => !SKIP.some((r) => r.test(f)));
        const hash = createHash('sha256');
        for (const f of files.sort()) hash.update(f).update(readFileSync(join(out, f)));
        // pages are cached by their clean URL ("/2-samuel/citire/3"), everything else by its file path
        const urls = files.map((f) => (f.endsWith('index.html') ? `/${f.slice(0, -'index.html'.length)}`.replace(/(.)\/$/, '$1') : `/${f}`));
        const template = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8');
        writeFileSync(join(out, 'sw.js'), template.replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace('__FILES__', JSON.stringify(urls)));
      },
    },
  };
}
