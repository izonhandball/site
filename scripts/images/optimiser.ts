// Optimise les images déposées dans public/images/ (via l'admin ou à la main) :
// JPEG/PNG → WebP redimensionné, WebP trop lourd → réencodé, puis mise à jour des
// références dans content/. Les images Instagram (public/instagram/) sont déjà optimisées
// par la synchro et ne sont pas concernées.
// Usage : pnpm images (lancé automatiquement par la première étape du workflow site.yml).

import { readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const LARGEUR_MAX = 1600;
export const QUALITE = 80;
/** Au-delà, un WebP est réencodé même s'il est déjà assez petit en largeur. */
export const POIDS_MAX_WEBP = 400 * 1024;

const RACINE = fileURLToPath(new URL("../../", import.meta.url));
const DOSSIER_IMAGES = join(RACINE, "public", "images");
const DOSSIER_CONTENU = join(RACINE, "content");
const A_CONVERTIR = new Set([".jpg", ".jpeg", ".png"]);

/** Chemin public (« /images/… ») d'un fichier de public/. */
export const cheminPublic = (fichier: string) =>
  "/" + relative(join(RACINE, "public"), fichier).split(sep).join("/");

/** Nom WebP libre pour une image convertie (photo.png → photo.webp, ou photo-2.webp). */
export function nomWebp(fichier: string, existe: (f: string) => boolean): string {
  const base = fichier.slice(0, -extname(fichier).length);
  let candidat = `${base}.webp`;
  for (let i = 2; existe(candidat); i++) candidat = `${base}-${i}.webp`;
  return candidat;
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Remplace chaque ancien chemin public par le nouveau dans un texte (YAML ou Markdown),
 * uniquement quand le chemin est complet (pas « photo.png » dans « photo.png.bak »).
 */
export function remplacerReferences(texte: string, renommages: Map<string, string>): string {
  let resultat = texte;
  for (const [avant, apres] of renommages) {
    resultat = resultat.replace(new RegExp(`${echapper(avant)}(?![\\w.-])`, "g"), apres);
  }
  return resultat;
}

async function fichiers(dossier: string): Promise<string[]> {
  if (!existsSync(dossier)) return [];
  const entrees = await readdir(dossier, { withFileTypes: true, recursive: true });
  return entrees.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

async function encoder(source: string, cible: string): Promise<void> {
  const tampon = await sharp(source)
    .rotate() // applique l'orientation EXIF des photos de téléphone
    .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
    .webp({ quality: QUALITE })
    .toBuffer();
  await writeFile(cible, tampon);
}

export async function optimiser(): Promise<{ renommages: Map<string, string>; gain: number }> {
  const renommages = new Map<string, string>();
  let gain = 0;

  for (const fichier of await fichiers(DOSSIER_IMAGES)) {
    const ext = extname(fichier).toLowerCase();
    const avant = (await stat(fichier)).size;

    if (A_CONVERTIR.has(ext)) {
      const cible = nomWebp(fichier, existsSync);
      await encoder(fichier, cible);
      await rm(fichier);
      renommages.set(cheminPublic(fichier), cheminPublic(cible));
      gain += avant - (await stat(cible)).size;
      console.log(`${cheminPublic(fichier)} → ${cheminPublic(cible)}`);
    } else if (ext === ".webp") {
      const { width = 0 } = await sharp(fichier).metadata();
      if (width <= LARGEUR_MAX && avant <= POIDS_MAX_WEBP) continue;
      const temporaire = `${fichier}.tmp`;
      await encoder(fichier, temporaire);
      const apres = (await stat(temporaire)).size;
      if (apres < avant) {
        await rename(temporaire, fichier);
        gain += avant - apres;
        console.log(`${cheminPublic(fichier)} réencodé`);
      } else {
        await rm(temporaire);
      }
    }
  }

  if (renommages.size) {
    for (const fichier of await fichiers(DOSSIER_CONTENU)) {
      if (![".yml", ".yaml", ".md"].includes(extname(fichier))) continue;
      const texte = await readFile(fichier, "utf8");
      const nouveau = remplacerReferences(texte, renommages);
      if (nouveau !== texte) await writeFile(fichier, nouveau);
    }
  }
  return { renommages, gain };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  optimiser()
    .then(({ renommages, gain }) =>
      console.log(
        `${renommages.size} image(s) convertie(s), ${Math.round(gain / 1024)} Kio économisés.`,
      ),
    )
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
