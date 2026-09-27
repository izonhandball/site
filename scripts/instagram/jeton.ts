// Jeton Instagram chiffré dans le dépôt (data/instagram/token.enc).
// La clé AES-256 vit uniquement dans le secret GitHub IG_KEY (et dans .env en local).
// Les dates de renouvellement et d'expiration restent en clair pour pouvoir alerter.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

export const FICHIER_JETON = new URL("../../data/instagram/token.enc", import.meta.url);

export interface JetonChiffre {
  version: 1;
  iv: string;
  tag: string;
  donnees: string;
  renouveleLe: string;
  expireLe: string;
}

export interface Jeton {
  valeur: string;
  renouveleLe: Date;
  expireLe: Date;
}

export function nouvelleCle(): string {
  return randomBytes(32).toString("base64");
}

export function cleDepuisEnv(env: NodeJS.ProcessEnv = process.env): Buffer {
  const brute = env.IG_KEY;
  if (!brute) throw new Error("Variable IG_KEY absente (secret GitHub, ou fichier .env en local).");
  const cle = Buffer.from(brute, "base64");
  if (cle.length !== 32)
    throw new Error("IG_KEY doit être une clé de 32 octets encodée en base64.");
  return cle;
}

export function chiffrer(jeton: Jeton, cle: Buffer): JetonChiffre {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cle, iv);
  const donnees = Buffer.concat([cipher.update(jeton.valeur, "utf8"), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    donnees: donnees.toString("base64"),
    renouveleLe: jeton.renouveleLe.toISOString(),
    expireLe: jeton.expireLe.toISOString(),
  };
}

export function dechiffrer(chiffre: JetonChiffre, cle: Buffer): Jeton {
  const decipher = createDecipheriv("aes-256-gcm", cle, Buffer.from(chiffre.iv, "base64"));
  decipher.setAuthTag(Buffer.from(chiffre.tag, "base64"));
  const valeur = Buffer.concat([
    decipher.update(Buffer.from(chiffre.donnees, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return {
    valeur,
    renouveleLe: new Date(chiffre.renouveleLe),
    expireLe: new Date(chiffre.expireLe),
  };
}

export async function lireJeton(cle: Buffer): Promise<Jeton> {
  let texte: string;
  try {
    texte = await readFile(FICHIER_JETON, "utf8");
  } catch {
    throw new Error("data/instagram/token.enc est absent : lancer d'abord `pnpm ig:init`.");
  }
  const jeton = dechiffrer(JSON.parse(texte) as JetonChiffre, cle);
  masquerDansLesLogs(jeton.valeur);
  return jeton;
}

/** Dans GitHub Actions, remplace toute apparition du jeton par *** dans les journaux. */
export function masquerDansLesLogs(valeur: string): void {
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${valeur}`);
}

export async function ecrireJeton(jeton: Jeton, cle: Buffer): Promise<void> {
  await writeFile(FICHIER_JETON, JSON.stringify(chiffrer(jeton, cle), null, 2) + "\n");
}

/** Nombre de jours avant expiration (arrondi à l'inférieur). */
export function joursRestants(jeton: Jeton, maintenant = new Date()): number {
  return Math.floor((jeton.expireLe.getTime() - maintenant.getTime()) / 86_400_000);
}
