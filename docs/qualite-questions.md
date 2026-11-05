# Qualité des questions : comment écrire, vérifier et corriger

Ce guide est pour la prochaine personne (ou IA) qui écrit ou reprend les questions. Le format des fichiers et le fonctionnement du site sont dans `docs/fonctionnement.md`, le barème de difficulté par niveau dans `docs/niveluri.md`.

État au 5 novembre 2026 : 2 Samuel complet en trois niveaux (Ușor, Mediu, Greu ; 72 questions par chapitre). 1 Samuel en cours, chapitre par chapitre (chapitres 1 à 12 écrits).

## Ce que le propriétaire exige (retours répétés)

1. **Chaque proposition répond à la question posée.** Si la question est « Ce a cunoscut David? », chaque proposition est une chose qu'il aurait pu connaître, formulée comme une réponse. Jamais un morceau de verset recopié (« îi ridica împărăția », « în mormântul lui Abner »), jamais un nom de lieu en réponse à « Ce a zis David? ».
2. **Choix multiple : des faits indépendants.** Les bonnes réponses ne sont jamais la suite l'une de l'autre ni deux formulations de la même chose. Chacune doit être juste toute seule.
3. **Pas de scène dans l'énoncé.** La scène est écrite une fois par chapitre (`scene:`) et ne s'affiche qu'en examen. L'énoncé doit quand même dire qui parle, à qui, de qui, où : jamais « Ce a zis femeia? », mais « Ce a spus femeia din Tecoa împăratului? ».
3 bis. **Un énoncé se comprend seul, même en chapitre** : il situe le moment (« Când Abner s-a întors la Hebron… », « La îngroparea lui Abner… ») au lieu d'un énoncé nu comme « Cine s-a certat cu Abner? ». Jamais de numéro de verset dans l'énoncé (« după versetul 30 ») : la référence est déjà affichée. Ce contexte ne doit pas donner la réponse d'une autre question du même niveau.
3 ter. **L'énoncé annonce exactement ce que les réponses donnent, et cite le moment précis.** Corrigé le 5 novembre 2026 (2 Samuel 7:3) : « Când David i-a vorbit despre chivot, ce motiv i-a dat Natan la început? » avec des citations pour réponses. Un « motif » appelle « pentru că… » ; pour des paroles, on demande « cu ce cuvinte… ». Et « i-a vorbit despre chivot » ou « la început » ne disent ni ce qui a été dit ni à quel moment : on écrit le fait (« Când David i-a spus că el locuiește într-o casă de cedru, iar chivotul într-un cort… »). Avant de garder une question : lire l'énoncé puis chaque réponse à voix haute, la phrase doit tenir.
4. **Une question = une seule question**, terminée par un point d'interrogation. Un vrai/faux est une affirmation, sans point d'interrogation. Pas de question à la forme négative (« Cu ce NU… »).
5. **Fausses réponses plausibles** (Mediu et Greu) : elles parlent des vrais personnages, lieux et objets du chapitre ; en Greu, elles ne diffèrent de la bonne que par un détail. `node scripts/qualite/ancrage.mjs` liste celles qu'on élimine sans avoir lu.
6. **Longueur des propositions** : à partir de Mediu, la bonne réponse n'est ni visiblement la plus longue ni la plus courte (écart de plus de 10 caractères avec toutes les autres). Le plus simple : écrire des fausses réponses aussi précises que la bonne. En Ușor, on s'en moque.
7. **Vrai ou faux équilibré** : 4 à 6 vraies sur 10 par niveau. Une fausse change un nom, un chiffre, un lieu ou le sens ; jamais un détail douteux ni un piège sur un mot.
7 bis. **Un vrai/faux se tranche sans hésiter** : celui qui connaît l'histoire répond tout de suite, sans relire le verset mot à mot. Exemples corrigés le 3 novembre 2026 :
   - **Pas de piège sur un détail secondaire** : « …l-ar fi urmărit pe Abner până la amiază » (le texte dit « până dimineața ») teste l'heure, pas l'histoire. Le faux porte sur ce qui compte : qui, quoi, où, ce qui s'est passé.
   - **Pas de mot vieilli ou à double sens dont dépend la réponse** : « s-au strâns în urma lui Abner și au făcut o ceată » est vrai, mais « în urma » se lit « derrière lui » ou « après lui » et « ceată » n'est plus compris ; le joueur a répondu faux. On garde le roumain de Cornilescu pour les noms et les citations entre guillemets, mais on reformule en roumain courant tout ce qui décide de la réponse.
   - **Pas de tournure bizarre** : « Mefiboșet era un om în putere », « au rămas departe, la Țiclag ». Une phrase étrange fait deviner qu'elle est fausse (ou fait douter d'une vraie).
   - **Pas de sujet flou** : « poporul », « oamenii », « ei » disent de qui il s'agit (« oamenii lui Ioab »).
   - **Situer aussi le vrai/faux** : « Când David s-a suit la Hebron, și-a lăsat oamenii în urmă, la Țiclag », pas « Oamenii lui David au rămas departe, la Țiclag ».
