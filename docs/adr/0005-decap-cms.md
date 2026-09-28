# ADR 0005 : administration par Decap CMS

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Des bénévoles non techniques doivent pouvoir modifier le contenu fixe (horaires, fiches équipes, histoire, coordonnées), sans serveur ni base de données, et sans connaître Git ni YAML.

## Options étudiées

- **Pas d'administration** : le mainteneur modifie les YAML et pousse. Plus simple, mais dépend d'une seule personne.
- **Édition dans l'interface GitHub** : possible, mais une indentation ratée casse le build.
- **Decap CMS** : une page statique (`/admin`) qui lit et écrit les fichiers du dépôt par l'API GitHub, avec des formulaires décrits dans `public/admin/config.yml`.

## Décision

- **Decap CMS**, backend GitHub, collections `equipes`, `periodes` et `reglages` (fichiers club et histoire), interface en français.
- **Relecture avant publication** (editorial workflow) : chaque modification devient une pull request `cms/…`, validée dans l'onglet « Flux » de l'admin.
- L'authentification GitHub passe par le Worker du site (voir [ADR 0006](0006-cloudflare-workers.md)), avec l'OAuth App « Site HBC Izon — administration » du compte izonhandball.

## Conséquences

- Les bénévoles ne peuvent pas casser la syntaxe : Decap écrit le YAML, et le schéma Astro vérifie au build.
- **Chaque bénévole a besoin d'un compte GitHub** avec un accès en écriture au dépôt : c'est la principale friction.
- Le jeton de connexion expire au bout de 8 heures environ.
- En local : `pnpm cms` (backend local de Decap), puis http://localhost:4321/admin/index.html. `decap-server` n'est pas une dépendance du projet (il apportait une vieille version de `cookie`) : il est lancé à la demande avec `pnpm dlx`.
