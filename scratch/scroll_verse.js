const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// 1. Remove border-bottom from highlight
const highlightRegex = /out \+= `<span class="verse-target-highlight" style="background:var\(--oil-soft\); color:var\(--ink\); font-weight:600; border-radius:6px; padding:2px 4px; border-bottom:2px solid var\(--oil\);"><sup>\$\{v\}<\/sup>\$\{esc\(vs\[v-1\]\)\}<\/span> `;/g;
const newHighlight = `out += \`<span class="verse-target-highlight" style="background:var(--oil-soft); color:var(--ink); font-weight:700; border-radius:6px; padding:2px 4px;"><sup>\${v}</sup>\${esc(vs[v-1])}</span> \`;`;
html = html.replace(highlightRegex, newHighlight);

// 2. Add scrollIntoView in the button's onclick
const btnRegex = /onclick="this\.nextElementSibling\.style\.display='block'; this\.style\.display='none';"/g;
const newBtnClick = `onclick="this.nextElementSibling.style.display='block'; this.style.display='none'; const hl = this.nextElementSibling.querySelector('.verse-target-highlight'); if (hl) hl.scrollIntoView({behavior: 'smooth', block: 'center'});"`;
html = html.replace(btnRegex, newBtnClick);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Scroll and highlight fixed');
