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
- Une question nomme toujours qui, où et quand : elle doit se comprendre seule, mélangée dans un examen.
- Pas de code mort ni de scripts jetables dans le dépôt.
