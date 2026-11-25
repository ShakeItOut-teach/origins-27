import { MICRO, capacity, upkeepRate } from "@o27/core";
import type { PlayerState } from "@o27/core";
import type { ResourceId, TextKey } from "@o27/data";
import { shortfalls } from "../game/missing";
import type { Shortfall } from "../game/missing";
import { formatAmount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly cost: Readonly<Record<ResourceId, number>>;
  readonly lang: Lang;
}

/** Pourquoi la production ne donnera pas cette ressource. Rien si la réserve est trop petite. */
function reason(state: PlayerState, lack: Shortfall): TextKey | null {
  if (lack.waitMs !== null) return null;
  // Un prix plus grand que la réserve : la ligne de la Vacuole le dit déjà, avec son bouton.
  if (lack.missing + state.resources[lack.resource] > capacity(state, lack.resource)) return null;
  if (lack.resource === "proteins") return "missing.hunt";
  if (lack.resource === "sugar" && upkeepRate(state) > 0) return "missing.eaten";
  return "missing.idle";
}

/**
 * Sous un prix que le joueur ne peut pas encore payer : ce qui manque, et comment l'avoir.
 * Un bouton grisé ne dit jamais seul pourquoi on ne peut pas.
 */
export function MissingHint({ state, cost, lang }: Props) {
  const lacks = shortfalls(state, cost);
  if (lacks.length === 0) return null;
  const t = (key: TextKey): string => translate(lang, key);
  // On annonce une attente seulement si la production apporte tout ce qui manque.
  const known = lacks.flatMap((lack) => (lack.waitMs === null ? [] : [lack.waitMs]));
  const wait = known.length === lacks.length ? Math.max(...known) : null;
  return (
    <p className="missing-hint" data-testid="missing-hint">
      <span>{t("missing.title")}</span>
      {lacks.map((lack) => {
        const why = reason(state, lack);
        return (
          <span
            key={lack.resource}
            className="missing-item"
            data-testid={`missing-${lack.resource}`}
          >
            <span className="cost is-missing">
              <ResourceIcon id={lack.resource} />
              {formatAmount(Math.ceil(lack.missing / MICRO) * MICRO, lang)}
            </span>
            {why !== null && <small>{t(why)}</small>}
          </span>
        );
      })}
      {wait !== null && (
        <small data-testid="missing-wait">
          {t("missing.wait").replace("{t}", formatDuration(wait))}
        </small>
      )}
    </p>
  );
}
