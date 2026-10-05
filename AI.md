# Instructions pour l'IA (AI Guidelines) - Projet Candela

Bienvenue dans le projet **Candela** ! Ce fichier est conçu pour aider toute intelligence artificielle (comme Cursor, Windsurf, Copilot, Gemini, etc.) à comprendre instantanément l'architecture du projet et les règles à suivre pour coder sans rien casser.

## 1. 🎯 Aperçu du Projet
Candela est une application web (PWA) d'étude biblique interactive et de quiz, actuellement centrée sur le livre de *1 Samuel*. Elle permet aux utilisateurs de lire des chapitres, de répondre à des quiz et de grimper dans un classement grâce à un système de points.

## 2. 💻 Stack Technique
*   **Frontend** : Vanilla HTML, CSS et JavaScript. **Il n'y a aucun framework frontend** (pas de React, pas de Vue, pas de Svelte).
*   **Backend & Base de données** : Supabase (Authentification, base de données PostgreSQL, Edge Functions pour la logique serveur).
*   **Données Locales** : Le texte biblique et les questions de quiz sont stockés dans des fichiers statiques `.json`.

## 3. 📂 Fichiers Clés et Architecture
*   `src/app.html` : **C'est LE fichier central du frontend.** Il contient la structure HTML, tout le CSS natif (dans la balise `<style>`), et toute la logique JavaScript (dans la balise `<script>`). C'est le fichier source que tu dois modifier.
*   `content/1-samuel/intrebari/ch[01-31].json` : Ces fichiers contiennent toutes les questions de quiz.
*   `index.html` : C'est le fichier généré pour la production. **NE MODIFIE JAMAIS CE FICHIER DIRECTEMENT.**
*   `scratch/build.js` : Le script Node.js maison qui compile `src/app.html` et les fichiers JSON pour générer le `index.html` final.
*   `scratch/serve.js` : Le serveur HTTP local léger sans dépendance pour tester l'application en local.

## 4. 🚨 LA RÈGLE D'OR (Processus de Build)
Puisqu'il n'y a pas de bundler (comme Vite ou Webpack), le processus de compilation est manuel via un script Node.
**À CHAQUE FOIS que tu modifies `src/app.html` ou un fichier `.json`, tu DOIS exécuter la commande suivante dans le terminal pour appliquer les changements :**
```bash
node scratch/build.js
```
*(ou `npm run build`)*

## 5. 🚀 Démarrer le Serveur Local (Localhost)
Pour tester l'application directement dans le navigateur en local avec la bonne gestion des fichiers statiques et MIME types :
```bash
node scratch/serve.js
```
*(ou `npm run serve`, ou `npm run dev` pour compiler puis lancer)*

L'application est ensuite accessible sur : **http://localhost:8080**

## 6. 🧠 Gestion de l'État (State Management)
Toute la logique client repose sur un objet JavaScript global appelé `S` (défini dans `src/app.html`).
*   `S.player` : Contient les informations de l'utilisateur connecté, son historique (`S.player.history`), les questions réussies (`S.player.ok`), et les chapitres tentés (`S.player.chap`).
*   Le DOM est mis à jour manuellement par des fonctions utilitaires (comme `render()`, `show()`, etc.) en fonction des changements apportés à l'objet `S`.

## 7. 📝 Format des Questions (JSON)
Les questions dans `content/1-samuel/intrebari/*.json` suivent un schéma strict. Voici les types supportés (`t`) :
*   `one` : Choix unique. `a` correspond à l'index de la bonne réponse dans le tableau `opts`.
*   `multi` : Choix multiples. `a` est un tableau contenant les index des bonnes réponses.
*   `tf` : Vrai / Faux. `a` est un booléen (`true` ou `false`).
*   `fill` : Texte à trous. La question (`q`) contient `___` (3 tirets du bas), et `a` est un tableau de strings contenant les mots corrects.
Toujours inclure la clé `"ref"` (ex: `"14:24"`) pour lier la question au verset biblique correspondant.

## 8. 🎨 Règles de Style
*   Utiliser uniquement le CSS natif dans `src/app.html`.
*   Respecter les variables CSS existantes (ex: `--bg`, `--fg`, `--primary`) pour la cohérence visuelle et le support des modes (clair/sombre).
*   Garder l'UI légère et "premium" avec des coins arrondis, des ombres douces et des micro-animations.

En suivant ces règles, tu pourras ajouter des fonctionnalités et corriger des bugs très efficacement sur ce projet !

## 9. 🧹 Propreté du Projet (Clean Code & Workspace)
*   **Nettoyage des fichiers temporaires** : Si tu as besoin de créer des scripts jetables (ex: des scripts Python ou JS pour analyser ou modifier en masse des fichiers JSON) dans le dossier `scratch/`, **tu DOIS impérativement les supprimer** une fois ta tâche terminée. 
*   Seuls les scripts vitaux (`build.js`, `serve.js`) doivent rester dans le dossier `scratch/`.
*   Le code ajouté doit être concis et propre, sans code mort ni commentaires inutiles. Garde toujours l'espace de travail intact.
