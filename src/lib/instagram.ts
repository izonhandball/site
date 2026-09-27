// Classement des posts Instagram par hashtag de pilotage et sélection des blocs de l'accueil.
// Le script de synchro ne fait que récupérer les posts : les règles vivent ici, au build.

export interface InstaMedia {
  src: string;
}

export interface InstaPost {
  id: string;
  permalink: string;
  timestamp: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  caption: string;
  media: InstaMedia[];
}

export interface InstaFeed {
  updatedAt: string;
  source: "fixture" | "api";
  posts: InstaPost[];
}

export type Categorie =
  "matchday" | "resultats" | "programme" | "recrutement" | "evenement" | "vie";

// Hashtags de pilotage, à placer dans la légende. Insensibles à la casse et aux accents.
const TAGS: Record<string, Exclude<Categorie, "vie">> = {
  hbcimatchday: "matchday",
  hbciresultats: "resultats",
  hbciprogramme: "programme",
  hbcirecrutement: "recrutement",
  hbcievent: "evenement",
};

const TAG_RE = /#(hbci[\p{L}]+)/giu;

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function categorie(caption: string): Categorie {
  for (const [, tag] of caption.matchAll(TAG_RE)) {
    const cat = TAGS[sansAccents(tag!)];
    if (cat) return cat;
  }
  return "vie";
}

/** Légende affichée sur le site : sans les hashtags de pilotage. */
export function legende(caption: string): string {
  return caption
    .replace(TAG_RE, (m, tag: string) => (TAGS[sansAccents(tag)] ? "" : m))
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/** Première ligne non vide de la légende, utilisée comme titre. */
export function titre(caption: string): string {
  return (
    legende(caption)
      .split("\n")
      .find((l) => l.trim())
      ?.trim() ?? ""
  );
}

/**
 * Un Match Day reste affiché jusqu'à la fin du dimanche qui suit sa publication
 * (les affiches sortent en semaine pour le week-end).
 */
export function matchDayExpire(post: InstaPost, now: Date): boolean {
  const pub = new Date(post.timestamp);
  const fin = new Date(pub);
  fin.setUTCDate(pub.getUTCDate() + ((7 - pub.getUTCDay()) % 7));
  fin.setUTCHours(23, 59, 59, 999);
  return now > fin;
}

export interface ALaUne {
  categorie: "matchday" | "programme" | "resultats";
  post: InstaPost;
}

const recents = (posts: InstaPost[]) =>
  [...posts].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export interface Accueil {
  /** Dernier post de chaque bloc piloté, du plus récent au plus ancien. */
  aLaUne: ALaUne[];
  annonces: InstaPost[];
  vieDuClub: InstaPost[];
}

export function selectionAccueil(posts: InstaPost[], now: Date): Accueil {
  const tries = recents(posts).filter((p) => new Date(p.timestamp) <= now);
  const aLaUne: ALaUne[] = [];
  for (const cat of ["matchday", "programme", "resultats"] as const) {
    const post = tries.find((p) => categorie(p.caption) === cat);
    if (!post || (cat === "matchday" && matchDayExpire(post, now))) continue;
    aLaUne.push({ categorie: cat, post });
  }
  aLaUne.sort((a, b) => b.post.timestamp.localeCompare(a.post.timestamp));
  return {
    aLaUne,
    annonces: tries
      .filter((p) => ["recrutement", "evenement"].includes(categorie(p.caption)))
      .slice(0, 4),
    vieDuClub: tries.filter((p) => categorie(p.caption) === "vie").slice(0, 6),
  };
}

export const LIBELLES: Record<Categorie, string> = {
  matchday: "Match day",
  programme: "Le programme",
  resultats: "Les résultats",
  recrutement: "Recrutement",
  evenement: "Événement",
  vie: "Vie du club",
};
