import { describe, expect, it } from "vitest";
import feed from "../../data/instagram/posts.json";
import {
  categorie,
  legende,
  matchDayExpire,
  selectionAccueil,
  titre,
  type InstaPost,
} from "./instagram";

const post = (timestamp: string, caption: string, id = timestamp): InstaPost => ({
  id,
  permalink: `https://www.instagram.com/p/${id}/`,
  timestamp,
  media_type: "IMAGE",
  caption,
  media: [],
});

describe("categorie", () => {
  it("reconnaît chaque hashtag de pilotage", () => {
    expect(categorie("Samedi 17h #hbcimatchday")).toBe("matchday");
    expect(categorie("#hbciresultats")).toBe("resultats");
    expect(categorie("#hbciprogramme")).toBe("programme");
    expect(categorie("#hbcirecrutement")).toBe("recrutement");
    expect(categorie("#hbcievent")).toBe("evenement");
  });

  it("ignore la casse et les accents", () => {
    expect(categorie("#HBCIMatchDay")).toBe("matchday");
    expect(categorie("#hbcirésultats")).toBe("resultats");
  });

  it("range en vie du club un post sans hashtag de pilotage", () => {
    expect(categorie("Bravo les filles ! #HBCIzon #Handball")).toBe("vie");
  });
});

describe("legende et titre", () => {
  it("retire les hashtags de pilotage et garde les autres", () => {
    expect(legende("Victoire !\n#AllezIzon #hbciresultats")).toBe("Victoire !\n#AllezIzon");
  });

  it("prend la première ligne non vide comme titre", () => {
    expect(titre("\n\nRECRUTEMENT -13 🔥\nTu es né en 2014 ?")).toBe("RECRUTEMENT -13 🔥");
  });
});

describe("matchDayExpire", () => {
  // Jeudi 17 septembre 2026 → valable jusqu'au dimanche 20 au soir.
  const md = post("2026-09-17T18:00:00+0000", "#hbcimatchday");

  it("reste affiché pendant le week-end", () => {
    expect(matchDayExpire(md, new Date("2026-09-20T22:00:00Z"))).toBe(false);
  });

  it("disparaît le lundi", () => {
    expect(matchDayExpire(md, new Date("2026-09-21T08:00:00Z"))).toBe(true);
  });

  it("un post publié le dimanche vaut pour le jour même", () => {
    const dimanche = post("2026-09-20T08:00:00+0000", "#hbcimatchday");
    expect(matchDayExpire(dimanche, new Date("2026-09-20T20:00:00Z"))).toBe(false);
    expect(matchDayExpire(dimanche, new Date("2026-09-21T01:00:00Z"))).toBe(true);
  });
});

describe("selectionAccueil", () => {
  const posts = feed.posts as InstaPost[];

  it("garde le Match Day pendant son week-end", () => {
    const { aLaUne } = selectionAccueil(posts, new Date("2026-09-19T10:00:00Z"));
    expect(aLaUne.map((u) => u.categorie)).toEqual(["matchday", "programme"]);
  });

  it("retire le Match Day passé et classe par date", () => {
    const { aLaUne } = selectionAccueil(posts, new Date("2026-09-27T10:00:00Z"));
    expect(aLaUne.map((u) => u.categorie)).toEqual(["resultats", "programme"]);
  });

  it("prend les 4 dernières annonces et les 6 derniers posts sans tag", () => {
    const { annonces, vieDuClub } = selectionAccueil(posts, new Date("2026-09-27T10:00:00Z"));
    expect(annonces).toHaveLength(4);
    expect(annonces[0]!.id).toBe("DcRC259M0vM");
    expect(vieDuClub).toHaveLength(6);
    expect(vieDuClub.every((p) => categorie(p.caption) === "vie")).toBe(true);
  });

  it("ne garde que le dernier post de chaque bloc", () => {
    const { aLaUne } = selectionAccueil(
      [
        post("2026-09-10T10:00:00+0000", "ancien #hbciresultats", "a"),
        post("2026-09-12T10:00:00+0000", "récent #hbciresultats", "b"),
      ],
      new Date("2026-09-13T10:00:00Z"),
    );
    expect(aLaUne).toEqual([
      { categorie: "resultats", post: expect.objectContaining({ id: "b" }) },
    ]);
  });
});
