const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

// 1. Replace verseHTML
const verseHtmlRegex = /function verseHTML\(ref\)\{[\s\S]*?return `<div class="verse-container" data-ref="\$\{esc\(ref\)\}">\s*\$\{beforeHTML\}\s*\$\{targetHTML\}\s*\$\{afterHTML\}\s*<\/div>`;\n\}/;

const newVerseHtml = `function verseHTML(ref){
  const m = /^(\\d+):(\\d+)(?:-(\\d+))?$/.exec(ref); if (!m) return "";
  const c = +m[1], a = +m[2], b = +(m[3]||m[2]); const vs = TEXT[c] || [];
  if (!vs.length) return "";
  
  let out = \`<div class="verse-container"><div class="verse-ctx-body full-chapter" style="max-height: 280px; overflow-y: auto; text-wrap: pretty; padding: 14px; background: var(--surface); border: 2px solid var(--line); border-radius: 16px; margin-top: 12px; border-top: 2px solid var(--line);">\`;
  out += \`<div style="font-family:var(--f-mono); font-size:12px; font-weight:700; color:var(--ink-2); margin-bottom:12px; text-transform:uppercase; letter-spacing:0.04em;">1 Samuel Capitolul \${c}</div>\`;
  out += \`<div style="font-family:var(--f-bible); font-size:17px; line-height:1.65; color:var(--ink-2);">\`;

  for (let v = 1; v <= vs.length; v++) {
    const isTarget = v >= a && v <= b;
    if (isTarget) {
      out += \`<span class="verse-target-highlight" style="background:var(--oil-soft); color:var(--ink); font-weight:600; border-radius:6px; padding:2px 4px; border-bottom:2px solid var(--oil);"><sup>\${v}</sup>\${esc(vs[v-1])}</span> \`;
    } else {
      out += \`<sup>\${v}</sup>\${esc(vs[v-1])} \`;
    }
  }
  out += \`</div></div></div>\`;
  
  return out;
}`;

html = html.replace(verseHtmlRegex, newVerseHtml);

// 2. Replace check() logic
const checkRegex = /if \(full\) \{\s*document\.body\.classList\.add\("ans-ok"\);\s*document\.body\.classList\.remove\("ans-no"\);\s*\$\("#fb"\)\.innerHTML = `<div class="fb-clean fb-ok">\$\{verdictBanner\}\$\{vHtml \? `<div class="verse">\$\{vHtml\}<\/div>` : ""\}<\/div>`;\s*\} else \{\s*document\.body\.classList\.add\("ans-no"\);\s*document\.body\.classList\.remove\("ans-ok"\);\s*const ansHtml = correctLine\(q\);\s*\$\("#fb"\)\.innerHTML = `<div class="fb-clean fb-wrong">\$\{verdictBanner\}\$\{ansHtml \? `<div class="fb-ans-card">\$\{ansHtml\}<\/div>` : ""\}\$\{vHtml \? `<div class="verse">\$\{vHtml\}<\/div>` : ""\}<\/div>`;\s*\}/;

const newCheckLogic = `
  const revealBtn = \`<button class="btn btn-ghost btn-block" style="margin-top:12px; min-height:46px; font-size:14.5px; font-weight:700; border:2px solid var(--line); border-bottom-width:4px;" onclick="this.nextElementSibling.style.display='block'; this.style.display='none';">Vezi răspunsul corect și versetul</button>\`;
  
  let hiddenContent = \`<div style="display:none; animation: fbIn 0.35s ease;">\`;
  const ansHtml = !full ? correctLine(q) : "";
  if (ansHtml) hiddenContent += \`<div class="fb-ans-card" style="margin-top:12px;">\${ansHtml}</div>\`;
  if (vHtml) hiddenContent += \`<div class="verse">\${vHtml}</div>\`;
  hiddenContent += \`</div>\`;

  const hasHidden = vHtml || ansHtml;

  if (full) {
    document.body.classList.add("ans-ok");
    document.body.classList.remove("ans-no");
    $("#fb").innerHTML = \`<div class="fb-clean fb-ok">\${verdictBanner}\${hasHidden ? revealBtn + hiddenContent : ""}</div>\`;
  } else {
    document.body.classList.add("ans-no");
    document.body.classList.remove("ans-ok");
    $("#fb").innerHTML = \`<div class="fb-clean fb-wrong">\${verdictBanner}\${hasHidden ? revealBtn + hiddenContent : ""}</div>\`;
  }
`;

html = html.replace(checkRegex, newCheckLogic);

fs.writeFileSync(appPath, html, 'utf-8');
console.log('Verse logic updated');
