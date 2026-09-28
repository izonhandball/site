# ADR 0010 : aperçus instantanés dans l'admin Decap

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

L'aperçu intégré de Decap affiche les champs bruts, sans la mise en page du site : un bénévole ne voit pas ce que donnera sa fiche.

## Options étudiées

- **A. Aperçu déployé par branche** : chaque enregistrement Decap construit le site et le publie sur une adresse d'aperçu Cloudflare. Rendu fidèle à 100 %, sans code en double, mais l'aperçu arrive environ une minute après l'enregistrement.
- **B. Gabarits d'aperçu instantané** dans Decap, avec les styles du site : mise à jour pendant la frappe, mais la structure HTML existe en double.

## Décision

**Option B**, en limitant le double code :

- **Données partagées** : mise en forme dans `src/lib/equipes.ts`, `histoire.ts`, `icones.ts`, utilisés par le site et par l'admin (et testés).
- **Styles partagés** : `src/styles/fiche-equipe.css`, `histoire.css`, `club.css`, chargés par le site et par la feuille d'aperçu `src/styles/apercu.css`.
- **Seule la structure HTML est dupliquée**, dans `src/admin/apercus.ts` : fiche équipe, période, accroche Histoire, pied de page, graphiques de la page Histoire.
- La page de l'admin est générée par Astro (`src/pages/admin/`), pour connaître l'URL de la feuille d'aperçu.

## Conséquences

- Aperçu immédiat, fidèle en polices, couleurs et mise en page.
- **Toute modification de structure** d'une fiche équipe, d'une période, de l'accroche Histoire, du pied de page ou des graphiques de la page Histoire **doit être reportée dans `apercus.ts`**, sinon l'aperçu ment.
- Un lien direct vers une page de Réglages affiche un formulaire vide (particularité de Decap) : passer par la liste.
