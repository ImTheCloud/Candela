# Candela

Teste biblice pentru pregătire, după traducerea Cornilescu. Prima carte: **1 Samuel** (31 de capitole, 1.411 întrebări, nivel ușor și greu, 5 tipuri de întrebări).

## Structură
- `src/app.html` — aplicația (HTML, CSS, JS, fără framework).
- `content/1-samuel/intrebari/chNN.json` — întrebările pe capitole (`easy` / `hard`).
- `content/1-samuel/text-cornilescu.json` — textul Cornilescu, verset cu verset.
- `api/player.js` — funcție Vercel care salvează progresul pe nume în Vercel Blob (`BLOB_READ_WRITE_TOKEN`).
- `index.html` — fișierul generat care se publică.

## Lucru
```
python3 scripts/validate.py   # verifică referințele, duplicatele și textul exact al completărilor
python3 scripts/build.py      # regenerează index.html
```
