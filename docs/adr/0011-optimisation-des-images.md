# ADR 0011 : optimisation automatique des images déposées

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Decap enregistre les images telles qu'elles arrivent. Une capture d'écran de test pesait 1,6 Mo ; des photos de téléphone alourdiraient vite le site et le dépôt. Les bénévoles ne doivent pas avoir à préparer leurs images.

## Options étudiées

- Demander aux bénévoles de redimensionner : peu fiable.
- Compresser dans le navigateur avant l'envoi : Decap ne le permet pas simplement.
- **Convertir en CI après la publication**, comme la synchro le fait déjà pour Instagram.

## Décision

- Script `scripts/images/optimiser.ts` (`pnpm images`, testé) : JPEG et PNG convertis en **WebP 1600 px de large au maximum, qualité 80**, WebP de plus de 400 Kio réencodés, photos redressées selon l'orientation du téléphone, **références mises à jour dans `content/`**. Les images Instagram, déjà optimisées, ne sont pas concernées. Relancer le script ne refait rien.
- Lancé en **première étape du workflow Site** quand `public/images/` contient un JPEG, un PNG ou un WebP de plus de 400 Kio ; le résultat est commité, puis vérifié et déployé dans la même exécution (voir [ADR 0012](0012-workflow-site-sequentiel.md)).
- Une image absente de `public/` s'affiche comme un emplacement réservé (`Visuel.astro`) : les chemins peuvent être déclarés avant que les fichiers existent.

## Conséquences

- Le site ne sert que des images légères ; la photo de test est passée de 1,6 Mo à 107 Kio.
- **L'original reste dans l'historique Git** : inévitable sans compression côté navigateur, négligeable pour quelques dizaines de photos par saison.
- Un WebP léger mais plus large que 1600 px n'est pas retraité automatiquement : `pnpm images` en local s'en charge.
