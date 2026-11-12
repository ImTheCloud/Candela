# Suivi des signalements

La page `/semnalari` montre les signalements reçus aux administrateurs. `/semnalari?tab=mine` montre uniquement ceux du compte connecté, y compris pour un administrateur.

- **En attente** : le signalement attend une vérification.
- **Accepté** : l’administrateur vérifie la version corrigée déjà publiée, confirme qu’elle répond au problème et écrit une explication. La version corrigée est conservée avec la décision.
- **Refusé** : seule la décision est enregistrée, sans modifier la question. Une explication est obligatoire.
- Chaque réponse inclut automatiquement un remerciement, même en cas de refus.
- Le badge compte les réponses non lues. Ouvrir une réponse la marque comme lue dans Firestore, donc sur tous les appareils du compte.
- Les anciens signalements `done: true` restent archivés, sans inventer une acceptation ou un refus et sans générer de notification rétroactive.

Les questions restent gérées dans les fichiers `content/`. Le bouton Accepter ne constitue pas un éditeur de questions : il vérifie à nouveau le chapitre publié avant d’enregistrer la décision. Les nouveaux signalements conservent un instantané complet pour détecter également une correction de réponse, de choix, de niveau ou de référence. Les anciens signalements ne permettent de comparer que l’énoncé et la référence.

## Mise en ligne

Publier les nouvelles règles `firestore.rules` avec cette version du site. Elles autorisent la lecture du seul propriétaire, les décisions terminales des administrateurs et l’accusé de lecture du propriétaire. Les suppressions et les modifications de décision ne sont plus proposées ni autorisées côté client. Aucune migration ni nouvel index n’est nécessaire.

La question `1sa.6.greu.301` est corrigée dans sa source et son JSON généré. Après publication du site, le signalement correspondant peut être accepté depuis la liste d’administration.

## Vérification

- `npm run check`
- `npm run build`
- `npm test`
- Avec un émulateur Firestore local en marche : `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test`. Les tests de règles utilisent exclusivement le projet de test `demo-candela-reports` et refusent un hôte distant.
