# Niveaux des questions : barème

Les niveaux (sub 12, 12–13, 14–15, 16–17, 18+) ne se calquent **pas** sur les examens réels (écrits par des humains, la tranche d'âge n'y est pas toujours respectée). Ils suivent ce barème, appliqué de la même façon à chaque chapitre de 1 et 2 Samuel. Chaque chapitre a ses propres questions : les niveaux se distinguent à l'intérieur du chapitre, pas par des liens vers d'autres chapitres.

Quatre leviers montent ensemble d'un niveau au suivant :

| Levier | sub 12 | 12–13 | 14–15 | 16–17 | 18+ |
|---|---|---|---|---|---|
| **Fait demandé** | l'histoire centrale du chapitre | tous les événements | paroles, causes, conséquences | détails : noms, lieux, chiffres, ordre | détails les plus fins, mot exact, versets moins en vue |
| **Distance au texte** | presque les mots du verset | paraphrase simple | paraphrase | reformulation | reformulation, nuances |
| **Propositions** (3) | deux fausses évidemment hors sujet | une absurde, une plausible | deux plausibles, même scène | trois plausibles | trois proches : mêmes personnages, même détail changé |
| **Compléter** (un mot) | mot très connu du verset entier (nom, Domnul, chivotul…) | idem | idem | idem, un peu moins en vue | idem, un peu moins en vue |

Règles communes :
- Compléter : le verset est toujours donné en entier ; le mot manquant est un nom propre ou un mot courant de l'histoire (choisi par fréquence dans le texte), jamais un mot technique ni un mot qui revient dans le verset. Les nombres écrits en chiffres sont acceptés.
- 21 questions par chapitre et par niveau : 5 vrai/faux, 5 à une réponse, 1 association de 5 paires (colonne de droite sans doublons), 5 à compléter (un seul mot, jamais présent ailleurs dans la phrase), 5 à plusieurs réponses (0, 1, 2 ou 3 justes).
- Vrai/faux : 2 ou 3 « vrai » sur 5 ; les faux changent un nom, un chiffre, un lieu ou un sens, jamais un détail douteux.
- Contexte : chaque énoncé porte sa scène (qui, où, à quel moment : « la nuit de l'appel à Silo », « après la première défaite d'Eben-Ezer »), même pour les adultes. Un examen blanc pioche dans tous les chapitres : on doit toujours comprendre de quel passage parle la question sans rien ajouter. L'écran de question affiche aussi le chapitre (livre, verset, titre).
- À une réponse : l'ordre des propositions est mélangé à la génération ; la bonne n'est pas systématiquement la plus longue ni la plus courte. À partir de 14–15 ans, les propositions ont une longueur proche de la bonne réponse (pas d'indice par la longueur) ; pour les enfants, on s'en moque.
- Sujets sensibles (Samuel 11, 13) : rien de cru pour les plus jeunes ; on garde l'événement et la leçon.
- La correction du mot à compléter accepte une faute de frappe (une lettre en trop, en moins, changée ou deux lettres inversées) et les mots de même sens (Domnul, Dumnezeu, Doamne ; împărat, rege).

Vérifications faites : `node scripts/validate.mjs` (forme, versets, un mot par trou) ; un audit lexical qui repère les bonnes réponses sans appui dans le verset cité et les fausses qui y figurent entièrement ; relecture à la main des cas signalés.

Les identifiants des questions ont changé (série 201 et suivantes par chapitre et par niveau). Les anciennes réponses enregistrées par un joueur (liste « Greșelile mele », questions « știute ») ne correspondent plus à aucune question ; elles ne comptent plus qu'au total du classement.
