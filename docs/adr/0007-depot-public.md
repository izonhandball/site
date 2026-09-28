# ADR 0007 : dépôt GitHub public

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

À la première connexion à l'admin, Decap répondait « Repo not found » : le dépôt `izonhandball/site` était privé, et Decap demandait la permission `public_repo`, qui ne donne accès qu'aux dépôts publics.

## Options étudiées

- **Rendre le dépôt public** et garder la permission minimale `public_repo`.
- **Garder le dépôt privé** et passer Decap et le Worker à la permission `repo` : elle donne accès à **tous** les dépôts privés du compte qui se connecte. Pour un bénévole qui a d'autres dépôts privés, c'est bien plus large que nécessaire.

## Décision

- **Dépôt public**, après avoir vérifié que tout l'historique Git était sans secret.
- Decap garde la permission **`public_repo`**.

## Conséquences

- Rien de sensible n'est publié : le jeton Instagram est chiffré ([ADR 0004](0004-jeton-instagram-chiffre.md)), les secrets sont dans GitHub et Cloudflare, `.env` et `.dev.vars` ne sont pas commités. Le contenu est de toute façon public sur le site et sur Instagram.
- Minutes GitHub Actions illimitées.
- Tout ce qui est commité est visible de tous : ne jamais y mettre de secret en clair, ni de donnée personnelle non publiée sur le site.
- Seuls les collaborateurs du dépôt peuvent pousser ; les autres ne peuvent que proposer une pull request (voir [ADR 0009](0009-protection-de-branche.md)).
