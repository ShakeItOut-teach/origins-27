import { capacity } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { RESOURCE_IDS } from "@o27/data";
import type { ResourceId } from "@o27/data";
import { translate } from "../game/text";
import type { Lang } from "../game/text";

interface Props {
  readonly state: PlayerState;
  readonly cost: Readonly<Record<ResourceId, number>>;
  readonly lang: Lang;
  /** Ouvre la fiche de la Vacuole, pour l'améliorer. */
  readonly onOpenStore: () => void;
}

/** Vrai si un prix dépasse ce que la réserve peut contenir : on ne pourra jamais le payer ainsi. */
export function tooBigForStore(
  state: PlayerState,
  cost: Readonly<Record<ResourceId, number>>,
): boolean {
  return RESOURCE_IDS.some((id) => cost[id] > capacity(state, id));
}

/**
 * Quand un prix dépasse la réserve, le joueur est bloqué : on le lui dit, et un bouton
 * l'emmène tout droit à ce qu'il faut améliorer.
 */
export function StorageHint({ state, cost, lang, onOpenStore }: Props) {
  if (!tooBigForStore(state, cost)) return null;
  const store = translate(lang, "organelle.vacuole.name");
  const action = state.organelles.vacuole === 0 ? "sheet.buildStore" : "sheet.openStore";
  return (
    <p className="storage-hint" data-testid="storage-hint">
      <span>{translate(lang, "sheet.tooBig").replace("{o}", store.toLowerCase())}</span>
      <button
        type="button"
        className="link-button"
        data-testid="storage-hint-open"
        onClick={onOpenStore}
      >
        {translate(lang, action).replace("{o}", store)} →
      </button>
    </p>
  );
}
