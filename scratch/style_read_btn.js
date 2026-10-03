const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

const oldReadBtn = '.read-btn{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--line);background:transparent;border-radius:999px;padding:7px 14px 7px 11px;font-size:14.5px;font-weight:600;color:var(--ink);flex:none;min-height:38px;transition:border-color .2s}';
const newReadBtn = '.read-btn{display:inline-flex;align-items:center;gap:6px;border:2px solid transparent;background:var(--ink);color:var(--bg);border-radius:12px;padding:7px 14px 7px 11px;font-size:13.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;box-shadow:0 4px 0 var(--ink-2);flex:none;min-height:38px;transition:all .15s ease}\n.read-btn:active{transform:translateY(4px);box-shadow:0 0px 0 transparent !important;}';

html = html.replace(oldReadBtn, newReadBtn);

const oldHover = '@media(hover:hover) and (pointer:fine){.read-btn:hover{border-color:var(--ink-2)}}';
const newHover = '@media(hover:hover) and (pointer:fine){.read-btn:hover{filter:brightness(1.1)}}';
html = html.replace(oldHover, newHover);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Read button styled');
