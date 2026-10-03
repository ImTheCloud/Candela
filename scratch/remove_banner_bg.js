const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// 1. Remove background overrides
html = html.replace(/html:has\(body\.ans-ok\),body\.ans-ok\{--bg:#EAF3DC;background-color:#EAF3DC!important\}\n/g, '');
html = html.replace(/html:has\(body\.ans-no\),body\.ans-no\{--bg:#FDEBE7;background-color:#FDEBE7!important\}\n/g, '');

// 2. Remove verdictBanner logic and references
const regexCheckBody = /const verdictBanner = full[\s\S]*?const ansHtml = !full \? correctLine\(q\) : "";/g;
html = html.replace(regexCheckBody, `const ansHtml = !full ? correctLine(q) : "";`);

const regexFbHtml = /if \(full\) \{\n    document\.body\.classList\.add\("ans-ok"\);\n    document\.body\.classList\.remove\("ans-no"\);\n    \$\("#fb"\)\.innerHTML = `<div class="fb-clean fb-ok">\$\{verdictBanner\}\$\{vHidden\}<\/div>`;\n  \} else \{\n    document\.body\.classList\.add\("ans-no"\);\n    document\.body\.classList\.remove\("ans-ok"\);\n    \$\("#fb"\)\.innerHTML = `<div class="fb-clean fb-wrong">\$\{verdictBanner\}\$\{ansHtml \? `<div class="fb-ans-card" style="margin-top:12px;">\$\{ansHtml\}<\/div>` : ""\}\$\{vHidden\}<\/div>`;\n  \}/g;

const newFbHtml = `if (full) {
    document.body.classList.add("ans-ok");
    document.body.classList.remove("ans-no");
    if (vHidden) {
      $("#fb").innerHTML = \`<div class="fb-clean fb-ok">\${vHidden}</div>\`;
    } else {
      $("#fb").innerHTML = ""; // No verse, nothing to show in fb container
    }
  } else {
    document.body.classList.add("ans-no");
    document.body.classList.remove("ans-ok");
    $("#fb").innerHTML = \`<div class="fb-clean fb-wrong">\${ansHtml ? \`<div class="fb-ans-card">\${ansHtml}</div>\` : ""}\${vHidden}</div>\`;
  }`;

html = html.replace(regexFbHtml, newFbHtml);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Banners and bg removed');
