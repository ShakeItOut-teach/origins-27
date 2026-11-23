/** Ce que le joueur a le droit de voir, d'après la table de déblocage. */
import { UNLOCKS } from "@o27/data";
import type { UiElementId } from "@o27/data";

const ELEMENT_TIER = new Map<UiElementId, number>(
  UNLOCKS.flatMap((unlock) => unlock.ui.map((element) => [element, unlock.tier] as const)),
);

/** Vrai si l'élément existe pour un joueur de ce palier. Sinon il ne doit pas être affiché du tout. */
export function isVisible(element: UiElementId, tier: number): boolean {
  return (ELEMENT_TIER.get(element) ?? Number.POSITIVE_INFINITY) <= tier;
}

/** Tous les éléments visibles à un palier donné. */
export function visibleElements(tier: number): UiElementId[] {
  return UNLOCKS.filter((unlock) => unlock.tier <= tier).flatMap((unlock) => unlock.ui);
}
