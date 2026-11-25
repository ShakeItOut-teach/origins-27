import { capacity, crisisRate, productionRate, upkeepRate } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { RESOURCE_IDS } from "@o27/data";
import type { ResourceId } from "@o27/data";

export interface Shortfall {
  readonly resource: ResourceId;
  /** Ce qu'il manque, en millionièmes d'unité. */
  readonly missing: number;
  /**
   * Le temps que la production mettra à le donner, ou `null` si elle ne le donnera jamais :
   * rien ne produit cette ressource, les troupes mangent tout, ou la réserve est trop petite.
   */
  readonly waitMs: number | null;
}

/** Ce que la cellule gagne vraiment par milliseconde : sa production, moins ce que mangent les troupes. */
export function netRate(state: PlayerState, resource: ResourceId): number {
  const made = crisisRate(state, productionRate(state, resource));
  return resource === "sugar" ? made - upkeepRate(state) : made;
}

/** Ce qui manque pour payer un prix, ressource par ressource. Vide si le joueur peut payer. */
export function shortfalls(
  state: PlayerState,
  cost: Readonly<Record<ResourceId, number>>,
): Shortfall[] {
  return RESOURCE_IDS.filter((id) => cost[id] > state.resources[id]).map((id) => {
    const missing = cost[id] - state.resources[id];
    const rate = netRate(state, id);
    const fits = cost[id] <= capacity(state, id);
    return { resource: id, missing, waitMs: rate > 0 && fits ? Math.ceil(missing / rate) : null };
  });
}
