# Instructions pour l'IA - Candela v2 (branche `v2`)

Candela est une app web de quiz biblique (1 Samuel et 2 Samuel, traduction Cornilescu), en roumain. Public : enfants et personnes peu à l'aise avec la technique. Le plan complet et les décisions sont dans `docs/v2-plan.md`.

`main` contient encore l'ancienne app (v1, Supabase), utilisée par des joueurs : ne jamais commiter la v2 sur `main` ni modifier la base Supabase avant la bascule.

## Stack
- Astro (site statique) + îlots Preact (`src/islands/`, montés avec `client:only="preact"` quand ils dépendent du compte), TypeScript strict.
- Firebase (projet `candela-64d25`) : Authentication email + mot de passe, Firestore. Règles dans `firestore.rules` (`firebase deploy --only firestore:rules`).
- Hébergement : Vercel (`vercel.json`), la branche `v2` a sa propre adresse de prévisualisation.

## Fichiers clés
- `src/layouts/Base.astro` : en-tête, fil d'Ariane (`crumbs`), pied de page, polices.
- `src/styles/global.css` : variables de couleur (clair et sombre), boutons, formulaires.
- `src/lib/books.ts` (livres, texte), `src/lib/age.ts` (catégories d'âge), `src/lib/session.ts` (compte, profil), `src/lib/firebase.ts`.
- `content/<livre>/text-cornilescu.json` : texte biblique, un tableau de versets par chapitre.
- `content/<livre>/sursa/chNN.txt` : source des questions d'un chapitre ; `intrebari/chNN.json` en est généré (`scripts/qualite/build-chapter.mjs`).

## Commandes
```
npm run dev     # http://localhost:4321
npm run build   # dist/
npm run check   # vérification des types
```

## Règles
- Une vraie adresse par page (`/2-samuel/citire/5`), le bouton retour doit marcher.
- Couleurs uniquement via les variables de `:root`, en clair et en sombre. Aucun emoji.
- Aucun texte de bouton ou de titre court ne passe sur deux lignes (vérifier à 320, 375 et 1280 px).
- Questions : voir `docs/fonctionnement.md` (format, ajout d'un livre) et `docs/qualite-questions.md` (règles). La scène est écrite une fois par chapitre, jamais dans l'énoncé ; l'énoncé nomme quand même qui parle et à qui.
- Pas de point médian « · » dans les textes.
- Navigation sans rechargement (`ClientRouter` dans `Base.astro`) : un `<script>` de page s'exécute une seule fois, donc le mettre dans un écouteur `astro:page-load` (et arrêter ses `effect` à `astro:before-swap`). Pour changer l'adresse sans changer de page : `history.replaceState(history.state, …)`.
- Pas de dégradés, pas de cartes superposées : sections plates séparées par des filets. Un chargement affiche un squelette de la même forme que le contenu.
- Pas de code mort ni de scripts jetables dans le dépôt.
