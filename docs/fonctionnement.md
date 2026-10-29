# Comment fonctionne Candela

Ce document explique le site de bout en bout, pour qu'une personne (ou une IA) puisse ajouter un livre ou refaire des questions sans tout redécouvrir. Les règles de rédaction des questions sont dans `docs/qualite-questions.md`, le barème de difficulté par niveau dans `docs/niveluri.md`.

## Vue d'ensemble

- **Site statique Astro** avec des îlots Preact (`src/islands/`). Tout le contenu (texte biblique, questions, examens) est lu au moment du build depuis `content/` et transformé en pages et en fichiers JSON.
- **Firebase** (projet `candela-64d25`) pour les comptes (Authentication) et la progression (Firestore). Les règles de sécurité sont dans `firestore.rules`.
- **Hébergement Vercel** : la branche `v2` a sa propre adresse de prévisualisation.

## Les dossiers d'un livre

```
content/<livre>/
  text-cornilescu.json   texte biblique : { "1": ["verset 1", "verset 2", …], "2": […] }
  carte.json             guide du livre (frises, lieux, trajets), facultatif
  sursa/chNN.txt         SOURCE des questions d'un chapitre (c'est ce fichier qu'on modifie)
  intrebari/chNN.json    questions générées depuis la source (ne pas modifier à la main)
  examene/*.json         examens réels du concours, recopiés tels quels (facultatif)
```

Le livre est déclaré dans `src/lib/books.ts` : `slug` (adresse, ex. `2-samuel`), nom affiché, nombre de chapitres, résumé et un titre court par chapitre (tuiles et menus).

## Les questions d'un chapitre

Chaque chapitre a, **pour chacun des trois niveaux** (Ușor pour les moins de 12 ans, Mediu pour 12-17 ans, Greu pour 18 ans et plus, voir `docs/niveluri.md`), exactement :

