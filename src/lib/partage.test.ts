import { describe, expect, it } from "vitest";
import { lignesEquipe } from "./equipes";
import { fondMaillot, hauteursLicencies } from "./histoire";

describe("lignesEquipe", () => {
  it("regroupe plusieurs équipes et formate les horaires", () => {
    const l = lignesEquipe({
      nom: "Séniors garçons",
      groupe: "adultes",
      equipes: [
        { nom: "Garçons 1", niveau: "Région Honneur" },
        { nom: "Garçons 2", niveau: "Départemental Honneur" },
      ],
      horaires: [{ jour: "Mardi", debut: "20:00", fin: "21:30" }],
    });
    expect(l).toEqual([
      { label: "Équipes", valeur: "Garçons 1 · Région Honneur\nGarçons 2 · Départemental Honneur" },
      { label: "Entraînements", valeur: "Mardi 20h00 – 21h30" },
      { label: "Entraîneur", valeur: undefined },
    ]);
  });

  it("ajoute les années de naissance pour les jeunes et traite les champs vides comme absents", () => {
    // Decap enregistre parfois une chaîne vide ou une liste vide au lieu d'omettre le champ.
    const l = lignesEquipe({ nom: "U9", groupe: "jeunes", niveau: "", horaires: [] });
    expect(l.map((x) => [x.label, x.valeur])).toEqual([
      ["Niveau", undefined],
      ["Années de naissance", undefined],
      ["Entraînements", undefined],
      ["Entraîneur", undefined],
    ]);
  });

  it("tolère un créneau ou une équipe en cours de saisie dans l'admin", () => {
    // Decap ajoute une entrée vide à la liste avant que les champs soient remplis.
    const l = lignesEquipe({
      nom: "Babyhand",
      groupe: "adultes",
      equipes: [{ nom: "Garçons 1" } as { nom: string; niveau: string }],
      horaires: [{} as { jour: string; debut: string; fin: string }],
    });
    expect(l.map((x) => x.valeur)).toEqual(["Garçons 1", "… … – …", undefined]);
  });
});

describe("histoire", () => {
  it("dessine un maillot uni ou à bandes égales", () => {
    expect(fondMaillot(["#111111"])).toBe("#111111");
    expect(fondMaillot(["#ffd52e", "#e0161b"])).toBe(
      "linear-gradient(90deg, #ffd52e 0% 50%, #e0161b 50% 100%)",
    );
  });

  it("met les barres de licenciés à l'échelle de la plus haute", () => {
    expect(hauteursLicencies([42, 168, 84])).toEqual([25, 100, 50]);
    expect(hauteursLicencies([])).toEqual([]);
  });
});
