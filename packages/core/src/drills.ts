/**
 * La recherche militaire : de petits pouvoirs pour les cellules filles. Chaque niveau coûte
 * le double du précédent : les premiers sont à portée de tous, les derniers demandent une
 * réserve immense.
 */
import { BALANCE, DRILL_IDS } from "@o27/data";
import type { DrillId, ResourceId, StatId } from "@o27/data";
import { MICRO } from "./types";
import type { PlayerState } from "./types";

const RULES = BALANCE.drills;

/** Ce que les pouvoirs acquis ajoutent (ou retirent) à une statistique, en pourcentage. */
export function drillPercent(state: PlayerState, stat: StatId): number {
  let total = 0;
  for (const id of DRILL_IDS) {
    const power = RULES.powers[id];
    if (power.stat === stat) total += power.percentPerLevel * state.drills[id];
  }
  return total;
}

export interface DrillOffer {
  readonly toLevel: number;
  /** Prix du niveau suivant, en millionièmes d'unité. */
  readonly cost: Readonly<Record<ResourceId, number>>;
  readonly blocked: "locked" | "maxLevel" | null;
}

/** Ce que coûte le niveau suivant d'un pouvoir. */
export function drillOffer(state: PlayerState, id: DrillId): DrillOffer {
  const level = state.drills[id];
  let factor = MICRO;
  for (let step = 0; step < level; step++) {
    factor = Math.floor((factor * RULES.costGrowthPercent) / 100);
  }
  return {
    toLevel: level + 1,
    cost: {
      sugar: RULES.cost.sugar * factor,
      bricks: RULES.cost.bricks * factor,
      proteins: RULES.cost.proteins * factor,
    },
    blocked: state.tier < RULES.tier ? "locked" : level >= RULES.maxLevel ? "maxLevel" : null,
  };
}
