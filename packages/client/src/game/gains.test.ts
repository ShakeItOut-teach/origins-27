import { describe, expect, it } from "vitest";
import { grainCount, suddenGain } from "./gains";

const UNIT = 1_000_000;

describe("un gain soudain", () => {
  it("n'existe pas quand seule la production fait monter le compteur", () => {
    // 2 par seconde pendant 3 secondes : 6 de plus, tout s'explique.
    expect(suddenGain(100 * UNIT, 106 * UNIT, 3000, (2 * UNIT) / 1000, UNIT)).toBe(0);
    expect(suddenGain(100 * UNIT, 100 * UNIT, 3000, 0, UNIT)).toBe(0);
  });

  it("est ce que la production n'explique pas : un toucher, un coffre, un butin", () => {
    expect(suddenGain(100 * UNIT, 101 * UNIT, 16, 0, UNIT)).toBe(UNIT);
    // 6 viennent de la production, 500 d'un coffre.
    expect(suddenGain(100 * UNIT, 606 * UNIT, 3000, (2 * UNIT) / 1000, UNIT)).toBe(500 * UNIT);
  });

  it("ignore une dépense, une miette, et un arrondi de la production", () => {
    expect(suddenGain(100 * UNIT, 40 * UNIT, 16, 0, UNIT)).toBe(0);
    expect(suddenGain(100 * UNIT, 100 * UNIT + 10, 16, 0, UNIT)).toBe(0);
    // La production donnait 60 ; on en voit 61 : c'est du bruit, pas un gain.
    expect(suddenGain(0, 61 * UNIT, 30_000, (2 * UNIT) / 1000, UNIT)).toBe(0);
  });

  it("ignore un saut d'horloge : au retour d'une absence, rien ne pleut", () => {
    expect(suddenGain(0, 900 * UNIT, 3 * 3_600_000, 0, UNIT)).toBe(0);
    expect(suddenGain(0, 900 * UNIT, -5, 0, UNIT)).toBe(0);
  });
});

describe("le nombre de grains", () => {
  it("grandit avec le gain, sans jamais noyer l'écran", () => {
    // Un toucher du tout début rapporte moins d'une unité : un grain, pas une pluie.
    expect(grainCount(UNIT / 10, UNIT)).toBe(1);
    expect(grainCount(UNIT, UNIT)).toBe(3);
    expect(grainCount(100 * UNIT, UNIT)).toBeGreaterThan(grainCount(5 * UNIT, UNIT));
    expect(grainCount(1e15, UNIT)).toBe(9);
  });
});
