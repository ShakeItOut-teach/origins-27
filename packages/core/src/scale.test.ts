import { BALANCE } from "@o27/data";
import { describe, expect, it } from "vitest";
import { partyOf, rivalStats, winChance } from "./index";
import type { Rival } from "./index";

/** Un rival moyen (tempérament 100 %) dans la zone demandée. */
function average(zone: number): Rival {
  return {
    id: "o:1",
    name: "Moyen",
    hue: 0,
    kind: "soft",
    steps: 1,
    far: false,
    human: false,
    temper: 100,
    zone,
    x: 0,
    y: 0,
    banner: null,
  };
}

/** Ce qu'une Centrale de ce niveau nourrit, sans mutation. */
function fedBy(level: number): number {
  const production = BALANCE.organelles.mitochondrion.effect;
  if (production.kind !== "production") throw new Error("la Centrale produit");
  return Math.floor(
    (production.milliPerSecondPerLevel * level) / BALANCE.troopUpkeep.milliPerSecond,
  );
}

describe("l'échelle des forces, depuis que les armées n'ont plus de plafond", () => {
  it("l'ancienne armée maximale (35 cellules) ne suffit plus contre un rival moyen du jour 7", () => {
    const guard = rivalStats(average(0), 7).guard;
    expect(winChance(partyOf({ hunter: 0, armored: 35, swift: 0 }), "soft", guard)).toBeLessThan(
      50,
    );
  });

  it("le jour de l'ouverture des rivaux, vingt cellules du bon type gagnent une fois sur deux ou mieux", () => {
    const guard = rivalStats(average(0), 2).guard;
    expect(
      winChance(partyOf({ hunter: 20, armored: 0, swift: 0 }), "soft", guard),
    ).toBeGreaterThanOrEqual(50);
  });

  it("une armée nourrie par une Centrale au maximum reste à la hauteur toute la saison", () => {
    const army = fedBy(BALANCE.organelles.mitochondrion.maxLevel);
    const mixed = partyOf({ hunter: Math.floor(army / 2), armored: Math.ceil(army / 2), swift: 0 });
    // Rival moyen des abysses au jour 18 : l'armée l'emporte plus d'une fois sur deux.
    expect(winChance(mixed, "soft", rivalStats(average(0), 18).guard)).toBeGreaterThan(50);
    // Rival moyen de la zone éclairée au dernier jour : difficile, mais jamais sans espoir.
    const top = BALANCE.ocean.zones.length - 1;
    const hardest = winChance(mixed, "soft", rivalStats(average(top), 27).guard);
    expect(hardest).toBeGreaterThanOrEqual(BALANCE.hunt.certainFromPercent);
    expect(hardest).toBeLessThan(50);
  });

  it("les proies et les prédateurs s'échelonnent : la première reste à la portée d'un débutant", () => {
    const [near, middle, far] = BALANCE.hunt.bands;
    if (near === undefined || middle === undefined || far === undefined) {
      throw new Error("trois distances de chasse attendues");
    }
    expect(
      winChance(partyOf({ hunter: 6, armored: 0, swift: 0 }), "soft", near.power),
    ).toBeGreaterThan(50);
    expect(middle.power).toBeGreaterThan(near.power * 2);
    expect(far.power).toBeGreaterThan(middle.power * 2);
    const levels = BALANCE.predators.levels;
    levels.forEach((level, index) => {
      const before = levels[index - 1];
      if (before === undefined) return;
      expect(level.power).toBeGreaterThan(before.power * 2);
      // Un prédateur plus fort rapporte plus par point de force.
      expect(level.proteins * before.power).toBeGreaterThan(before.proteins * level.power);
    });
    // Le plus fort des prédateurs demande une armée que l'ancien plafond interdisait.
    const strongest = levels[levels.length - 1];
    expect(strongest?.power ?? 0).toBeGreaterThan(35 * BALANCE.hunt.strongMultiplier);
  });
});
