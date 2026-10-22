# Candela v2 : état des lieux

Dernière mise à jour : 21 octobre 2026. Branche `v2` (la v1 reste sur `main`, intacte).

## Où ça tourne
- **Local :** `npm run dev` (émulateurs Firebase, données jetables) ou `npm run dev:live` (vrai Firebase). Port 4321.
- **Preview Vercel :** https://candela-git-v2-claudius-projects-0e716889.vercel.app (protégée, seul le propriétaire y accède ; ne pas changer la protection).
- **Firebase :** projet `candela-64d25` (Auth + Firestore eur3). Règles dans `firestore.rules`, déployées avec `firebase deploy --only firestore:rules --project candela-64d25`.
- **Commits :** en roumain, jamais de ligne « Co-Authored-By » (mémoire du projet).

## Fait
- **App :** Astro + Preact, PWA hors-ligne, mobile d'abord, toujours en clair (fond beige, lampe de la v1).
- **Comptes :** Firebase Auth (mot de passe oublié par email, œil sur le mot de passe), invité sans compte, compte parent avec enfants, plus aucune année de naissance : le niveau (sub 12, 12–13, 14–15, 16–17, 18–99) se choisit dans le menu du chapitre, le dernier choix est gardé pour tous les chapitres (`src/lib/level.ts`, clé `level`) ; un score par chapitre (`exams.c{N}`, meilleur score sur 100) ; le classement range chaque joueur au dernier niveau joué ; 31 comptes v1 migrés (Auth + Firestore, mots de passe conservés).
- **Questions :** refaites le 22 octobre 2026 selon le barème de `docs/niveluri.md` (difficulté par levier, plus liée aux examens réels). 1 Samuel 3 255 (31 ch.) et 2 Samuel 2 520 (24 ch.), soit 21 par chapitre et par âge (sub 12, 12–13, 14–15, 16–17, 18+) : 5 vrai/faux, 5 à une réponse, 1 association de 5 paires, 5 à compléter (un seul mot), 5 à plusieurs réponses. Un test de chapitre = un examen sur 100 (3, 4, 2 par paire, 5, 6 points). Relues contre le texte Cornilescu. 4 examens réels 1 Samuel 2026 reproduits (12–13, 14–15, 16–17, 18+), notés sur 100.
- **Accueil :** « Bun venit, {prénom} », 2 Samuel par défaut, bascule 1/2 Samuel sans rechargement (retenue en mémoire locale), grille de chapitres, tuile « Examene » après le dernier chapitre, carte « Clasament ».
- **Menu de chapitre :** « Citește capitolul » (cèdre) et « Testul capitolului » (orange, étiquette de catégorie, nombre de questions), « Mai greu » et « Greșelile mele » si utile.
- **Quiz :** correction avec bandeau Corect/Greșit, carte « De ce / Ce spune textul », résultat avec cercle de score et « De recitit ».
- **Signalement :** bouton « Semnalează o greșeală » sous chaque correction, page admin `/semnalari` (compte avec `admin: true`).
- **Autres :** lecture avec surlignage, clasement par livre et par âge (message pour les invités), bouton retour sur toutes les pages sauf l'accueil.
- **Profil (`/cont`) :** une seule page plate, sans cartes ni dégradés : identité, interrupteur parent, puis chaque joueur avec son progrès (la page `/progres` n'existe plus). Le dernier profil connu est gardé en mémoire locale pour s'afficher tout de suite.
- **Vitesse :** navigation sans rechargement (ClientRouter + préchargement au toucher), retour sans rechargement, prénom dans l'en-tête de l'accueil (« Bun venit, … ») à la place de « Candela ».
- **Supprimé sur demande :** mode sombre, guide du livre et carte, mode « par type de question », durée estimée des tests, pied de page.

## À faire / à vérifier
1. **Relecture humaine** des questions : tous les chapitres sont encore « de verificat » (`/{livre}/verificare`). Le bouton de signalement sert à ça.
2. **Bug « image d'une autre page au chargement » :** trois correctifs faits (styles du quiz chargés avec la page, redirection de livre avant l'affichage, fondu entre pages) mais la cause n'est pas reproduite. À re-tester sur téléphone.
3. **Compte admin :** vérifier que ton compte a bien `admin: true` (sinon ni « Semnalări » ni la page).
4. **Équilibre vrai/faux :** ≈ 2/3 de « vrai » dans les nouvelles questions.
5. **Examen blanc :** page présente mais basse priorité. 2 Samuel n'a pas d'examens réels.
6. **Questions de la v1 de 1 Samuel :** à décider si elles reviennent comme source de questions (dossier `content/1-samuel/intrebari-v1`). Examens réels : 12–13 à 18+ ont eu lieu le lundi 19 octobre 2026 ; l'examen sub 12 est prévu dans environ une semaine et demie (pas encore dans le site).

## Bascule vers la production (quand tu valides)
1. Refaire l'export Supabase (`scripts/export-supabase.sh`), puis relancer `node scripts/migrate-supabase.mjs <export.json>` (idempotent : ajoute, n'efface rien de la v2).
2. Merger `v2` dans `main`.
3. Garder Supabase en lecture seule quelque temps.

## Fichiers utiles
- `docs/v2-plan.md` : décisions du début. `AI.md` : consignes pour les IA. `README.md`.
- `content/{livre}/intrebari/chNN.json` : questions (générées depuis des sources compactes hors dépôt ; modifier le JSON directement est possible, puis `node scripts/validate.mjs`).
- `scripts/validate.mjs` : règles (un seul trou, un seul mot ; paires uniques ; versets exacts).

## Classements (octobre 2026)
- En bas de l'accueil : classement du livre affiché, tous niveaux ou un niveau. Un grand carré par joueur, une ligne chacun. Pas de classement par chapitre ni de classement de toute l'app.
- Données : `boards/{livre}/players/{uid}~{joueur}` = `score` (questions connues, vérifié par les règles) et `lv` (par niveau). Code : `src/lib/board.ts`. Les entrées se remplissent à chaque nouvelle question réussie, et une fois pour les joueurs qui avaient déjà répondu (effet de rattrapage dans `src/lib/progress.ts`).
- Les règles (`firestore.rules`) acceptent encore d'anciens champs (`ct`, `ch`, `boards/all`) : inoffensif, à nettoyer à l'occasion. Après chaque changement de règles : `firebase deploy --only firestore:rules`.
- Les examens (blanc ou réels) ne comptent pas pour les classements.
