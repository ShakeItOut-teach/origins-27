import {
  BALANCE,
  DRILL_IDS,
  EVOLUTION_IDS,
  MAX_RELEASED_TIER,
  ORGANELLE_IDS,
  RESOURCE_IDS,
  SEASON_DAYS,
  TROOP_IDS,
  UNLOCKS,
} from "@o27/data";
import type { ResourceId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  apexOffer,
  capacity,
  createPlayer,
  donationCost,
  drillMaxLevel,
  drillOffer,
  levelCost,
  maxLevelOf,
  nextMutationPrice,
  researchOffer,
} from "./index";
import type { PlayerState } from "./index";

const SEASON = 1_800_000_000_000;

/** Le plus haut palier qu'on peut avoir atteint ce jour-là. */
function tierOn(day: number): number {
  let tier = 0;
  for (const unlock of UNLOCKS) {
    if (unlock.tier <= MAX_RELEASED_TIER && (unlock.minDay ?? 1) <= day)
      tier = Math.max(tier, unlock.tier);
  }
  return tier;
}

/** Le joueur le mieux rangé possible ce jour-là : sa Vacuole au plus haut, aucun gène qui aide. */
function bestStorage(day: number): PlayerState {
  const now = SEASON + (day - 1) * DAY_MS + 60_000;
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  const atTier = { ...base, tier: tierOn(day) };
  return {
    ...atTier,
    organelles: { ...atTier.organelles, vacuole: maxLevelOf(atTier, "vacuole"), nucleus: 99 },
  };
}

/**
 * Ce qui coûte plus que la réserve ne peut contenir ne s'achète jamais : le joueur reste
 * bloqué devant un bouton. Chaque jour de la saison, tout ce qui s'achète doit tenir dans la
 * plus grande réserve possible ce jour-là.
 */
describe("tout ce qui s'achète tient dans la réserve", () => {
  const blocked: string[] = [];
  for (let day = 1; day <= SEASON_DAYS; day++) {
    const state = bestStorage(day);
    const tier = state.tier;
    const room = (id: ResourceId) => capacity(state, id);
    const fits = (what: string, cost: Readonly<Record<ResourceId, number>>) => {
      for (const id of RESOURCE_IDS) {
        if (cost[id] > room(id)) {
          blocked.push(
            `jour ${String(day)} (palier ${String(tier)}) : ${what} coûte ${String(Math.ceil(cost[id] / MICRO))} ${id}, réserve ${String(Math.floor(room(id) / MICRO))}`,
          );
        }
      }
    };
    for (const id of ORGANELLE_IDS) {
      if (BALANCE.organelles[id].tier > tier) continue;
      for (let level = 1; level <= maxLevelOf(state, id); level++) {
        fits(`${id} niveau ${String(level)}`, levelCost(state, id, level));
      }
    }
    if (tier >= BALANCE.research.tier) {
      for (const id of EVOLUTION_IDS) {
        for (let level = 0; level < BALANCE.research.maxLevel; level++) {
          const offer = researchOffer(
            { ...state, evolutions: { ...state.evolutions, [id]: level } },
            id,
          );
          fits(`évolution ${id} niveau ${String(level + 1)}`, offer.cost);
        }
      }
    }
    if (tier >= BALANCE.drills.tier) {
      for (const id of DRILL_IDS) {
        for (let level = 0; level < drillMaxLevel(state); level++) {
          fits(
            `pouvoir ${id} niveau ${String(level + 1)}`,
            drillOffer({ ...state, drills: { ...state.drills, [id]: level } }, id).cost,
          );
        }
      }
    }
    if (UNLOCKS.some((entry) => entry.tier <= tier && entry.orders.includes("migrate"))) {
      BALANCE.ocean.migrate.forEach((cost, index) => {
        fits(`remontée ${String(index + 1)}`, {
          sugar: cost.sugar * MICRO,
          bricks: cost.bricks * MICRO,
          proteins: cost.proteins * MICRO,
        });
      });
    }
    if (UNLOCKS.some((entry) => entry.tier <= tier && entry.orders.includes("buyMutation"))) {
      for (let chosen = 1; chosen <= BALANCE.mutationPrices.length + 1; chosen++) {
        const price = nextMutationPrice({
          ...state,
          counters: { ...state.counters, mutationsChosen: chosen },
        });
        fits(`mutation ${String(chosen)}`, { sugar: 0, bricks: 0, proteins: price });
      }
    }
    if (UNLOCKS.some((entry) => entry.tier <= tier && entry.orders.includes("donate"))) {
      fits("don à l'alliance", donationCost());
    }
    for (const id of TROOP_IDS) {
      const troop = BALANCE.troops[id];
      if (troop.tier > tier) continue;
      fits(`cellule fille ${id}`, {
        sugar: troop.cost.sugar * MICRO,
        bricks: troop.cost.bricks * MICRO,
        proteins: troop.proteins * MICRO,
      });
    }
    if (tier >= BALANCE.companion.tier) {
      for (const price of BALANCE.companion.sharePrices) {
        fits("partage de gène", { sugar: 0, bricks: 0, proteins: price * MICRO });
      }
    }
    if (tier >= BALANCE.apex.tier) fits("sortie des eaux", apexOffer(state).cost);
  }

  it("aucun achat n'est plus cher que la plus grande réserve du jour", () => {
    expect(blocked).toEqual([]);
  });
});
