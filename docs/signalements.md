# Suivi des signalements

La page `/semnalari` montre les signalements reçus aux administrateurs. `/semnalari?tab=mine` montre uniquement ceux du compte connecté, y compris pour un administrateur.

- **En attente** : le signalement attend une vérification.
- **Accepté** : un seul clic sur Accepter, sans confirmation ni commentaire. Si le chapitre publié contient déjà une version corrigée de la question, elle est conservée avec la décision et montrée au joueur.
- **Refusé** : un seul clic sur Refuser, sans confirmation ni commentaire. La question n’est pas modifiée.
- Le joueur voit seulement la décision (acceptée ou refusée) avec un remerciement automatique. Les anciennes réponses écrites restent affichées.
- Le badge compte les réponses non lues. Ouvrir une réponse la marque comme lue dans Firestore, donc sur tous les appareils du compte.
- Les anciens signalements `done: true` restent archivés, sans inventer une acceptation ou un refus et sans générer de notification rétroactive.

Les questions restent gérées dans les fichiers `content/`. Le bouton Accepter ne constitue pas un éditeur de questions : il relit le chapitre publié au moment de la décision pour joindre la correction, s’il y en a une. Les nouveaux signalements conservent un instantané complet pour détecter également une correction de réponse, de choix, de niveau ou de référence. Les anciens signalements ne permettent de comparer que l’énoncé et la référence.

## Mise en ligne

Publier les nouvelles règles `firestore.rules` avec cette version du site. Elles autorisent la lecture du seul propriétaire, les décisions terminales des administrateurs (sans commentaire) et l’accusé de lecture du propriétaire. Les suppressions et les modifications de décision ne sont plus proposées ni autorisées côté client. Aucune migration ni nouvel index n’est nécessaire.

La question `1sa.6.greu.301` est corrigée dans sa source et son JSON généré. Après publication du site, le signalement correspondant peut être accepté depuis la liste d’administration.

## Vérification

- `npm run check`
- `npm run build`
- `npm test`
- Avec un émulateur Firestore local en marche : `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test`. Les tests de règles utilisent exclusivement le projet de test `demo-candela-reports` et refusent un hôte distant.
