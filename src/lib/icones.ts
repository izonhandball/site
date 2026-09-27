// Pictogrammes en trait, repris de la maquette. Partagés par Icone.astro et l'aperçu de l'admin.

export const ICONES = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
  precedent: '<path d="M15 5l-7 7 7 7"/>',
  suivant: '<path d="M9 5l7 7-7 7"/>',
  fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
  lieu: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
} as const;

export type NomIcone = keyof typeof ICONES;

/** Les flèches et la croix sont tracées un peu plus épais. */
export const epaisseurIcone = (nom: NomIcone) =>
  nom === "precedent" || nom === "suivant" || nom === "fermer" ? 2.5 : 2;
