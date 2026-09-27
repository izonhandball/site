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

Prérequis : Node 22 et pnpm.

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm test     # règles de classement des posts Instagram
pnpm build    # vérification des types et du contenu, puis build statique dans dist/
```

Pour essayer l'administration en local, lancer `pnpm cms` dans un second terminal, puis ouvrir http://localhost:4321/admin/index.html.

## Où est quoi

| Dossier | Contenu |
|---|---|
| `content/` | Contenu fixe (YAML / Markdown), édité via Decap CMS. Schémas : `src/content.config.ts` |
| `data/instagram/` | Posts Instagram, écrits par la synchro automatique |
| `public/` | Images (Instagram, équipes, archives) et Decap CMS (`admin/`) |
| `src/` | Pages, composants, styles et règles de l'accueil |

Le contexte complet du projet (décisions, direction artistique, prochaines étapes) est dans [`CLAUDE.md`](CLAUDE.md).
