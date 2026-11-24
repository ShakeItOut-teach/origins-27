import { describe, expect, it, vi } from "vitest";
import { HUMAN_TEN_A_DAY, simulateHuman } from "./human";

vi.setConfig({ testTimeout: 60_000 });

describe("une saison au rythme humain (dix connexions par jour)", () => {
  const report = simulateHuman({ ...HUMAN_TEN_A_DAY, seed: 7, worldSeed: 27, slot: 4 });
  const at = (day: number) => {
    const found = report.days.find((entry) => entry.day === day);
    if (found === undefined) throw new Error("jour attendu");
    return found;
  };

  it("rejouée avec la même graine, elle donne le même récit", () => {
    const again = simulateHuman({ ...HUMAN_TEN_A_DAY, seed: 7, worldSeed: 27, slot: 4 });
    expect(again).toEqual(report);
  });

  it("le joueur suit le calendrier : chaque ouverture datée arrive à son jour", () => {
    expect(report.days).toHaveLength(27);
    expect(at(3).tier).toBeGreaterThanOrEqual(6);
    expect(at(4).tier).toBeGreaterThanOrEqual(7);
    expect(at(5).tier).toBeGreaterThanOrEqual(8);
    expect(at(9).tier).toBeGreaterThanOrEqual(9);
    expect(report.milestones["zone éclairée atteinte"]).toBeLessThanOrEqual(19);
  });

  it("il ne meurt pas de faim et garde une armée", () => {
    for (const day of report.days) expect(day.starved).toBe(0);
    expect(at(27).troops).toBeGreaterThan(50);
  });
});
