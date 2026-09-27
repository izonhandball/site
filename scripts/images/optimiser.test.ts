import { describe, expect, it } from "vitest";
import { nomWebp, remplacerReferences } from "./optimiser";

describe("nomWebp", () => {
  it("remplace l'extension", () => {
    expect(nomWebp("/p/images/uploads/photo.JPG", () => false)).toBe(
      "/p/images/uploads/photo.webp",
    );
  });

  it("évite d'écraser un WebP existant", () => {
    const existants = new Set(["/p/photo.webp", "/p/photo-2.webp"]);
    expect(nomWebp("/p/photo.png", (f) => existants.has(f))).toBe("/p/photo-3.webp");
  });
});

describe("remplacerReferences", () => {
  it("met à jour le chemin complet, entre guillemets ou non, et pas un chemin plus long", () => {
    const yml = [
      "photo: /images/uploads/equipe.png",
      '  - image: "/images/uploads/equipe.png"',
      "autre: /images/uploads/equipe.png.bak",
      "",
    ].join("\n");
    const map = new Map([["/images/uploads/equipe.png", "/images/uploads/equipe.webp"]]);
    expect(remplacerReferences(yml, map)).toBe(
      [
        "photo: /images/uploads/equipe.webp",
        '  - image: "/images/uploads/equipe.webp"',
        "autre: /images/uploads/equipe.png.bak",
        "",
      ].join("\n"),
    );
  });
});
