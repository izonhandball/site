# ADR 0009 : protection de la branche main sans vérification obligatoire

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

La règle de protection de `main` n'avait qu'une option cochée, « Allow force pushes → Everyone », qui autorisait tout collaborateur à réécrire l'historique. `izonhandball` est un compte **utilisateur**, pas une organisation : l'option « Restreindre qui peut pousser » n'existe pas. Plusieurs bots commitent directement sur `main` (synchro Instagram, renouvellement du jeton, optimisation des images).

## Décision

- **Force push interdit**, **suppression de `main` interdite**.
- **Pas de pull request obligatoire ni de « status checks » obligatoires** : ils bloqueraient les commits des bots et la publication depuis Decap.
- Qui peut pousser : **la liste des collaborateurs** du dépôt joue ce rôle (izonhandball en admin, collaborateurs en écriture).

## Conséquences

- Un commit cassé peut arriver sur `main`, mais il n'est **jamais déployé** : le workflow Site ne déploie qu'après une vérification réussie (voir [ADR 0012](0012-workflow-site-sequentiel.md)). Le site garde la dernière version valide.
- Donner l'accès à un bénévole = l'ajouter comme collaborateur (Settings → Collaborators, depuis le compte izonhandball).
