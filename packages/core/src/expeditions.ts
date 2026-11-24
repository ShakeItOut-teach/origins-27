/**
 * Envoyer récolter : dans la goutte ou dans l'océan. Ces règles servent à l'ordre du joueur et
 * à la récolte automatique, qui relance les cellules dès leur retour.
 */
import { gatherOffer, playerDeposit, playerDeposits } from "./gather";
import { cellDistance, playerCell } from "./ocean";
import { capacity } from "./stats";
import type { Expedition, GameEvent, OrderErrorCode, PlayerState, Step } from "./types";
import { placeOffer, visiblePlaces } from "./world";

type Outcome =
  | { readonly state: PlayerState; readonly events: readonly GameEvent[] }
  | { readonly error: OrderErrorCode };

export function sendExpedition(state: PlayerState, placeId: string): Outcome {
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

/** Récolter un gisement commun : ce que l'on charge n'est plus là pour les autres. */
export function gather(state: PlayerState, depositId: string): Outcome {
  if (state.expedition !== null) return { error: "busy" };
  const deposit = playerDeposit(state, depositId, state.now);
  if (deposit === null) return { error: "unknownPlace" };
  if (deposit.zone > state.zone) return { error: "zoneClosed" };
  const offer = gatherOffer(state, deposit, state.now);
  if (offer.loot <= 0) return { error: "depleted" };
  if (state.energy < offer.energy) return { error: "noEnergy" };
  const returnsAt = state.now + offer.durationMs;
  // On oublie au passage les gisements disparus : la liste ne grossit pas sans fin.
  const taken: Record<string, number> = {};
  for (const [id, amount] of Object.entries(state.taken)) {
    if (playerDeposit(state, id, state.now) !== null) taken[id] = amount;
  }
  taken[depositId] = (taken[depositId] ?? 0) + offer.loot;
  return {
    state: {
      ...state,
      energy: state.energy - offer.energy,
      taken,
      expedition: {
        place: depositId,
        kind: deposit.kind,
        loot: offer.loot,
        energy: offer.energy,
        restMs: 0,
        startedAt: state.now,
        returnsAt,
        cancelled: false,
      },
    },
    events: [{ type: "expeditionSent", at: state.now, place: depositId, returnsAt }],
  };
}

/**
 * Récolte automatique : les cellules qui rentrent repartent aussitôt. Dans l'océan, vers le
 * même gisement s'il en reste, sinon vers le plus proche ; dans la goutte, vers le lieu
 * disponible le plus proche. Elles ne partent pas si la réserve est pleine, ni sans énergie.
 */
export function autoHarvest(state: PlayerState, last: Expedition): Step {
  const nothing: Step = { state, events: [] };
  if (!state.autoHarvest || state.expedition !== null) return nothing;
  const tryStart = (outcome: Outcome): Step | null => ("error" in outcome ? null : outcome);
  if (/^[dv]:/.test(last.place)) {
    const home = playerCell(state);
    const near = playerDeposits(state, state.now)
      .filter((deposit) => deposit.zone <= state.zone && deposit.id !== last.place)
      .sort(
        (one, other) =>
          cellDistance(home, one) - cellDistance(home, other) || (one.id < other.id ? -1 : 1),
      )
      .slice(0, 6);
    const same = playerDeposit(state, last.place, state.now);
    for (const deposit of same === null ? near : [same, ...near]) {
      const offer = gatherOffer(state, deposit, state.now);
      if (capacity(state, offer.resource) - state.resources[offer.resource] <= 0) continue;
      const started = tryStart(gather(state, deposit.id));
      if (started !== null) return started;
    }
    return nothing;
  }
  for (const place of visiblePlaces(state.worldSeed, state.slot)) {
    const offer = placeOffer(place);
    if (capacity(state, offer.resource) - state.resources[offer.resource] <= 0) continue;
    const started = tryStart(sendExpedition(state, place.id));
    if (started !== null) return started;
  }
  return nothing;
}
