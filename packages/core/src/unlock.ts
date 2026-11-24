/** Déblocage progressif : quel palier le joueur a atteint, et ce que cela ouvre. */
import { BALANCE, MAX_RELEASED_TIER, MUTATION_IDS, UNLOCKS } from "@o27/data";
import type { MutationId, OrderType, Unlock } from "@o27/data";
import { createRng } from "./rng";
import { DAY_MS } from "./types";
import type { GameEvent, PlayerState, Step } from "./types";

/** Jour de saison à un instant donné (1 = premier jour). */
export function seasonDay(state: PlayerState, at: number): number {
  return Math.floor(Math.max(0, at - state.seasonStart) / DAY_MS) + 1;
}

const ORDER_TIER = new Map<OrderType, number>(
  UNLOCKS.flatMap((unlock) => unlock.orders.map((order) => [order, unlock.tier] as const)),
);

/** Palier à partir duquel un ordre est autorisé. */
export function orderTier(order: OrderType): number {
  return ORDER_TIER.get(order) ?? Number.POSITIVE_INFINITY;
}

function conditionMet(state: PlayerState, unlock: Unlock, at: number): boolean {
  if (unlock.minDay !== null && seasonDay(state, at) < unlock.minDay) return false;
  if (unlock.condition === null) return true;
  return state.counters[unlock.condition.counter] >= unlock.condition.atLeast;
}

/** Les mutations que le joueur n'a pas encore et que son palier permet de proposer. */
export function mutationPool(state: PlayerState): MutationId[] {
  return MUTATION_IDS.filter(
    (id) => !state.mutations.includes(id) && BALANCE.mutations[id].tier <= state.tier,
  );
}

export function drawMutationOffer(state: PlayerState, at: number): Step {
  const pool = mutationPool(state);
  const count = Math.min(BALANCE.mutationOffer.choices, pool.length);
  if (count === 0) return { state, events: [] };
  const rng = createRng(state.rngState);
  const options: MutationId[] = [];
  for (let i = 0; i < count; i++) {
    const [picked] = pool.splice(rng.int(pool.length), 1);
    if (picked !== undefined) options.push(picked);
  }
  return {
    state: { ...state, rngState: rng.state, mutationOffer: options },
    events: [{ type: "mutationOffered", at, options }],
  };
}

/**
 * Fait monter le joueur de palier tant que les conditions sont remplies,
 * sans jamais dépasser le dernier palier livré.
 */
export function evaluateTier(state: PlayerState, at: number): Step {
  let current = state;
  const events: GameEvent[] = [];
  for (;;) {
    const next = UNLOCKS[current.tier + 1];
    if (next === undefined || next.tier > MAX_RELEASED_TIER) break;
    if (!conditionMet(current, next, at)) break;
    // Un nouveau palier remplit la jauge : le joueur peut essayer tout de suite la nouveauté.
    current = { ...current, tier: next.tier, energy: BALANCE.energy.max, energyAt: at };
    events.push({ type: "tierReached", at, tier: next.tier });
    if (next.tier === BALANCE.mutationOffer.tier) {
      const offer = drawMutationOffer(current, at);
      current = offer.state;
      events.push(...offer.events);
    }
  }
  return { state: current, events };
}
