const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

const regex = /const revealBtn = `<button[\s\S]*?\$\("#fb"\)\.innerHTML = `<div class="fb-clean fb-wrong">\$\{verdictBanner\}\$\{hasHidden \? revealBtn \+ hiddenContent : ""\}<\/div>`;\n  \}/;

const replacement = `  const revealBtn = \`<button class="btn btn-ghost btn-block" style="margin-top:12px; min-height:46px; font-size:14.5px; font-weight:700; border:2px solid var(--line); border-bottom-width:4px;" onclick="this.nextElementSibling.style.display='block'; this.style.display='none';">Vezi versetul din Biblie</button>\`;
  
  const ansHtml = !full ? correctLine(q) : "";
  let vHidden = "";
  if (vHtml) {
    vHidden = revealBtn + \`<div style="display:none; animation: fbIn 0.35s ease; margin-top:12px;"><div class="verse">\${vHtml}</div></div>\`;
  }

  if (full) {
    document.body.classList.add("ans-ok");
    document.body.classList.remove("ans-no");
    $("#fb").innerHTML = \`<div class="fb-clean fb-ok">\${verdictBanner}\${vHidden}</div>\`;
  } else {
    document.body.classList.add("ans-no");
    document.body.classList.remove("ans-ok");
    $("#fb").innerHTML = \`<div class="fb-clean fb-wrong">\${verdictBanner}\${ansHtml ? \`<div class="fb-ans-card" style="margin-top:12px;">\${ansHtml}</div>\` : ""}\${vHidden}</div>\`;
  }`;

html = html.replace(regex, replacement);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Fixed answer display');
