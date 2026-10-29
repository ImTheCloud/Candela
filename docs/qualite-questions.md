# Qualité des questions : comment écrire, vérifier et corriger

Ce guide est pour la prochaine personne (ou IA) qui écrit ou reprend les questions. Le format des fichiers et le fonctionnement du site sont dans `docs/fonctionnement.md`, le barème de difficulté par niveau dans `docs/niveluri.md`.

État au 29 octobre 2026 : 2 Samuel en trois niveaux (Ușor, Mediu, Greu ; 72 questions par chapitre). Les trois niveaux du chapitre 1 ont été recalibrés (Ușor plus simple, Greu plus dur) : à valider par le propriétaire avant de refaire les autres chapitres de la même façon. 1 Samuel vidé, à refaire ensuite.

## Ce que le propriétaire exige (retours répétés)

1. **Chaque proposition répond à la question posée.** Si la question est « Ce a cunoscut David? », chaque proposition est une chose qu'il aurait pu connaître, formulée comme une réponse. Jamais un morceau de verset recopié (« îi ridica împărăția », « în mormântul lui Abner »), jamais un nom de lieu en réponse à « Ce a zis David? ».
2. **Choix multiple : des faits indépendants.** Les bonnes réponses ne sont jamais la suite l'une de l'autre ni deux formulations de la même chose. Chacune doit être juste toute seule.
3. **Pas de scène dans l'énoncé.** La scène est écrite une fois par chapitre (`scene:`) et ne s'affiche qu'en examen. L'énoncé doit quand même dire qui parle, à qui, de qui, où : jamais « Ce a zis femeia? », mais « Ce a spus femeia din Tecoa împăratului? ».
4. **Une question = une seule question**, terminée par un point d'interrogation. Un vrai/faux est une affirmation, sans point d'interrogation. Pas de question à la forme négative (« Cu ce NU… »).
5. **Fausses réponses plausibles** (Mediu et Greu) : elles parlent des vrais personnages, lieux et objets du chapitre ; en Greu, elles ne diffèrent de la bonne que par un détail. `node scripts/qualite/ancrage.mjs` liste celles qu'on élimine sans avoir lu.
6. **Longueur des propositions** : à partir de Mediu, la bonne réponse n'est ni visiblement la plus longue ni la plus courte (écart de plus de 10 caractères avec toutes les autres). Le plus simple : écrire des fausses réponses aussi précises que la bonne. En Ușor, on s'en moque.
7. **Vrai ou faux équilibré** : 4 à 6 vraies sur 10 par niveau. Une fausse change un nom, un chiffre, un lieu ou le sens ; jamais un détail douteux ni un piège sur un mot.
8. **Associations autonomes** : chaque paire doit se comprendre sans la consigne, car l'examen blanc mélange des paires de cinq chapitres (« Itream | al șaselea fiu al lui David », pas « Itream | al șaselea »).
9. **La référence couvre les versets de la réponse** : la fenêtre « Versetul » surligne ces versets.
10. **Sujets sensibles** (2 Samuel 11, 13) : rien de cru pour les plus jeunes ; on garde l'événement et la leçon.
11. **Pas de point médian « · »** dans les textes du site : une virgule, des parenthèses ou une autre phrase.
12. **Dire au propriétaire combien de questions ont été modifiées** à chaque correction.

## Écrire un chapitre

1. Lire le chapitre dans `content/<livre>/text-cornilescu.json`.
2. Écrire `content/<livre>/sursa/chNN.txt` : la scène, puis pour chaque niveau (`## usor`, `## mediu`, `## greu`) 10 `tf`, 10 `one`, 1 `match` de 5 paires, 3 `multi`. Un même fait peut revenir d'un niveau à l'autre, formulé selon le barème.
3. Varier les `multi` : selon les questions, une, deux ou trois bonnes réponses, et de temps en temps aucune.
4. Générer et valider :

```bash
node scripts/qualite/build-chapter.mjs 2-samuel 5 content/2-samuel/sursa/ch05.txt
node scripts/validate.mjs
```

`validate.mjs` refuse (erreur) : mauvais nombre de questions par type et par niveau, scène répétée dans un énoncé, deux points d'interrogation, question sans « ? », vrai/faux avec « ? », association sans verset par paire, versets inexistants. Il signale (avertissement) : réponse trahie par sa longueur, vrai/faux déséquilibré, bonne réponse trop souvent sur la même lettre. Un chapitre n'est fini qu'avec 0 erreur et 0 avertissement.

## Corriger une question

Modifier sa ligne **sur place** dans `sursa/chNN.txt`, régénérer le chapitre, valider. Ne jamais insérer ni supprimer de ligne au milieu d'un niveau : les identifiants suivraient l'ordre et la progression des joueurs serait décalée.

## Détecteurs

```bash
node scripts/qualite/scan.mjs fragments      # bonnes réponses qui ressemblent à un morceau de phrase
node scripts/qualite/scan.mjs continuation   # deux bonnes réponses dont l'une continue l'autre
node scripts/qualite/scan.mjs speech         # quelqu'un parle et l'énoncé ne dit pas qui
node scripts/qualite/scan.mjs double         # deux questions dans un énoncé
node scripts/qualite/scan.mjs vague          # nom défini sans antécédent (« capul », « omul »)
```

Ce sont des heuristiques par mots-clés : elles sortent des candidats, jamais une preuve. Il faut lire la liste et ne corriger que les vrais défauts. Le plus fiable reste de jouer un test et un examen blanc sur téléphone : une capture du propriétaire = un type de défaut à chercher partout.

## Pièges connus

- Écrire la bonne réponse avec soin et les fausses à la va-vite : c'est la première cause d'avertissement de longueur.
- Recopier le verset comme réponse : la proposition doit répondre à la question, pas la prolonger.
- Une paire d'association qui ne vit que par la consigne (« fils → mère ») : écrire la relation dans la colonne de droite.
- Les examens réels (`content/1-samuel/examene/`) gardent leur texte d'origine : on n'y touche pas (leurs avertissements de texte non exact sont normaux).
