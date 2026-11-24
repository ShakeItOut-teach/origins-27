import { MICRO, productionRate, trainMs, troopsOwned, upkeepRate } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { formatAmount, formatDuration, formatRate, translate } from "../game/text";
import type { Lang } from "../game/text";
import { PreyIcon, ResourceIcon, TroopIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onOrder: (order: Order) => void;
}

/** On fait naître les cellules filles une par une, ou par dix. */
const BATCHES = [1, 10] as const;

/**
 * Dans le Centrosome : les cellules filles qu'on a, ce qu'elles coûtent à nourrir, et de quoi
 * en faire naître. Leur nombre n'a pas de plafond : c'est l'entretien qui le limite.
 */
export function TroopPanel({ state, lang, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const owned = troopsOwned(state);
  const training = state.training;
  const upkeep = upkeepRate(state);
  const starving = upkeep > productionRate(state, "sugar");

  return (
    <div className="troops" data-testid="troops">
      <p className="troops-head">
        {t("label.troops")} <strong data-testid="troops-count">{owned}</strong>
      </p>
      <p className={`upkeep${starving ? " is-starving" : ""}`} data-testid="upkeep">
        {t("label.upkeep")} : <ResourceIcon id="sugar" />
        <strong>−{formatRate(upkeep, lang)}/s</strong>
        <small>{starving ? t("state.starving") : t("label.upkeepText")}</small>
      </p>
      {TROOP_IDS.map((id) => {
        const cost = BALANCE.troops[id].cost;
        const poor = (count: number): boolean =>
          state.resources.sugar < cost.sugar * MICRO * count ||
          state.resources.bricks < cost.bricks * MICRO * count;
        return (
          <div key={id} className="troop-row">
            <TroopIcon id={id} />
            <span className="troop-name">
              {t(`troop.${id}.name`)}
              <small>
                <PreyIcon kind={STRONG_AGAINST[id]} /> ×2
              </small>
            </span>
            <span className="troop-count" data-testid={`troop-${id}`}>
              {state.troops[id]}
            </span>
            <span className={`cost${poor(1) ? " is-missing" : ""}`}>
              <ResourceIcon id="sugar" />
              {formatAmount(cost.sugar * MICRO, lang)}
              {cost.bricks > 0 && (
                <>
                  <ResourceIcon id="bricks" />
                  {formatAmount(cost.bricks * MICRO, lang)}
                </>
              )}
            </span>
            <span className="train-buttons">
              {BATCHES.map((count) => (
                <button
                  key={count}
                  type="button"
                  className="step"
                  aria-label={`${t("action.train")} : ${String(count)} × ${t(`troop.${id}.name`)}`}
                  disabled={poor(count) || training !== null}
                  data-testid={count === 1 ? `train-${id}` : `train-${id}-${String(count)}`}
                  onClick={() => {
                    onOrder({ type: "trainTroop", troop: id, count });
                  }}
                >
                  +{count}
                </button>
              ))}
            </span>
          </div>
        );
      })}
      {training !== null && (
        <p className="sheet-building" data-testid="training">
          {t("state.born")} · {t(`troop.${training.troop}.name`)}
          {training.remaining > 1 ? ` × ${String(training.remaining)}` : ""} ·{" "}
          {formatDuration(
            training.nextAt - state.now + (training.remaining - 1) * trainMs(state, training.troop),
          )}
        </p>
      )}
    </div>
  );
}
