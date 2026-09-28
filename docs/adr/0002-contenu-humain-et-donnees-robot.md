# ADR 0002 : contenu des bénévoles et données du robot séparés

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Le site a deux sources de données : le contenu fixe (club, équipes, histoire), modifié par des humains, et les posts Instagram, récupérés par un script. Les deux écrivent dans le même dépôt Git, parfois au même moment.

## Décision

- **Deux dossiers, deux auteurs** :
  - `content/` : écrit par les humains, via l'admin (Decap) ou à la main ;
  - `data/instagram/` et `public/instagram/` : écrits par le script de synchro, jamais à la main.
  - Decap ne voit que `content/`, le robot ne touche qu'à `data/` : pas de conflit de commit entre eux.
- **Le script récupère, le build sélectionne** : la synchro se contente de stocker les posts ; le classement par hashtag et le choix de ce qui s'affiche (`selectionAccueil` dans `src/lib/instagram.ts`, testé) se font au build.
- **Données de développement réalistes** : `posts.json` est d'abord rempli avec les vrais posts de la maquette, pour construire le site avant que l'API Meta soit branchée. Les tests utilisent un jeu d'essai figé (`src/lib/fixtures/`), pas `posts.json`.

## Conséquences

- On peut changer les règles de l'accueil (durée d'un Match Day, nombre d'annonces) sans resynchroniser : il suffit de reconstruire.
- `content/` et `data/` sont exclus de Prettier (voir [ADR 0012](0012-workflow-site-sequentiel.md)) : une modification de bénévole ou de robot ne bloque jamais le déploiement pour une question de mise en forme.
