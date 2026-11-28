import { describe, expect, it } from "vitest";
import {
  GUIDE_SKIPPED,
  GUIDE_STEPS,
  GUIDE_STEP_TIERS,
  MAX_RELEASED_TIER,
  ORGANELLE_IDS,
  RESOURCE_IDS,
  UNLOCKS,
  en,
  fr,
} from "./index";

const texts: readonly Readonly<Record<string, string>>[] = [fr, en];

describe("le guide des nouveautés", () => {
  it("tout ce qui apparaît à l'écran a sa fiche, une seule", () => {
    const shown = UNLOCKS.filter((unlock) => unlock.tier <= MAX_RELEASED_TIER).flatMap(
      (unlock) => unlock.ui,
    );
    const explained = GUIDE_STEPS.flatMap((step) => step.ui);
    for (const element of shown) {
      if (GUIDE_SKIPPED.includes(element)) continue;
      expect(
        explained.filter((entry) => entry === element),
        `fiche pour ${element}`,
      ).toHaveLength(1);
    }
  });

  it("chaque fiche a un nom unique et dit quand elle apparaît", () => {
    const ids = GUIDE_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of GUIDE_STEPS) {
      if (step.ui.length === 0) expect(GUIDE_STEP_TIERS[step.id], step.id).toBeDefined();
    }
  });

  it("chaque fiche a son titre et son texte, en français et en anglais", () => {
    for (const step of GUIDE_STEPS) {
      for (const lang of texts) {
        expect(lang[`guide.${step.id}.title`], `${step.id} : titre`).toBeTruthy();
        expect(lang[`guide.${step.id}.text`], `${step.id} : texte`).toBeTruthy();
      }
    }
  });

  it("les noms d'organites et de ressources cités existent", () => {
    for (const step of GUIDE_STEPS) {
      for (const lang of texts) {
        const text = lang[`guide.${step.id}.text`] ?? "";
        for (const match of text.matchAll(/\{o:(\w+)\}/g)) {
          expect(ORGANELLE_IDS, `${step.id} : ${match[0]}`).toContain(match[1]);
        }
        for (const match of text.matchAll(/\{r:(\w+)\}/g)) {
          expect(RESOURCE_IDS, `${step.id} : ${match[0]}`).toContain(match[1]);
        }
      }
    }
  });
});
