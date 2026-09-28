# ADR 0013 : formulaire de contact envoyé par Cloudflare Email Routing

- **Date** : 28/09/2026
- **Statut** : accepté

## Contexte

Le bouton « Nous rejoindre » de l'en-tête menait à HelloAsso. Il devient « Nous contacter » et ouvre un formulaire (essai, inscription, partenariat, autre question) dont les messages doivent arriver dans la boîte du club, **izonhandball@gmail.com**.

Contraintes du projet :

- **gratuit** et **infrastructure minimale** : pas de serveur ni de base de données, un seul Worker Cloudflare déjà en place ;
- **pas de relais de spam** : personne ne doit pouvoir se servir du formulaire pour écrire à un tiers ;
- **peu de messages indésirables** dans la boîte du club ;
- maintenance faible pour des bénévoles.

Le domaine `hbc-izon.fr` avait encore les MX et le SPF de la messagerie OVH, jugée inutilisée.

## Options étudiées

| Option                                                 | Pour                                                                                                                 | Contre                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **A. Cloudflare Email Routing + liaison `send_email`** | Gratuit sur toutes les offres vers une adresse vérifiée, hors quota ; aucun tiers ; adresses `@hbc-izon.fr` en prime | Remplace les MX du domaine (fin de la messagerie OVH)                                                                            |
| B. Resend avec un sous-domaine vérifié                 | Ne touche pas aux MX ; gratuit (3 000/mois, 100/jour) ; peut écrire à n'importe qui                                  | Compte et clé d'API chez un tiers                                                                                                |
| C. Resend sans domaine (`onboarding@resend.dev`)       | Aucun changement DNS                                                                                                 | Fonction réservée aux tests par Resend, peut disparaître                                                                         |
| D. Script Google Apps Script (`MailApp`)               | Aucun changement DNS ; le club s'écrit à lui-même                                                                    | Script à maintenir dans le compte Google ; 100 mails/jour                                                                        |
| E. Web3Forms, Formspree                                | Rien à coder côté serveur                                                                                            | Messages confiés à un tiers, clé visible dans la page, protection anti-spam selon leur offre, expéditeur extérieur (risque spam) |
| F. Cloudflare Email Routing sur un sous-domaine seul   | Ne toucherait pas aux MX                                                                                             | L'ajout d'un sous-domaine passe par les réglages Email Routing du domaine principal                                              |

## Décision

**Option A.** Email Routing est activé sur `hbc-izon.fr`. Le Worker existant reçoit le formulaire sur `/api/contact` et l'envoie par la liaison `send_email` `CONTACT`.

- **Destinataire fixé dans `wrangler.jsonc`** (`destination_address: izonhandball@gmail.com`) : Cloudflare refuse tout autre destinataire, même en cas de bug du code.
- **Expéditeur** `formulaire@hbc-izon.fr` (« Site HBC Izon »), **Répondre à** = l'adresse du visiteur, qui n'est jamais destinataire.
- **Anti-spam** :
  - **Turnstile** (gratuit), vérifié côté Worker : un jeton ne sert qu'une fois, expire en 5 minutes, et doit venir du même nom d'hôte que la requête ;
  - **champ piège** : s'il est rempli, le Worker répond « envoyé » sans rien envoyer ;
  - **contrôles** : objet parmi une liste fermée, champs obligatoires, longueurs maximales, format de l'e-mail, 3 liens au plus, en-tête `Origin` identique au site ;
  - les champs d'une ligne sont nettoyés des retours à la ligne avant d'entrer dans l'objet du mail.
- **DNS** : MX, SPF et DKIM de Cloudflare ; DMARC `p=none` (observation, sans rapports).
- **En prime** : `contact@hbc-izon.fr` est renvoyé vers la boîte Gmail.

## Conséquences

- La messagerie OVH de `hbc-izon.fr` ne reçoit plus rien. Pour revenir en arrière, voir [la procédure de retour](../formulaire-de-contact.md#revenir-à-la-messagerie-ovh).
- Coût nul : les envois vers une adresse vérifiée du compte ne comptent dans aucun quota, sur toutes les offres. Si des robots saturaient `/api/contact`, seul le formulaire tomberait : le reste du site ne passe pas par le Worker.
- Un visiteur humain peut toujours envoyer des messages indésirables à la main, comme avec une adresse affichée.
- Le formulaire dépend de trois réglages hors du code : Email Routing, le widget Turnstile et le secret `TURNSTILE_SECRET`. Ils sont décrits dans [formulaire-de-contact.md](../formulaire-de-contact.md).
- Pour écrire un jour à d'autres destinataires (accusé de réception au visiteur), il faudra l'offre Email Sending, qui demande l'abonnement Workers payant, ou l'option B.

## Références

- [Email Service : tarifs](https://developers.cloudflare.com/email-service/platform/pricing/) et [limites](https://developers.cloudflare.com/email-service/platform/limits/)
- [Restrictions des liaisons d'envoi](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
- [Turnstile : validation côté serveur](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
