/** Faire passer le temps : production passive, fin des chantiers, retour des expéditions, paliers. */
import { PLACE_RESOURCE, RESOURCE_IDS } from "@o27/data";
import { capacity, productionRate } from "./stats";
import type { Construction, Expedition, GameEvent, PlayerState, Step } from "./types";
import { evaluateTier } from "./unlock";
import { energyAt } from "./world";

/** Produit jusqu'à l'instant `to`, sans dépasser le stockage. */
function produce(state: PlayerState, to: number): PlayerState {
  const elapsed = to - state.now;
  if (elapsed === 0) return state;
  const resources = { ...state.resources };
  for (const id of RESOURCE_IDS) {
    const current = state.resources[id];
    const filled = Math.min(capacity(state, id), current + productionRate(state, id) * elapsed);
    // Un stock déjà au-dessus du plafond n'est jamais réduit.
    resources[id] = Math.max(current, filled);
  }
  return { ...state, now: to, resources };
}

function complete(state: PlayerState, construction: Construction): PlayerState {
  const isNew = state.organelles[construction.organelle] === 0;
  return {
    ...state,
    construction: null,
    organelles: { ...state.organelles, [construction.organelle]: construction.toLevel },
    counters: isNew
      ? { ...state.counters, organellesBuilt: state.counters.organellesBuilt + 1 }
      : state.counters,
  };
}

/** Le filament est revenu : le butin entre dans la réserve, ce qui déborde est perdu. */
function comeBack(state: PlayerState, expedition: Expedition): Step {
  const resource = PLACE_RESOURCE[expedition.kind];
  const loot = expedition.cancelled ? 0 : expedition.loot;
  const room = Math.max(0, capacity(state, resource) - state.resources[resource]);
  const gained = Math.min(room, loot);
  const next: PlayerState = {
    ...state,
    expedition: null,
    resources: { ...state.resources, [resource]: state.resources[resource] + gained },
    counters: expedition.cancelled
      ? state.counters
      : { ...state.counters, mapHarvests: state.counters.mapHarvests + 1 },
    placeReadyAt: expedition.cancelled
      ? state.placeReadyAt
      : { ...state.placeReadyAt, [expedition.place]: expedition.returnsAt + expedition.restMs },
  };
  return {
    state: next,
    events: [
      {
        type: "expeditionReturned",
        at: expedition.returnsAt,
        place: expedition.place,
        resource,
        gained,
        lost: loot - gained,
        cancelled: expedition.cancelled,
      },
    ],
  };
}

/** Énergie remise à jour, lieux regarnis oubliés. */
function settle(state: PlayerState, now: number): PlayerState {
  const energy = energyAt(state, now);
  const resting = Object.entries(state.placeReadyAt).filter(([, readyAt]) => readyAt > now);
  const pruned = resting.length !== Object.keys(state.placeReadyAt).length;
  if (energy.energy === state.energy && energy.energyAt === state.energyAt && !pruned) return state;
  return {
    ...state,
    ...energy,
    placeReadyAt: pruned ? Object.fromEntries(resting) : state.placeReadyAt,
  };
}

/**
 * Amène l'état à l'instant `now`. Chaque événement daté (fin de chantier, retour) est résolu
 * à son heure exacte : avancer en une fois ou en plusieurs donne le même résultat.
 */
export function advance(state: PlayerState, now: number): Step {
  if (!Number.isSafeInteger(now) || now < state.now) {
    throw new RangeError("advance : le temps ne peut pas reculer");
  }
  let current = state;
  const events: GameEvent[] = [];
  for (;;) {
    const { construction, expedition } = current;
    const buildEnd = construction?.endsAt ?? Number.POSITIVE_INFINITY;
    const tripEnd = expedition?.returnsAt ?? Number.POSITIVE_INFINITY;
    const at = Math.min(buildEnd, tripEnd);
    if (at > now) break;
    // À la même milliseconde, le chantier passe d'abord : la réserve agrandie accueille le butin.
    if (construction !== null && buildEnd <= tripEnd) {
      current = complete(produce(current, at), construction);
      events.push({
        type: "constructionDone",
        at,
        organelle: construction.organelle,
        level: construction.toLevel,
      });
    } else if (expedition !== null) {
      const back = comeBack(produce(current, at), expedition);
      current = back.state;
      events.push(...back.events);
    }
    const step = evaluateTier(current, at);
    current = step.state;
    events.push(...step.events);
  }
  const step = evaluateTier(settle(produce(current, now), now), now);
  events.push(...step.events);
  return { state: step.state, events };
}
