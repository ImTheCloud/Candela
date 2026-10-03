const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// 1. Smaller button
html = html.replace(
  /\.qactions \.btn\{flex:1;min-height:50px;font-size:16px;box-sizing:border-box\}/g,
  '.qactions .btn{flex:1;min-height:46px;font-size:14.5px;box-sizing:border-box}'
);

// 2. Sticky header
const oldHeader = `    mount(\`<div class="qtop">
      <button class="icon-btn" id="quit" aria-label="Pauză test"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg></button>
      <div class="bar" aria-hidden="true" style="align-self:center;"><i id="prog" style="width:0"></i></div>
      <span class="qcount" id="qcount" style="font-size:13px; font-weight:600; color:var(--ink-2); text-align:right;"></span>
    </div>
    <div style="display:flex; justify-content:center; align-items:center; gap:4px; margin-top:-4px; margin-bottom:12px; color:var(--oil-ink); opacity:0.8;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.8;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span id="qtimer" style="font-family:var(--f-mono); font-size:14.5px; font-weight:700; opacity:0.9;"></span>
      <span id="qref-container" style="display:none; align-items:center; gap:6px; margin-left:8px; padding-left:12px; border-left:2px solid var(--line); font-size:13px; font-weight:600;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span id="qref"></span>
      </span>
    </div>`;

const newHeader = `    mount(\`<div id="qheader-wrap" style="position:sticky; top:-14px; padding-top:14px; padding-bottom:8px; margin-bottom:4px; background:var(--bg); z-index:100; border-bottom:1px solid transparent; transition:border-bottom 0.2s;">
      <div class="qtop">
        <button class="icon-btn" id="quit" aria-label="Pauză test"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg></button>
        <div class="bar" aria-hidden="true" style="align-self:center;"><i id="prog" style="width:0"></i></div>
        <span class="qcount" id="qcount" style="font-size:13px; font-weight:600; color:var(--ink-2); text-align:right;"></span>
      </div>
      <div style="display:flex; justify-content:center; align-items:center; gap:4px; margin-top:-4px; margin-bottom:0; color:var(--oil-ink); opacity:0.8;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.8;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span id="qtimer" style="font-family:var(--f-mono); font-size:14.5px; font-weight:700; opacity:0.9;"></span>
        <span id="qref-container" style="display:none; align-items:center; gap:6px; margin-left:8px; padding-left:12px; border-left:2px solid var(--line); font-size:13px; font-weight:600;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <span id="qref"></span>
        </span>
      </div>
    </div>\``;

html = html.replace(oldHeader, newHeader);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Header and button adjusted');
