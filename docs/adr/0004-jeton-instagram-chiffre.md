# ADR 0004 : jeton Instagram chiffré dans le dépôt

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Le jeton longue durée de l'API Instagram vaut 60 jours et doit être renouvelé avant expiration. Le jeton renouvelé doit être conservé quelque part par un workflow GitHub Actions, sans intervention humaine. Un workflow ne peut pas modifier un secret GitHub avec le `GITHUB_TOKEN` fourni par défaut.

## Options étudiées

- **Jeton chiffré commité dans le dépôt**, clé fixe en secret GitHub.
- Jeton en secret GitHub, mis à jour par le workflow avec un jeton d'accès personnel (PAT) : un secret de plus, à droits larges, qui expire lui aussi.
- Stockage externe (KV Cloudflare, gestionnaire de secrets) : une pièce de plus.

## Décision

- Jeton chiffré en **AES-256-GCM** dans `data/instagram/token.enc`, clé fixe dans le secret GitHub **`IG_KEY`** (et dans `.env` en local, non commité).
- Workflow `refresh-token.yml` **chaque lundi** : il renouvelle le jeton et commite le nouveau `token.enc`.
- Commandes `pnpm ig:cle`, `ig:init`, `ig:renouveler`, `ig:etat` (`scripts/instagram/jeton*.ts`).
- Jeton masqué dans les journaux Actions (`::add-mask::`), avertissement à moins de 14 jours de l'expiration.

## Conséquences

- Pas de PAT à gérer. Le commit hebdomadaire garde aussi les workflows planifiés actifs (GitHub les suspend après 60 jours sans activité sur un dépôt).
- Le dépôt étant public (voir [ADR 0007](0007-depot-public.md)), la sécurité repose entièrement sur `IG_KEY`. Si la clé fuit : en générer une nouvelle et rechiffrer le jeton.
- Si le renouvellement échoue (accès révoqué, mot de passe changé), il faut régénérer un jeton dans Meta et relancer `pnpm ig:init`.
