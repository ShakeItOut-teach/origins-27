import { MICRO, troopCapacity, troopsOwned } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { formatAmount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { PreyIcon, ResourceIcon, TroopIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onOrder: (order: Order) => void;
}

/** Dans la Pouponnière : les cellules filles qu'on a, et un bouton pour en faire naître. */
export function TroopPanel({ state, lang, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const capacity = troopCapacity(state);
  const owned = troopsOwned(state);
  const training = state.training;

  return (
    <div className="troops" data-testid="troops">
      <p className="troops-head">
        {t("label.troops")}{" "}
        <strong data-testid="troops-count">
          {owned}/{capacity}
        </strong>
      </p>
      {TROOP_IDS.map((id) => {
        const cost = BALANCE.troops[id].cost;
        const poor =
          state.resources.sugar < cost.sugar * MICRO ||
          state.resources.bricks < cost.bricks * MICRO;
        const full = owned >= capacity;
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
            <span className={`cost${poor ? " is-missing" : ""}`}>
              <ResourceIcon id="sugar" />
              {formatAmount(cost.sugar * MICRO, lang)}
              {cost.bricks > 0 && (
                <>
                  <ResourceIcon id="bricks" />
                  {formatAmount(cost.bricks * MICRO, lang)}
                </>
              )}
            </span>
            <button
              type="button"
              className="step"
              aria-label={`${t("action.train")} : ${t(`troop.${id}.name`)}`}
              disabled={poor || full || training !== null}
              data-testid={`train-${id}`}
              onClick={() => {
                onOrder({ type: "trainTroop", troop: id, count: 1 });
              }}
            >
              +
            </button>
          </div>
        );
      })}
      {training !== null && (
        <p className="sheet-building" data-testid="training">
          {t("state.born")} · {t(`troop.${training.troop}.name`)} ·{" "}
          {formatDuration(training.nextAt - state.now)}
        </p>
      )}
      {training === null && owned >= capacity && (
        <p className="sheet-building">{t("state.nurseryFull")}</p>
      )}
    </div>
  );
}
