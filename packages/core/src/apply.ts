/** Point d'entrée du moteur : appliquer un ordre du joueur à un instant donné. */
import { BALANCE, RESOURCE_IDS } from "@o27/data";
import type { MutationId, Order, OrganelleId } from "@o27/data";
import { advance } from "./advance";
import { capacity, levelCost, levelDuration, tapYield } from "./stats";
import type { GameEvent, OrderErrorCode, OrderResult, PlayerState } from "./types";
import { orderTier } from "./unlock";
import { cancelReturnMs, placeOffer, visiblePlaces } from "./world";

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

function sendExpedition(state: PlayerState, placeId: string): Outcome {
  if (state.expedition !== null) return { error: "busy" };
  const place = visiblePlaces(state.worldSeed, state.slot).find((entry) => entry.id === placeId);
  if (place === undefined) return { error: "unknownPlace" };
  if ((state.placeReadyAt[placeId] ?? 0) > state.now) return { error: "placeResting" };
  const offer = placeOffer(place);
  if (state.energy < offer.energy) return { error: "noEnergy" };
  const returnsAt = state.now + offer.durationMs;
  return {
    state: {
      ...state,
      energy: state.energy - offer.energy,
      expedition: {
        place: placeId,
        kind: place.kind,
        loot: offer.loot,
        energy: offer.energy,
        restMs: offer.restMs,
        startedAt: state.now,
        returnsAt,
        cancelled: false,
      },
    },
    events: [{ type: "expeditionSent", at: state.now, place: placeId, returnsAt }],
  };
}

function cancelExpedition(state: PlayerState): Outcome {
  const expedition = state.expedition;
  if (expedition === null || expedition.cancelled) return { error: "noExpedition" };
  const returnsAt =
    state.now + cancelReturnMs(expedition.startedAt, expedition.returnsAt, state.now);
  return {
    state: {
      ...state,
      // L'énergie est rendue tout de suite ; le filament, lui, met un instant à rentrer.
      energy: Math.min(BALANCE.energy.max, state.energy + expedition.energy),
      expedition: { ...expedition, returnsAt, cancelled: true },
    },
    events: [{ type: "expeditionCancelled", at: state.now, returnsAt }],
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
    case "sendExpedition":
      return sendExpedition(state, order.place);
    case "cancelExpedition":
      return cancelExpedition(state);
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
  // Une expédition rappelée tout près de la cellule peut rentrer dans la même milliseconde.
  const after = advance(outcome.state, now);
  return {
    ok: true,
    state: after.state,
    events: [...before.events, ...outcome.events, ...after.events],
  };
}
