# Candela

Teste biblice pentru pregătire, după traducerea Cornilescu. Prima carte: **1 Samuel** (31 de capitole, 1.411 întrebări, nivel ușor și greu, 5 tipuri de întrebări).

## Structură
- `src/app.html` — aplicația (HTML, CSS, JS, fără framework).
- `content/1-samuel/intrebari/chNN.json` — întrebările pe capitole (`easy` / `hard`).
- `content/1-samuel/text-cornilescu.json` — textul Cornilescu, verset cu verset.
- `api/login.js`, `api/save.js`, `api/leaderboard.js` + `lib/players.js` — conturi nume + cod de 4 cifre (scrypt, blocare după 5 încercări greșite), progres îmbinat pe server (nimic nu se pierde, ultimele 5 versiuni păstrate) și clasament, în Vercel Blob (`BLOB_READ_WRITE_TOKEN`).
- Clasament: fiecare întrebare contează o singură dată, prima oară când e răspunsă complet corect (scor = întrebări stăpânite ÷ total). La egalitate e înaintea cel care a ajuns primul. `lib/quiz-counts.json` e generat de `scripts/build.py`.
- `index.html` — fișierul generat care se publică.

## Lucru
```
python3 scripts/validate.py   # verifică referințele, duplicatele și textul exact al completărilor
python3 scripts/build.py      # regenerează index.html
```
