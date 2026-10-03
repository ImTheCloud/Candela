const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

html = html.replace(
  /\.brow-l \.pts b\{font-family:var\(--f-display\);font-weight:700;font-size:22px;color:var\(--ink\);font-variant-numeric:tabular-nums\}/,
  '.brow-l .pts b{font-family:var(--f-display);font-weight:700;font-size:17.5px;color:var(--ink);font-variant-numeric:tabular-nums}'
);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Points size reduced');
