# ADR 0006 : hébergement sur Cloudflare Workers, avec l'OAuth de Decap dans le même Worker

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Le site statique doit être hébergé gratuitement, reconstruit chaque nuit et à chaque modification. Decap a besoin d'un petit service qui échange le code OAuth de GitHub contre un jeton : un site purement statique ne peut pas le faire.

## Options étudiées

- **GitHub Pages** : tout reste chez GitHub, mais il faut héberger ailleurs le service OAuth de Decap.
- **Cloudflare Pages** : intégration Git et aperçus de branche, mais Cloudflare ne met plus Pages en avant, et l'OAuth reste un service à part.
- **Cloudflare Workers avec static assets** : un seul Worker sert les fichiers du site et des routes `/api/*`.

## Décision

- **Un seul Worker `hbcizon`** (`worker/index.ts`, `wrangler.jsonc`) :
  - sert `dist/` (fichiers statiques, page 404) ;
  - gère l'OAuth GitHub de Decap sur `/api/auth` et `/api/auth/callback` (état anti-falsification en cookie, jeton transmis à la seule origine du site). Testé.
  - Seules les routes `/api/*` exécutent le Worker (`run_worker_first`) ; le reste est servi directement.
- **Déploiement par GitHub Actions** avec `wrangler deploy`, jeton d'API « github-actions-deploiement-site » (modèle Edit Cloudflare Workers, sans expiration, révocable) et secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- **Secrets du Worker** posés depuis le tableau de bord Cloudflare, en Production seulement : `GITHUB_CLIENT_SECRET` (puis `TURNSTILE_SECRET`, voir [ADR 0013](0013-formulaire-de-contact.md)). L'identifiant OAuth, public, est dans `wrangler.jsonc`.
- Compte Cloudflare izonhandball@gmail.com, sous-domaine `izonhandball.workers.dev`.

## Conséquences

- Même domaine pour le site et l'admin : pas de service séparé, pas de CORS.
- Gratuit (offre Workers Free) ; les fichiers statiques ne comptent pas dans le quota de requêtes du Worker.
- Le Worker est le point d'entrée naturel pour d'autres besoins serveur légers (formulaire de contact, [ADR 0013](0013-formulaire-de-contact.md)).
- Pas d'aperçu automatique des branches : les aperçus de l'admin sont faits autrement (voir [ADR 0010](0010-apercus-instantanes-decap.md)).
- `wrangler deploy` ne retire pas les domaines personnalisés ajoutés depuis le tableau de bord.
