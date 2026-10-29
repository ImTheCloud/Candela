# Niveaux des questions : barème

Depuis le 29 octobre 2026, les questions des chapitres n'ont plus de tranches d'âge mais trois niveaux, avec un âge conseillé (les examens réels du concours gardent leurs tranches d'âge) :

| | Ușor | Mediu | Greu |
|---|---|---|---|
| **Pour qui** | moins de 12 ans | 12 à 17 ans | 18 ans et plus |
| **Fait demandé** | l'histoire centrale du chapitre | tous les événements, paroles, causes et conséquences | détails précis : qui a dit quoi à qui, mots exacts, chiffres, noms (pères, villes d'origine), lieux, ordre des événements |
| **Distance au texte** | presque les mots du verset | paraphrase | reformulation, nuances |
| **Propositions** (3) | une seule plausible, les autres clairement hors sujet | toutes ancrées dans le chapitre (vrais personnages, vrais lieux) : on ne devine pas sans avoir lu | trois très proches : la même scène avec un seul détail changé, ou un autre vrai fait du chapitre mal attribué |
| **Vrai ou faux** | le faux change le sens de l'histoire | le faux change un nom, un lieu ou une action | le faux change un seul détail précis (un nom, un chiffre, la personne qui parle) |

Règles communes :
- 24 questions par chapitre et par niveau (forme de l'examen final) : 10 vrai/faux, 10 à une réponse, 1 association de 5 paires (colonne de droite sans doublons, chaque paire compréhensible seule), 3 à plusieurs réponses (0, 1, 2 ou 3 justes).
- Vrai/faux : 4 à 6 « vrai » sur 10 ; jamais un détail douteux ni un piège sur un mot.
- Greu doit être difficile, pas absurde : pas de listes de généalogie apprises par cœur, pas de piège de formulation ; la réponse est toujours écrite clairement dans les versets cités.
- Contexte : la scène est écrite une fois par chapitre et affichée seulement quand les chapitres sont mélangés (examen blanc). L'énoncé nomme quand même qui parle, à qui, de qui.
- À partir de Mediu, les propositions ont une longueur proche de la bonne réponse.
- Sujets sensibles (Samuel 11, 13) : rien de cru, surtout en Ușor ; on garde l'événement et la leçon.

Vérifications : `node scripts/validate.mjs` (nombre par type et par niveau, forme des énoncés, versets, longueurs, équilibre vrai/faux) et `node scripts/qualite/ancrage.mjs` (fausses réponses trop faciles à éliminer en Mediu et Greu), puis relecture.

Les identifiants contiennent le niveau (`2sa.5.greu.301`). Les anciens identifiants par âge n'existent plus ; le classement de 2 Samuel repart de zéro au passage aux niveaux.
