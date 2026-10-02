function openOptions(chs = [...S.sel].sort((a,b)=>a-b)){
  const c = chs[0];
  const bg = document.createElement("div"); bg.className = "sheet-bg";
  
  const lvlButtons = ["easy", "hard", "both"].map(m => {
    const list = buildPool(chs, m); const pool = list.length; const perQ = estSecs(list) / pool;
    const done = levelDone(chs, m);
    const lastSc = levelLast(c, m);
    const note = done ? `Făcut deja${lastSc != null ? ` · ultimul scor: ${lastSc}%` : ""}` : esc(MODE_NOTE[m]);
    const dur = durLabel(perQ * pool).replace(/^cam /, "");
    return `<button type="button" class="hrow" data-m="${m}" style="display:block; padding:16px; border:2px solid transparent;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:16px; color:var(--ink);">
        <b>${MODE_LABEL[m]}</b>
        <span style="font-size:13px; color:var(--oil-ink); font-weight:500;">${dur}</span>
      </div>
      <div style="font-size:13.5px; color:${done ? 'var(--cedar)' : 'var(--oil-ink)'}; display:flex; align-items:center; gap:6px;">
        ${done ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M13.333 4L6 11.333 2.667 8"/></svg>` : ""}${note}
      </div>
    </button>`;
  }).join("");

  bg.innerHTML = `<div class="sheet start-sheet" role="dialog" aria-modal="true" aria-labelledby="shT">
    <div class="sheet-h"><div class="sh-title"><h3 id="shT">Capitolul ${c}</h3></div><div class="sh-tools">${!$(".reader") ? `<button class="read-btn sm" id="shRead" type="button" aria-label="Citește capitolul ${c} înainte">${BOOK}<span>Citește</span></button>` : ""}<button class="icon-btn" id="shX" aria-label="Închide"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div></div><p class="sh-sub">${esc(TITLES[c-1])}</p>
    <div class="sh-lvl" style="margin-top:16px;"><span class="sh-l">Alege nivelul pentru a începe</span>
      <div style="display:grid; gap:10px; margin-top:10px;">
        ${lvlButtons}
      </div>
    </div>
  </div>`;
  document.body.appendChild(bg);

  const close = () => closeModal(bg);
  bg.querySelectorAll("[data-m]").forEach(b => {
    b.onclick = () => {
      const mode = b.dataset.m;
      closeModal(bg, () => { S.mode = mode; S.sel = new Set([c]); persistPrefs(); startQuiz(null); });
    };
  });
  bg.querySelector("#shX").onclick = close;
  bg.onclick = e => { if (e.target === bg) close(); };
  if (bg.querySelector("#shRead")) bg.querySelector("#shRead").onclick = () => closeModal(bg, () => viewRead(c));
}
