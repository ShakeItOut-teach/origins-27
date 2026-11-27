/**
 * Les deux fils d'alliance (monde partagé, étape 3) : qui a attaqué qui, qui a espionné qui.
 * Tenus par le jeu, sans texte libre. Une attaque contre un allié y paraît avant d'arriver, et
 * on peut lui envoyer des renforts. Le client ne fait que lire et afficher : le serveur fait foi.
 */
import { escortTrip, partyOf, partySize } from "@o27/core";
import type { Battle, PlayerState } from "@o27/core";
import { TROOP_IDS } from "@o27/data";
import type { Order, TextKey, TroopId } from "@o27/data";
import { useEffect, useState } from "react";
import type { Community, FeedAttack, Feeds } from "../game/community";
import { formatAway, formatCount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import type { BattleReport } from "./JournalSheet";
import { TroopIcon } from "./icons";

/** Les fils sont relus toutes les trente secondes tant qu'ils sont à l'écran. */
const REFRESH_MS = 30_000;

/** Les fils du joueur : `undefined` pendant la lecture, `null` sans serveur. */
export function useFeeds(community: Community | null, active: boolean) {
  const [feeds, setFeeds] = useState<Feeds | null | undefined>(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (community === null) {
      setFeeds(null);
      return;
    }
    let live = true;
    const read = (): void => {
      community.feeds().then(
        (found) => {
          if (live) setFeeds(found);
        },
        () => {
          if (live) setFeeds(null);
        },
      );
    };
    read();
    const timer = setInterval(read, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [community, active, tick]);
  return {
    feeds,
    refresh: () => {
      setTick((value) => value + 1);
    },
  };
}

/** Remplace chaque {clé} d'un texte par sa valeur. */
function fill(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** Le nom d'un camp, ou « vous ». */
function who(lang: Lang, name: string, me: boolean): string {
  return me ? translate(lang, "feed.you") : name;
}

/** La phrase d'une attaque du fil. */
export function attackLine(lang: Lang, attack: FeedAttack, now: number): string {
  const a = who(lang, attack.attackerName, attack.mine);
  const d = who(lang, attack.defenderName, attack.aimed);
  switch (attack.status) {
    case "pending":
      return attack.resolveAt > now
        ? fill(translate(lang, "feed.pending"), {
            a,
            d,
            t: formatDuration(attack.resolveAt - now),
          })
        : fill(translate(lang, "feed.landing"), { a, d });
    case "resolved":
      return fill(
        translate(lang, attack.summary?.attackerWon === true ? "feed.won" : "feed.lost"),
        {
          a,
          d,
        },
      );
    case "bounced":
      return fill(translate(lang, "feed.bounced"), { a, d });
    case "cancelled":
      return fill(translate(lang, "feed.cancelled"), { a, d });
  }
}

/** Le côté du joueur dans ce combat : le sien, ou celui de son banc. */
function sideOf(state: PlayerState, attack: FeedAttack): "attacker" | "defender" {
  if (attack.mine) return "attacker";
  if (attack.aimed || attack.helping) return "defender";
  return state.alliance?.banner === attack.attackerBanner ? "attacker" : "defender";
}

/** Un combat du fil, tel que la page « Rapport de combat » le montre, du côté du joueur. */
export function feedReport(
  state: PlayerState,
  lang: Lang,
  attack: FeedAttack,
  battle: Battle,
): {
  readonly report: BattleReport;
  readonly names?: { readonly attacker: string; readonly defender: string; readonly title: string };
} {
  const side = sideOf(state, attack);
  const won = side === "attacker" ? battle.attackerWon : !battle.attackerWon;
  const other = side === "attacker" ? attack.defenderSlot : attack.attackerSlot;
  const report: BattleReport = {
    at: attack.resolveAt,
    kind: side === "attacker" ? "raid" : "defense",
    won,
    who: `o:${String(other)}`,
    sugar: 0,
    bricks: 0,
    proteins: 0,
    lost: 0,
    troops: 0,
    battle: { ...battle, mine: side },
  };
  // Un combat entre deux autres humains : on dit qui était qui.
  if (attack.mine || attack.aimed) return { report };
  return {
    report,
    names: {
      attacker: attack.attackerName,
      defender: attack.defenderName,
      title: attackLine(lang, attack, state.now),
    },
  };
}

/** Une attaque contre un allié, qu'on peut encore renforcer. */
function defendable(state: PlayerState, attack: FeedAttack): boolean {
  return (
    attack.status === "pending" &&
    !attack.mine &&
    !attack.aimed &&
    attack.resolveAt > state.now &&
    state.alliance !== null &&
    attack.defenderBanner === state.alliance.banner
  );
}

/** Les attaques en route contre le joueur lui-même, pour l'écran des rivaux. */
export function IncomingAttacks({
  state,
  lang,
  feeds,
}: {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly feeds: Feeds | null | undefined;
}) {
  const coming = (feeds?.attacks ?? []).filter(
    (attack) => attack.aimed && attack.status === "pending" && attack.resolveAt > state.now,
  );
  if (coming.length === 0) return null;
  return (
    <ul className="feed-incoming" data-testid="incoming-humans">
      {coming.map((attack) => (
        <li key={attack.id} className="sheet-building is-warning">
          {fill(translate(lang, "versus.incoming"), {
            name: attack.attackerName,
            t: formatDuration(attack.resolveAt - state.now),
          })}
        </li>
      ))}
    </ul>
  );
}

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly feeds: Feeds | null | undefined;
  readonly onRefresh: () => void;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
  readonly onOpenBattle: (opened: ReturnType<typeof feedReport>) => void;
}

/** Les deux fils du banc, et les renforts à envoyer à un allié attaqué. */
export function FeedsPanel({ state, lang, feeds, onRefresh, onOrder, onOpenBattle }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [defending, setDefending] = useState<FeedAttack | null>(null);
  const n = (value: number): string => formatCount(value, lang);

  if (feeds === undefined) {
    return <p className="account-note">{t("feed.loading")}</p>;
  }
  if (feeds === null) {
    return <p className="account-note">{t("feed.offline")}</p>;
  }

  return (
    <div className="feeds" data-testid="feeds">
      <h3 className="sheet-title">{t("feed.attacks")}</h3>
      <p className="account-note">{t("feed.text")}</p>
      {feeds.attacks.length === 0 && <p className="sheet-building">{t("feed.empty")}</p>}
      <ol className="journal" data-testid="feed-attacks">
        {feeds.attacks.map((attack) => {
          const battle = attack.battle;
          const summary = attack.summary;
          return (
            <li
              key={attack.id}
              className={`journal-row is-${attack.status === "pending" ? "defense" : "raid"}`}
              data-testid="feed-attack"
              data-status={attack.status}
            >
              <div className="journal-head">
                <strong>{attackLine(lang, attack, state.now)}</strong>
                {attack.status !== "pending" && (
                  <span className="journal-time">
                    {t("reports.ago").replace(
                      "{t}",
                      formatAway(state.now - attack.resolveAt, lang),
                    )}
                  </span>
                )}
              </div>
              {(attack.helpers.length > 0 || (summary !== null && summary.fought)) && (
                <p className="journal-detail">
                  {summary !== null && summary.fought && (
                    <span>
                      {fill(t("feed.losses"), {
                        a: n(summary.attackerLost),
                        d: n(summary.defenderLost + summary.helpersLost),
                      })}
                    </span>
                  )}
                  {attack.helpers.length > 0 && (
                    <span>{fill(t("feed.helpers"), { names: attack.helpers.join(", ") })}</span>
                  )}
                </p>
              )}
              {battle !== null && (
                <button
                  type="button"
                  className="link-button journal-battle"
                  data-testid="feed-battle"
                  onClick={() => {
                    onOpenBattle(feedReport(state, lang, attack, battle));
                  }}
                >
                  {t("battle.open")}
                </button>
              )}
              {defendable(state, attack) &&
                (attack.helping ? (
                  <p className="sheet-building">{t("feed.helping")}</p>
                ) : (
                  <button
                    type="button"
                    className="button button-quiet"
                    data-testid="feed-defend"
                    onClick={() => {
                      setDefending(attack);
                    }}
                  >
                    {t("feed.defend")}
                  </button>
                ))}
            </li>
          );
        })}
      </ol>

      <h3 className="sheet-title">{t("feed.spies")}</h3>
      {feeds.spies.length === 0 && <p className="sheet-building">{t("feed.empty")}</p>}
      <ol className="journal" data-testid="feed-spies">
        {feeds.spies.map((spy, index) => (
          <li
            key={`${String(spy.at)}-${String(index)}`}
            className={`journal-row ${spy.success ? "is-lost" : "is-won"}`}
            data-testid="feed-spy"
          >
            <div className="journal-head">
              <strong>
                {fill(t(spy.success ? "feed.spySuccess" : "feed.spyFailed"), {
                  a: who(lang, spy.spyName, spy.mine),
                  d: who(lang, spy.targetName, spy.aimed),
                })}
              </strong>
              <span className="journal-time">
                {t("reports.ago").replace("{t}", formatAway(state.now - spy.at, lang))}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {defending !== null && (
        <DefendSheet
          state={state}
          lang={lang}
          attack={defending}
          onClose={() => {
            setDefending(null);
          }}
          onSend={(party) => {
            const sent = onOrder({
              type: "reinforceAlly",
              attack: defending.id,
              slot: defending.defenderSlot,
              party,
            });
            if (sent) {
              setDefending(null);
              onRefresh();
            }
          }}
        />
      )}
    </div>
  );
}

/** Choisir les cellules filles à envoyer défendre un allié. */
function DefendSheet({
  state,
  lang,
  attack,
  onClose,
  onSend,
}: {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly attack: FeedAttack;
  readonly onClose: () => void;
  readonly onSend: (party: Record<TroopId, number>) => void;
}) {
  const t = (key: TextKey): string => translate(lang, key);
  const [kept, setKept] = useState<Record<TroopId, number>>(() => partyOf());
  const party = partyOf();
  for (const id of TROOP_IDS) party[id] = Math.max(0, state.troops[id] - kept[id]);
  const trip = escortTrip(state, attack.defenderSlot);
  const late = trip === null || state.now + trip > attack.resolveAt;
  const blocked = state.escort !== null ? t("feed.busy") : late ? t("feed.tooLate") : null;

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        data-testid="defend-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>{fill(t("feed.defendTitle"), { name: attack.defenderName })}</h2>
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>
        <p className="sheet-role">{t("feed.defendHint")}</p>
        {trip !== null && (
          <p className="sheet-building" data-testid="defend-trip">
            {fill(t("feed.trip"), {
              t: formatDuration(trip),
              c: formatDuration(Math.max(0, attack.resolveAt - state.now)),
            })}
          </p>
        )}
        {blocked === null ? (
          <div className="party" aria-label={t("label.party")}>
            {TROOP_IDS.filter((id) => state.troops[id] > 0).map((id) => (
              <div key={id} className="party-row">
                <TroopIcon id={id} />
                <span className="party-name">{t(`troop.${id}.name`)}</span>
                <button
                  type="button"
                  className="step"
                  aria-label={`${t(`troop.${id}.name`)} −`}
                  disabled={party[id] === 0}
                  onClick={() => {
                    setKept({ ...kept, [id]: kept[id] + 1 });
                  }}
                >
                  −
                </button>
                <span className="party-count">{party[id]}</span>
                <button
                  type="button"
                  className="step"
                  aria-label={`${t(`troop.${id}.name`)} +`}
                  disabled={kept[id] === 0}
                  onClick={() => {
                    setKept({ ...kept, [id]: Math.max(0, kept[id] - 1) });
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="sheet-building is-warning" data-testid="defend-blocked">
            {blocked}
          </p>
        )}
        <button
          type="button"
          className="button"
          disabled={blocked !== null || partySize(party) === 0}
          data-testid="defend-send"
          onClick={() => {
            onSend(party);
          }}
        >
          {t("feed.send")}
        </button>
      </div>
    </div>
  );
}
