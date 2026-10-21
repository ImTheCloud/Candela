# Candela v2 : état des lieux

Dernière mise à jour : 21 octobre 2026. Branche `v2` (la v1 reste sur `main`, intacte).

## Où ça tourne
- **Local :** `npm run dev` (émulateurs Firebase, données jetables) ou `npm run dev:live` (vrai Firebase). Port 4321.
- **Preview Vercel :** https://candela-git-v2-claudius-projects-0e716889.vercel.app (protégée, seul le propriétaire y accède ; ne pas changer la protection).
- **Firebase :** projet `candela-64d25` (Auth + Firestore eur3). Règles dans `firestore.rules`, déployées avec `firebase deploy --only firestore:rules --project candela-64d25`.
- **Commits :** en roumain, jamais de ligne « Co-Authored-By » (mémoire du projet).

## Fait
- **App :** Astro + Preact, PWA hors-ligne, mobile d'abord, toujours en clair (fond beige, lampe de la v1).
- **Comptes :** Firebase Auth (mot de passe oublié par email, œil sur le mot de passe), invité sans compte, compte parent avec enfants, année de naissance demandée dans une fenêtre obligatoire (toi + chaque enfant), 31 comptes v1 migrés (Auth + Firestore, mots de passe conservés).
- **Questions :** 1 Samuel 2 325 (31 ch.) et 2 Samuel 1 800 (24 ch.), 15 par chapitre et par âge (sub 12, 12–13, 14–15, 16–17, 18+), 3 par type. Relues contre le texte Cornilescu (≈ 45 corrections). 4 examens réels 1 Samuel 2026 reproduits (12–13, 14–15, 16–17, 18+), notés sur 100.
- **Accueil :** « Bun venit, {prénom} », 2 Samuel par défaut, bascule 1/2 Samuel sans rechargement (retenue en mémoire locale), grille de chapitres, tuile « Examene » après le dernier chapitre, carte « Clasament ».
- **Menu de chapitre :** « Citește capitolul » (cèdre) et « Testul capitolului » (orange, étiquette de catégorie, nombre de questions), « Mai greu » et « Greșelile mele » si utile.
- **Quiz :** correction avec bandeau Corect/Greșit, carte « De ce / Ce spune textul », résultat avec cercle de score et « De recitit ».
- **Signalement :** bouton « Semnalează o greșeală » sous chaque correction, page admin `/semnalari` (compte avec `admin: true`).
- **Autres :** lecture avec surlignage, clasement par livre et par âge (message pour les invités), progrès par enfant, bouton retour sur toutes les pages sauf l'accueil, page de profil refaite (avatar, famille, interrupteur parent).
- **Supprimé sur demande :** mode sombre, guide du livre et carte, mode « par type de question », durée estimée des tests, pied de page.

## À faire / à vérifier
1. **Relecture humaine** des questions : tous les chapitres sont encore « de verificat » (`/{livre}/verificare`). Le bouton de signalement sert à ça.
2. **Bug « image d'une autre page au chargement » :** trois correctifs faits (styles du quiz chargés avec la page, redirection de livre avant l'affichage, fondu entre pages) mais la cause n'est pas reproduite. À re-tester sur téléphone.
3. **Compte admin :** vérifier que ton compte a bien `admin: true` (sinon ni « Semnalări » ni la page).
4. **Équilibre vrai/faux :** ≈ 2/3 de « vrai » dans les nouvelles questions.
5. **Examen blanc :** page présente mais basse priorité. 2 Samuel n'a pas d'examens réels.
6. **Dernière page touchée (profil) :** commit en cours ; le rendu des boutons « Schimbă / Șterge » des enfants était en cours de réglage.

## Bascule vers la production (quand tu valides)
1. Refaire l'export Supabase (`scripts/export-supabase.sh`), puis relancer `node scripts/migrate-supabase.mjs <export.json>` (idempotent : ajoute, n'efface rien de la v2).
2. Merger `v2` dans `main`.
3. Garder Supabase en lecture seule quelque temps.

## Fichiers utiles
- `docs/v2-plan.md` : décisions du début. `AI.md` : consignes pour les IA. `README.md`.
- `content/{livre}/intrebari/chNN.json` : questions (générées depuis des sources compactes hors dépôt ; modifier le JSON directement est possible, puis `node scripts/validate.mjs`).
- `scripts/validate.mjs` : règles (un seul trou, un seul mot ; paires uniques ; versets exacts).
