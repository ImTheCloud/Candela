# Instructions pour l'IA - Candela v2

Candela est une app web de quiz biblique (1 Samuel et 2 Samuel, traduction Cornilescu), en roumain. Public : enfants et personnes peu à l'aise avec la technique. Le plan complet et les décisions sont dans `docs/v2-plan.md`.

`main` contient la v2, en production sur https://candela-biblia.vercel.app. L'ancienne app (v1, Supabase) reste en archive sur la branche `v1` : ne rien y commiter.

## Stack
- Astro (site statique) + îlots Preact (`src/islands/`, montés avec `client:only="preact"` quand ils dépendent du compte), TypeScript strict.
- Firebase (projet `candela-64d25`) : Authentication email + mot de passe, Firestore. Règles dans `firestore.rules` (`firebase deploy --only firestore:rules`).
- Hébergement : Vercel (`vercel.json`), chaque push sur `main` part en production. Les audios ne sont pas sur Vercel : voir « Audio » plus bas.

## Fichiers clés
- `src/layouts/Base.astro` : en-tête, fil d'Ariane (`crumbs`), pied de page, polices.
- `src/styles/global.css` : variables de couleur (clair et sombre), boutons, formulaires.
- `src/lib/books.ts` (livres, texte), `src/lib/age.ts` (niveaux des questions), `src/lib/session.ts` (compte, profil), `src/lib/firebase.ts`.
- `content/<livre>/text-cornilescu.json` : texte biblique, un tableau de versets par chapitre.
- `content/<livre>/sursa/chNN.txt` : source des questions d'un chapitre ; `intrebari/chNN.json` en est généré (`scripts/qualite/build-chapter.mjs`).
- `src/lib/speech.ts` et `src/lib/speech-text.ts` : lecture à voix haute ; `scripts/generate-audio.mjs` : enregistre les audios dans `../candela-audio`.

## Commandes
```
npm run dev     # http://localhost:4321
npm run build   # dist/
npm run check   # vérification des types
node scripts/generate-audio.mjs --check   # les audios sont-ils à jour ?
```

## Audio (voix)
Chaque verset, chaque « Capitolul N. » et chaque question (énoncé et propositions) a un MP3 enregistré à l'avance, nommé par `audioFileName()` d'après son texte. Les MP3 sont dans un dépôt à part, public : `ImTheCloud/candela-audio`, cloné à côté du projet (`../candela-audio`) et servi par GitHub Pages (`https://imthecloud.github.io/candela-audio/<nom>.mp3`). Ils ne sont jamais dans `public/` : chaque déploiement Vercel les recopierait (limite de stockage du plan gratuit).

**Après toute modification d'une question, d'une proposition ou d'un verset** (`sursa/`, `intrebari/`, `text-cornilescu.json`, ou `speech-text.ts`), et avant de pousser Candela :
1. Si `../candela-audio` n'existe pas : `git clone https://github.com/ImTheCloud/candela-audio.git ../candela-audio`.
2. `node scripts/generate-audio.mjs` : enregistre seulement les textes nouveaux ou modifiés et supprime les audios qui ne servent plus (ffmpeg requis pour couper les silences).
3. Dans `../candela-audio` : `git add -A`, commit, `git push`. GitHub Pages publie en une minute environ.
4. `node scripts/generate-audio.mjs --check` doit afficher 0 manquant et 0 inutilisé.

Pousser `candela-audio` avant Candela : sinon le site en ligne cherche un audio qui n'existe pas encore et doit le synthétiser à la volée. Toujours lancer l'étape 2, même pour un petit changement : déplacer la bonne réponse (`*`) change l'ordre des propositions, donc l'audio. Si rien n'a changé à l'oral, elle ne fait rien.

## Règles
- Une vraie adresse par page (`/2-samuel/citire/5`), le bouton retour doit marcher.
- Couleurs uniquement via les variables de `:root`, en clair et en sombre. Aucun emoji.
- Aucun texte de bouton ou de titre court ne passe sur deux lignes (vérifier à 320, 375 et 1280 px).
- Questions : voir `docs/fonctionnement.md` (format, ajout d'un livre) et `docs/qualite-questions.md` (règles). La scène est écrite une fois par chapitre, jamais dans l'énoncé ; l'énoncé nomme quand même qui parle et à qui.
- Pas de point médian « · » dans les textes.
- Navigation sans rechargement (`ClientRouter` dans `Base.astro`) : un `<script>` de page s'exécute une seule fois, donc le mettre dans un écouteur `astro:page-load` (et arrêter ses `effect` à `astro:before-swap`). Pour changer l'adresse sans changer de page : `history.replaceState(history.state, …)`.
- Pas de dégradés, pas de cartes superposées : sections plates séparées par des filets. Un chargement affiche un squelette de la même forme que le contenu.
- Pas de code mort ni de scripts jetables dans le dépôt.
