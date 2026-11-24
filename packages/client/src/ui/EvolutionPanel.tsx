import { researchOffer, seasonDraw } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, EVOLUTION_BRANCHES, EVOLUTION_IDS, RESOURCE_IDS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { formatAmount, formatAway, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onOrder: (order: Order) => void;
}

/**
 * Dans le Noyau : les évolutions de la saison, branche par branche. On en exprime une à la
 * fois. Celles que la saison a endormies sont montrées, pour que le joueur sache ce qu'il
 * n'aura pas cette fois-ci.
 */
export function EvolutionPanel({ state, lang, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const draw = seasonDraw(state.worldSeed);
  const running = state.research;
  const max = BALANCE.research.maxLevel;

  return (
    <div className="evolutions" data-testid="evolutions">
      <p className="sheet-role">{t("label.seasonDraw")}</p>
      {running !== null && (
        <p className="sheet-building" data-testid="research">
          {t("state.expressing")} · {t(`evolution.${running.evolution}.name`)}{" "}
          {t("label.level").toLowerCase()} {running.toLevel} ·{" "}
          {formatDuration(running.endsAt - state.now)}
        </p>
      )}
      {running !== null && state.boosts > 0 && (
        <button
          type="button"
          className="button button-small button-quiet"
          data-testid="boost-research"
          onClick={() => {
            onOrder({ type: "useBoost", target: "research" });
          }}
        >
          {t("action.boost").replace("{t}", formatAway(BALANCE.boost.minutes * 60_000, lang))} ·{" "}
          {t("boost.left").replace("{n}", String(state.boosts))}
        </button>
      )}
      {EVOLUTION_BRANCHES.map((branch) => (
        <section key={branch} className="branch" data-testid={`branch-${branch}`}>
          <h3>{t(`branch.${branch}`)}</h3>
          {EVOLUTION_IDS.filter((id) => BALANCE.evolutions[id].branch === branch).map((id) => {
            const data = BALANCE.evolutions[id];
            const level = state.evolutions[id];
            const offer = researchOffer(state, id);
            const dormant = draw.dormant.includes(id);
            const favoured = draw.favoured.includes(id);
            const percent = Math.trunc(
              (data.percentPerLevel * (favoured ? BALANCE.research.favouredPercent : 100)) / 100,
            );
            const poor = RESOURCE_IDS.some((key) => state.resources[key] < offer.cost[key]);
            let blocked: string | null = null;
            if (offer.blocked === "dormant") blocked = t("state.dormant");
            else if (offer.blocked === "needsNucleus") {
              blocked = t("state.needsNucleus").replace("{n}", String(offer.toLevel));
            }
            return (
              <div
                key={id}
                className={`evolution${dormant ? " is-dormant" : ""}${favoured ? " is-favoured" : ""}`}
                data-testid={`evolution-${id}`}
                data-level={level}
              >
                <p className="evolution-head">
                  <strong>{t(`evolution.${id}.name`)}</strong>
                  <span className="evolution-level">
                    {level} / {max}
                  </span>
                </p>
                <p className="evolution-effect">
                  {t(`stat.${data.stat}` as TextKey)} {percent > 0 ? "+" : "−"}
                  {Math.abs(percent)} % {t("label.perLevel")}
                  {favoured && <span className="badge">{t("label.favoured")}</span>}
                </p>
                {blocked !== null && <p className="evolution-blocked">{blocked}</p>}
                {offer.blocked === null && (
                  <div className="evolution-act">
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
                      <span className="cost cost-time">{formatDuration(offer.durationMs)}</span>
                    </span>
                    <button
                      type="button"
                      className="button button-small"
                      disabled={poor || running !== null}
                      data-testid={`express-${id}`}
                      onClick={() => {
                        onOrder({ type: "research", evolution: id });
                      }}
                    >
                      {t("action.express")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
