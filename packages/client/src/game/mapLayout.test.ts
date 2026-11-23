import { visiblePlaces } from "@o27/core";
import { describe, expect, it } from "vitest";
import { MIN_GAP, filamentReach, layoutPlaces } from "./mapLayout";

describe("disposition des lieux sur la lame", () => {
  it("pour tous les joueurs : aucun lieu ne chevauche un autre, ni la cellule, ni le bord", () => {
    for (let slot = 0; slot < 500; slot++) {
      const placed = layoutPlaces(visiblePlaces(27, slot));
      expect(placed).toHaveLength(6);
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

  it("plus un lieu est loin, plus il est dessiné loin du centre", () => {
    const placed = layoutPlaces(visiblePlaces(27, 3));
    const radius = (band: number) =>
      placed
        .filter((entry) => entry.place.band === band)
        .map((entry) => Math.hypot(entry.x - 0.5, entry.y - 0.5));
    expect(Math.max(...radius(0))).toBeLessThan(Math.min(...radius(1)));
    expect(Math.max(...radius(1))).toBeLessThan(Math.min(...radius(2)));
  });
});

describe("avancée du filament", () => {
  const trip = { startedAt: 0, returnsAt: 600_000, cancelled: false };

  it("s'éloigne à l'aller, touche le lieu à mi-chemin, revient au retour", () => {
    expect(filamentReach(trip, 600_000, 10, 0)).toBe(0);
    expect(filamentReach(trip, 600_000, 10, 150_000)).toBe(0.5);
    expect(filamentReach(trip, 600_000, 10, 300_000)).toBe(1);
    expect(filamentReach(trip, 600_000, 10, 450_000)).toBe(0.5);
    expect(filamentReach(trip, 600_000, 10, 600_000)).toBe(0);
  });

  it("rappelé à mi-aller, il repart de là où il était et rentre dix fois plus vite", () => {
    // Rappelé après 150 s : il lui reste 15 s de retour.
    const cancelled = { startedAt: 0, returnsAt: 165_000, cancelled: true };
    expect(filamentReach(cancelled, 600_000, 10, 150_000)).toBe(0.5);
    expect(filamentReach(cancelled, 600_000, 10, 157_500)).toBe(0.25);
    expect(filamentReach(cancelled, 600_000, 10, 165_000)).toBe(0);
  });
});
