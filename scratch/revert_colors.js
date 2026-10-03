const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// The new :root vars to replace
const currentVarsRegex = /:root\s*\{[\s\S]*?color-scheme:light dark;\n\}/;
const oldVars = `:root{
  --bg:#F8F1E6;          /* warm cream */
  --surface:#FFFBF4;
  --surface-2:#F1E6D5;
  --ink:#3A271B;         /* dark brown */
  --ink-2:#7B6450;
  --line:#E7D8C2;
  --oil:#D97B26;         /* lamp oil / flame orange */
  --oil-soft:#FBE5CC;
  --oil-ink:#8A4510;
  --cedar:#8A5A36;       /* warm brown (easy level, avatars) */
  --cedar-soft:#F2E3D2;
  --ok:#5E8A3A; --ok-soft:#E8F0DA;
  --warn:#D99C26; --warn-soft:#FCF0D2;
  --bad:#B23A2E; --bad-soft:#FBE4DF;
  --p1:#D97B26; --p2:#8A5A36; --p3:#B0644A; --p4:#5E8A3A; --p5:#B4534A;
  --shadow:0 4px 12px rgba(58, 39, 27, 0.05), 0 10px 20px rgba(58, 39, 27, 0.05);
  --f-display:"Outfit", "Georgia", "Times New Roman", serif;
  --f-bible:"Source Serif 4", "Georgia", "Times New Roman", serif;
  --f-body:"Outfit", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --f-mono:"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --r:14px;
  color-scheme:light;
}`;

html = html.replace(currentVarsRegex, oldVars);

// Remove the dark mode block
const darkRegex = /@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?\n\}\n/g;
html = html.replace(darkRegex, '');

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Colors Reverted in app.html');
