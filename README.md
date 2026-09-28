# Site du HBC Izon

Site du Handball Club Izonnais : [hbc-izon.fr](https://hbc-izon.fr).

- **L'accueil se met à jour tout seul depuis Instagram** (@hbcizon). Il suffit d'ajouter un hashtag dans la légende du post :

  | Hashtag                          | Où le post apparaît             |
  | -------------------------------- | ------------------------------- |
  | `#hbcimatchday`                  | À la une · Match day            |
  | `#hbciprogramme`                 | À la une · Le programme         |
  | `#hbciresultats`                 | À la une · Les résultats        |
  | `#hbcirecrutement`, `#hbcievent` | Annonces (les 4 dernières)      |
  | aucun                            | La vie du club (les 6 derniers) |

- **Le contenu fixe** (équipes, horaires, histoire, coordonnées) se modifie depuis `/admin`, sans toucher au code. Les photos peuvent être déposées telles quelles (même prises au téléphone) : elles sont redimensionnées et converties automatiquement après publication.

## Développement

Prérequis : Node 24 et pnpm.

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm test     # tests unitaires (Instagram, images, Worker…)
pnpm build    # vérification des types et du contenu, puis build statique dans dist/
pnpm format   # mise en forme (Prettier) ; la CI vérifie avec pnpm format:check
```

Pour essayer l'administration en local, lancer `pnpm cms` dans un second terminal, puis ouvrir http://localhost:4321/admin/index.html.

## Synchro Instagram

Une GitHub Action lit les posts chaque nuit vers 4h, commite les changements et redéploie le site. On peut aussi la lancer à la main depuis l’onglet Actions de GitHub (« Synchro Instagram » → « Run workflow »). Le jeton Meta est chiffré dans le dépôt (`data/instagram/token.enc`) et renouvelé automatiquement chaque lundi.

Mise en route, à faire une seule fois :

1. Sur [developers.facebook.com](https://developers.facebook.com/apps), créer une app de type **Business**, ajouter le produit **Instagram**, puis dans _API setup with Instagram business login_, connecter @hbcizon et cliquer sur **Generate token**.
2. Générer la clé de chiffrement et la déclarer à GitHub :
   ```bash
   pnpm ig:cle            # copier la ligne IG_KEY=… dans .env
   gh secret set IG_KEY -R izonhandball/site
   ```
3. Chiffrer le jeton, puis commiter `data/instagram/token.enc` :
   ```bash
   pnpm ig:init           # coller le jeton généré à l'étape 1
   pnpm ig:sync           # facultatif : première synchro en local
   ```

Pour vérifier le jeton : `pnpm ig:etat`. Si le renouvellement échoue (mot de passe Instagram changé, accès révoqué…), le site reste en ligne avec les derniers posts. Il suffit de refaire les étapes 1 et 3.

## Formulaire de contact

Le bouton « Nous contacter » envoie les messages à izonhandball@gmail.com, par Cloudflare Email Routing et le Worker du site (`/api/contact`), avec Turnstile contre les robots. `contact@hbc-izon.fr` est aussi renvoyé vers cette boîte. Configuration, tests et dépannage : [`docs/formulaire-de-contact.md`](docs/formulaire-de-contact.md). Pourquoi cette solution : [ADR 0001](docs/adr/0001-formulaire-de-contact.md).

## Où est quoi

| Dossier           | Contenu                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `content/`        | Contenu fixe (YAML / Markdown), édité via Decap CMS. Schémas : `src/content.config.ts` |
| `docs/`           | Documentation d'exploitation et décisions d'architecture (`docs/adr/`)                 |
| `data/instagram/` | Posts Instagram, écrits par la synchro automatique                                     |
| `public/`         | Images (Instagram, équipes, archives) et Decap CMS (`admin/`)                          |
| `src/`            | Pages, composants, styles et règles de l'accueil                                       |
| `worker/`         | Worker Cloudflare : fichiers du site, connexion à l'admin, formulaire de contact       |

Le contexte complet du projet (décisions, direction artistique, prochaines étapes) est dans [`CLAUDE.md`](CLAUDE.md).
