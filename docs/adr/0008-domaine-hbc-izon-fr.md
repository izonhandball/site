# ADR 0008 : domaine hbc-izon.fr, DNS chez Cloudflare

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Il fallait un nom de domaine. `hbcizon.fr` était libre, mais `hbc-izon.fr` appartient déjà au club (ancien site Clubeo, abandonné), chez le registrar OVH, avec une messagerie OVH. Cloudflare ne vend pas de `.fr`.

## Options étudiées

- Acheter `hbcizon.fr` : 7 à 12 € par an, un domaine de plus à renouveler.
- **Réutiliser `hbc-izon.fr`**, en gardant OVH comme registrar et en confiant les DNS à Cloudflare.

## Décision

- **`hbc-izon.fr`**, registrar OVH (expiration le **05/01/2027**, à renouveler).
- **DNS chez Cloudflare** (serveurs `lara` et `rick.ns.cloudflare.com`, zone en offre Free). Les enregistrements de l'ancien site ont été supprimés ; les MX et le SPF OVH ont d'abord été conservés, puis remplacés par Email Routing (voir [ADR 0013](0013-formulaire-de-contact.md)).
- `hbc-izon.fr` et `www.hbc-izon.fr` sont des **domaines personnalisés du Worker**, ajoutés depuis le tableau de bord : le jeton d'API de déploiement n'a pas les droits de zone.
- **Règle de redirection** « www vers hbc-izon.fr » (301, chemin et paramètres conservés), appliquée avant le Worker, et **« Always Use HTTPS »**.
- `hbcizon.izonhandball.workers.dev` reste actif en secours. L'OAuth App GitHub accepte les deux adresses de retour.

## Conséquences

- Aucun achat : il faut seulement penser au renouvellement chez OVH avant le 05/01/2027.
- Le changement de serveurs DNS se fait chez OVH, avec un accès au compte du titulaire.
- Retour arrière possible : remettre les serveurs DNS d'OVH.
