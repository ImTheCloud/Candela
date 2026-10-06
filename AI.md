# Instructions pour l'IA - Projet Candela

Candela est une PWA de quiz biblique (livre de 1 Samuel, traduction Cornilescu), en roumain. Public : enfants et personnes peu à l'aise avec la technique, donc l'interface reste très simple.

## Stack
- Frontend : HTML, CSS et JavaScript natifs, sans framework, dans un seul fichier.
- Backend : Supabase (auth email + mot de passe, Postgres avec RLS, Edge Functions dans `supabase/functions/`).
- Hébergement : Vercel, site statique (`vercel.json`).

## Fichiers clés
- `src/app.html` : tout le frontend (HTML, CSS, JS). C'est le seul fichier à modifier pour l'interface.
- `content/1-samuel/intrebari/ch01..ch31.json` : questions (`easy` / `hard`). `content/1-samuel/text-cornilescu.json` : texte biblique.
- `index.html` et `sw.js` : générés, ne jamais les modifier à la main.
- `supabase/quiz_counts.sql` : généré par le build, à exécuter dans Supabase quand le nombre de questions change.
- `supabase/migrations/` : schéma de la base. Toute modification de base passe par une nouvelle migration.

## Commandes (Node.js, aucune dépendance)
```
npm run validate   # contrôle des questions
npm run build      # régénère index.html, sw.js, supabase/quiz_counts.sql
npm run serve      # http://localhost:8080
npm run dev        # build + serve
```
Après chaque modification de `src/app.html` ou d'un fichier de questions : `npm run validate` puis `npm run build`, et commiter les fichiers générés.

## Questions
- Types (`t`) : `tf` (`a` booléen), `one` (3 `opts`, `a` = index), `multi` (3 `opts`, `a` = liste d'index), `match` (exactement 3 `pairs`), `fill` (`___` dans `q`, `a` = liste de mots, texte identique au verset).
- Une question (vrai/faux, choix unique ou multiple, association) doit se comprendre sans avoir lu le chapitre, car elle peut tomber dans l'examen alb qui mélange tous les chapitres : nommer qui, où ou quand dans `q`. Les textes à compléter sont des versets et n'ont pas besoin de contexte.
- Toujours 3 choix au maximum, 20 questions par chapitre et niveau au maximum, et une `ref` (ex. `"14:24"`).
- L'identifiant d'une question est `<chapitre><e|h><index>` : seul l'ajout en fin de liste garde la progression des joueurs. Après un changement du nombre de questions, mettre à jour `quiz_counts`.

## Règles de style
- Thème clair uniquement, pas de mode sombre, aucun emoji.
- Variables CSS de `:root` (`--bg`, `--surface`, `--ink`, `--oil`, `--cedar`...) ; pas de style inline quand une classe suffit.
- Aucun texte ne doit passer sur deux lignes (vérifier à 320, 390 et 1280 px).
- Sobre : pas de médailles, de séries ni de notes explicatives (seul le minuteur d'étude de l'administrateur est autorisé, sur son accueil).

## État
L'objet global `S` de `app.html` contient le joueur (`S.player` : historique, questions réussies, chapitres) et la question en cours (`S.quiz`). Les vues se dessinent avec `mount(html)`.

## Propreté
Pas de code mort ni de scripts jetables dans le dépôt : tout script temporaire se supprime une fois la tâche finie.
