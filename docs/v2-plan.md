# Candela v2 : plan

Nouvelle application, construite sur la branche `v2`. `main` reste l'application actuelle tant que des gens l'utilisent : aucun commit de la v2 n'y arrive avant la bascule.

## Décisions

| Sujet | Décision |
|---|---|
| Code | Branche `v2` de ce dépôt. Fusion dans `main` le jour de la bascule, en remplaçant proprement l'ancienne app. |
| Framework | Astro (site statique), TypeScript, îlots interactifs (Preact) pour le lecteur et les questions, CSS avec variables. |
| Hébergement | Vercel : la branche `v2` a sa propre adresse de prévisualisation (`*.vercel.app`). Vérifier que la protection des prévisualisations est désactivée pour les testeurs. |
| Données | Firebase (projet `candela-64d25`) : Authentication (email + mot de passe) et Firestore (emplacement `eur3`, Europe multirégion). Supabase reste en place pour l'ancienne app jusqu'à la bascule. |
| Langue | Interface en roumain uniquement. |
| Design | Sobre et chaleureux (bougie, huile, cèdre), belle typographie de lecture, sans emoji, toujours en clair (fond beige v1). |
| Navigation | Une vraie adresse par page, le bouton retour fonctionne, chaque chapitre ou question a un lien partageable. |
| Mode invité | Oui : lire et jouer sans compte, la progression passe dans le compte à l'inscription. |
| Mot de passe oublié | Email de réinitialisation de Firebase. Plus de page de mot de passe provisoire. |
| Hors ligne | App installable, lecture et questions sans internet. |

## Joueurs et âges

- Compte adulte : email + mot de passe. Il peut être parent.
- Enfant : simple profil rattaché au parent dans Firestore, sans compte de connexion. Le parent choisit « Cine joacă? ».
- **Plus d'année de naissance** (décision d'octobre 2026) : le joueur choisit son niveau lui-même, parmi les catégories :

| Catégorie | Âge |
|---|---|
| `sub12` | moins de 12 ans |
| `12-13` | 12–13 ans |
| `14-15` | 14–15 ans |
| `16-17` | 16–17 ans |
| `18+` | 18 ans et plus |

- On peut toujours jouer la catégorie au-dessus (« Niveau au-dessus »).

## Format des examens réels (toutes les catégories)

5 parties de 5 questions. Points par question : 3, 4, 2 par paire, 5, 6 : un examen complet vaut exactement 100 (le papier réel compte 75 ; la version du site est ramenée à 100 pour éviter les fractions).

| Partie | Type | Points |
|---|---|---|
| I | Adevărat / Fals | 2 chacune |
| II | Un singur răspuns corect (3 variantes) | 3 chacune |
| III | Asociați cele două coloane (5 paires) | 1 par paire |
| IV | Completează spațiile libere (verset exact) | 4 chacune |
| V | Unul, două, trei sau niciun răspuns corect (3 variantes) | 5 chacune |

La difficulté vient du choix des faits : faits marquants pour les plus jeunes, lieux, généalogies et détails pour 16+ et 18+.

## Questions

- 15 questions par chapitre et par catégorie, 3 de chaque type. 2 Samuel : 24 chapitres, ≈ 1 800 questions. 1 Samuel : 31 chapitres, ≈ 2 300 questions, entièrement réécrites.
- Chaque question nomme qui, où et quand, pour se comprendre seule, même mélangée dans un examen.
- Après chaque réponse : la bonne réponse, une courte explication quand elle est utile (comme les « Atenție: » des corrigés), et le verset de référence en entier.
- « Completează » : le joueur tape les mots, pour tous les âges. Majuscules et diacritiques tolérés.
- Identifiant stable par question (pas l'index dans la liste) : on peut ajouter, retirer ou réordonner sans casser la progression.
- Je rédige à partir du texte Cornilescu, un script vérifie (référence existante, citation exacte, doublons, nombre par type), puis relecture humaine chapitre par chapitre avant publication.

Format proposé (`content/2-samuel/intrebari/ch01.json`) :

```json
{
  "id": "2sa.1.12-13.one.02",
  "age": "12-13",
  "t": "one",
  "ref": "1:10",
  "q": "După moartea lui Saul pe muntele Ghilboa, ce i-a adus tânărul amalecit lui David la Țiclag?",
  "opts": ["cununa și brățara lui Saul", "sulița lui Saul", "scutul lui Ionatan"],
  "a": 0,
  "explain": ""
}
```

## Modes de jeu

1. **Pe capitol** : un ou plusieurs chapitres, ma catégorie, tous types mélangés.
2. **Pe tip** : une seule partie de l'examen (ex. seulement « Completează »).
3. **Greșelile mele** : les questions ratées reviennent jusqu'à ce qu'elles soient réussies.
4. **Examene date** : les examens réels passés, refaits à l'identique (pour commencer, les 4 examens 1 Samuel : 12-13, 14-15, 16-17, 18+).
5. **Examen alb** : le format réel, tiré au hasard sur les chapitres choisis (priorité basse).

## Lecture

- 1 Samuel et 2 Samuel, même édition Cornilescu que le fichier actuel.
- Surligner des versets (sauvegardé dans le compte), chapitres marqués comme lus, progression de lecture.
- Lien lecture ↔ questions : depuis une question, ouvrir le verset, et depuis un chapitre lu, lancer ses questions.
- Carte, frise et personnages, pour les deux livres.

## Progression et classement

- Une question compte une seule fois, la première fois qu'elle est réussie.
- Classement par livre et par catégorie d'âge, on peut s'en cacher.
- Suivi parent : progression de chaque enfant (chapitres lus, maîtrisés, points faibles par type).
- Pas d'historique de tests.

## Migration Supabase → Firebase

- Comptes : export des 31 comptes adultes avec leur hachage bcrypt, import dans Firebase Auth (`firebase auth:import --hash-algo=BCRYPT`) : même email, même mot de passe.
- Profils des 20 enfants, liens parent–enfant, choix « caché du classement », rôle administrateur, versets surlignés.
- Questions maîtrisées de 1 Samuel : conservées en archive (« 1 Samuel, versiunea veche »), car les questions sont réécrites.
- Un premier export pour développer, un second le jour de la bascule (nouveaux comptes et nouveaux surlignages entre-temps).

Point d'attention : sans Cloud Functions (forfait payant Blaze), les contrôles anti-triche du classement passent par les règles de sécurité Firestore, moins strictes que les fonctions SQL actuelles.

## Ordre de construction

1. Projet Astro, design, navigation, Firebase, migration des comptes.
2. Lecture 1 et 2 Samuel (surlignage, chapitres lus).
3. Moteur de questions (5 types, retour après réponse) + 2 Samuel chapitre par chapitre, avec relecture.
4. Examene date : les 4 examens réels 1 Samuel.
5. Classement, greșelile mele, suivi parent, carte et frise.
6. Réécriture de 1 Samuel.
7. Examen alb.
8. Bascule : second export, fusion `v2` → `main`.
