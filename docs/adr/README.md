# Décisions d'architecture (ADR)

Chaque fichier consigne une décision : son contexte, les options étudiées, le choix retenu et ses conséquences. Ils sont numérotés dans l'ordre où les décisions ont été prises. Une décision remplacée n'est pas effacée : on écrit un nouvel ADR et on passe l'ancien au statut « remplacé par ADR XXXX ».

| N°                                              | Décision                                                               | Date       |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| [0001](0001-astro-site-statique.md)             | Site statique avec Astro, CSS et JavaScript natifs                     | 27/09/2026 |
| [0002](0002-contenu-humain-et-donnees-robot.md) | Contenu des bénévoles et données du robot séparés                      | 27/09/2026 |
| [0003](0003-synchro-instagram.md)               | Accueil alimenté par Instagram, piloté par hashtags                    | 27/09/2026 |
| [0004](0004-jeton-instagram-chiffre.md)         | Jeton Instagram chiffré dans le dépôt                                  | 27/09/2026 |
| [0005](0005-decap-cms.md)                       | Administration par Decap CMS                                           | 27/09/2026 |
| [0006](0006-cloudflare-workers.md)              | Hébergement sur Cloudflare Workers, OAuth de Decap dans le même Worker | 27/09/2026 |
| [0007](0007-depot-public.md)                    | Dépôt GitHub public                                                    | 27/09/2026 |
| [0008](0008-domaine-hbc-izon-fr.md)             | Domaine hbc-izon.fr, DNS chez Cloudflare                               | 27/09/2026 |
| [0009](0009-protection-de-branche.md)           | Protection de main sans vérification obligatoire                       | 27/09/2026 |
| [0010](0010-apercus-instantanes-decap.md)       | Aperçus instantanés dans l'admin Decap                                 | 27/09/2026 |
| [0011](0011-optimisation-des-images.md)         | Optimisation automatique des images déposées                           | 27/09/2026 |
| [0012](0012-workflow-site-sequentiel.md)        | Un seul workflow « Site » : images, vérification, déploiement          | 27/09/2026 |
| [0013](0013-formulaire-de-contact.md)           | Formulaire de contact envoyé par Cloudflare Email Routing              | 28/09/2026 |
