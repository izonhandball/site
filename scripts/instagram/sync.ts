// Synchro Instagram : lit les derniers posts de @hbcizon, télécharge les images utiles
// dans public/instagram/ et écrit data/instagram/posts.json.
// Ne garde que les posts que l'accueil peut afficher, pour limiter le poids du dépôt.
// Usage : pnpm ig:sync (IG_KEY dans l'environnement ou dans .env)

import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { derniersMedias, imagesDuPost, type MediaApi } from "./api.ts";
import { cleDepuisEnv, joursRestants, lireJeton } from "./jeton.ts";
import { selectionAccueil, type InstaFeed, type InstaPost } from "../../src/lib/instagram.ts";

const NB_POSTS_LUS = 50;
const LARGEUR_MAX = 1080;
const ALERTE_JOURS = 14;
const DOSSIER_IMAGES = new URL("../../public/instagram/", import.meta.url);
const FICHIER_POSTS = new URL("../../data/instagram/posts.json", import.meta.url);

export const cheminImage = (id: string, n: number) => `/instagram/${id}-${n}.webp`;
const nomFichier = (src: string) => src.split("/").pop()!;

export interface PostSource {
  post: InstaPost;
  /** URL CDN Instagram de chaque image, dans l'ordre de post.media. */
  sources: string[];
}

export function versPost(media: MediaApi): PostSource {
  const sources = imagesDuPost(media);
  return {
    sources,
    post: {
      id: media.id,
      permalink: media.permalink,
      timestamp: media.timestamp,
      media_type: media.media_type,
      caption: media.caption ?? "",
      media: sources.map((_, i) => ({ src: cheminImage(media.id, i + 1) })),
    },
  };
}

/** Posts affichables par l'accueil à cette date (union des blocs, du plus récent au plus ancien). */
export function postsAGarder(posts: InstaPost[], maintenant: Date): InstaPost[] {
  const { aLaUne, annonces, vieDuClub } = selectionAccueil(posts, maintenant);
  const ids = new Set([...aLaUne.map((u) => u.post), ...annonces, ...vieDuClub].map((p) => p.id));
  return posts.filter((p) => ids.has(p.id)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

async function telechargerImage(url: string, fichier: URL): Promise<void> {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`Téléchargement d'image impossible : ${reponse.status}`);
  const brut = Buffer.from(await reponse.arrayBuffer());
  await sharp(brut)
    .rotate()
    .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(fileURLToPath(fichier));
}

async function lireFlux(): Promise<InstaFeed | null> {
  try {
    return JSON.parse(await readFile(FICHIER_POSTS, "utf8")) as InstaFeed;
  } catch {
    return null;
  }
}

export async function synchroniser() {
  const maintenant = new Date();
  const jeton = await lireJeton(cleDepuisEnv());
  const jours = joursRestants(jeton, maintenant);
  if (jours < ALERTE_JOURS) {
    // Annotation visible dans GitHub Actions ; le renouvellement hebdomadaire a dû échouer.
    console.log(`::warning::Le jeton Instagram expire dans ${jours} jours.`);
  }

  const lus = (await derniersMedias(jeton.valeur, NB_POSTS_LUS)).map(versPost);
  const gardes = postsAGarder(
    lus.map((l) => l.post),
    maintenant,
  );
  const sources = new Map(lus.map((l) => [l.post.id, l.sources]));

  let nouvelles = 0;
  for (const post of gardes) {
    const urls = sources.get(post.id)!;
    for (const [i, m] of post.media.entries()) {
      const fichier = new URL(nomFichier(m.src), DOSSIER_IMAGES);
      if (existsSync(fichier)) continue;
      await telechargerImage(urls[i]!, fichier);
      nouvelles++;
    }
  }

  // Supprime les images des posts qui ne sont plus affichés.
  const utiles = new Set(gardes.flatMap((p) => p.media.map((m) => nomFichier(m.src))));
  let supprimees = 0;
  for (const nom of await readdir(DOSSIER_IMAGES)) {
    if (nom.endsWith(".webp") && !utiles.has(nom)) {
      await rm(new URL(nom, DOSSIER_IMAGES));
      supprimees++;
    }
  }

  // N'écrit posts.json que si les posts ont changé, pour éviter un commit par heure.
  const avant = await lireFlux();
  const change = JSON.stringify(avant?.posts) !== JSON.stringify(gardes);
  if (change) {
    const flux: InstaFeed = { updatedAt: maintenant.toISOString(), source: "api", posts: gardes };
    await writeFile(FICHIER_POSTS, JSON.stringify(flux, null, 2) + "\n");
  }

  console.log(
    `${lus.length} posts lus, ${gardes.length} gardés, ${nouvelles} images ajoutées, ` +
      `${supprimees} supprimées, posts.json ${change ? "mis à jour" : "inchangé"}. ` +
      `Jeton valable encore ${jours} jours.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  synchroniser().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
