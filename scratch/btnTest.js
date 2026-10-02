const ICONS = {
  easy: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  hard: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  both: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
};

const lvlButtons = ["easy", "hard", "both"].map(m => {
  let done = levelDone(chs, m);
  let note = "";
  if (m === "both") {
    done = false;
    note = esc(MODE_NOTE[m]);
  } else {
    const lastSc = levelLast(c, m);
    note = done ? `Făcut deja${lastSc != null ? ` · scor: ${lastSc}%` : ""}` : esc(MODE_NOTE[m]);
  }

  let durStr = "";
  if (m === "easy") durStr = durLabel(secsEasy);
  else if (m === "hard") durStr = durLabel(secsHard);
  else durStr = durLabel((mEasy + mHard) * 60);
  durStr = durStr.replace(/^cam /, "");

  return `<button type="button" class="hrow" data-m="${m}" style="display:flex; align-items:center; gap:16px; padding:12px 14px; border:2px solid transparent; ${m==='both'?'background:var(--oil-soft); border-color:var(--oil-soft);':''}">
    <div style="flex:none; width:44px; height:44px; border-radius:12px; background:var(--bg); display:grid; place-items:center; color:${m==='both'?'var(--oil)':'var(--ink)'}; box-shadow:0 2px 5px rgba(0,0,0,0.06)">
      ${ICONS[m]}
    </div>
    <div style="flex:1; text-align:left;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; font-size:16.5px; color:var(--ink);">
        <b style="font-weight:700">${MODE_LABEL[m]}</b>
        <span style="font-size:13px; color:var(--oil-ink); font-weight:600;">${durStr}</span>
      </div>
      <div style="font-size:13px; color:${done ? 'var(--cedar)' : 'var(--ink-2)'}; display:flex; align-items:center; gap:5px; font-weight:500;">
        ${done ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M13.333 4L6 11.333 2.667 8"/></svg>` : ""}${note}
      </div>
    </div>
  </button>`;
}).join("");
