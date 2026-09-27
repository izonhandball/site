import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Contenu éditable par les bénévoles (dossier content/, via Decap CMS).
// Toute fiche invalide fait échouer le build : la version en ligne reste alors inchangée.

const url = z.url();
const heure = z.string().regex(/^\d{2}:\d{2}$/, "Format attendu : HH:MM");

const club = defineCollection({
  loader: glob({ pattern: "club.yml", base: "./content" }),
  schema: z.object({
    nom: z.string(),
    nomCourt: z.string(),
    fondation: z.number().int(),
    devise: z.string(),
    email: z.email(),
    salle: z.object({ nom: z.string(), adresse: z.string() }),
    liens: z.object({
      instagram: url,
      facebook: url,
      ffhandball: url,
      scorenco: url,
      adhesion: url,
      boutique: url,
    }),
    accrocheHistoire: z.string(),
  }),
});

const equipes = defineCollection({
  loader: glob({ pattern: "*.yml", base: "./content/equipes" }),
  schema: z.object({
    nom: z.string(),
    groupe: z.enum(["adultes", "jeunes"]),
    ordre: z.number(),
    niveau: z.string().optional(),
    // Plusieurs équipes regroupées sur une même fiche (ex. séniors garçons 1 et 2).
    equipes: z.array(z.object({ nom: z.string(), niveau: z.string() })).optional(),
    naissance: z.string().optional(),
    horaires: z
      .array(
        z.object({
          jour: z.enum(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]),
          debut: heure,
          fin: heure,
        }),
      )
      .optional(),
    entraineurs: z.string().optional(),
    mention: z.string().optional(),
    photo: z.string().optional(),
    photoLegende: z.string().optional(),
  }),
});

const periodes = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/histoire/periodes" }),
  schema: z.object({
    ordre: z.number().int(),
    periode: z.string(),
    titre: z.string(),
    presidents: z.array(z.string()).default([]),
    archives: z.array(z.object({ image: z.string(), legende: z.string() })).default([]),
  }),
});

const histoire = defineCollection({
  loader: glob({ pattern: "histoire.yml", base: "./content/histoire" }),
  schema: z.object({
    intro: z.string(),
    licencies: z.array(
      z.object({ saison: z.string(), nombre: z.number().int(), periode: z.number().int() }),
    ),
    maillots: z.array(z.object({ nom: z.string(), couleurs: z.array(z.string()).min(1) })),
    citationMaillots: z.string().optional(),
  }),
});

export const collections = { club, equipes, periodes, histoire };
