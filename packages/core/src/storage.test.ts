import {
  BALANCE,
  DRILL_IDS,
  EVOLUTION_IDS,
  MAX_RELEASED_TIER,
  ORGANELLE_IDS,
  RESOURCE_IDS,
  TROOP_IDS,
  UNLOCKS,
} from "@o27/data";
import type { ResourceId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
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

/** Le joueur le mieux rangé possible à ce palier : sa Vacuole au plus haut, aucun gène qui aide. */
function bestStorage(tier: number): PlayerState {
  const base = createPlayer(7, SEASON, SEASON, { worldSeed: 27, slot: 4 });
  const atTier = { ...base, tier };
  return {
    ...atTier,
    organelles: { ...atTier.organelles, vacuole: maxLevelOf(atTier, "vacuole"), nucleus: 99 },
  };
}

/**
 * Ce qui coûte plus que la réserve ne peut contenir ne s'achète jamais : le joueur reste
 * bloqué devant un bouton. À chaque palier, tout ce qui s'achète doit tenir dans la plus
 * grande réserve possible à ce palier.
 */
describe("tout ce qui s'achète tient dans la réserve", () => {
  const blocked: string[] = [];
  for (let tier = 1; tier <= MAX_RELEASED_TIER; tier++) {
    const state = bestStorage(tier);
    const room = (id: ResourceId) => capacity(state, id);
    const fits = (what: string, cost: Readonly<Record<ResourceId, number>>) => {
      for (const id of RESOURCE_IDS) {
        if (cost[id] > room(id)) {
          blocked.push(
            `palier ${String(tier)} : ${what} coûte ${String(Math.ceil(cost[id] / MICRO))} ${id}, réserve ${String(Math.floor(room(id) / MICRO))}`,
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

  it("aucun achat n'est plus cher que la plus grande réserve de son palier", () => {
    expect(blocked).toEqual([]);
  });
});
