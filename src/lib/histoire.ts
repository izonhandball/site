// Mise en forme de la page Histoire, partagée par le site et l'aperçu de l'administration.

/** Fond d'un maillot : une couleur unie, ou des bandes verticales égales. */
export function fondMaillot(couleurs: string[]): string {
  if (couleurs.length <= 1) return couleurs[0] ?? "transparent";
  const n = couleurs.length;
  return `linear-gradient(90deg, ${couleurs
    .map((c, i) => `${c} ${(i * 100) / n}% ${((i + 1) * 100) / n}%`)
    .join(", ")})`;
}

/** Hauteur relative (en %) de chaque barre du graphique des licenciés. */
export function hauteursLicencies(nombres: number[]): number[] {
  const max = Math.max(1, ...nombres);
  return nombres.map((n) => (n / max) * 100);
}
