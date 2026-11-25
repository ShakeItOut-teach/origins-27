import { SEASON_DAYS } from "@o27/data";
import { describe, expect, it } from "vitest";
import { DAY_MS, createPlayer, museumPlate, seasonOver, speciesOf } from "./index";
import type { PlayerState } from "./index";

const SEASON = 1_800_000_000_000;

function player(day: number, patch: Partial<PlayerState> = {}): PlayerState {
  const now = SEASON + (day - 1) * DAY_MS + 3_600_000;
  return { ...createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 }), ...patch };
}

describe("la planche du Muséum : ce qu'une espèce était à la fin d'une saison", () => {
  it("porte la saison, le nom de l'espèce, son rang et sa ligue", () => {
    const state = player(27, { tier: 12 });
    const plate = museumPlate(state);
    expect(plate.season).toBe(SEASON);
    expect(plate.name).toBe(speciesOf(state).name);
    expect(plate.rank).toBeGreaterThanOrEqual(1);
    expect(plate.rank).toBeLessThanOrEqual(plate.of);
    expect(plate.of).toBe(500);
  });

  it("une espèce restée dans l'eau n'a ni lignée ni place", () => {
    const plate = museumPlate(player(27, { tier: 12 }));
    expect(plate.lineage).toBe("");
    expect(plate.place).toBe(0);
  });

  it("une lignée sortie des eaux garde son nom et sa place", () => {
    const base = player(27, { tier: 12 });
    const plate = museumPlate({ ...base, apex: { endsAt: base.now, place: 3 } });
    expect(plate.lineage).not.toBe("");
    expect(plate.place).toBe(3);
  });

  it("deux lectures du même état donnent la même planche", () => {
    const state = player(20, { tier: 11 });
    expect(museumPlate(state)).toEqual(museumPlate(state));
  });

  it("la saison est finie le lendemain du dernier jour, pas avant", () => {
    const last = player(SEASON_DAYS);
    expect(seasonOver(last, last.now)).toBe(false);
    expect(seasonOver(last, SEASON + SEASON_DAYS * DAY_MS)).toBe(true);
  });
});
