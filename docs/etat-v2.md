# Candela v2 : état des lieux

Dernière mise à jour : 29 octobre 2026. Branche `v2` (la v1 reste sur `main`, intacte).

## Où ça tourne
- **Local :** `npm run dev` (émulateurs Firebase, données jetables) ou `npm run dev:live` (vrai Firebase). Port 4321.
- **Preview Vercel :** https://candela-git-v2-claudius-projects-0e716889.vercel.app (protégée, seul le propriétaire y accède ; ne pas changer la protection).
- **Firebase :** projet `candela-64d25` (Auth + Firestore eur3). Règles dans `firestore.rules`, déployées avec `firebase deploy --only firestore:rules --project candela-64d25`.
- **Commits :** en roumain, jamais de ligne « Co-Authored-By » (mémoire du projet).

## Fait
- **App :** Astro + Preact, PWA hors-ligne, mobile d'abord, toujours en clair (fond beige, lampe de la v1).
- **Comptes :** Firebase Auth (mot de passe oublié par email, œil sur le mot de passe), invité sans compte, compte parent avec enfants, plus aucune année de naissance : le niveau (sub 12, 12–13, 14–15, 16–17, 18–99) se choisit dans le menu du chapitre, le dernier choix est gardé pour tous les chapitres (`src/lib/level.ts`, clé `level`) ; un score par chapitre (`exams.c{N}`, meilleur score sur 100) ; le classement range chaque joueur au dernier niveau joué ; 31 comptes v1 migrés (Auth + Firestore, mots de passe conservés).
- **Questions :** réécrites entièrement le 29 octobre 2026. 2 Samuel : 24 chapitres × 120 questions (pour chaque âge : 10 vrai/faux, 10 à une réponse, 1 association de 5 paires, 3 à plusieurs réponses ; plus de textes à compléter). 1 Samuel est vide (« în pregătire ») jusqu'à validation de 2 Samuel. La scène est stockée par chapitre et affichée seulement en examen. Chaque question vaut 1 point, score en pourcentage ; l'examen blanc a la forme de l'examen final (10 + 10 + 1 + 3), son association prend une paire dans cinq chapitres. 4 examens réels 1 Samuel 2026 conservés.
- **Accueil :** « Bun venit, {prénom} », 2 Samuel par défaut, bascule 1/2 Samuel sans rechargement (retenue en mémoire locale), grille de chapitres, tuile « Examene » après le dernier chapitre, carte « Clasament ».
- **Lecture :** titre « Capitolul 4 (22 de versete) », barre du bas : précédent, « Începe întrebările », suivant (plus de sélecteur de chapitre).
- **Menu de chapitre :** « Citește capitolul » (cèdre) et « Testul capitolului » (orange, étiquette de catégorie, nombre de questions), « Mai greu » et « Greșelile mele » si utile.
- **Quiz :** un seul écran pour tout (test de chapitre, examen blanc, examen réel refait, greșeli) : barre de progression et compteur « 4/21 » dans l'en-tête, ligne « type · tranche d'âge · Semnalează », ligne « livre verset », lampe Candela sur chaque question, réponses « tactiles », barre du bas (Verifică, puis panneau vert/rouge avec Corect/Greșit, « Versetul » et « Mai departe »). Les examens sont des tests comme les autres, notés sur 21 (plus de partie en chiffres romains, plus de note sur 100). Résultat avec cercle de score, barres par type de question et « De recitit » (« Vezi versetul » seulement). Les scores de chapitre sont gardés par niveau (`c5@14-15`) : tuiles et fenêtre montrent le score du niveau choisi. « Greșelile mele » ne donne pas de points. Les textes à compléter montrent le verset en entier.
- **Signalement :** bouton « Semnalează » en haut de chaque question (fenêtre courte, tous les boutons visibles), page admin `/semnalari` (compte avec `admin: true`).
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
6. **1 Samuel :** questions à réécrire au nouveau format après validation de 2 Samuel (les anciennes, v1 comprise, sont supprimées ; elles restent dans l'historique git). Examens réels : 12–13 à 18+ ont eu lieu le lundi 19 octobre 2026 ; l'examen sub 12 est prévu dans environ une semaine et demie (pas encore dans le site).

## Bascule vers la production (quand tu valides)
1. Refaire l'export Supabase (`scripts/export-supabase.sh`), puis relancer `node scripts/migrate-supabase.mjs <export.json>` (idempotent : ajoute, n'efface rien de la v2).
2. Merger `v2` dans `main`.
3. Garder Supabase en lecture seule quelque temps.

## Fichiers utiles
- `docs/v2-plan.md` : décisions du début. `AI.md` : consignes pour les IA. `README.md`.
- `content/{livre}/sursa/chNN.txt` : source des questions ; `intrebari/chNN.json` est généré par `scripts/qualite/build-chapter.mjs`. Voir `docs/fonctionnement.md`.
- `scripts/validate.mjs` : règles (nombre par type et par âge, forme des énoncés, longueurs, versets).

## Classements (octobre 2026)
- En bas de l'accueil : classement du livre affiché, tous niveaux ou un niveau. Un grand carré par joueur, une ligne chacun. Pas de classement par chapitre ni de classement de toute l'app.
- Données : `boards/{livre}/players/{uid}~{joueur}` = `score` (questions connues, vérifié par les règles) et `lv` (par niveau). Code : `src/lib/board.ts`. Les entrées se remplissent à chaque nouvelle question réussie, et une fois pour les joueurs qui avaient déjà répondu (effet de rattrapage dans `src/lib/progress.ts`).
- Les règles (`firestore.rules`) acceptent encore d'anciens champs (`ct`, `ch`, `boards/all`) : inoffensif, à nettoyer à l'occasion. Après chaque changement de règles : `firebase deploy --only firestore:rules`.
- Les examens (blanc ou réels) ne comptent pas pour les classements.
