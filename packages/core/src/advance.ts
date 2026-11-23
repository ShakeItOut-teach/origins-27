/** Faire passer le temps : production passive, fin des chantiers, paliers. */
import { RESOURCE_IDS } from "@o27/data";
import { capacity, productionRate } from "./stats";
import type { Construction, GameEvent, PlayerState, Step } from "./types";
import { evaluateTier } from "./unlock";

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

/**
 * Amène l'état à l'instant `now`. Chaque événement daté (fin de chantier) est résolu
 * à son heure exacte : avancer en une fois ou en plusieurs donne le même résultat.
 */
export function advance(state: PlayerState, now: number): Step {
  if (!Number.isSafeInteger(now) || now < state.now) {
    throw new RangeError("advance : le temps ne peut pas reculer");
  }
  let current = state;
  const events: GameEvent[] = [];
  while (current.construction !== null && current.construction.endsAt <= now) {
    const construction = current.construction;
    current = complete(produce(current, construction.endsAt), construction);
    events.push({
      type: "constructionDone",
      at: construction.endsAt,
      organelle: construction.organelle,
      level: construction.toLevel,
    });
    const step = evaluateTier(current, construction.endsAt);
    current = step.state;
    events.push(...step.events);
  }
  const step = evaluateTier(produce(current, now), now);
  events.push(...step.events);
  return { state: step.state, events };
}
