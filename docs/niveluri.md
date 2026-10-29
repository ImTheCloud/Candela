# Niveaux des questions : barème

Les niveaux (sub 12, 12–13, 14–15, 16–17, 18+) ne se calquent **pas** sur les examens réels (écrits par des humains, la tranche d'âge n'y est pas toujours respectée). Ils suivent ce barème, appliqué de la même façon à chaque chapitre de 1 et 2 Samuel. Chaque chapitre a ses propres questions : les niveaux se distinguent à l'intérieur du chapitre, pas par des liens vers d'autres chapitres.

Trois leviers montent ensemble d'un niveau au suivant :

| Levier | sub 12 | 12–13 | 14–15 | 16–17 | 18+ |
|---|---|---|---|---|---|
| **Fait demandé** | l'histoire centrale du chapitre | tous les événements | paroles, causes, conséquences | détails : noms, lieux, chiffres, ordre | détails les plus fins, mot exact, versets moins en vue |
| **Distance au texte** | presque les mots du verset | paraphrase simple | paraphrase | reformulation | reformulation, nuances |
| **Propositions** (3) | deux fausses évidemment hors sujet | une absurde, une plausible | deux plausibles, même scène | trois plausibles | trois proches : mêmes personnages, même détail changé |

Règles communes :
- 24 questions par chapitre et par niveau (forme de l'examen final) : 10 vrai/faux, 10 à une réponse, 1 association de 5 paires (colonne de droite sans doublons, chaque paire compréhensible seule), 3 à plusieurs réponses (0, 1, 2 ou 3 justes). Plus de textes à compléter.
- Vrai/faux : 4 à 6 « vrai » sur 10 ; les faux changent un nom, un chiffre, un lieu ou un sens, jamais un détail douteux.
- Contexte : la scène (qui, où, à quel moment) est écrite une fois par chapitre et affichée seulement quand les chapitres sont mélangés (examen blanc). L'énoncé nomme quand même les personnes : qui parle, à qui, de qui.
- À une réponse : l'ordre des propositions est mélangé à la génération ; la bonne n'est pas systématiquement la plus longue ni la plus courte. À partir de 14–15 ans, les propositions ont une longueur proche de la bonne réponse (pas d'indice par la longueur) ; pour les enfants, on s'en moque.
- Sujets sensibles (Samuel 11, 13) : rien de cru pour les plus jeunes ; on garde l'événement et la leçon.

Vérifications : `node scripts/validate.mjs` (nombre par type et par âge, forme des énoncés, versets, longueurs des propositions, équilibre vrai/faux) et les détecteurs de `docs/qualite-questions.md`.

Les identifiants ont changé le 29 octobre 2026 (série 301 et suivantes, réécriture complète de 2 Samuel) ; le classement de 2 Samuel repart de zéro.
