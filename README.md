# Candela

Teste biblice pentru pregătire, după traducerea Cornilescu. Prima carte: **1 Samuel** (31 de capitole, 1.411 întrebări, nivel ușor și greu, 5 tipuri de întrebări).

## Structură
- `src/app.html` — aplicația (HTML, CSS, JS, fără framework).
- `content/1-samuel/intrebari/chNN.json` — întrebările pe capitole (`easy` / `hard`).
- `content/1-samuel/text-cornilescu.json` — textul Cornilescu, verset cu verset.
- `supabase/` — baza de date (Supabase, proiectul „candela”): conturi email + parolă (Supabase Auth), progres în Postgres cu row-level security.
  - `migrations/` — tabelele `profiles`, `results`, `chapter_best`, `mastered`, `quiz_counts` și funcțiile `save_result()`, `my_progress()`, `leaderboard()`.
  - `functions/signup/` — crearea contului (nume unic, fără email de confirmare).
  - `quiz_counts.sql` — generat de `scripts/build.py`; trebuie rulat în Supabase dacă se schimbă numărul de întrebări.
- Clasament: fiecare întrebare contează o singură dată, prima oară când e răspunsă complet corect (scor = întrebări stăpânite ÷ total). La egalitate e înaintea cel care a ajuns primul. ID-ul unei întrebări e `<capitol><e|h><index>`, deci întrebările noi se adaugă la sfârșitul listei.
- `index.html` — fișierul generat care se publică.

## Lucru
```
python3 scripts/validate.py   # verifică referințele, duplicatele și textul exact al completărilor
python3 scripts/build.py      # regenerează index.html și supabase/quiz_counts.sql
node scripts/dev-server.mjs   # previzualizare pe http://localhost:4173
```
