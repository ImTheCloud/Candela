function chapScore(c) {
  return (S.player.ok || []).filter(id => parseInt(id, 10) === c).length;
}
function chapTotal(c) {
  return (QUIZ[c]?.easy || []).length + (QUIZ[c]?.hard || []).length;
}

// Inside viewHome
const gridHtml = Array.from({length:31},(_,i)=>i+1).map(c=> {
  const sc = chapScore(c);
  const tot = chapTotal(c);
  const fracHTML = (sc > 0 || chapTried(c)) ? `<span class="tile-sc ${sc===tot ? 'full' : ''}">${sc}/${tot}</span>` : "";
  return `<button class="tile" data-c="${c}" aria-pressed="false" title="${c}. ${esc(TITLES[c-1])}" aria-label="Capitolul ${c}: ${esc(TITLES[c-1])}">
    <span class="n">${c}</span>
    ${fracHTML}
  </button>`;
}).join("");
