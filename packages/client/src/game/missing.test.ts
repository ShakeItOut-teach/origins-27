import { DAY_MS, MICRO, capacity, createPlayer } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { describe, expect, it } from "vitest";
import { netRate, shortfalls } from "./missing";

const SEASON = 1_800_000_000_000;
const NOW = SEASON + 6 * DAY_MS;

/** Un joueur qui produit du sucre, sans troupes à nourrir, avec une petite réserve. */
function player(): PlayerState {
  const base = createPlayer(7, SEASON, NOW, { worldSeed: 27, slot: 4 });
  return {
    ...base,
    tier: 8,
    organelles: { ...base.organelles, mitochondrion: 3, vacuole: 3 },
    resources: { sugar: 50 * MICRO, bricks: 50 * MICRO, proteins: 5 * MICRO },
  };
}

describe("ce qui manque pour payer un prix", () => {
  it("rien quand le joueur a de quoi payer", () => {
    const cost = { sugar: 10 * MICRO, bricks: 10 * MICRO, proteins: MICRO };
    expect(shortfalls(player(), cost)).toEqual([]);
  });

  it("une ressource que la cellule produit : on dit combien de temps attendre", () => {
    const state = player();
    expect(netRate(state, "sugar")).toBeGreaterThan(0);
    const cost = { sugar: 70 * MICRO, bricks: 0, proteins: 0 };
    const [sugar] = shortfalls(state, cost);
    expect(sugar?.resource).toBe("sugar");
    expect(sugar?.missing).toBe(20 * MICRO);
    expect(sugar?.waitMs).toBe(Math.ceil((20 * MICRO) / netRate(state, "sugar")));
  });

  it("les protéines ne se produisent pas : pas d'attente annoncée, il faut chasser", () => {
    const state = player();
    expect(netRate(state, "proteins")).toBe(0);
    const [proteins] = shortfalls(state, { sugar: 0, bricks: 0, proteins: 40 * MICRO });
    expect(proteins).toEqual({ resource: "proteins", missing: 35 * MICRO, waitMs: null });
  });

  it("un prix plus grand que la réserve ne viendra jamais en attendant", () => {
    const state = player();
    const tooBig = capacity(state, "sugar") + MICRO;
    const [sugar] = shortfalls(state, { sugar: tooBig, bricks: 0, proteins: 0 });
    expect(sugar?.waitMs).toBeNull();
  });

  it("des troupes qui mangent tout le sucre : pas d'attente annoncée non plus", () => {
    const base = player();
    const state = { ...base, troops: { ...base.troops, hunter: 5000 } };
    expect(netRate(state, "sugar")).toBeLessThanOrEqual(0);
    const [sugar] = shortfalls(state, { sugar: 70 * MICRO, bricks: 0, proteins: 0 });
    expect(sugar?.waitMs).toBeNull();
  });
});
