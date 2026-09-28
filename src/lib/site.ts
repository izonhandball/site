import { existsSync } from "node:fs";
import { join } from "node:path";
import { getEntry } from "astro:content";

export async function getClub() {
  const club = await getEntry("club", "club");
  if (!club) throw new Error("content/club.yml est introuvable");
  return club.data;
}

/**
 * Chemin public d'une image s'il existe dans public/, sinon null.
 * Permet d'afficher un emplacement vide tant qu'une photo n'est pas fournie.
 */
export function imagePublique(src: string | undefined): string | null {
  if (!src) return null;
  return existsSync(join(process.cwd(), "public", src)) ? src : null;
}

const dateFr = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});
const jourMoisFr = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});
const dateCourteFr = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export const formatDate = (iso: string) => dateFr.format(new Date(iso));
export const formatJourMois = (iso: string) => jourMoisFr.format(new Date(iso));
export const formatDateCourte = (iso: string) => dateCourteFr.format(new Date(iso));
