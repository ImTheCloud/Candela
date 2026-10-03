const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// Rank circle
html = html.replace(
  /\.brow-l \.rank\{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;justify-self:center;font-family:var\(--f-display\);font-size:17px;color:var\(--ink-2\);font-variant-numeric:tabular-nums\}/,
  '.brow-l .rank{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;justify-self:center;font-family:var(--f-display);font-size:16px;font-weight:700;color:var(--ink-2);font-variant-numeric:tabular-nums}'
);

html = html.replace(
  /\.brow-l \.rank\.r1,\.brow-l \.rank\.r2,\.brow-l \.rank\.r3\{color:#fff;font-size:13px\}/,
  '.brow-l .rank.r1,.brow-l .rank.r2,.brow-l .rank.r3{color:#fff;font-size:15px}'
);

// Points
html = html.replace(
  /\.brow-l \.pts b\{font-family:var\(--f-display\);font-weight:400;font-size:19px;font-variant-numeric:tabular-nums\}/,
  '.brow-l .pts b{font-family:var(--f-display);font-weight:700;font-size:22px;color:var(--ink);font-variant-numeric:tabular-nums}'
);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Leaderboard numbers improved');
