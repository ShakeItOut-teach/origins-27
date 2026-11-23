/**
 * Cibles d'équilibrage des paliers 0 à 2. Si un changement de chiffres casse une cible,
 * c'est l'intention qu'il faut rediscuter, pas le test qu'il faut assouplir.
 */
import { describe, expect, it } from "vitest";
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
