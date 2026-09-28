# ADR 0001 : site statique avec Astro, CSS et JavaScript natifs

- **Date** : 27/09/2026
- **Statut** : accepté

## Contexte

Le site du HBC Izon reprend la maquette A1 « Affiche » : un accueil sur une seule page (À la une, Annonces, Vie du club, Équipes) et une page Histoire. Le contenu change peu, sauf l'accueil, alimenté par Instagram. Il faut un site gratuit à héberger, rapide sur mobile, et que des bénévoles ne puissent pas casser en modifiant le contenu.

## Options étudiées

- **Astro en sortie 100 % statique**, TypeScript strict.
- Un générateur plus simple (Eleventy…) ou un site écrit à la main : moins d'outillage, mais pas de validation du contenu.
- Un framework applicatif (Next.js, SvelteKit) : surdimensionné, JavaScript envoyé au navigateur sans besoin.
- Pour le style : Tailwind, ou CSS natif avec variables.

## Décision

- **Astro**, sortie statique, **TypeScript strict**.
- **Content collections** avec des schémas Zod (`src/content.config.ts`) : une fiche mal remplie fait échouer le build au lieu de casser le site en ligne.
- **CSS natif**, couleurs et polices en variables dans `src/styles/tokens.css` : la direction artistique tient en une dizaine de variables.
- **JavaScript natif sans framework** (`src/scripts/ui.ts`) pour les onglets, carrousels, fenêtres et le menu mobile.
- **Polices servies par le site** (`@fontsource`), sans Google Fonts : pas d'appel à un tiers, pas de question RGPD.
- pnpm, Node 24 (qui exécute directement les scripts TypeScript), tests avec Vitest.

## Conséquences

- Le site ne contient que du HTML, du CSS et très peu de JavaScript : rapide et hébergeable n'importe où gratuitement.
- Toute donnée dynamique doit être connue **au moment du build** : l'accueil Instagram impose donc un build régulier (voir [ADR 0003](0003-synchro-instagram.md)).
- Un `~/node_modules` sur le poste du mainteneur cassait le prérendu (vieille version de `cookie`) : `pnpm-workspace.yaml` hisse `cookie` pour s'en protéger.
