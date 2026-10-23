# Qualité des questions : comment vérifier et corriger

Ce guide est pour la prochaine personne (ou IA) qui reprend les questions de `content/{livre}/intrebari/chNN.json` (1 et 2 Samuel : 55 chapitres, 105 questions par chapitre, 21 par tranche d'âge). Voir aussi `docs/niveluri.md` (le barème) et `docs/etat-v2.md` (l'état du projet).

## Ce que l'utilisateur exige (retours répétés)

1. **Contexte partout.** Un examen blanc pioche dans tous les chapitres : chaque question doit se comprendre seule. Les questions de chapitre portent donc leur scène : préfixe `La Silo, în noaptea chemării lui Samuel: …` (phrases de scène par chapitre dans `scripts/qualite/scenes.mjs`). Les associations disent leur épisode (`…, în episodul „Titlu”`). Les textes à compléter montrent le verset entier. Même pour les adultes.
2. **Précision.** Dire qui parle, à qui, de qui, où : jamais « Ce a zis femeia ? » ou « În mormântul cui a fost îngropat capul ? ». Nommer le personnage (« capul lui Iș-Boșet »).
3. **Une question = une seule question.** Pas deux interrogatifs dans un énoncé (« Ce a făcut X cu Y și cu capul lui Z ? »).
4. **Chaque proposition répond à la question posée**, en phrase complète. Pas de fragments de verset (« în mormântul lui Abner », « ca să nu moară »). Dans une question à plusieurs réponses, les bonnes réponses sont des faits **indépendants** : jamais la suite l'une de l'autre (« au fugit la Ghitaim » + « au locuit acolo până azi » : à fusionner).
5. **Longueur des propositions** : à partir de 14–15 ans, la bonne réponse n'est ni la plus longue ni la plus courte de façon visible (écart > ~10 caractères). Pour les enfants, on s'en moque.
6. **Textes à compléter** : un seul mot, courant et facile (nom propre, Domnul, chivotul…), jamais présent ailleurs dans le verset ; les chiffres écrits en chiffres sont acceptés. `scripts/qualite/easyfill.mjs` choisit le mot par fréquence.
7. **La référence (`ref`) couvre les versets où se trouve la réponse** : la fenêtre « Versetul » surligne ces versets ; si la bonne réponse est dans le verset voisin, il n'est pas surligné. `scripts/qualite/refs.mjs` étend la référence.
8. **Les `id` ne changent jamais** : les points déjà gagnés y sont rattachés. On corrige le texte, pas l'identifiant. (Changer le sens d'une bonne réponse laisse le point à ceux qui avaient réussi l'ancienne version ; c'est accepté.)
9. **Dire à l'utilisateur combien de questions ont été modifiées** à chaque correction.

## Détecteurs (à lancer depuis la racine du dépôt)

```bash
node scripts/qualite/scan.mjs fragments      # propositions justes qui ne sont qu'un morceau de phrase
node scripts/qualite/scan.mjs continuation   # deux bonnes réponses dont l'une continue l'autre
node scripts/qualite/scan.mjs speech         # quelqu'un parle/demande et l'énoncé ne dit pas qui
node scripts/qualite/scan.mjs double         # deux questions dans un énoncé
node scripts/qualite/scan.mjs noscene        # énoncé sans scène devant (doit donner 0)
node scripts/qualite/scan.mjs vague          # nom défini sans antécédent (« capul », « omul »)
node scripts/qualite/lens2.mjs /tmp/len.json # propositions adultes dont la longueur trahit la bonne réponse
node scripts/qualite/refs.mjs                # (sans argument : simulation) références trop courtes
node scripts/validate.mjs                    # forme, versets, un mot par trou (0 erreur exigé)
```

Les détecteurs sont des **heuristiques par mots-clés** : ils sortent des candidats, jamais une preuve. Il faut lire la liste et ne corriger que les vrais défauts. Ils ne voient pas tout (un défaut qui ne contient aucun mot-clé passe). Le plus fiable reste de jouer un examen blanc et de relire ce qui choque ; l'utilisateur envoie des captures, une capture = un type de défaut à chercher ailleurs avec un nouveau détecteur.

## Corriger

Les fichiers JSON se modifient avec les scripts d'application (chacun lit un petit JSON `id → changement`, ne change que ce qu'on lui donne, et garde l'`id`) :

| Script | Ce qu'il change | Format du JSON |
|---|---|---|
| `applyfull.mjs` | énoncé, propositions, bonnes réponses | `{"id": {"q": "…", "opts": ["…"], "a": 0 ou [0,2]}}` |
| `applyopts.mjs` | propositions seules (bonne réponse inchangée) | `{"id": ["a", "b", "c"]}` |
| `applyq.mjs` | énoncé entier | `{"id": "nouvel énoncé"}` |
| `applytail.mjs` | énoncé **sans toucher à la scène** devant | `{"id": "énoncé sans préfixe"}` |
| `showq.mjs` | affiche des questions | liste d'identifiants, un par ligne, avant ` | ` |

`a` = index de la bonne réponse (`one`) ou tableau d'index (`multi`, peut être vide : « Niciun răspuns corect »). Après chaque lot : `node scripts/validate.mjs`, puis `npm run build`, puis commit (message en roumain, **sans** ligne Co-Authored-By : règle de l'utilisateur) et push sur `v2`.

Autres outils : `scenes.mjs` (préfixe de scène ; ajouter un chapitre = ajouter sa phrase de scène), `easyfill.mjs write` (re-choisit les mots à compléter : à n'utiliser que si l'on veut refaire tous les trous).

## Méthode recommandée pour une nouvelle passe

1. Lancer les détecteurs, lire chaque liste.
2. Pour chaque vrai défaut, écrire la correction complète : stem + propositions + `a` cohérents, propositions de longueur proche (adultes), faits **vérifiés dans le texte** (`content/{livre}/text-cornilescu.json`, chapitre → liste de versets).
3. Appliquer par lots de 30–80 avec les scripts, valider, builder, pousser.
4. Annoncer à l'utilisateur le nombre exact de questions modifiées et ce qui n'a pas été vérifié.
5. Échantillonner : jouer un examen blanc dans le navigateur (`npm run build` puis `astro preview`) et regarder 20 questions au hasard.

## Pièges connus

- Un énoncé qui commence par « În / La / Din » peut être une question et non une scène : le détecteur `noscene` regarde le préfixe `…: ` et non le premier mot.
- Les propositions d'une question à plusieurs réponses ont été générées à partir de morceaux de versets : c'est la source de la plupart des défauts (fragments, continuations, hors-sujet).
- Un nom propre au début d'un énoncé a une majuscule sans être un nom : les détecteurs ignorent le premier mot.
- `ref` en liste (« 1:3, 5 ») n'est pas traité par `refs.mjs` (seulement `c:v` ou `c:a-b`).
- Les examens réels (`content/1-samuel/examene/`) gardent leur texte d'origine : on n'y touche pas.
