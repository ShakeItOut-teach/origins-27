import { describe, expect, it } from "vitest";
import { researchParts } from "./research";

describe("l'onglet Recherche : une rubrique par façon de faire évoluer l'organisme", () => {
  it("avant la première mutation à acheter, l'onglet n'existe pas", () => {
    expect(researchParts(3)).toEqual([]);
  });

  it("palier 4 : les gènes, puisque l'on peut muter", () => {
    expect(researchParts(4)).toEqual(["genes"]);
  });

  it("palier 7 : les évolutions de la cellule passent devant", () => {
    expect(researchParts(7)).toEqual(["cell", "genes"]);
  });

  it("palier 8 : la recherche militaire et le compagnon complètent l'onglet", () => {
    expect(researchParts(8)).toEqual(["cell", "troops", "genes", "companion"]);
  });

  it("aucune rubrique n'apparaît deux fois, à aucun palier", () => {
    for (let tier = 0; tier <= 12; tier++) {
      const parts = researchParts(tier);
      expect(new Set(parts).size).toBe(parts.length);
    }
  });
});
