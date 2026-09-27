# Site du HBC Izon (hbcizon.fr)

Site web du Handball Club Izonnais. Ce fichier résume le contexte établi en phase de conception (maquettes faites sur claude.ai). À lire avant toute tâche.

## Objectif et principe

- **Partie statique** : contacts, histoire, équipes, entraînements, liens. Contenu figé dans des fichiers de config (YAML / Markdown), modifiable sans toucher au code.
- **Page d'accueil dynamique** : alimentée automatiquement par les publications Instagram du club, filtrées par hashtags.
- **Administration minimale** : pas de serveur, pas de base de données. Des bénévoles non techniques doivent pouvoir modifier le contenu figé → CMS Git-based type **Decap CMS**.
- **Coût** : zéro hors nom de domaine (hébergement statique gratuit : Cloudflare Pages, Netlify ou GitLab Pages).

## Décisions prises

- **Framework** : Astro (sortie 100 % statique), TypeScript strict, CSS natif (tokens dans `src/styles/tokens.css`), JS natif sans framework (`src/scripts/ui.ts`).
- **CMS** : Decap CMS dans `public/admin/` (backend GitHub, relecture avant publication). En prod, il faut un Worker OAuth sur Cloudflare (compte gratuit à créer).
- **Dépôt** : `git@github.com:izonhandball/site.git` (public), CI GitHub Actions.
- **Hébergement** : **Cloudflare Workers avec static assets** (plutôt que Pages, que Cloudflare ne met plus en avant). Un seul Worker (`worker/index.ts`, `wrangler.jsonc`) sert `dist/` et l'OAuth GitHub de Decap sur `/api/auth` : même domaine, pas de service séparé. Déploiement par GitHub Actions (`deploy.yml`) avec `wrangler deploy` : à chaque push sur main, après une synchro Instagram qui a changé quelque chose (déclenché explicitement, car un push fait avec `GITHUB_TOKEN` ne déclenche rien), et chaque nuit (expiration des Match Day).
- **Domaine** : `hbcizon.fr` (libre au 27/09/2026). `hbc-izon.fr` est déjà enregistré par quelqu'un.
- **Jeton Instagram** : stocké chiffré dans le dépôt (`data/instagram/token.enc`), clé fixe dans le secret `IG_KEY`, rafraîchi chaque semaine par un workflow qui commite le nouveau jeton (pas de PAT, et le commit garde les crons actifs).
- **Hashtags de pilotage** : dans la légende uniquement (permission `instagram_business_basic` seule).

## Architecture du code

```
content/                 contenu éditable (Decap) — schémas Zod dans src/content.config.ts
  club.yml               nom, salle, mail, liens, accroche histoire
  equipes/*.yml          une fiche par équipe (groupe adultes|jeunes, horaires, niveau…)
  histoire/periodes/*.md frise : une période par fichier (faits en liste Markdown)
  histoire/histoire.yml  licenciés par saison, maillots
data/instagram/posts.json  posts Instagram (écrit par le script de synchro, jamais à la main)
public/instagram/        images des posts (<id>-<n>.webp)
public/images/           equipes/, archives/, uploads/ (Decap)
public/admin/            Decap CMS (index.html + config.yml) ; base_url = origine du site, auth_endpoint api/auth
worker/                  Worker Cloudflare : assets + OAuth GitHub pour Decap (testé)
src/lib/instagram.ts     classement par hashtag + sélection des blocs de l'accueil (testé)
src/components/          sections de l'accueil, carrousel, fenêtres
src/pages/               index, histoire, 404
```

