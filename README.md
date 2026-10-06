# Candela

Teste biblice pentru pregătire, după traducerea Cornilescu. Prima carte: **1 Samuel** (31 de capitole, 1.000 de întrebări, nivel ușor și greu, 5 tipuri de întrebări).

## Structură
- `src/app.html` — aplicația (HTML, CSS, JS, fără framework).
- `content/1-samuel/intrebari/chNN.json` — întrebările pe capitole (`easy` / `hard`).
- `content/1-samuel/text-cornilescu.json` — textul Cornilescu, verset cu verset.
- `supabase/` — baza de date (Supabase, proiectul „candela”): conturi email + parolă (Supabase Auth); mai multe conturi pot avea același nume, emailul e cel unic; conturile vechi au o adresă internă `<nume>@candela.invalid` până își adaugă emailul, progres în Postgres cu row-level security.
  - `migrations/` — tabelele `profiles`, `results`, `chapter_best`, `mastered`, `quiz_counts`, `groups`, `group_members` și funcțiile `save_result()` (cu verificări de plauzibilitate), `my_progress()`, `board()` (clasamentul public, „Prenume N.”), grupurile (`create_group`, `join_group`, `leave_group`, `my_groups`, `group_board`) și `pace()` (timpul real pe întrebare).
  - `functions/signup/` — crearea contului (nume, prenume, email, parolă).
  - `functions/account/` — schimbarea numelui și a emailului din profil.
  - `quiz_counts.sql` — generat de `scripts/build.js`; se rulează în Supabase (SQL editor) după ce se adaugă întrebări.
- Fără cont se joacă în modul invitat: rezultatele rămân în browser și trec în cont la înregistrare sau la intrare.
- Clasament: fiecare întrebare contează o singură dată, prima oară când e răspunsă complet corect (scor = întrebări stăpânite ÷ total). La egalitate e înaintea cel care a ajuns primul. ID-ul unei întrebări e `<capitol><e|h><index>`, deci întrebările noi se adaugă la sfârșitul listei.
- Cont de părinte (bifat la înregistrare sau comutatorul din profil): părintele își adaugă copiii (`functions/family/`), iar pe acasă alege „Cine face testul?”. Un copil e un cont fără email și fără parolă cunoscută; rezultatele lui se salvează cu `save_play(p_player, …)`, verificat de `can_play()`.
- Oricine poate alege din profil să nu apară în clasament (`profiles.hidden`, `set_hidden`).
- Grupuri: pregătite doar în baza de date (funcțiile de mai sus), fără interfață deocamdată; toți sunt în același clasament.
- Pe acasă: citirea întregii cărți (butonul „Citește” din antet, capitol cu capitol; un verset atins se colorează în galben și rămâne salvat în cont) și a capitolului înainte de test. Fără emoji: aplicația rămâne sobră.
- Parola uitată: aplicația nu trimite emailuri. Administratorul (tabelul `admins`) are pagina „Administrare” din profil: lista conturilor, parolă provizorie (`functions/admin-reset/`) și ștergere (`functions/admin/`), iar jucătorul o schimbă din profil („Nume, email și parolă”). Funcția `functions/delete-account/` există în baza de date, dar interfața nu mai oferă ștergerea contului.
- `index.html`, `sw.js` — fișierele generate care se publică; `manifest.webmanifest` și `icons/` fac aplicația instalabilă, iar `sw.js` o deschide și fără internet.

## Lucru
```
npm run validate   # verifică referințele, duplicatele, 3 variante, maximum 20 pe nivel și textul exact al completărilor
npm run build      # regenerează index.html, sw.js și supabase/quiz_counts.sql
npm run serve      # previzualizare pe http://localhost:8080
npm run dev        # build + serve
```
Fără dependențe: doar Node.js. După ce întrebările se schimbă, se rulează `supabase/quiz_counts.sql` în Supabase (SQL editor).

- Examenul alb: 21 de întrebări din toată cartea, nu aduce puncte în clasament; rezultatele lui se salvează cu capitolul `0`.
