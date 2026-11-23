/** Point d'entrée du moteur : appliquer un ordre du joueur à un instant donné. */
import { BALANCE, RESOURCE_IDS } from "@o27/data";
import type { MutationId, Order, OrganelleId } from "@o27/data";
import { advance } from "./advance";
import { capacity, levelCost, levelDuration, tapYield } from "./stats";
import type { GameEvent, OrderErrorCode, OrderResult, PlayerState } from "./types";
import { evaluateTier, orderTier } from "./unlock";

type Outcome =
  | { readonly state: PlayerState; readonly events: readonly GameEvent[] }
  | { readonly error: OrderErrorCode };

function harvest(state: PlayerState, taps: number): Outcome {
  const interval = BALANCE.tap.minIntervalMs;
  const burst = BALANCE.tap.burst;
  // Le budget de touchers se remplit avec le temps, jusqu'à `burst`.
  const budgetStart = Math.max(state.tapBudgetAt, state.now - burst * interval);
  const allowed = Math.min(taps, Math.floor((state.now - budgetStart) / interval));
  if (allowed <= 0) return { error: "tooFast" };
  const room = capacity(state, "sugar") - state.resources.sugar;
  if (room <= 0) return { error: "storageFull" };
  const amount = Math.min(room, allowed * tapYield(state));
  return {
    state: {
      ...state,
      tapBudgetAt: budgetStart + allowed * interval,
      resources: { ...state.resources, sugar: state.resources.sugar + amount },
      counters: { ...state.counters, harvests: state.counters.harvests + allowed },
    },
    events: [{ type: "harvested", at: state.now, amount }],
  };
}

function startConstruction(state: PlayerState, organelle: OrganelleId, toLevel: number): Outcome {
  if (state.construction !== null) return { error: "busy" };
  const cost = levelCost(state, organelle, toLevel);
  if (RESOURCE_IDS.some((id) => state.resources[id] < cost[id])) return { error: "insufficient" };
  const endsAt = state.now + levelDuration(state, organelle, toLevel);
  return {
    state: {
      ...state,
      resources: {
        sugar: state.resources.sugar - cost.sugar,
        bricks: state.resources.bricks - cost.bricks,
      },
      construction: { organelle, toLevel, endsAt },
    },
    events: [{ type: "constructionStarted", at: state.now, organelle, toLevel, endsAt }],
  };
}

function build(state: PlayerState, organelle: OrganelleId): Outcome {
  if (BALANCE.organelles[organelle].tier > state.tier) return { error: "locked" };
  if (state.organelles[organelle] > 0) return { error: "alreadyBuilt" };
  return startConstruction(state, organelle, 1);
}

function upgrade(state: PlayerState, organelle: OrganelleId): Outcome {
  const level = state.organelles[organelle];
  if (level === 0) return { error: "notBuilt" };
  if (level >= BALANCE.organelles[organelle].maxLevel) return { error: "maxLevel" };
  return startConstruction(state, organelle, level + 1);
}

function chooseMutation(state: PlayerState, mutation: MutationId): Outcome {
  if (state.mutationOffer === null) return { error: "noOffer" };
  if (!state.mutationOffer.includes(mutation)) return { error: "notInOffer" };
  return {
    state: {
      ...state,
      mutationOffer: null,
      mutations: [...state.mutations, mutation],
      counters: { ...state.counters, mutationsChosen: state.counters.mutationsChosen + 1 },
    },
    events: [{ type: "mutationChosen", at: state.now, mutation }],
  };
}

function execute(state: PlayerState, order: Order): Outcome {
  switch (order.type) {
    case "harvest":
      return harvest(state, order.taps);
    case "build":
      return build(state, order.organelle);
    case "upgrade":
      return upgrade(state, order.organelle);
    case "chooseMutation":
      return chooseMutation(state, order.mutation);
  }
}

/**
 * Applique un ordre à l'instant `now`.
 * L'état reçu n'est jamais modifié. En cas de refus, rien ne change.
 */
export function applyOrder(state: PlayerState, order: Order, now: number): OrderResult {
  if (!Number.isSafeInteger(now) || now < state.now) return { ok: false, error: "timeBackwards" };
  const before = advance(state, now);
  if (orderTier(order.type) > before.state.tier) return { ok: false, error: "locked" };
  const outcome = execute(before.state, order);
  if ("error" in outcome) return { ok: false, error: outcome.error };
  const after = evaluateTier(outcome.state, now);
  return {
    ok: true,
    state: after.state,
    events: [...before.events, ...outcome.events, ...after.events],
  };
}