| Type | Nombre | Code | Ce que c'est |
|---|---|---|---|
| Vrai ou faux | 10 | `tf` | une affirmation, 4 à 6 vraies sur 10 |
| Une seule réponse | 10 | `one` | une question, 3 propositions, une seule juste |
| Association | 1 | `match` | 5 paires à relier |
| Plusieurs réponses | 3 | `multi` | une question, 3 propositions, de 0 à 3 justes (« Niciun răspuns corect » s'ajoute tout seul) |

Soit 24 questions par niveau et 72 par chapitre. Un test de chapitre suit l'ordre de l'examen (vrai/faux, une réponse, association, plusieurs réponses), mélangé à l'intérieur de chaque type. Les boutons de niveau indiquent à qui ils s'adressent : Ușor (copii), Mediu (adolescenți), Greu (adulți). C'est aussi la forme de l'examen final : l'examen blanc tire 10 + 10 + 1 + 3 questions dans tout le livre. Il n'y a plus de textes à compléter (`fill`) dans les chapitres ; le type existe encore dans le code pour les examens réels de 1 Samuel qui en contiennent.

### La scène (contexte)

Chaque chapitre a une phrase de scène (`scene: …` en tête de la source), par exemple « La Hebron, la uciderea lui Iș-Boșet ». Elle n'est **pas** répétée dans les énoncés. Le quiz l'affiche au-dessus de la question seulement quand les questions viennent de plusieurs chapitres (examen blanc, « Greșelile mele ») ; dans un test de chapitre, ce serait la même phrase à chaque fois. Le code : `scene` dans `src/lib/content.ts`, affichage dans `QHead` de `src/islands/Quiz.tsx`.

### Le format source (`sursa/chNN.txt`)

```
scene: La Țiclag, când David află de moartea lui Saul
## usor
tf + 1:1 | David s-a întors la Țiclag.                         (+ vrai, - faux)
one 1:2 | Cine a venit din tabăra lui Saul? | *un tânăr | un preot | un frate al lui David
multi 1:11 | Ce au făcut David și oamenii lui? | *au plâns | *au postit | au cântat
match 1:1-27 | Asociază fiecare persoană cu ce se spune despre ea.
= Saul | s-a sprijinit în suliță | 1:6                    (cinq lignes : gauche | droite | verset)
## mediu
…
## greu
…
```

- Le chiffre après le type est la **référence** : les versets où se trouve la réponse. La fenêtre « Versetul » les surligne.
- La bonne réponse porte une `*`. Une question `multi` sans aucune `*` a pour réponse « Niciun răspuns corect ».
- L'ordre des propositions est mélangé par le script (toujours de la même façon) ; pour `one`, la bonne réponse tombe tour à tour sur a, b et c.
- Chaque paire d'association a son propre verset : l'examen blanc prend **une paire dans chacun de cinq chapitres différents**. Une paire doit donc se comprendre seule, sans la consigne de son chapitre (« Amnon | fiul Ahinoamei », pas « Amnon | Ahinoam »).

Générer le JSON, puis vérifier :

```bash
node scripts/qualite/build-chapter.mjs 2-samuel 5 content/2-samuel/sursa/ch05.txt
node scripts/validate.mjs
```

### Les identifiants

Le script numérote les questions de chaque niveau dans l'ordre de la source : `2sa.5.greu.301`, `302`… La progression des joueurs (questions « știute », erreurs, classement) est rattachée à ces identifiants. Donc :

- pour corriger une question, **modifier sa ligne sur place** (l'identifiant reste le même) ;
- ne jamais insérer ni supprimer une ligne au milieu d'un niveau : toutes les suivantes changeraient d'identifiant ;
- pour une refonte complète d'un livre, on remet le classement à zéro (voir plus bas).

## De la source à l'écran

1. Au build, `src/lib/content.ts` lit tous les `content/*/intrebari/ch*.json`.
2. `src/pages/data/[book]/[ch].json.ts` publie un fichier par chapitre (`/data/2-samuel/5.json`) avec les questions, la scène et les versets cités.
3. Le navigateur charge ces fichiers à la demande (`src/lib/load.ts`).
4. `src/islands/Quiz.tsx` affiche un test ; `QuestionView.tsx` dessine chaque type ; la correction est dans `grade()` de `src/lib/questions.ts`.
5. Points : chaque question vaut 1 point (une association : 0,2 par paire juste). Le score s'affiche en pourcentage. Le classement compte les questions réussies au moins une fois.
6. L'examen blanc (`src/islands/MockExam.tsx`) suit `SHAPE` dans `src/lib/questions.ts` et compose son association avec `mixedMatch`.

Un livre sans aucun fichier de questions s'affiche « Întrebările sunt în pregătire » : la page existe, mais il n'y a rien à jouer (c'est le cas de 1 Samuel pendant sa réécriture).

## Ajouter un livre

1. **Texte** : `content/<livre>/text-cornilescu.json` (un tableau de versets par chapitre).
2. **Déclaration** : ajouter le livre dans `BOOKS` de `src/lib/books.ts` (slug, nom, chapitres, résumé, titres). L'abréviation des identifiants s'ajoute dans `scripts/qualite/build-chapter.mjs` (`ABBR`) et `scripts/validate.mjs` (`BOOKS`).
3. **Firestore** : les règles citent les livres par leur nom. Dans `firestore.rules`, ajouter le nouveau slug partout où apparaissent `1-samuel` et `2-samuel` (clé de progression, signalements, classement, somme du score), puis `firebase deploy --only firestore:rules --project candela-64d25`.
4. **Questions** : écrire `content/<livre>/sursa/chNN.txt` chapitre par chapitre (règles dans `docs/qualite-questions.md`), générer avec `build-chapter.mjs`, valider avec `validate.mjs` (0 erreur exigée, pas d'avertissement de longueur).
5. **Vérifier** : `npm run build`, puis jouer un test de chapitre et un examen blanc sur téléphone (`npx astro preview`).
6. **Examens réels** (facultatif) : `content/<livre>/examene/<année>-<âge>.json`, recopiés tels quels, et leurs dates dans `EXAM_DATES` de `src/lib/content.ts`.

## Remettre le classement à zéro

Quand toutes les questions d'un livre changent, les anciennes réponses ne correspondent plus à rien. On efface alors, dans Firestore, les documents `users/*/progress/*~<livre>` et `boards/<livre>/players/*` (console Firebase ou script avec un compte de service). C'est irréversible : à faire seulement avec l'accord du propriétaire, au moment de publier les nouvelles questions.