8. **Faux partout, pas seulement dans ce verset** : une affirmation fausse ou une mauvaise réponse ne doit pas être vraie ailleurs dans la Bible (un autre chapitre, 1 Samuel 31, etc.). Exemples corrigés le 31 octobre 2026 : « David a cântat această cântare după moartea lui Absalom » (2 Sam 22 : vrai dans l'histoire), « de pe zidul Bet-Șanului » (vrai en 1 Sam 31), « Saul era rănit de moarte » (vrai en 1 Sam 31:3), « David bătuse pe gheșuriți » (vrai en 1 Sam 27). On évite aussi « în acest capitol » comme seule raison du faux, et deux propositions qui veulent dire la même chose (« căpetenie a neamurilor » / « împărat peste neamuri »).

9. **Un fait par question, dans tout le niveau** : à l'intérieur d'un niveau, deux questions (même de types différents : vrai/faux, une réponse, plusieurs réponses, association) ne portent jamais sur le même fait. Le même verset peut servir deux fois seulement pour deux faits différents ; quand le chapitre est très court et qu'on ne peut pas faire autrement, on reformule vraiment. Les niveaux entre eux peuvent reprendre un même fait. Les **énoncés** comptent aussi : en Ușor, « Ce veste a venit când Mefiboșet era copil de cinci ani? » donnait la réponse du vrai/faux « Mefiboșet era un om în putere când a murit Saul ». Avant de garder une question, relire les autres énoncés et les paires d'association du même niveau.
10. **« Niciun răspuns corect »** : jamais en Ușor (enfants), au plus une fois par chapitre en Mediu et rarement, une fois par chapitre environ en Greu. `validate.mjs` le signale (avertissement).
11. **Association en Ușor** : la réponse ne doit pas se lire dans la question (pas « stânca → Domnul este stânca lui »). Chaque paire relie une chose à un fait du chapitre qu'il faut avoir lu.
12. **Associations autonomes** : chaque paire doit se comprendre sans la consigne, car l'examen blanc mélange des paires de cinq chapitres (« Itream | al șaselea fiu al lui David », pas « Itream | al șaselea »).
13. **La référence couvre les versets de la réponse** : la fenêtre « Versetul » surligne ces versets.
14. **Sujets sensibles** (2 Samuel 11, 13) : rien de cru pour les plus jeunes ; on garde l'événement et la leçon.
15. **Pas de point médian « · »** dans les textes du site : une virgule, des parenthèses ou une autre phrase.
16. **Dire au propriétaire combien de questions ont été modifiées** à chaque correction.

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

- Écrire un vrai/faux en recopiant le verset puis en changeant un mot : on obtient soit un piège sur un détail, soit une phrase vieillie que personne ne sait trancher. Partir du fait qu'on veut tester, l'écrire en roumain courant, puis le rendre faux en changeant ce fait.
- Écrire la bonne réponse avec soin et les fausses à la va-vite : c'est la première cause d'avertissement de longueur.
- Recopier le verset comme réponse : la proposition doit répondre à la question, pas la prolonger.
- Une paire d'association qui ne vit que par la consigne (« fils → mère ») : écrire la relation dans la colonne de droite.
- Les examens réels (`content/1-samuel/examene/`) ne sont plus dans le site (retirés le 5 novembre 2026) : les fichiers restent comme archive, on n'y touche pas (leurs avertissements de texte non exact sont normaux).
