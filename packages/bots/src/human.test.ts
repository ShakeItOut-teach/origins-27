import { OrderSchema } from "@o27/data";
import { describe, expect, it, vi } from "vitest";
import { HUMAN_TEN_A_DAY, simulateHuman } from "./human";

vi.setConfig({ testTimeout: 60_000 });

describe("une saison au rythme humain (dix connexions par jour)", () => {
  const refusedBySchema: string[] = [];
  const report = simulateHuman({
    ...HUMAN_TEN_A_DAY,
    seed: 7,
    worldSeed: 27,
    slot: 4,
    observe: {
      order(order) {
        if (!OrderSchema.safeParse(order).success) refusedBySchema.push(JSON.stringify(order));
      },
    },
  });
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

  it("le serveur accepterait chacun de ses ordres", () => {
    expect(refusedBySchema).toEqual([]);
  });

  it("il n'est presque jamais à court au point de ne rien pouvoir lancer, ni sans rien à bâtir", () => {
    const poor = report.days.reduce((sum, day) => sum + day.sessionsTooPoor, 0);
    expect(poor).toBeLessThanOrEqual(3);
    // Dix connexions par jour : il reste presque toujours un chantier à lancer.
    const idle = report.days.reduce((sum, day) => sum + day.sessionsWithNothingToBuild, 0);
    expect(idle).toBeLessThanOrEqual(25);
  });

  it("il ne meurt pas de faim et garde une armée", () => {
    for (const day of report.days) expect(day.starved).toBe(0);
    // Une chasse ratée peut coûter cher un jour donné : on regarde la dernière semaine.
    const lastWeek = report.days.slice(-7);
    const troops = lastWeek.reduce((sum, day) => sum + day.troops, 0) / lastWeek.length;
    expect(troops).toBeGreaterThan(50);
  });
});