- Le script de synchro **récupère** seulement. Le **classement et la sélection** se font au build (`selectionAccueil`), ce qui permet de changer les règles sans resynchroniser.
- Une image absente de `public/` s'affiche comme un emplacement réservé (`Visuel.astro`, `imagePublique`). Les chemins peuvent donc être déclarés avant que les fichiers existent.
- `data/instagram/posts.json` contient pour l'instant des **données de dev** (`"source": "fixture"`) tirées de la maquette : vraies légendes, hashtags ajoutés, images pas encore récupérées.
- Commandes : `pnpm dev`, `pnpm test`, `pnpm build` (= `astro check` + build), `pnpm cms` (backend local de Decap, puis http://localhost:4321/admin/index.html).
- `pnpm-workspace.yaml` hisse `cookie` : un `~/node_modules/cookie` (v0.7) sur le poste du mainteneur cassait le prérendu.

## Synchro Instagram

- Compte : **@hbcizon**, compte **professionnel** (catégorie « Équipe de sport amateur »). Le mainteneur a les accès.
- API : **Instagram API with Instagram Login** (remplace la Basic Display API). Lecture seule des médias du compte : `id, caption, media_type, media_url, permalink, timestamp`, + `children` pour les carrousels.
- Prérequis : app Meta Developers, jeton longue durée (60 jours) **renouvelé automatiquement** par le script.
- Tâche planifiée (toutes les heures) : récupère les derniers posts → **télécharge les images dans le dépôt** (les URL CDN Instagram expirent), en WebP ~1200 px → écrit `data/instagram/posts.json` → commit si changement → rebuild/déploiement.
- Les Reels avec musique sous droits n'ont pas de `media_url` : prendre `thumbnail_url`.
- Si le jeton expire, le site reste en ligne avec les derniers contenus.
- **Implémentation** (`scripts/instagram/`, Node 24 exécute le TypeScript directement) :
  - `sync.ts` (`pnpm ig:sync`) : lit les 50 derniers médias (API v25.0, `/me/media` avec `children`), ne garde que les posts affichables à l'instant T (`postsAGarder` = union des blocs de `selectionAccueil`), télécharge leurs images en WebP 1080 px dans `public/instagram/<id>-<n>.webp`, supprime les images devenues inutiles, et n'écrit `posts.json` que si les posts ont changé.
  - `jeton.ts` / `jeton-cli.ts` : AES-256-GCM, clé `IG_KEY` (secret GitHub + `.env` local). Commandes `pnpm ig:cle`, `ig:init`, `ig:renouveler`, `ig:etat`. Le jeton est masqué dans les journaux Actions (`::add-mask::`), et un avertissement s'affiche à moins de 14 jours de l'expiration.
  - Workflows `sync-instagram.yml` (horaire) et `refresh-token.yml` (lundi), sans effet tant que `token.enc` n'existe pas. Ils commitent avec `GITHUB_TOKEN` : ces commits **ne déclenchent pas** d'autres workflows. Le déploiement devra donc soit être déclenché par l'hébergeur (intégration Git de Cloudflare Pages), soit être fait dans le même workflow.
  - Un build quotidien sera nécessaire au déploiement pour retirer un Match Day expiré quand aucun nouveau post n'arrive.
- Pour des données de dev réelles sans API : `instaloader` avec login (l'accès anonyme est bloqué par Instagram).

### Hashtags de pilotage (dans la légende, insensibles à la casse et aux accents)

| Hashtag | Bloc de l'accueil | Règle |
|---|---|---|
| `#hbcimatchday` | À la une | dernier post ; retiré après le dimanche qui suit sa publication |
| `#hbciresultats` | À la une | dernier post tagué |
| `#hbciprogramme` | À la une | dernier post tagué |
| `#hbcirecrutement` | Annonces | 4 dernières annonces (recrutement + événements) |
| `#hbcievent` | Annonces | idem |
| (aucun) | La vie du club | 6 derniers posts, ouverts en album |

À la une affiche un onglet par bloc présent, le plus récent sélectionné. Les hashtags de pilotage sont retirés de la légende affichée.

Piste d'évolution : lire le texte des visuels (scores, adversaire, date) pour remplir les gabarits HTML au lieu d'afficher l'image brute.

## Structure du site (maquette validée : A1 « Affiche »)

Maquette : https://claude.ai/artifact/5MA6EF4E1Efuyikr9qbpMA (desktop 1280, mobile 390, page Histoire).

| Page | Contenu | Source |
|---|---|---|
| Accueil `/` | À la une (onglets Match day / Programme / Résultats) · Annonces (carrousel, fiche avec légende complète) · La vie du club (grille, album) · Équipes & entraînements (une fiche par équipe, lieu et mail donnés une fois) · accroche Histoire · pied de page contact | Instagram + `content/` |
| Histoire `/histoire/` | frise en 5 périodes (faits, présidents, archives), licenciés par saison, maillots | `content/histoire/` |

Menu : À la une · Annonces · Vie du club · Équipes · Histoire (pas d'entrée Contact : il est en pied de page). Bouton « Nous rejoindre » → HelloAsso.

## Direction artistique

Issue des affiches publiées par le club sur Instagram (Match Day, Les Résultats, Recrutement). Le site doit ressembler à ces affiches.

- **Couleurs** : noir `#0b0b0b` dominant · jaune `#f5c400` · dégradé jaune-orangé `#f7c600 → #eaa300` (fond des affiches résultats) · rouge `#e0161b` (accent, maillots) · blanc.
- **Typo (site, d'après la maquette)** : titres d'affiche `Anton` en capitales · libellés et boutons `Barlow Condensed` 700/900 · dates et accroches `Playfair Display` italique jaune · texte courant `Barlow`. Polices servies par le site (`@fontsource`), pas de Google Fonts.
- **Couleurs du site** : noir `#0d0d0d`, sections alternées `#1a1a1a`, jaune `#ffd52e`, rouge `#e0161b`, corail `#ff6b6e` (catégories), dégradé `#e8b62e → #cf9616` (accroche Histoire).
- **Typo des affiches Instagram** (référence) : `Barlow Condensed` 900, script manuscrit type `Permanent Marker`.
- **Motifs** : coups de pinceau et éclaboussures jaunes, griffures rouges dans les coins, traits de pinceau jaunes dans les 4 coins (Match Day), texture sombre, photos en noir et blanc.
- **Gabarit résultats** : photo d'équipe en tête, « LES RÉSULTATS » + script « Nos séniors » / « Nos jeunes », barres noires `CATÉGORIE (jaune) // ADVERSAIRE (blanc) SCORE (gros)` + « Victoire »/« Défaite » en script + pastille verte/rouge.
- **Gabarit Match Day** : « MATCH DAY » blanc droit, catégorie en script jaune, deux logos séparés par un trait, « HBC IZON VS » jaune / adversaire blanc, date+heure en gras, lieu et « Restauration sur place », joueur détouré à droite.
- **Signatures** : « Un ballon, une passion, une famille… Since 1973 » · « Ensemble, écrivons l'histoire ! » · « Plaisir, motivation et compétition » · « Viens essayer gratuitement ! ».
- Logo : rond jaune, silhouette noire de joueur, lettres HBC / IZON rouges. À déposer en `public/logo.png` (photo de profil Instagram, 960 px) ; une pastille provisoire s'affiche en attendant.
- Mobile-first : les maquettes existent en 1280 px et 390 px.


## Contenu du club (données réelles)

- **Nom** : Handball Club Izonnais — HBC Izon
- **Salle** : Salle des Costauds, 7-9 rue des Écoles, 33450 Izon
- **Mail** : izonhandball@gmail.com
- **Catégories** : Babyhand à Seniors + Loisir. Seniors F, Seniors G1, Seniors G2, U18 G, U15 F, U15 G, U13, U11, U9, Babyhand.
- **Créneau connu** : -15 garçons, mercredi 17h–18h30 (2 essais gratuits). Les autres horaires sont à compléter.
- **Jeunes** : membre du Grand Libournais Handball.

### Histoire (à développer dans `histoire.md`)

- 1973 : fondation par **Marcel Deberteix**, joueur et président. 14 filles et 8 garçons. Terrain en herbe, sans vestiaires ; le terrain passe ensuite à la terre battue puis à l'enrobé.
- Années 90 : matchs le dimanche matin, les ballons finissent dans les vignes faute de filets.
- **23 juin 2001** : inauguration de la Salle des Costauds (Izon était l'un des deux derniers clubs girondins sans salle).
- Maillots : jaunes en coton à l'origine, puis vert, noir, et aujourd'hui jaune/rouge/noir.
- 2023 : 50 ans du club.
- Sources : dans le google drive https://drive.google.com/drive/folders/1DMVpeSkw4P2LUehZ4n8tCK2t6nI0kfP0 (PDF et tableur historiques, photos d'équipes 1973-74, 1987-2010).


### Exemples de données Instagram (week-end du 19/20 septembre 2026)

Résultats séniors : Sénior F 35-13 Blayais Haute Gironde HB (V) · Sénior G1 29-31 Villebois (V) · Sénior G2 38-24 HBC Pays Castillonnais (V).
Résultats jeunes : U15 G 25-28 Carbon Blanc / Artigues (V) · U15 F 22-26 Handball Cubzaguais (D) · U18 G 32-36 AS HB du Fronsadais (D).
Match Day : U18 G, HBC Izon vs AS HB du Fronsadais, 19.09.2026 17h00, Salle les Costauds.

Post résultats de référence : https://www.instagram.com/p/Ddj4ZUbEVND/ (carrousel : couverture + Nos séniors + Nos jeunes)
Post Match Day de référence : https://www.instagram.com/p/DdbEwuZjQp1/
Affiche recrutement de référence : https://www.instagram.com/p/DbnkHCmMJuI/

## Liens utiles

- Instagram : https://www.instagram.com/hbcizon/
- Facebook : https://www.facebook.com/izonhandball/
- FFHandball : https://monclub.ffhandball.fr/clubs/hbc-izonnais/
- HelloAsso (adhésions) : https://www.helloasso.com/associations/handball-izonnais
- Boutique : https://www.helloasso.com/associations/handball-izonnais/boutiques/boutique
- Résultats & classements : https://scorenco.com/hand/clubs/hbc-izonnais-2pr8
- Ancien site Clubeo : https://hbc-izon.clubeo.com/

## Prochaines étapes

1. ~~Synchro Instagram en service~~ (27/09/2026) : app Meta « site » (ID 1401697685421396 côté Instagram), @hbcizon testeur Instagram, permission `instagram_business_basic` seule, secret `IG_KEY` posé, jeton chiffré commité. Les posts existants n'ont pas encore de hashtags de pilotage : il faut les ajouter aux légendes (modifier un post suffit, la synchro suivante le reclasse).
2. Ajouter le logo, les photos d'équipe et les archives.
3. Cloudflare : compte, jeton d'API (modèle « Edit Cloudflare Workers ») → secrets GitHub `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, premier déploiement sur `hbcizon.<compte>.workers.dev`.
4. OAuth App GitHub dans l'organisation izonhandball (callback `https://<domaine>/api/auth/callback`) → `wrangler secret put GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET`. Chaque bénévole doit avoir un accès en écriture au dépôt.
5. Domaine `hbcizon.fr` (.fr non vendu par Cloudflare Registrar : acheter chez un registrar français, puis déléguer les DNS à Cloudflare), domaine personnalisé sur le Worker, mise à jour du callback de l'OAuth App.
6. Version mobile de la page Histoire à vérifier sur appareil réel.

## Plus tard

