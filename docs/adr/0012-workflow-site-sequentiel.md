# ADR 0012 : un seul workflow « Site » qui enchaîne images, vérification et déploiement

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Un push sur `main` lançait les workflows CI et Déploiement en parallèle, sans lien : un test en échec n'empêchait pas la mise en ligne, et le site était construit deux fois. Une photo publiée depuis l'admin déclenchait en plus le workflow d'optimisation, d'où deux déploiements et une minute environ avec la photo lourde en ligne. Aucune vérification de mise en forme n'existait.

## Options étudiées

- **Séquentiel** : images → vérification → déploiement.
- **Images et vérification en parallèle** : la vérification travaillerait sur le commit d'avant l'optimisation, donc le déploiement devrait reconstruire. Gain quasi nul (30 à 40 s, seulement quand il y a des images).

## Décision

- **Un seul workflow `site.yml`**, séquentiel :
  1. **images** : optimisation si nécessaire ([ADR 0011](0011-optimisation-des-images.md)), commit avec `GITHUB_TOKEN`, puis publication du **SHA à vérifier** (le nouveau commit, ou celui d'origine) ;
  2. **vérification** : checkout de ce SHA, `pnpm format:check` (Prettier), tests, `astro check` et build ;
  3. **déploiement** : `wrangler deploy` du `dist/` vérifié, sans nouveau build.
- **Sur une pull request** (relecture Decap) : vérification seule.
- La **synchro Instagram** (`sync-instagram.yml`) appelle `site.yml` dans la même exécution (`workflow_call`), même sans changement ou en cas d'échec de la synchro.
- `content/` et `data/` sont exclus de Prettier.
- L'étape images a son propre groupe de concurrence, sans annulation en cours de commit ; vérification et déploiement sont annulables par une exécution plus récente.

## Conséquences

- **Un commit n'est déployé que si le format, les tests et le build passent**, et ce qui est vérifié est exactement ce qui part en ligne.
- Un seul déploiement par push, sans fenêtre avec une photo lourde.
- Le commit d'images fait avec `GITHUB_TOKEN` ne relance aucun workflow : c'est pourquoi il est vérifié et déployé dans la même exécution.
- Trois workflows au lieu de cinq : Site, Synchro Instagram, Renouvellement du jeton.
- Un pipeline un peu plus long qu'en parallèle : environ 1 min 10 sans image.
