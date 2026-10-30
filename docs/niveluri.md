# Niveaux des questions : barème

Depuis le 29 octobre 2026, les questions des chapitres n'ont plus de tranches d'âge mais trois niveaux, avec un âge conseillé (les examens réels du concours gardent leurs tranches d'âge) :

| | Ușor | Mediu | Greu |
|---|---|---|---|
| **Pour qui** | moins de 12 ans | 12 à 17 ans | 18 ans et plus |
| **Fait demandé** | l'histoire centrale du chapitre | tous les événements, paroles, causes et conséquences | détails précis : qui a dit quoi à qui, mots exacts, chiffres, noms (pères, villes d'origine), lieux, ordre des événements |
| **Distance au texte** | presque les mots du verset | paraphrase | reformulation, nuances |
| **Propositions** (3) | des choses bibliques simples mais fausses ici, jamais absurdes | toutes ancrées dans le chapitre (vrais personnages, vrais lieux) : on ne devine pas sans avoir lu | trois très proches : la même scène avec un seul détail changé, ou un autre vrai fait du chapitre mal attribué |
| **Vrai ou faux** | le faux change le sens de l'histoire | le faux change un nom, un lieu ou une action | le faux change un seul détail précis (un nom, un chiffre, la personne qui parle) |

## Calibrage de référence : 2 Samuel 1 (30 octobre 2026)

Après un premier test du propriétaire (Ușor « un chouïa trop facile », Mediu « vraiment trop facile », Greu « un chouïa trop facile »), le chapitre 1 a été réécrit un cran plus dur en Ușor et Greu, deux crans en Mediu. **Une fois validé, c'est ce chapitre qui sert de modèle pour tous les autres** (2 Samuel, puis 1 Samuel) : relire `content/2-samuel/sursa/ch01.txt` avant d'écrire un chapitre.

**Ușor** : les faits principaux, mais il faut avoir lu ou écouté le chapitre. Plus de réponses absurdes (« pe o corabie », « cu melcii ») : les fausses réponses sont des choses bibliques simples mais fausses ici.
- vrai/faux : « Saul a murit pe muntele Carmel. » (faux, c'était Ghilboa)
- une réponse : « Din ce popor era tânărul care a adus vestea? » amalecit / filistean / egiptean
- une réponse : « Pentru cine a făcut David cântarea de jale? » Saul și Ionatan / Saul și Abner / Ionatan și Mical

**Mediu** : à peu près le niveau qu'avait l'ancien Greu. Paroles, détails importants (jour, lieu, qui), fausses réponses toutes tirées du chapitre ou très plausibles.
- une réponse : « În a câta zi a venit omul din tabăra lui Saul? » a treia / a doua / a șaptea
- une réponse : « Ce motiv i-ar fi dat Saul tânărului ca să-l omoare? » îl apucase amețeala / era rănit de o săgeată / nu voia să cadă viu
- vrai/faux : « David și oamenii lui au jelit doar pentru Saul și Ionatan. » (faux : aussi pour le peuple)

**Greu** : détails précis et ordre exact, mots exacts, propositions qui se ressemblent presque mot pour mot ; toujours écrit clairement dans le texte.
- une réponse : « Ce a spus omul întâi […]? » că poporul a fugit / că Saul și Ionatan au murit / că un mare număr de oameni a pierit (les trois sont dans le verset, seule la première vient en premier)
- vrai/faux : « David i-a spus amalecitului: „Sângele lui Saul să cadă asupra capului tău.” » (faux : « sângele tău »)
- vrai/faux : « David l-a întrebat pe tânăr „De unde ești?” abia după ce au jelit. » (vrai, ordre des versets 12-13)
- association : les images de la cântare reliées à la personne qu'elles décrivent.

## Réglage fin après le chapitre 22 (31 octobre 2026)

Retour du propriétaire : Ușor un tout petit peu trop dur, Mediu un tout petit peu trop facile, Greu très bien mais à peine trop dur. Appliqué aux chapitres 1, 21 et 22, et à suivre pour tous les autres :
- **Ușor** : les images et les faits les plus parlants ; dans une question à une réponse, une seule fausse réponse plausible et une clairement à côté ; jamais une expression exacte à retenir (« scutul mântuirii Sale »).
- **Mediu** : des fausses réponses de la même famille que la bonne (« valurile morții / valurile mării / șuvoaiele apelor ») ; un faux change un détail, pas le sens général.
- **Greu** : au plus deux ou trois pièges de mots exacts par test (moitiés de verset inversées, quasi-synonymes, lieux voisins) ; le reste en détails précis mais faciles à retenir (qui, combien, dans quel ordre, quelle image).
- **Associations, à tous les niveaux** : la réponse ne répète jamais le mot de la colonne de gauche (« cel bun → Domnul este bun » est interdit).
- **Chapitres de poésie** (cântări, 2 Samuel 22, une partie de 1 et 23) : ils paraissent naturellement plus durs ; viser un cran plus simple que pour un chapitre d'histoire au même niveau.

Règles communes :
- 24 questions par chapitre et par niveau (forme de l'examen final) : 10 vrai/faux, 10 à une réponse, 1 association de 5 paires (colonne de droite sans doublons, chaque paire compréhensible seule), 3 à plusieurs réponses (0, 1, 2 ou 3 justes).
- Vrai/faux : 4 à 6 « vrai » sur 10 ; jamais un détail douteux ni un piège sur un mot.
- Un faux (ou une mauvaise réponse) doit être faux dans toute la Bible, pas seulement « selon ce verset » : rien qui soit vrai dans un autre chapitre ou dans 1 Samuel.
- Greu doit être difficile, pas absurde : pas de listes de généalogie apprises par cœur, pas de piège de formulation ; la réponse est toujours écrite clairement dans les versets cités.
- Contexte : la scène est écrite une fois par chapitre et affichée seulement quand les chapitres sont mélangés (examen blanc). L'énoncé nomme quand même qui parle, à qui, de qui.
- À partir de Mediu, les propositions ont une longueur proche de la bonne réponse.
- Sujets sensibles (Samuel 11, 13) : rien de cru, surtout en Ușor ; on garde l'événement et la leçon.

Vérifications : `node scripts/validate.mjs` (nombre par type et par niveau, forme des énoncés, versets, longueurs, équilibre vrai/faux) et `node scripts/qualite/ancrage.mjs` (fausses réponses trop faciles à éliminer en Mediu et Greu), puis relecture.

Les identifiants contiennent le niveau (`2sa.5.greu.301`). Les anciens identifiants par âge n'existent plus ; le classement de 2 Samuel repart de zéro au passage aux niveaux.
