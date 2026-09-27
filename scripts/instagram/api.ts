// Client minimal de l'Instagram API with Instagram Login (lecture des médias du compte).
// Doc : https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login

const HOTE = "https://graph.instagram.com";
export const VERSION = "v25.0";

const CHAMPS_MEDIA = "media_type,media_url,thumbnail_url";
const CHAMPS = `id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{${CHAMPS_MEDIA}}`;

export interface MediaApi {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  // Absent pour les Reels contenant de la musique sous droits : on prend alors thumbnail_url.
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  children?: { data: Omit<MediaApi, "children" | "caption" | "permalink" | "timestamp" | "id">[] };
}

interface PageApi<T> {
  data: T[];
  paging?: { next?: string };
}

interface ErreurApi {
  error?: { message: string; type?: string; code?: number };
}

async function appel<T>(url: string | URL): Promise<T> {
  const reponse = await fetch(url);
  const corps = (await reponse.json()) as T & ErreurApi;
  if (!reponse.ok || corps.error) {
    const detail = corps.error
      ? `${corps.error.message} (code ${corps.error.code})`
      : reponse.statusText;
    // Ne jamais journaliser l'URL : elle contient le jeton.
    throw new Error(`Instagram API : ${reponse.status} ${detail}`);
  }
  return corps;
}

/** Derniers médias du compte, du plus récent au plus ancien. */
export async function derniersMedias(jeton: string, nombre: number): Promise<MediaApi[]> {
  const url = new URL(`${HOTE}/${VERSION}/me/media`);
  url.searchParams.set("fields", CHAMPS);
  url.searchParams.set("limit", String(Math.min(nombre, 50)));
  url.searchParams.set("access_token", jeton);

  const medias: MediaApi[] = [];
  let suivante: string | undefined = url.toString();
  while (suivante && medias.length < nombre) {
    const page: PageApi<MediaApi> = await appel(suivante);
    medias.push(...page.data);
    suivante = page.paging?.next;
  }
  return medias.slice(0, nombre);
}

export interface JetonRenouvele {
  access_token: string;
  expires_in: number;
}

/** Renouvelle un jeton longue durée (âgé d'au moins 24 h et non expiré) pour 60 jours. */
export function renouveler(jeton: string): Promise<JetonRenouvele> {
  const url = new URL(`${HOTE}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", jeton);
  return appel<JetonRenouvele>(url);
}

/** URL de l'image à télécharger pour un média (image, vignette de vidéo). */
export function urlImage(media: {
  media_url?: string;
  thumbnail_url?: string;
  media_type: string;
}) {
  return media.media_type === "VIDEO" ? (media.thumbnail_url ?? media.media_url) : media.media_url;
}

/** Images d'un post : une par diapositive pour un carrousel, sinon une seule. */
export function imagesDuPost(media: MediaApi): string[] {
  const sources = media.media_type === "CAROUSEL_ALBUM" ? (media.children?.data ?? []) : [media];
  return sources.map(urlImage).filter((u): u is string => Boolean(u));
}
