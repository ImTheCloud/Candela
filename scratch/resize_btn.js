const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

html = html.replace(
  /\.read-btn\.sm\{padding:6px 12px 6px 9px;font-size:13\.5px;color:var\(--bg\)\}/,
  '.read-btn.sm{padding:4px 10px 4px 8px;font-size:11.5px;border-radius:10px;box-shadow:0 3px 0 var(--ink-2);min-height:32px;color:var(--bg)}\n.read-btn.sm:active{transform:translateY(3px)}'
);

html = html.replace(
  /\.read-btn\.sm svg\{width:16px;height:16px\}/,
  '.read-btn.sm svg{width:14px;height:14px}'
);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Button resized');
