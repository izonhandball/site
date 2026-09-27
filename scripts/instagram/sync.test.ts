import { describe, expect, it } from "vitest";
import { imagesDuPost, type MediaApi } from "./api.ts";
import { chiffrer, cleDepuisEnv, dechiffrer, joursRestants, nouvelleCle } from "./jeton.ts";
import { postsAGarder, versPost } from "./sync.ts";

const media = (m: Partial<MediaApi> & Pick<MediaApi, "id" | "timestamp">): MediaApi => ({
  media_type: "IMAGE",
  media_url: `https://cdn.example/${m.id}.jpg`,
  permalink: `https://www.instagram.com/p/${m.id}/`,
  caption: "",
  ...m,
});

describe("imagesDuPost", () => {
  it("prend une image par diapositive d'un carrousel", () => {
    const m = media({
      id: "1",
      timestamp: "2026-09-20T10:00:00+0000",
      media_type: "CAROUSEL_ALBUM",
      children: {
        data: [
          { media_type: "IMAGE", media_url: "https://cdn.example/a.jpg" },
          {
            media_type: "VIDEO",
            media_url: "https://cdn.example/b.mp4",
            thumbnail_url: "https://cdn.example/b.jpg",
          },
        ],
      },
    });
    expect(imagesDuPost(m)).toEqual(["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"]);
  });

  it("prend la vignette d'un Reel sans media_url (musique sous droits)", () => {
    const m = media({
      id: "2",
      timestamp: "2026-09-20T10:00:00+0000",
      media_type: "VIDEO",
      media_url: undefined,
      thumbnail_url: "https://cdn.example/reel.jpg",
    });
    expect(imagesDuPost(m)).toEqual(["https://cdn.example/reel.jpg"]);
  });
});

describe("versPost", () => {
  it("nomme les images d'après l'identifiant du post", () => {
    const { post, sources } = versPost(
      media({ id: "42", timestamp: "2026-09-20T10:00:00+0000", caption: undefined }),
    );
    expect(post.caption).toBe("");
    expect(post.media).toEqual([{ src: "/instagram/42-1.webp" }]);
    expect(sources).toEqual(["https://cdn.example/42.jpg"]);
  });
});

describe("postsAGarder", () => {
  const maintenant = new Date("2026-09-27T12:00:00Z");
  const jour = (j: number) => `2026-09-${String(j).padStart(2, "0")}T10:00:00+0000`;
  const posts = [
    ...Array.from(
      { length: 10 },
      (_, i) => versPost(media({ id: `vie${i}`, timestamp: jour(i + 1) })).post,
    ),
    versPost(media({ id: "res", timestamp: jour(21), caption: "#hbciresultats" })).post,
    versPost(media({ id: "res-ancien", timestamp: jour(14), caption: "#hbciresultats" })).post,
    versPost(media({ id: "md", timestamp: jour(17), caption: "#hbcimatchday" })).post,
  ];

  it("ne garde que les posts affichables, du plus récent au plus ancien", () => {
    const ids = postsAGarder(posts, maintenant).map((p) => p.id);
    expect(ids).toEqual(["res", "vie9", "vie8", "vie7", "vie6", "vie5", "vie4"]);
  });
});

describe("jeton chiffré", () => {
  const cle = cleDepuisEnv({ IG_KEY: nouvelleCle() });
  const jeton = {
    valeur: "IGAAtest",
    renouveleLe: new Date("2026-09-27T00:00:00Z"),
    expireLe: new Date("2026-11-26T00:00:00Z"),
  };

  it("se déchiffre avec la même clé et ne contient pas le jeton en clair", () => {
    const chiffre = chiffrer(jeton, cle);
    expect(JSON.stringify(chiffre)).not.toContain("IGAAtest");
    expect(dechiffrer(chiffre, cle)).toEqual(jeton);
  });

  it("refuse une autre clé", () => {
    const autre = cleDepuisEnv({ IG_KEY: nouvelleCle() });
    expect(() => dechiffrer(chiffrer(jeton, cle), autre)).toThrow();
  });

  it("refuse une clé mal formée", () => {
    expect(() => cleDepuisEnv({ IG_KEY: "trop-courte" })).toThrow(/32 octets/);
    expect(() => cleDepuisEnv({})).toThrow(/IG_KEY/);
  });

  it("compte les jours restants", () => {
    expect(joursRestants(jeton, new Date("2026-11-12T12:00:00Z"))).toBe(13);
  });
});
