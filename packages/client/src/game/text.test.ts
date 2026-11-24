import { LEXICON, en, enScience, fr, frScience } from "@o27/data";
import { afterEach, describe, expect, it } from "vitest";
import { isScience, saveScience, savedScience, setScience, translate } from "./text";

describe("vrais termes ou mots simples", () => {
  afterEach(() => {
    setScience(true);
  });

  it("par défaut, le jeu emploie les vrais termes de la biologie", () => {
    expect(isScience()).toBe(true);
    expect(translate("fr", "resource.sugar")).toBe("ATP");
    expect(translate("fr", "organelle.mitochondrion.name")).toBe("Mitochondrie");
    expect(translate("en", "resource.bricks")).toBe("Lipids");
  });

  it("le joueur peut revenir aux mots simples, et y rester", () => {
    setScience(false);
    expect(translate("fr", "resource.sugar")).toBe("Sucre");
    expect(translate("en", "organelle.mitochondrion.name")).toBe("Power plant");
    // Un texte sans vrai terme est le même dans les deux réglages.
    expect(translate("fr", "action.close")).toBe(translate("fr", "action.close", true));

    const kept = new Map<string, string>();
    const storage = {
      getItem: (key: string) => kept.get(key) ?? null,
      setItem: (key: string, value: string) => {
        kept.set(key, value);
      },
    };
    expect(savedScience(storage)).toBeNull();
    saveScience(storage, false);
    expect(savedScience(storage)).toBe(false);
    saveScience(storage, true);
    expect(savedScience(storage)).toBe(true);
  });

  it("chaque vrai terme existe dans les deux langues et diffère du mot simple", () => {
    expect(Object.keys(enScience).sort()).toEqual(Object.keys(frScience).sort());
    for (const [word, meaning] of LEXICON) {
      expect(frScience[word]).not.toBe(fr[word]);
      expect(enScience[word]).not.toBe(en[word]);
      expect(fr[meaning].length).toBeGreaterThan(10);
      expect(en[meaning].length).toBeGreaterThan(10);
      // Le lexique montre les deux mots côte à côte, quel que soit le réglage.
      expect(translate("fr", word, true)).toBe(frScience[word]);
      expect(translate("fr", word, false)).toBe(fr[word]);
    }
  });
});
