/**
 * Le chef de la bannière et ses guerres : voter pour un chef parmi les espèces humaines du
 * banc ; le chef déclare la guerre à une autre bannière, ou fait la paix. Les règles sont dans
 * le moteur (`politics.ts`) : l'écran ne fait que montrer et envoyer.
 */
import {
  atWar,
  candidates,
  declaredWar,
  enemiesOf,
  humansBySlot,
  isLeader,
  leaderOf,
  voteOpensAt,
  votesFor,
} from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BANNER_IDS } from "@o27/data";
import type { BannerId, Order, TextKey } from "@o27/data";
import { useState } from "react";
import { formatCountdown, translate } from "../game/text";
import type { Lang } from "../game/text";
import { bannerLabel } from "./AllianceSheet";
import { RelationLegend, RelationMark } from "./RelationMark";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onOrder: (order: Order) => boolean;
}

export function PoliticsPanel({ state, lang, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [confirming, setConfirming] = useState<BannerId | null>(null);
  const mine = state.alliance?.banner;
  if (mine === undefined) return null;
  const opensIn = voteOpensAt(state) - state.now;
  const leader = leaderOf(state, mine);
  const chief = isLeader(state);
  const humans = humansBySlot(state);
  const nameOf = (slot: number): string =>
    slot === state.slot ? t("leader.youName") : (humans.get(slot)?.name ?? "?");
  const enemies = enemiesOf(state, mine);

  return (
    <section className="politics" data-testid="politics">
      <h3 className="sheet-title">{t("leader.title")}</h3>
      <RelationLegend lang={lang} />
      {opensIn > 0 ? (
        <p className="sheet-role" data-testid="leader-closed">
          {t("leader.opens").replace("{t}", formatCountdown(opensIn, lang))}
        </p>
      ) : (
        <>
          <p className="sheet-role" data-testid="leader-now">
            {chief
              ? t("leader.you")
              : leader === null
                ? t("leader.none")
                : t("leader.is").replace("{name}", nameOf(leader))}{" "}
            {t("leader.text")}
          </p>
          <ul className="politics-list" data-testid="leader-candidates">
            {candidates(state).map((slot) => {
              const voted = state.alliance?.vote === slot;
              return (
                <li
                  key={slot}
                  className={`politics-row${slot === leader ? " is-mine" : ""}`}
                  data-testid={`candidate-${String(slot)}`}
                >
                  <span className="politics-name">
                    <RelationMark relation="ally" lang={lang} />
                    {nameOf(slot)}
                    {slot === leader && <span className="badge">{t("leader.badge")}</span>}
                  </span>
                  <span className="politics-votes">
                    {t("leader.votes").replace("{n}", String(votesFor(state, slot)))}
                  </span>
                  {voted ? (
                    <span className="badge">{t("leader.voted")}</span>
                  ) : (
                    <button
                      type="button"
                      className="button button-small button-quiet"
                      data-testid={`vote-${String(slot)}`}
                      onClick={() => {
                        onOrder({ type: "voteLeader", slot });
                      }}
                    >
                      {t("leader.vote")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3 className="sheet-title">{t("war.title")}</h3>
      <p className="sheet-role">{t("war.text")}</p>
      {enemies.length === 0 && <p className="sheet-building">{t("war.none")}</p>}
      {enemies.map((banner) => (
        <p key={banner} className="sheet-building war-line" data-testid={`war-${banner}`}>
          <RelationMark relation="enemy" lang={lang} />
          {t("war.with").replace("{banner}", bannerLabel(lang, banner))}
          {!declaredWar(state, mine, banner) &&
            ` ${t("war.theirs").replace("{banner}", bannerLabel(lang, banner))}`}
        </p>
      ))}
      {chief && (
        <ul className="politics-list" data-testid="war-actions">
          {BANNER_IDS.filter((banner) => banner !== mine).map((banner) => {
            const ours = declaredWar(state, mine, banner);
            const asking = confirming === banner;
            return (
              <li key={banner} className="politics-row">
                <span className="politics-name">{bannerLabel(lang, banner)}</span>
                {!ours && atWar(state, mine, banner) ? (
                  <span className="war-line">{t("war.badge")}</span>
                ) : ours ? (
                  <button
                    type="button"
                    className="button button-small button-quiet"
                    data-testid={`peace-${banner}`}
                    onClick={() => {
                      onOrder({ type: "makePeace", banner });
                    }}
                  >
                    {t("war.peace")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`button button-small${asking ? "" : " button-quiet"}`}
                    data-testid={`declare-${banner}`}
                    onClick={() => {
                      if (!asking) {
                        setConfirming(banner);
                        return;
                      }
                      setConfirming(null);
                      onOrder({ type: "declareWar", banner });
                    }}
                  >
                    {asking ? t("war.confirm") : t("war.declare")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
