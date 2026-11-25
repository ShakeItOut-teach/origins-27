import { drillMaxLevel, drillOffer } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, DRILL_IDS, RESOURCE_IDS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { formatAmount, translate } from "../game/text";
import type { Lang } from "../game/text";
import { MissingHint } from "./MissingHint";
import { StorageHint } from "./StorageHint";
import { ResourceIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onOrder: (order: Order) => void;
  readonly onOpenStore: () => void;
}

/**
 * La recherche militaire : de petits pouvoirs pour toutes les cellules filles. Chaque niveau
 * coûte le double du précédent ; sous un prix trop cher, on dit ce qui manque.
 */
export function DrillPanel({ state, lang, onOrder, onOpenStore }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  return (
    <section className="drills" data-testid="drills">
      <p className="sheet-role">{t("drills.text")}</p>
      {DRILL_IDS.map((id) => {
        const offer = drillOffer(state, id);
        const power = BALANCE.drills.powers[id];
        const level = state.drills[id];
        const percent = power.percentPerLevel * level;
        const next = power.percentPerLevel * (level + 1);
        const poor = RESOURCE_IDS.some((key) => state.resources[key] < offer.cost[key]);
        const show = (value: number): string =>
          `${value > 0 ? "+" : "−"}${String(Math.abs(value))} %`;
        return (
          <div key={id} className="tech-row" data-testid={`drill-${id}`} data-level={level}>
            <div className="tech-head">
              <strong>{t(`drill.${id}.name`)}</strong>
              <span className="tech-level">
                {t("label.level")} {level} / {drillMaxLevel()}
              </span>
            </div>
            <p className="tech-effect">
              {t(`stat.${power.stat}` as TextKey)} {level > 0 && show(percent)}
              {level > 0 && offer.blocked === null && " → "}
              {offer.blocked === null && show(next)}
            </p>
            {offer.blocked === null && (
              <StorageHint state={state} cost={offer.cost} lang={lang} onOpenStore={onOpenStore} />
            )}
            {offer.blocked === null && <MissingHint state={state} cost={offer.cost} lang={lang} />}
            {offer.blocked === null && (
              <div className="tech-act">
                <span className="costs">
                  {RESOURCE_IDS.map((key) => (
                    <span
                      key={key}
                      className={`cost${state.resources[key] < offer.cost[key] ? " is-missing" : ""}`}
                    >
                      <ResourceIcon id={key} />
                      {formatAmount(offer.cost[key], lang)}
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  className="button button-small"
                  disabled={poor}
                  data-testid={`drill-buy-${id}`}
                  onClick={() => {
                    onOrder({ type: "drill", power: id });
                  }}
                >
                  {t("action.drill")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
