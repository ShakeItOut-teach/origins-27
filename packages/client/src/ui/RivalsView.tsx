import {
  MICRO,
  defensePower,
  foePower,
  isAlly,
  partyOf,
  depthAt,
  nearRivals,
  isNewcomer,
  protectedUntil,
  partySize,
  raidForce,
  raidOffer,
  raidWins,
} from "@o27/core";
import type { PlayerState, Rival } from "@o27/core";
import { BALANCE, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, TextKey, TroopId } from "@o27/data";
import { useState } from "react";
import { formatAmount, formatAway, formatDepth, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { bannerTag } from "./AllianceSheet";
import { EnergyIcon, ResourceIcon, TroopIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

/** Sans espionnage, on ne connaît la garde d'un rival qu'à peu près. */
function guardRange(guard: number): { low: number; high: number } {
  return { low: Math.max(1, Math.floor(guard * 0.7)), high: Math.ceil(guard * 1.3) };
}

/** Les rivaux : six voisins à espionner et à attaquer, et l'état de sa propre défense. */
export function RivalsView({ state, lang, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [selected, setSelected] = useState<string | null>(null);
  const rivals = nearRivals(state);
  const raid = state.raid;
  const shieldLeft = protectedUntil(state, state.now) - state.now;
  // L'heure de la nuit est gardée en temps universel ; le joueur la choisit à son heure locale.
  const zone = new Date().getTimezoneOffset();
  const localHour =
    state.nightStart === null
      ? null
      : Math.floor(((((state.nightStart - zone) % 1440) + 1440) % 1440) / 60);
  const [hour, setHour] = useState<number>(localHour ?? 23);
  const nightRest = state.nightReadyAt - state.now;
  const open = rivals.find((rival) => rival.id === selected) ?? null;
  const awayRest = state.awayReadyAt - state.now;

  return (
    <section className="rivals" data-testid="rivals">
      <div className="defense" data-testid="defense">
        <p>
          {t("label.yourDefense")} <strong>{defensePower(state)}</strong>
        </p>
        <p
          className={shieldLeft > 0 || isNewcomer(state) ? "is-safe" : "is-exposed"}
          data-testid="shield"
        >
          {isNewcomer(state)
            ? t("label.newcomer")
            : shieldLeft > 0
              ? `${t("label.shield")} ${formatAway(shieldLeft, lang)}`
              : t("label.nextRaid")}
        </p>
        {awayRest > 0 ? (
          shieldLeft <= 0 && (
            <p className="away-hint" data-testid="away-rest">
              {t("label.awayResting")} {formatAway(awayRest, lang)}
            </p>
          )
        ) : (
          <>
            <button
              type="button"
              className="button button-quiet"
              disabled={raid !== null}
              data-testid="away"
              onClick={() => {
                onOrder({ type: "goAway" });
              }}
            >
              {t("action.away")}
            </button>
            <p className="away-hint">{t("label.awayHint")}</p>
          </>
        )}
        <div className="night" data-testid="night">
          <label htmlFor="night-hour">{t("label.night")}</label>
          {nightRest > 0 ? (
            <strong data-testid="night-hour">
              {localHour === null ? t("label.nightNone") : `${String(localHour)} h`}
            </strong>
          ) : (
            <>
              <select
                id="night-hour"
                value={hour}
                onChange={(event) => {
                  setHour(Number(event.target.value));
                }}
              >
                {Array.from({ length: 24 }, (_, value) => (
                  <option key={value} value={value}>
                    {value} h
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button button-quiet"
                data-testid="night-set"
                onClick={() => {
                  onOrder({
                    type: "setNight",
                    minute: (((hour * 60 + zone) % 1440) + 1440) % 1440,
                  });
                }}
              >
                {t("action.setNight")}
              </button>
            </>
          )}
          <p className="away-hint">
            {nightRest > 0
              ? `${t("label.nightResting")} ${formatAway(nightRest, lang)}`
              : t("label.nightHint")}
          </p>
        </div>
      </div>

      <ul className="rival-list">
        {rivals.map((rival) => {
          const offer = raidOffer(state, rival, state.now);
          const spiedFor = (state.spiedUntil[rival.id] ?? 0) - state.now;
          const closedFor = (state.placeReadyAt[rival.id] ?? 0) - state.now;
          const mine = raid !== null && raid.rival === rival.id ? raid : null;
          const range = guardRange(offer.guard);
          return (
            <li key={rival.id}>
              <button
                type="button"
                className={`rival${closedFor > 0 ? " is-closed" : ""}${mine !== null ? " is-target" : ""}`}
                data-testid={`rival-${rival.id}`}
                onClick={() => {
                  setSelected(rival.id);
                }}
              >
                <span
                  className="rival-dot"
                  style={{ background: `hsl(${String(rival.hue)} 50% 45%)` }}
                  aria-hidden="true"
                />
                <span className="rival-name">
                  {rival.name}
                  {rival.human && (
                    <span className="human-tag" data-testid="human-tag">
                      {t("label.human")}
                    </span>
                  )}
                </span>
                <span className="rival-guard">
                  {t("label.guard")}{" "}
                  <strong>
                    {spiedFor > 0 ? offer.guard : `${String(range.low)}–${String(range.high)}`}
                  </strong>
                </span>
                <span className="rival-state">
                  {mine !== null
                    ? formatDuration(mine.returnsAt - state.now)
                    : closedFor > 0
                      ? `${t("state.rivalClosed")} ${formatAway(closedFor, lang)}`
                      : spiedFor > 0
                        ? `${t("state.spied")} ${formatAway(spiedFor, lang)}`
                        : formatDuration(offer.durationMs)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null && (
        <RivalSheet
          state={state}
          rival={open}
          lang={lang}
          onClose={() => {
            setSelected(null);
          }}
          onOrder={onOrder}
        />
      )}
    </section>
  );
}

interface SheetProps extends Props {
  readonly rival: Rival;
  readonly onClose: () => void;
}

/** Fiche d'un rival : ce qu'on sait de lui, espionner, choisir son groupe, attaquer. */
export function RivalSheet({ state, rival, lang, onClose, onOrder }: SheetProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const offer = raidOffer(state, rival, state.now);
  const spied = (state.spiedUntil[rival.id] ?? 0) > state.now;
  const closedFor = (state.placeReadyAt[rival.id] ?? 0) - state.now;
  const raid = state.raid;
  const mine = raid !== null && raid.rival === rival.id ? raid : null;
  const weakness = TROOP_IDS.find((id) => STRONG_AGAINST[id] === rival.kind) ?? "hunter";
  const range = guardRange(offer.guard);
  const [kept, setKept] = useState<Record<TroopId, number>>(() => partyOf());
  const party = partyOf();
  for (const id of TROOP_IDS) party[id] = Math.max(0, state.troops[id] - kept[id]);
  // Pas de hasard : la plus forte gagne. Attraper la bulle renforce l'attaque.
  const foe = foePower(state, offer.guard);
  const away = raidForce(party, rival.kind, false);
  const there = raidForce(party, rival.kind, true);
  const verdict = (force: number): string =>
    `${t(raidWins(force, foe) ? "label.raidWins" : "label.raidLoses")} (${t("label.forces")
      .replace("{a}", String(force))
      .replace("{b}", String(foe))})`;
  const spy = BALANCE.rivals.spy;

  const ally = isAlly(state, rival);
  // Un allié ou une autre espèce humaine : on ne l'espionne pas et on ne l'attaque pas.
  const peaceful = ally || rival.human;
  let blocked: string | null = null;
  if (rival.human) blocked = t("state.human");
  else if (ally) blocked = t("state.ally");
  else if ((raid !== null && mine === null) || state.hunt !== null) blocked = t("state.oneSortie");
  else if (closedFor > 0) blocked = `${t("state.rivalClosed")} ${formatAway(closedFor, lang)}`;
  else if (partySize(state.troops) === 0) blocked = t("state.noTroops");
  else if (state.energy < offer.energy) blocked = t("state.noEnergy");

  const undecided = mine !== null && !mine.cancelled && mine.outcome === null;
  const face = undecided && state.now >= mine.arrivesAt;

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet sheet-tall"
        role="dialog"
        aria-modal="true"
        data-testid="rival-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>
              {state.alliance !== null && rival.banner !== null && (
                <small className="banner-tag">{bannerTag(rival.banner)} </small>
              )}
              {rival.name}
            </h2>
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>

        <div className="costs" hidden={rival.human}>
          <span className="cost">
            {t("label.guard")}{" "}
            {spied
              ? offer.guard
              : t("label.range")
                  .replace("{a}", String(range.low))
                  .replace("{b}", String(range.high))}
          </span>
          <span className="cost cost-time">{formatDuration(offer.durationMs)}</span>
          <span className={`cost${state.energy < offer.energy ? " is-missing" : ""}`}>
            <EnergyIcon />
            {offer.energy}
          </span>
        </div>

        {state.tier >= BALANCE.ocean.tier && (
          <p className="sheet-role" data-testid="rival-zone">
            {t(`zone.${String(rival.zone)}.name` as TextKey)} ·{" "}
            {t("label.depth").replace("{n}", formatDepth(depthAt(rival.x, rival.y), lang))}
          </p>
        )}

        {ally && (
          <p className="sheet-level" data-testid="rival-ally">
            <span className="badge">{t("label.ally")}</span>
          </p>
        )}
        {rival.human && (
          <p className="sheet-level" data-testid="rival-human">
            <span className="human-tag">{t("label.human")}</span>
          </p>
        )}
        {offer.weakened && !peaceful && (
          <p className="sheet-building is-warning" data-testid="rival-weakened">
            {t("state.weakened")}
          </p>
        )}

        {peaceful ? null : spied ? (
          <>
            <p className="sheet-role weakness">
              {t("label.weakness")} : <TroopIcon id={weakness} />
              <strong>{t(`troop.${weakness}.name`)}</strong>
            </p>
            <p className="costs" data-testid="rival-loot">
              <span className="cost">{t("label.loot")}</span>
              {(["sugar", "bricks", "proteins"] as const).map((id) => (
                <span key={id} className="cost cost-gain">
                  <ResourceIcon id={id} />
                  {formatAmount(offer[id] * MICRO, lang)}
                </span>
              ))}
            </p>
          </>
        ) : (
          <button
            type="button"
            className="button button-quiet"
            disabled={state.energy < spy.energy}
            data-testid="rival-spy"
            onClick={() => {
              onOrder({ type: "spyRival", rival: rival.id });
            }}
          >
            {t("action.spy")} · <EnergyIcon />
            {spy.energy}
          </button>
        )}

        {mine !== null ? (
          <>
            <p className="sheet-building" data-testid="rival-status">
              {face ? t("state.fighting") : undecided ? t("state.away") : t("state.returning")} ·{" "}
              {formatDuration(mine.returnsAt - state.now)}
            </p>
            {face && (
              <button
                type="button"
                className="button button-strike"
                data-testid="rival-strike"
                onClick={() => {
                  onOrder({ type: "strikeRaid" });
                }}
              >
                {t("action.strikeRaid")}
              </button>
            )}
            {undecided && !face && (
              <button
                type="button"
                className="button button-quiet"
                data-testid="rival-cancel"
                onClick={() => {
                  onOrder({ type: "cancelRaid" });
                }}
              >
                {t("action.cancelExpedition")}
              </button>
            )}
          </>
        ) : (
          <>
            {blocked === null && (
              <>
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
                {spied ? (
                  <div className="chance" data-testid="rival-chance">
                    <p>
                      {t("label.raidChance")} : <strong>{verdict(away)}</strong>
                    </p>
                    <p data-testid="rival-chance-there">
                      {t("label.raidChanceThere")} : <strong>{verdict(there)}</strong>
                    </p>
                    <small className="chance-sure">{t("label.strikeBonus")}</small>
                  </div>
                ) : (
                  <p className="sheet-building" data-testid="rival-blind">
                    {t("label.blind")}
                  </p>
                )}
              </>
            )}
            {blocked !== null && (
              <p className="sheet-building" data-testid="rival-status">
                {blocked}
              </p>
            )}
            {blocked === null &&
              (isNewcomer(state) || protectedUntil(state, state.now) > state.now) && (
                <p className="sheet-building is-warning" data-testid="shield-drop">
                  {t("label.shieldDrop")}
                </p>
              )}
            <button
              type="button"
              className="button"
              disabled={blocked !== null || partySize(party) === 0}
              data-testid="rival-raid"
              onClick={() => {
                if (onOrder({ type: "sendRaid", rival: rival.id, party })) onClose();
              }}
            >
              {t("action.raid")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
