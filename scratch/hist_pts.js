const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

html = html.replace(
  /\.hrow \.pct\{font-family:var\(--f-display\);font-size:19px;font-variant-numeric:tabular-nums;line-height:1\}/g,
  '.hrow .pct{font-family:var(--f-display);font-weight:700;font-size:17.5px;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1}'
);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('History percentage styled like leaderboard');
