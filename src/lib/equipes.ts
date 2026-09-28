// Mise en forme d'une fiche équipe, partagée par le site (Equipes.astro)
// et l'aperçu de l'administration (src/admin/apercus.ts).

export const A_COMPLETER = "À compléter";

export interface Equipe {
  nom: string;
  groupe: "adultes" | "jeunes";
  niveau?: string;
  equipes?: { nom: string; niveau: string }[];
  naissance?: string;
  horaires?: { jour: string; debut: string; fin: string }[];
  entraineurs?: string;
  mention?: string;
  photo?: string;
  photoLegende?: string;
}

// Les valeurs peuvent manquer dans l'aperçu de l'admin (créneau ou équipe en cours de saisie).
export const formatHeure = (h?: string) => (h ? h.replace(":", "h") : "…");

const joindre = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ");

export const libelleGroupe = (e: Pick<Equipe, "groupe">) =>
  e.groupe === "jeunes" ? "Catégorie jeunes" : "Adultes";

/** Créneaux en abrégé pour la liste des équipes sur mobile : « Mer 19h30 · Ven 21h15 ». */
export function resumeHoraires(e: Pick<Equipe, "horaires">): string {
  if (!e.horaires?.length) return "Horaires à venir";
  return joindre(
    ...e.horaires.map((h) => `${(h.jour ?? "…").slice(0, 3)} ${formatHeure(h.debut)}`),
  );
}

/** Lignes « libellé / valeur » de la fiche ; une valeur absente s'affiche « À compléter ». */
export function lignesEquipe(e: Equipe): { label: string; valeur?: string }[] {
  const l: { label: string; valeur?: string }[] = [];
  if (e.equipes?.length) {
    l.push({ label: "Équipes", valeur: e.equipes.map((x) => joindre(x.nom, x.niveau)).join("\n") });
  } else {
    l.push({ label: "Niveau", valeur: e.niveau || undefined });
  }
  if (e.groupe === "jeunes")
    l.push({ label: "Années de naissance", valeur: e.naissance || undefined });
  l.push({
    label: "Entraînements",
    valeur: e.horaires?.length
      ? e.horaires
          .map((h) => `${h.jour ?? "…"} ${formatHeure(h.debut)} – ${formatHeure(h.fin)}`)
          .join("\n")
      : undefined,
  });
  l.push({ label: "Entraîneur", valeur: e.entraineurs || undefined });
  return l;
}
