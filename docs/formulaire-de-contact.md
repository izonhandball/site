# Formulaire de contact

Le bouton « Nous contacter » ouvre une fenêtre de contact. Les messages arrivent dans **izonhandball@gmail.com**, et « Répondre » dans Gmail écrit directement au visiteur. Le choix de cette solution est expliqué dans l'[ADR 0001](adr/0001-formulaire-de-contact.md).

## Fonctionnement

```
Navigateur                        Worker hbcizon (Cloudflare)              Gmail du club
FenetreContact.astro + ui.ts      worker/contact.ts
  │ widget Turnstile (jeton)        │
  │── POST /api/contact (JSON) ────▶│ 1. origine, champ piège, champs
  │                                 │ 2. jeton → Turnstile siteverify
  │                                 │ 3. env.CONTACT.send() ─────────────▶ izonhandball@gmail.com
  │◀── 200 / 4xx / 5xx ─────────────│    (de formulaire@hbc-izon.fr,
  « Message envoyé » ou erreur            répondre à : le visiteur)
```

| Fichier                               | Rôle                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/components/FenetreContact.astro` | Fenêtre et formulaire ; clé publique Turnstile                                                |
| `src/scripts/ui.ts` (`contact()`)     | Chargement de Turnstile à la première ouverture, validation, envoi, états « envoyé » / erreur |
| `worker/contact.ts`                   | Contrôles, vérification Turnstile, composition et envoi du mail                               |
| `worker/contact.test.ts`              | Tests du Worker (envoi, refus, champ piège, injection dans l'objet…)                          |
| `wrangler.jsonc`                      | Liaison `send_email` `CONTACT`, destinataire fixé                                             |

Réponses de `/api/contact` : `200` envoyé (ou robot piégé), `400` formulaire invalide, `403` origine ou Turnstile refusés, `405` autre méthode que POST, `500` secret ou liaison manquants, `502` échec d'envoi. Le visiteur voit « Message envoyé », ou un message d'erreur qui donne l'adresse du club.

## Configuration Cloudflare (compte izonhandball@gmail.com)

Tout se fait depuis le tableau de bord, rien n'est dans le code sauf la liaison et la clé publique.

| Réglage                   | Où                                                           | Valeur                                                                                                             |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Email Routing             | Compute › Email Service › Email Routing › `hbc-izon.fr`      | Activé ; enregistrements DNS ajoutés et verrouillés par Cloudflare                                                 |
| Adresse de destination    | Email Routing › Destination addresses                        | izonhandball@gmail.com (vérifiée)                                                                                  |
| Règle de renvoi           | Email Routing › Routing rules                                | `contact@hbc-izon.fr` → izonhandball@gmail.com                                                                     |
| DNS                       | `hbc-izon.fr` › DNS › Records                                | MX `route1/2/3.mx.cloudflare.net`, TXT SPF et DKIM (`cf2024-1._domainkey`), TXT `_dmarc` `v=DMARC1; p=none`        |
| Widget Turnstile          | Application security › Turnstile                             | « Site HBC Izon - formulaire de contact », mode Managed, hôtes `hbc-izon.fr` et `hbcizon.izonhandball.workers.dev` |
| Clé publique Turnstile    | `src/components/FenetreContact.astro`                        | `0x4AAAAAAFH2KRxS11ofFMsF`                                                                                         |
| Secret `TURNSTILE_SECRET` | Workers & Pages › hbcizon › Settings › Variables and Secrets | Secret key du widget (type Secret, Production)                                                                     |

Changer de clé Turnstile (widget recréé, clé secrète régénérée) : mettre la nouvelle clé publique dans `FenetreContact.astro` et la nouvelle clé secrète dans `TURNSTILE_SECRET`, puis déployer. Changer la boîte destinataire : ajouter et vérifier la nouvelle adresse dans Destination addresses, puis modifier `destination_address` dans `wrangler.jsonc` et `DESTINATAIRE` dans `worker/contact.ts`.

## Tester

### Tests automatiques

```bash
pnpm test
```

`worker/contact.test.ts` simule Turnstile et la liaison d'envoi : aucun mail ne part.

### En local, de bout en bout

Cloudflare fournit des [clés Turnstile de test](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) : sur `localhost`, la page prend la clé publique de test et le Worker accepte la réponse de la clé secrète de test (en production, la vraie clé secrète refuse ces jetons).

1. Dans `.dev.vars` (non commité) :
   ```bash
   TURNSTILE_SECRET="1x0000000000000000000000000000000AA"
   ```
2. Construire le site et lancer le Worker en local :
   ```bash
   pnpm preview:cf
   ```
3. Ouvrir http://localhost:8787, cliquer sur « Nous contacter », remplir et envoyer.
4. Aucun mail ne part : wrangler affiche l'expéditeur, le destinataire et l'objet dans le terminal, et écrit le texte du mail dans `.wrangler/tmp/email/…/email-text/*.txt`.

`pnpm dev` (Astro seul, port 4321) affiche la fenêtre mais n'a pas `/api/contact` : l'envoi y finit toujours sur le message d'erreur.

### En production, après chaque changement de configuration

1. Sur https://hbc-izon.fr, envoyer un message avec l'objet « Autre question », une adresse à laquelle on a accès et un texte comme « Test du formulaire, à ignorer ».
2. Vérifier dans izonhandball@gmail.com :
   - le mail arrive en boîte de réception (pas en spam), de « Site HBC Izon » `formulaire@hbc-izon.fr`, objet `[Site] Autre question : <nom>` ;
   - « Répondre » propose l'adresse saisie dans le formulaire ;
   - « Afficher l'original » indique `SPF: PASS`, `DKIM: PASS` et `DMARC: PASS`.
3. Si le mail est en spam : le marquer « Non spam », et au besoin créer un filtre Gmail sur `from:formulaire@hbc-izon.fr` avec « Ne jamais envoyer dans le spam ».
4. Tester le renvoi : écrire à `contact@hbc-izon.fr` depuis une autre boîte et vérifier l'arrivée dans Gmail.

On peut aussi appeler l'API directement pour vérifier que les refus fonctionnent (aucun mail ne part) :

```bash
curl -i -X POST https://hbc-izon.fr/api/contact -H 'Content-Type: application/json' -d '{"sujet":"autre","nom":"Test","email":"test@example.org","message":"Test"}'
```

Réponse attendue : `403` (pas de jeton Turnstile). Une réponse `500` signifie que `TURNSTILE_SECRET` ou la liaison `CONTACT` manque.

## Dépannage

| Symptôme                                                       | Cause probable et solution                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| « L'envoi a échoué » à chaque essai, `/api/contact` répond 500 | `TURNSTILE_SECRET` absent sur le Worker : le poser (voir la configuration)                                                                                                                                                                 |
| Réponse 403 pour de vrais visiteurs                            | Clé publique et clé secrète de widgets différents, ou nom d'hôte absent du widget Turnstile                                                                                                                                                |
| « Vérification anti-robot en cours » qui ne disparaît pas      | Le script Turnstile ne charge pas (bloqueur de contenu, réseau) : le visiteur peut écrire à l'adresse affichée                                                                                                                             |
| Réponse 502                                                    | Envoi refusé par Cloudflare : voir les journaux (Workers & Pages › hbcizon › Observability, message « Envoi du formulaire de contact impossible » et code `E_…`). Vérifier qu'Email Routing est actif et l'adresse de destination vérifiée |
| `wrangler deploy` refuse la liaison `send_email`               | Le jeton d'API de GitHub Actions n'a pas le droit nécessaire : lui ajouter une permission Email Routing                                                                                                                                    |
| Mails en spam                                                  | Voir « En production », étape 3 ; vérifier SPF, DKIM et DMARC dans l'original                                                                                                                                                              |

## Revenir à la messagerie OVH

Seulement si des boîtes OVH `@hbc-izon.fr` doivent à nouveau recevoir du courrier (le formulaire cesse alors de fonctionner) :

1. Email Routing › Settings › **Disable** : Cloudflare retire ses enregistrements MX, SPF et DKIM.
2. Dans DNS › Records, recréer les enregistrements OVH d'origine :
   - MX `hbc-izon.fr` → `mx1.mail.ovh.net` (priorité 1), `mx2.mail.ovh.net` (5), `mx3.mail.ovh.net` (100) ;
   - TXT `hbc-izon.fr` → `v=spf1 include:mx.ovh.com -all`.
3. Remplacer l'envoi du formulaire par une autre option de l'[ADR 0001](adr/0001-formulaire-de-contact.md) (Resend sur sous-domaine par exemple).
