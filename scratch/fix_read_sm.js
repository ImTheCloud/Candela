const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// 1. Fix CSS
html = html.replace(
  /\.read-btn\.sm\{padding:6px 12px 6px 9px;font-size:13\.5px;color:var\(--ink-2\)\}/g,
  '.read-btn.sm{padding:6px 12px 6px 9px;font-size:13.5px;color:var(--bg)}'
);

// 2. Fix JS
const oldJs = `  const isMulti = chs.length > 1;
  const titleStr = isMulti ? chaptersLabel(chs) : \`Capitolul \${c}\`;
  const subStr = isMulti ? "" : esc(TITLES[c-1]);
  const readBtnStr = !$(".reader") ? \`<button class="read-btn sm" id="shRead" type="button" aria-label="Citește capitolul \${c} înainte">\${BOOK}<span>Citește</span></button>\` : "";`;

const newJs = `  const isMulti = chs.length > 1;
  const titleStr = isMulti ? chaptersLabel(chs) : \`Capitolul \${c}\`;
  const subStr = isMulti ? "" : esc(TITLES[c-1]);
  const readText = isMulti ? "Citește Cartea" : "Citește Capitolul";
  const readBtnStr = !$(".reader") ? \`<button class="read-btn sm" id="shRead" type="button" aria-label="\${readText}">\${BOOK}<span>\${readText}</span></button>\` : "";`;

html = html.replace(oldJs, newJs);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Fixed button text and color');
