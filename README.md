# Site du HBC Izon

Site du Handball Club Izonnais : [hbcizon.fr](https://hbcizon.fr).

- **L'accueil se met à jour tout seul depuis Instagram** (@hbcizon). Il suffit d'ajouter un hashtag dans la légende du post :

  | Hashtag | Où le post apparaît |
  |---|---|
  | `#hbcimatchday` | À la une · Match day |
  | `#hbciprogramme` | À la une · Le programme |
  | `#hbciresultats` | À la une · Les résultats |
  | `#hbcirecrutement`, `#hbcievent` | Annonces (les 4 dernières) |
  | aucun | La vie du club (les 6 derniers) |

- **Le contenu fixe** (équipes, horaires, histoire, coordonnées) se modifie depuis `/admin`, sans toucher au code.

## Développement

Prérequis : Node 24 et pnpm.

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm test     # règles de classement des posts Instagram
pnpm build    # vérification des types et du contenu, puis build statique dans dist/
```

Pour essayer l'administration en local, lancer `pnpm cms` dans un second terminal, puis ouvrir http://localhost:4321/admin/index.html.

## Synchro Instagram

Une GitHub Action lit les posts toutes les heures et commite les changements. Le jeton Meta est chiffré dans le dépôt (`data/instagram/token.enc`) et renouvelé automatiquement chaque lundi.

Mise en route, à faire une seule fois :

1. Sur [developers.facebook.com](https://developers.facebook.com/apps), créer une app de type **Business**, ajouter le produit **Instagram**, puis dans *API setup with Instagram business login*, connecter @hbcizon et cliquer sur **Generate token**.
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

## Où est quoi

| Dossier | Contenu |
|---|---|
| `content/` | Contenu fixe (YAML / Markdown), édité via Decap CMS. Schémas : `src/content.config.ts` |
| `data/instagram/` | Posts Instagram, écrits par la synchro automatique |
| `public/` | Images (Instagram, équipes, archives) et Decap CMS (`admin/`) |
| `src/` | Pages, composants, styles et règles de l'accueil |

Le contexte complet du projet (décisions, direction artistique, prochaines étapes) est dans [`CLAUDE.md`](CLAUDE.md).
