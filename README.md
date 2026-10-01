# Candela

Teste biblice pentru pregătire, după traducerea Cornilescu. Prima carte: **1 Samuel** (31 de capitole, 2.004 de întrebări, nivel ușor și greu, 5 tipuri de întrebări).

## Structură
- `src/app.html` — aplicația (HTML, CSS, JS, fără framework).
- `content/1-samuel/intrebari/chNN.json` — întrebările pe capitole (`easy` / `hard`).
- `content/1-samuel/text-cornilescu.json` — textul Cornilescu, verset cu verset.
- `supabase/` — baza de date (Supabase, proiectul „candela”): conturi email + parolă (Supabase Auth) cu nume + prenume unic; conturile vechi au o adresă internă `<nume>@candela.invalid` până își adaugă emailul, progres în Postgres cu row-level security.
  - `migrations/` — tabelele `profiles`, `results`, `chapter_best`, `mastered`, `quiz_counts`, `groups`, `group_members` și funcțiile `save_result()` (cu verificări de plauzibilitate), `my_progress()`, `board()` (clasamentul public, „Prenume N.”), grupurile (`create_group`, `join_group`, `leave_group`, `my_groups`, `group_board`) și `pace()` (timpul real pe întrebare).
  - `functions/signup/` — crearea contului (nume + prenume unic, email, parolă).
  - `functions/account/` — schimbarea numelui și a emailului din profil.
  - `quiz_counts.sql` — generat de `scripts/build.py`; se rulează în Supabase (SQL editor) după ce se adaugă întrebări.
- Fără cont se joacă în modul invitat: rezultatele rămân în browser și trec în cont la înregistrare sau la intrare.
- Clasament: fiecare întrebare contează o singură dată, prima oară când e răspunsă complet corect (scor = întrebări stăpânite ÷ total). La egalitate e înaintea cel care a ajuns primul. ID-ul unei întrebări e `<capitol><e|h><index>`, deci întrebările noi se adaugă la sfârșitul listei.
- Grupuri: pregătite doar în baza de date (funcțiile de mai sus), fără interfață deocamdată; toți sunt în același clasament.
- Pe acasă: seria de zile, medalii pe capitol (bronz, argint, aur), citirea capitolului înainte de test, tutorial la prima vizită. Fără emoji: aplicația rămâne sobră.
- Parola uitată: aplicația nu trimite emailuri. Administratorul (tabelul `admins`) dă o parolă provizorie din profil („Parolă provizorie pentru un cont”, funcția `functions/admin-reset/`), iar jucătorul o schimbă din profil („Schimbă parola”).
- `index.html`, `sw.js` — fișierele generate care se publică; `manifest.webmanifest` și `icons/` fac aplicația instalabilă, iar `sw.js` o deschide și fără internet.

## Lucru
```
python3 scripts/validate.py   # verifică referințele, duplicatele și textul exact al completărilor
python3 scripts/build.py      # regenerează index.html și supabase/quiz_counts.sql
node scripts/dev-server.mjs   # previzualizare pe http://localhost:4173
```
