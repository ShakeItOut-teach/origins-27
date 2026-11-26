import {
  MICRO,
  genesMissing,
  productionRate,
  trainMs,
  troopUnlocked,
  troopsOwned,
  upkeepRate,
} from "@o27/core";
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
  /** Ouvre l’onglet Recherche, à la rubrique des troupes. */
  readonly onResearch: () => void;
  /** Ouvre l’onglet Recherche, à la rubrique des gènes : là où l'on débloque une cellule fille. */
  readonly onGenes: () => void;
}

/** On fait naître les cellules filles une par une, ou par dix. */
const BATCHES = [1, 10] as const;

/**
 * Dans le Centrosome : les cellules filles qu'on a, ce qu'elles coûtent à nourrir, et de quoi
 * en faire naître. Leur nombre n'a pas de plafond : c'est l'entretien qui le limite.
 * Les cellules de rang 2 n'apparaissent qu'à leur palier ; chacune demande ses gènes.
 * Leurs pouvoirs se cherchent dans l'onglet Recherche : un lien y mène.
 * Une cellule fille pas encore ouverte dit ce qui manque, comment l'obtenir, et y mène.
 */
export function TroopPanel({ state, lang, onOrder, onResearch, onGenes }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const owned = troopsOwned(state);
  const training = state.training;
  const upkeep = upkeepRate(state);
  const starving = upkeep > productionRate(state, "sugar");
  const shown = TROOP_IDS.filter((id) => BALANCE.troops[id].tier <= state.tier);
  // La première cellule fille encore fermée porte l'explication du chemin à suivre.
  const firstLocked = shown.find((id) => !troopUnlocked(state, id));

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
      {shown.map((id) => {
        const data = BALANCE.troops[id];
        const strong = STRONG_AGAINST[id];
        const missing = genesMissing(state, id);
        const locked = !troopUnlocked(state, id);
        const poor = (count: number): boolean =>
          state.resources.sugar < data.cost.sugar * MICRO * count ||
          state.resources.bricks < data.cost.bricks * MICRO * count ||
          state.resources.proteins < data.proteins * MICRO * count;
        return (
          <div
            key={id}
            className={`troop-row${data.family !== null ? " is-rank2" : ""}${locked ? " is-locked" : ""}`}
            data-testid={`troop-row-${id}`}
          >
            <TroopIcon id={id} />
            <span className="troop-name">
              {t(`troop.${id}.name`)}
              {strong !== null && (
                <small>
                  <PreyIcon kind={strong} /> ×2
                </small>
              )}
              {data.family !== null && (
                <small className="troop-role">
                  {locked
                    ? t("state.geneMissing")
                        .replace("{n}", String(missing))
                        .replace("{family}", t(`family.${data.family}.name`))
                    : t(`troop.${id}.role` as TextKey)}
                </small>
              )}
              {data.family !== null && locked && (
                <>
                  {/* L'explication entière une seule fois ; le lien, sous chaque cellule fille. */}
                  {id === firstLocked && (
                    <small className="troop-how" data-testid="troop-how">
                      {t("state.geneHow").replace("{family}", t(`family.${data.family}.name`))}
                    </small>
                  )}
                  <button
                    type="button"
                    className="link-button"
                    data-testid={`troop-genes-${id}`}
                    onClick={onGenes}
                  >
                    {t("research.seeGenes")} →
                  </button>
                </>
              )}
            </span>
            <span className="troop-count" data-testid={`troop-${id}`}>
              {state.troops[id]}
            </span>
            <span className={`cost${poor(1) ? " is-missing" : ""}`}>
              <ResourceIcon id="sugar" />
              {formatAmount(data.cost.sugar * MICRO, lang)}
              {data.cost.bricks > 0 && (
                <>
                  <ResourceIcon id="bricks" />
                  {formatAmount(data.cost.bricks * MICRO, lang)}
                </>
              )}
              {data.proteins > 0 && (
                <>
                  <ResourceIcon id="proteins" />
                  {formatAmount(data.proteins * MICRO, lang)}
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
                  disabled={locked || poor(count) || training !== null}
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
      {state.tier >= BALANCE.drills.tier && (
        <button
          type="button"
          className="link-button"
          data-testid="troops-research"
          onClick={onResearch}
        >
          {t("research.seeDrills")} →
        </button>
      )}
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
