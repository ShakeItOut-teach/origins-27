/**
 * Cibles d'équilibrage des paliers 0 à 2. Si un changement de chiffres casse une cible,
 * c'est l'intention qu'il faut rediscuter, pas le test qu'il faut assouplir.
 */
import { describe, expect, it } from "vitest";
import { BALANCE } from "@o27/data";
import { PROFILES, simulate } from "./index";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const HOUR = 3600;

describe("cibles d'équilibrage", () => {
  it("tout le monde atteint le palier 1 en moins de 15 secondes", () => {
    for (const profile of Object.values(PROFILES)) {
      for (const seed of SEEDS) {
        expect(simulate(profile, seed, HOUR).tierSeconds[1]).toBeLessThanOrEqual(15);
      }
    }
  });

  it("un joueur appliqué choisit sa première mutation en 2 à 6 minutes", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, HOUR);
      expect(report.mutationSeconds).toBeGreaterThanOrEqual(120);
      expect(report.mutationSeconds).toBeLessThanOrEqual(360);
    }
  });

  it("un joueur appliqué n'attend jamais plus de 90 secondes sans rien pouvoir faire", () => {
    for (const seed of SEEDS) {
      expect(simulate(PROFILES.applique, seed, HOUR).longestStuckSeconds).toBeLessThanOrEqual(90);
    }
  });

  it("un débutant choisit sa première mutation en moins de 10 minutes", () => {
    for (const seed of SEEDS) {
      expect(simulate(PROFILES.debutant, seed, HOUR).mutationSeconds).toBeLessThanOrEqual(600);
    }
  });

  it("un joueur parti après deux minutes trouve sa mutation à son retour", () => {
    const { activeSeconds, awaySeconds } = PROFILES.absent.sessions;
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.absent, seed, 24 * HOUR);
      expect(report.mutationSeconds).toBeLessThanOrEqual(2 * activeSeconds + awaySeconds);
    }
  });

  it("le même robot avec la même graine rejoue la même partie", () => {
    expect(simulate(PROFILES.debutant, 42, HOUR)).toEqual(simulate(PROFILES.debutant, 42, HOUR));
  });
});

describe("cibles d'équilibrage du palier 3 (la carte)", () => {
  const FIVE = { expeditions: 5 } as const;

  it("la première expédition part moins de 30 secondes après l'ouverture de la carte", () => {
    for (const profile of [PROFILES.applique, PROFILES.debutant]) {
      for (const seed of SEEDS) {
        const report = simulate(profile, seed, HOUR, FIVE);
        const opened = report.tierSeconds[3] ?? Number.POSITIVE_INFINITY;
        expect((report.firstExpeditionSeconds ?? Number.POSITIVE_INFINITY) - opened).toBeLessThan(
          30,
        );
      }
    }
  });

  it("cinq expéditions revenues en moins de 15 minutes de carte, dans la première session", () => {
    for (const profile of [PROFILES.applique, PROFILES.debutant]) {
      for (const seed of SEEDS) {
        const report = simulate(profile, seed, HOUR, FIVE);
        const opened = report.tierSeconds[3] ?? Number.POSITIVE_INFINITY;
        expect(
          (report.expeditionsGoalSeconds ?? Number.POSITIVE_INFINITY) - opened,
        ).toBeLessThanOrEqual(15 * 60);
      }
    }
  });

  it("un joueur soigneux perd moins d'un tiers de son butin faute de place", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, HOUR, FIVE);
      expect(report.lootLost * 2).toBeLessThanOrEqual(report.lootGained);
    }
  });

  it("sur la carte non plus, jamais plus de 90 secondes sans rien pouvoir faire", () => {
    for (const seed of SEEDS) {
      expect(simulate(PROFILES.applique, seed, HOUR, FIVE).longestStuckSeconds).toBeLessThanOrEqual(
        90,
      );
    }
  });

  it("un joueur qui revient toutes les 8 heures finit par faire ses cinq expéditions", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.absent, seed, 72 * HOUR, FIVE);
      expect(report.expeditionsGoalSeconds).not.toBeNull();
    }
  });

  it("une expédition proche rapporte plus que le même temps passé à toucher la cellule", () => {
    const near = BALANCE.expedition.bands[0];
    if (near === undefined) throw new Error("bande attendue");
    // Un débutant touche une fois par seconde, pour 1 sucre.
    expect(near.sugar).toBeGreaterThanOrEqual(near.seconds * BALANCE.tap.yield * 1.5);
  });
});
