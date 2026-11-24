import { foePower, partyOf, partySize, strikeChance, unattendedChance, winChance } from "@o27/core";
import type { PlayerState, PreyOffer } from "@o27/core";
import { STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, PreyKind, TextKey, TroopId } from "@o27/data";
import { useState } from "react";
import { formatAmount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { EnergyIcon, ResourceIcon, TroopIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  /** Ce que l'on chasse : une proie de la goutte ou un prédateur de l'océan. */
  readonly target: { readonly id: string; readonly kind: PreyKind };
  readonly offer: PreyOffer;
  readonly title: string;
  /** Une phrase de présentation, s'il y en a une. */
  readonly note?: string;
  /** Une raison de refuser propre à cette cible (trop haute, par exemple). */
  readonly closed?: string | null;
  /** L'ordre à envoyer pour partir avec ce groupe. */
  readonly order: (party: Readonly<Record<TroopId, number>>) => Order;
  readonly onClose: () => void;
  readonly onOrder: (order: Order) => void;
}

/** Fiche d'une chasse : le point faible, le groupe à envoyer, les chances, un bouton. */
export function PreySheet(props: Props) {
  const { state, lang, target, offer, onClose, onOrder } = props;
  const t = (key: TextKey): string => translate(lang, key);
  const hunt = state.hunt;
  const mine = hunt !== null && hunt.prey === target.id ? hunt : null;
  const restingFor = (state.placeReadyAt[target.id] ?? 0) - state.now;
  const weakness = TROOP_IDS.find((id) => STRONG_AGAINST[id] === target.kind) ?? "hunter";
  // Par défaut, tout le monde part. Le joueur peut en garder à la maison.
  const [kept, setKept] = useState<Record<TroopId, number>>(() => partyOf());
  const party = partyOf();
  for (const id of TROOP_IDS) party[id] = Math.max(0, state.troops[id] - kept[id]);
  // Les bonus d'attaque du joueur affaiblissent ce qu'il affronte.
  const chance = winChance(party, target.kind, foePower(state, offer.power));
  const sure = partySize(party) > 0 && strikeChance(chance) === 100;

  let blocked: string | null = null;
  if (props.closed !== undefined && props.closed !== null) blocked = props.closed;
  else if ((hunt !== null && mine === null) || state.raid !== null) blocked = t("state.oneHunt");
  else if (restingFor > 0) blocked = `${t("state.resting")} · ${formatDuration(restingFor)}`;
  else if (partySize(state.troops) === 0) blocked = t("state.noTroops");
  else if (state.energy < offer.energy) blocked = t("state.noEnergy");

  const undecided = mine !== null && !mine.cancelled && mine.outcome === null;
  const face = undecided && state.now >= mine.arrivesAt;

  return (
    <SheetFrame
      title={props.title}
      testId="prey-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      {props.note !== undefined && <p className="sheet-role">{props.note}</p>}
      <div className="costs">
        <span className="cost cost-gain">
          <ResourceIcon id="proteins" />+{formatAmount(offer.proteins, lang)}
        </span>
        <span className="cost cost-time">{formatDuration(offer.durationMs)}</span>
        <span className={`cost${state.energy < offer.energy ? " is-missing" : ""}`}>
          <EnergyIcon />
          {offer.energy}
        </span>
      </div>
      <p className="sheet-role weakness">
        {t("label.weakness")} : <TroopIcon id={weakness} />
        <strong>{t(`troop.${weakness}.name`)}</strong>
      </p>

      {mine !== null ? (
        <>
          <p className="sheet-building" data-testid="prey-status">
            {face ? t("state.fighting") : undecided ? t("state.away") : t("state.returning")} ·{" "}
            {formatDuration(mine.returnsAt - state.now)}
          </p>
          {face && (
            <button
              type="button"
              className="button button-strike"
              data-testid="prey-strike"
              onClick={() => {
                onOrder({ type: "strikeHunt" });
              }}
            >
              {t("action.strike")}
            </button>
          )}
          {undecided && !face && (
            <button
              type="button"
              className="button button-quiet"
              data-testid="prey-cancel"
              onClick={() => {
                onOrder({ type: "cancelHunt" });
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
                    <span className="party-count" data-testid={`party-${id}`}>
                      {party[id]}
                    </span>
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
              <p className="chance" data-testid="prey-chance">
                {t("label.chance")} : <strong>{unattendedChance(chance)} %</strong>
                {sure && <span className="chance-sure"> · {t("label.sureIfStruck")}</span>}
              </p>
            </>
          )}
          {blocked !== null && (
            <p className="sheet-building" data-testid="prey-status">
              {blocked}
            </p>
          )}
          <button
            type="button"
            className="button"
            disabled={blocked !== null || partySize(party) === 0}
            data-testid="prey-send"
            onClick={() => {
              onOrder(props.order(party));
            }}
          >
            {t("action.hunt")}
          </button>
        </>
      )}
    </SheetFrame>
  );
}
