# ADR 0003 : accueil alimenté par Instagram, piloté par hashtags

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Le club publie déjà ses affiches (Match Day, résultats, programme, recrutement) sur Instagram (@hbcizon, compte professionnel). L'accueil doit les reprendre sans double saisie. La Basic Display API de Meta n'existe plus.

## Options étudiées

- **Instagram API with Instagram Login**, lecture seule des médias du compte.
- **oEmbed** : affiche un post dont on connaît l'adresse, mais ne sait pas lister les derniers posts.
- Hashtags de pilotage **dans la légende**, ou en premier commentaire (qui demanderait une permission de plus).
- Synchro toutes les heures, ou une fois par jour.

## Décision

- **Instagram API with Instagram Login**, app Meta « site », @hbcizon testeur Instagram, permission **`instagram_business_basic` seule** (mode développement : on ne lit que le compte du club).
- **Hashtags dans la légende**, insensibles à la casse et aux accents, retirés du texte affiché : `#hbcimatchday`, `#hbciresultats`, `#hbciprogramme` (À la une), `#hbcirecrutement`, `#hbcievent` (Annonces), aucun (La vie du club). Un Match Day est retiré après le dimanche qui suit sa publication.
- **Images téléchargées dans le dépôt** en WebP 1080 px : les URL du CDN Instagram expirent. Un Reel avec musique sous droits n'a pas d'image directe : on prend sa vignette.
- La synchro lit les 50 derniers médias, **ne garde que les posts affichables** (union des blocs de l'accueil), supprime les images devenues inutiles et n'écrit `posts.json` que si quelque chose a changé.
- **Une fois par jour vers 4h** (heure de Paris), puis reconstruction et déploiement du site, même sans changement : c'est ce build quotidien qui retire les Match Day expirés. La synchro était d'abord horaire ; une fois par jour suffit.

## Conséquences

- Les bénévoles pilotent l'accueil depuis Instagram, sans toucher au site. Un post existant se reclasse en modifiant sa légende.
- Un post publié apparaît sur le site au plus tard le lendemain matin, ou tout de suite en lançant « Synchro Instagram » à la main depuis l'onglet Actions.
- Si le jeton expire, le site reste en ligne avec les derniers posts.
- Le dépôt grossit des images gardées ; le filtrage limite ce volume aux posts affichés.
- Piste d'évolution : lire le texte des visuels (scores, adversaire, date) pour remplir des gabarits HTML au lieu d'afficher l'image brute.
