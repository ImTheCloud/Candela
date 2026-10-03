const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// 1. Update refLabel
html = html.replace(
  /const refLabel = r => !r \? "" : String\(r\)\.startsWith\("1 Sam"\) \? r : "1 Sam\. " \+ r;/,
  `const refLabel = r => {
  if (!r) return "";
  let clean = String(r).replace(/^1\\s*Sam(?:\\.|uel)?\\s*/i, "").trim();
  return "1 Samuel " + clean;
};`
);

// 2. Add #qref to the top bar HTML
const mountRegex = /mount\(\`<div class="qtop">[\s\S]*?<div style="display:flex; justify-content:center; align-items:center; gap:4px; margin-top:-4px; margin-bottom:12px; color:var\(--oil-ink\); opacity:0\.65;">\s*<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2\.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"><\/circle><polyline points="12 6 12 12 16 14"><\/polyline><\/svg>\s*<span id="qtimer" style="font-family:var\(--f-mono\); font-size:14px; font-weight:700;"><\/span>\s*<\/div>\s*<div id="qslot"><\/div>/;

const mountReplacement = `mount(\`<div class="qtop">
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
    </div>
    <div id="qslot"></div>`;

html = html.replace(mountRegex, mountReplacement);

// 3. Remove from .qfoot
const qfootRegex = /<div class="qfoot"><p class="keys">\$\{\(\{tf:"Taste: A adevărat · F fals", one:"Taste: A, B, C… · Enter verifică", multi:"Taste: A, B, C… · Enter verifică", fill:"Enter trece la căsuța următoare", match:"Enter verifică"\}\)\[q\.t\]\}<\/p>\$\{q\.ref \? `<span class="ref">\$\{refLabel\(q\.ref\)\}<\/span>` : ""\}<\/div>/;

const newQfoot = `<div class="qfoot"><p class="keys">\${({tf:"Taste: A adevărat · F fals", one:"Taste: A, B, C… · Enter verifică", multi:"Taste: A, B, C… · Enter verifică", fill:"Enter trece la căsuța următoare", match:"Enter verifică"})[q.t]}</p></div>`;

html = html.replace(qfootRegex, newQfoot);

// 4. Add the updater for qref
const updaterRegex = /\$\("#prog"\)\.style\.width = \(Z\.i\/n\*100\) \+ "%";\s*\$\("#qcount"\)\.textContent = `\$\{Z\.i\+1\}\/\$\{n\}`;/;
const newUpdater = `$("#prog").style.width = (Z.i/n*100) + "%";
  $("#qcount").textContent = \`\${Z.i+1}/\${n}\`;
  if ($("#qref-container")) {
    if (q.ref) {
      $("#qref-container").style.display = "flex";
      $("#qref").textContent = refLabel(q.ref);
    } else {
      $("#qref-container").style.display = "none";
    }
  }`;

html = html.replace(updaterRegex, newUpdater);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Timer and ref moved successfully');
