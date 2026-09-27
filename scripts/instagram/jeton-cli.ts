// Gestion du jeton Instagram chiffré.
//   pnpm ig:cle          génère une clé IG_KEY (à mettre dans .env et dans les secrets GitHub)
//   pnpm ig:init         chiffre un jeton généré dans le tableau de bord Meta
//   pnpm ig:renouveler   renouvelle le jeton pour 60 jours (workflow hebdomadaire)
//   pnpm ig:etat         affiche la date d'expiration

import { createInterface } from "node:readline/promises";
import { renouveler } from "./api.ts";
import {
  cleDepuisEnv,
  ecrireJeton,
  joursRestants,
  lireJeton,
  masquerDansLesLogs,
  nouvelleCle,
  type Jeton,
} from "./jeton.ts";

const JOUR = 86_400_000;

async function renouvelle(valeur: string): Promise<Jeton> {
  const r = await renouveler(valeur);
  masquerDansLesLogs(r.access_token);
  const maintenant = new Date();
  return {
    valeur: r.access_token,
    renouveleLe: maintenant,
    expireLe: new Date(maintenant.getTime() + r.expires_in * 1000),
  };
}

async function lireSaisie(question: string): Promise<string> {
  if (process.env.IG_TOKEN) return process.env.IG_TOKEN.trim();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const reponse = await rl.question(question);
  rl.close();
  return reponse.trim();
}

const commandes: Record<string, () => Promise<void>> = {
  async cle() {
    console.log(`IG_KEY=${nouvelleCle()}`);
    console.log("\nÀ copier dans .env (local) puis : gh secret set IG_KEY -R izonhandball/site");
  },

  async init() {
    const cle = cleDepuisEnv();
    const valeur = await lireSaisie("Jeton Instagram (tableau de bord Meta → Generate token) : ");
    if (!valeur) throw new Error("Aucun jeton saisi.");
    let jeton: Jeton;
    try {
      jeton = await renouvelle(valeur);
    } catch {
      // Un jeton de moins de 24 h ne peut pas encore être renouvelé : il vaut 60 jours.
      const maintenant = new Date();
      jeton = {
        valeur,
        renouveleLe: maintenant,
        expireLe: new Date(maintenant.getTime() + 60 * JOUR),
      };
    }
    await ecrireJeton(jeton, cle);
    console.log(
      `Jeton chiffré dans data/instagram/token.enc, valable jusqu'au ${jeton.expireLe.toLocaleDateString("fr-FR")}.`,
    );
    console.log("Commiter ce fichier pour que la synchro automatique l'utilise.");
  },

  async renouveler() {
    const cle = cleDepuisEnv();
    const actuel = await lireJeton(cle);
    const jeton = await renouvelle(actuel.valeur);
    await ecrireJeton(jeton, cle);
    console.log(`Jeton renouvelé, valable ${joursRestants(jeton)} jours.`);
  },

  async etat() {
    const jeton = await lireJeton(cleDepuisEnv());
    console.log(
      `Renouvelé le ${jeton.renouveleLe.toLocaleDateString("fr-FR")}, ` +
        `expire le ${jeton.expireLe.toLocaleDateString("fr-FR")} (${joursRestants(jeton)} jours).`,
    );
  },
};

const nom = process.argv[2] ?? "";
const commande = commandes[nom];
if (!commande) {
  console.error(`Commande inconnue « ${nom} ». Possibles : ${Object.keys(commandes).join(", ")}`);
  process.exit(1);
}
commande().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
