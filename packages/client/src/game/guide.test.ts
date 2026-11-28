import { GUIDE_STEPS } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  guideSteps,
  guideText,
  guideTier,
  pendingGuide,
  readGuideSeen,
  saveGuideSeen,
} from "./guide";
import { translate } from "./text";

function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key) => data.get(key) ?? null,
    key: () => null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("le guide, à l'écran", () => {
  it("les fiches arrivent avec leur palier, dans l'ordre", () => {
    expect(guideSteps(0)).toEqual([]);
    expect(guideSteps(1).map((step) => step.id)).toEqual(["build", "production"]);
    const four = guideSteps(4).map((step) => step.id);
    expect(four).toContain("troops");
    expect(four).not.toContain("rivals");
    const all = guideSteps(12);
    expect(all).toHaveLength(GUIDE_STEPS.length);
    for (let index = 1; index < all.length; index++) {
      const before = all[index - 1];
      const after = all[index];
      if (before === undefined || after === undefined) continue;
      expect(guideTier(before)).toBeLessThanOrEqual(guideTier(after));
    }
  });

  it("un nouveau joueur lira tout ; un joueur avancé ne lit que son palier", () => {
    const storage = memory();
    expect(pendingGuide(1, readGuideSeen(storage, 0)).map((step) => step.id)).toEqual([
      "build",
      "production",
    ]);
    const late = readGuideSeen(storage, 9);
    const pending = pendingGuide(9, late);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((step) => guideTier(step) === 9)).toBe(true);
  });

  it("ce qui est lu le reste, et une mémoire abîmée ne casse rien", () => {
    const storage = memory();
    saveGuideSeen(storage, new Set(["build"]));
    expect(pendingGuide(1, readGuideSeen(storage, 1)).map((step) => step.id)).toEqual([
      "production",
    ]);
    storage.setItem("o27.guide.vu", "{pas du json");
    expect(readGuideSeen(storage, 5).size).toBe(0);
  });

  it("les noms suivent le vocabulaire choisi", () => {
    const text = "L’organite {o:nursery} ; ressource : {r:sugar}.";
    expect(guideText(text, (key) => translate("fr", key, false))).toBe(
      "L’organite Pouponnière ; ressource : Sucre.",
    );
    expect(guideText(text, (key) => translate("fr", key, true))).toBe(
      "L’organite Centrosome ; ressource : ATP.",
    );
  });
});
