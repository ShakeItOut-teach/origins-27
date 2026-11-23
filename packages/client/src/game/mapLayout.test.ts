import { visiblePlaces, visiblePrey } from "@o27/core";
import { describe, expect, it } from "vitest";
import { MIN_GAP, filamentReach, layoutSpots } from "./mapLayout";

describe("disposition sur la lame", () => {
  it("pour tous les joueurs : lieux et proies ne se chevauchent pas, ni la cellule, ni le bord", () => {
    for (let slot = 0; slot < 500; slot++) {
      const placed = layoutSpots([...visiblePlaces(27, slot), ...visiblePrey(27, slot)]);
      expect(placed).toHaveLength(9);
      for (const [index, a] of placed.entries()) {
        const fromCentre = Math.hypot(a.x - 0.5, a.y - 0.5);
        expect(fromCentre).toBeGreaterThan(0.15);
        expect(fromCentre).toBeLessThan(0.44);
        for (const b of placed.slice(index + 1)) {
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(MIN_GAP - 1e-9);
        }
      }
    }
  });

  it("plus c'est loin, plus c'est dessiné loin du centre", () => {
    const placed = layoutSpots(visiblePlaces(27, 3));
    const radius = (band: number) =>
      placed
        .filter((entry) => entry.item.band === band)
        .map((entry) => Math.hypot(entry.x - 0.5, entry.y - 0.5));
    expect(Math.max(...radius(0))).toBeLessThan(Math.min(...radius(1)));
    expect(Math.max(...radius(1))).toBeLessThan(Math.min(...radius(2)));
  });
});

describe("avancée d'un filament", () => {
  it("expédition : s'éloigne, touche le lieu à mi-chemin, revient", () => {
    const trip = {
      startedAt: 0,
      arrivesAt: 300_000,
      leavesAt: 300_000,
      returnsAt: 600_000,
      cancelled: false,
    };
    expect(filamentReach(trip, 10, 0)).toBe(0);
    expect(filamentReach(trip, 10, 150_000)).toBe(0.5);
    expect(filamentReach(trip, 10, 300_000)).toBe(1);
    expect(filamentReach(trip, 10, 450_000)).toBe(0.5);
    expect(filamentReach(trip, 10, 600_000)).toBe(0);
  });

  it("chasse : le groupe reste sur la proie pendant le combat", () => {
    const hunt = {
      startedAt: 0,
      arrivesAt: 30_000,
      leavesAt: 38_000,
      returnsAt: 68_000,
      cancelled: false,
    };
    expect(filamentReach(hunt, 10, 15_000)).toBe(0.5);
    expect(filamentReach(hunt, 10, 30_000)).toBe(1);
    expect(filamentReach(hunt, 10, 37_000)).toBe(1);
    expect(filamentReach(hunt, 10, 53_000)).toBe(0.5);
  });

  it("rappelé à mi-aller, il repart de là où il était et rentre dix fois plus vite", () => {
    // Rappelé après 150 s d'un aller de 300 s : il lui reste 15 s de retour.
    const cancelled = {
      startedAt: 0,
      arrivesAt: 300_000,
      leavesAt: 300_000,
      returnsAt: 165_000,
      cancelled: true,
    };
    expect(filamentReach(cancelled, 10, 150_000)).toBe(0.5);
    expect(filamentReach(cancelled, 10, 157_500)).toBe(0.25);
    expect(filamentReach(cancelled, 10, 165_000)).toBe(0);
  });
});
