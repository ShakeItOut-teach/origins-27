import {
  capacity,
  partySize,
  placeOffer,
  preyOffer,
  strikeChance,
  unattendedChance,
  visiblePlaces,
  visiblePrey,
  winChance,
} from "@o27/core";
import type { Place, PlayerState, Prey } from "@o27/core";
import { BALANCE, PLACE_RESOURCE, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, TextKey, TroopId } from "@o27/data";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MapCanvas } from "../cell/MapCanvas";
import type { MapScene } from "../cell/MapCanvas";
import { filamentReach, layoutSpots } from "../game/mapLayout";
import { formatAmount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { EnergyIcon, PreyIcon, ResourceIcon, TroopIcon } from "./icons";

interface Props {
  /** La goutte reste en place quand on regarde la cellule : elle est seulement cachée. */
  readonly hidden: boolean;
  readonly state: PlayerState;
  readonly hue: number;
  readonly lang: Lang;
  /** Les proies n'existent pas avant le palier de la chasse. */
  readonly showPrey: boolean;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

type Spot =
  | { readonly type: "place"; readonly place: Place; x: number; y: number; band: number }
  | { readonly type: "prey"; readonly prey: Prey; x: number; y: number; band: number };

function idOf(spot: Spot): string {
  return spot.type === "place" ? spot.place.id : spot.prey.id;
}

/** La goutte : la cellule au centre, les lieux et les proies autour. */
export function MapView({ hidden, state, hue, lang, showPrey, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [selected, setSelected] = useState<string | null>(null);
  const placed = useMemo(() => {
    const spots: Spot[] = visiblePlaces(state.worldSeed, state.slot).map((place) => ({
      type: "place",
      place,
      x: place.x,
      y: place.y,
      band: place.band,
    }));
    if (showPrey) {
      for (const prey of visiblePrey(state.worldSeed, state.slot)) {
        spots.push({ type: "prey", prey, x: prey.x, y: prey.y, band: prey.band });
      }
    }
    return layoutSpots(spots);
  }, [state.worldSeed, state.slot, showPrey]);

  const trip = state.expedition;
  const hunt = state.hunt;
  const speedup = BALANCE.expedition.cancelSpeedup;
  const filaments: MapScene["filaments"][number][] = [];
  const tripTarget = placed.find((entry) => idOf(entry.item) === trip?.place);
  if (trip !== null && tripTarget?.item.type === "place") {
    // Rappelée, l'expédition a une nouvelle heure de retour : on se repère sur son départ.
    const arrivesAt = trip.startedAt + placeOffer(tripTarget.item.place).durationMs / 2;
    filaments.push({
      x: tripTarget.x,
      y: tripTarget.y,
      reach: filamentReach({ ...trip, arrivesAt, leavesAt: arrivesAt }, speedup, state.now),
      loaded: !trip.cancelled && state.now > arrivesAt,
      group: false,
    });
  }
  const huntTarget = placed.find((entry) => idOf(entry.item) === hunt?.prey);
  if (hunt !== null && huntTarget !== undefined) {
    filaments.push({
      x: huntTarget.x,
      y: huntTarget.y,
      reach: filamentReach({ ...hunt, leavesAt: hunt.resolveAt }, speedup, state.now),
      loaded: hunt.outcome?.won === true && state.now > hunt.resolveAt,
      group: true,
    });
  }

  const scene: MapScene = {
    seed: state.seed,
    hue,
    places: placed.map((entry) => ({
      x: entry.x,
      y: entry.y,
      tone:
        entry.item.type === "prey"
          ? "prey"
          : entry.item.place.kind === "debris"
            ? "bricks"
            : "sugar",
      resting: (state.placeReadyAt[idOf(entry.item)] ?? 0) > state.now,
    })),
    filaments,
  };

  const open = placed.find((entry) => idOf(entry.item) === selected)?.item ?? null;
  const fightingAt =
    hunt !== null && !hunt.cancelled && hunt.outcome === null && state.now >= hunt.arrivesAt
      ? hunt.prey
      : null;
  const close = (): void => {
    setSelected(null);
  };
  const act = (order: Order): void => {
    if (onOrder(order)) setSelected(null);
  };

  return (
    <>
      <section className="lens" data-testid="map" aria-label={t("label.map")} hidden={hidden}>
        <MapCanvas scene={scene} />
        {placed.map(({ item, x, y }) => {
          const id = idOf(item);
          const restingFor = (state.placeReadyAt[id] ?? 0) - state.now;
          let returnsAt: number | null = null;
          if (trip !== null && trip.place === id) returnsAt = trip.returnsAt;
          if (hunt !== null && hunt.prey === id) returnsAt = hunt.returnsAt;
          const kind = item.type === "place" ? item.place.kind : `prey-${item.prey.kind}`;
          const name: TextKey =
            item.type === "place" ? `place.${item.place.kind}.name` : `prey.${item.prey.kind}.name`;
          return (
            <button
              key={id}
              type="button"
              className={`place place-${kind}${item.type === "prey" ? " place-prey" : ""}${restingFor > 0 ? " is-resting" : ""}${returnsAt !== null ? " is-target" : ""}${fightingAt === id ? " is-fighting" : ""}`}
              style={{ left: `${String(x * 100)}%`, top: `${String(y * 100)}%` }}
              aria-label={t(name)}
              data-testid={`${item.type}-${id}`}
              data-band={item.band}
              onClick={() => {
                setSelected(id);
              }}
            >
              {item.type === "place" ? (
                <ResourceIcon id={PLACE_RESOURCE[item.place.kind]} />
              ) : (
                <PreyIcon kind={item.prey.kind} />
              )}
              {returnsAt !== null && (
                <span className="slot-timer">{formatDuration(returnsAt - state.now)}</span>
              )}
              {returnsAt === null && restingFor > 0 && (
                <span className="slot-timer">{formatDuration(restingFor)}</span>
              )}
            </button>
          );
        })}
      </section>

      {open !== null && !hidden && open.type === "place" && (
        <PlaceSheet state={state} place={open.place} lang={lang} onClose={close} onOrder={act} />
      )}
      {open !== null && !hidden && open.type === "prey" && (
        <PreySheet state={state} prey={open.prey} lang={lang} onClose={close} onOrder={act} />
      )}
    </>
  );
}

interface SheetProps {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
  readonly onOrder: (order: Order) => void;
}

function SheetFrame(props: {
  readonly title: string;
  readonly testId: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="veil veil-bottom" onClick={props.onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        data-testid={props.testId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>{props.title}</h2>
          </div>
          <button
            type="button"
            className="close"
            aria-label={props.closeLabel}
            onClick={props.onClose}
          >
            ×
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

/** Fiche d'un lieu : un gain, une durée, un coût, un bouton. */
function PlaceSheet({ state, place, lang, onClose, onOrder }: SheetProps & { place: Place }) {
  const t = (key: TextKey): string => translate(lang, key);
  const offer = placeOffer(place);
  const trip = state.expedition;
  const mine = trip !== null && trip.place === place.id ? trip : null;
  const restingFor = (state.placeReadyAt[place.id] ?? 0) - state.now;
  const room = capacity(state, offer.resource) - state.resources[offer.resource];

  let blocked: string | null = null;
  if (trip !== null && mine === null) blocked = t("state.oneAtATime");
  else if (restingFor > 0) blocked = `${t("state.resting")} · ${formatDuration(restingFor)}`;
  else if (state.energy < offer.energy) blocked = t("state.noEnergy");

  return (
    <SheetFrame
      title={t(`place.${place.kind}.name`)}
      testId="place-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <div className="costs">
        <span className="cost cost-gain">
          <ResourceIcon id={offer.resource} />+{formatAmount(offer.loot, lang)}
        </span>
        <span className="cost cost-time">{formatDuration(offer.durationMs)}</span>
        <span className={`cost${state.energy < offer.energy ? " is-missing" : ""}`}>
          <EnergyIcon />
          {offer.energy}
        </span>
      </div>

      {mine !== null ? (
        <>
          <p className="sheet-building" data-testid="place-status">
            {mine.cancelled ? t("state.returning") : t("state.away")} ·{" "}
            {formatDuration(mine.returnsAt - state.now)}
          </p>
          {!mine.cancelled && (
            <button
              type="button"
              className="button button-quiet"
              data-testid="place-cancel"
              onClick={() => {
                onOrder({ type: "cancelExpedition" });
              }}
            >
              {t("action.cancelExpedition")}
            </button>
          )}
        </>
      ) : (
        <>
          {blocked !== null && (
            <p className="sheet-building" data-testid="place-status">
              {blocked}
            </p>
          )}
          {blocked === null && room < offer.loot && (
            <p className="sheet-building" data-testid="place-warning">
              {t("state.overflow")}
            </p>
          )}
          <button
            type="button"
            className="button"
            disabled={blocked !== null}
            data-testid="place-send"
            onClick={() => {
              onOrder({ type: "sendExpedition", place: place.id });
            }}
          >
            {t("action.send")}
          </button>
        </>
      )}
    </SheetFrame>
  );
}

/** Fiche d'une proie : son point faible, le groupe à envoyer, les chances, un bouton. */
function PreySheet({ state, prey, lang, onClose, onOrder }: SheetProps & { prey: Prey }) {
  const t = (key: TextKey): string => translate(lang, key);
  const offer = preyOffer(prey);
  const hunt = state.hunt;
  const mine = hunt !== null && hunt.prey === prey.id ? hunt : null;
  const restingFor = (state.placeReadyAt[prey.id] ?? 0) - state.now;
  const weakness = TROOP_IDS.find((id) => STRONG_AGAINST[id] === prey.kind) ?? "hunter";
  // Par défaut, tout le monde part. Le joueur peut en garder à la maison.
  const [kept, setKept] = useState<Record<TroopId, number>>({ hunter: 0, armored: 0, swift: 0 });
  const party: Record<TroopId, number> = {
    hunter: Math.max(0, state.troops.hunter - kept.hunter),
    armored: Math.max(0, state.troops.armored - kept.armored),
    swift: Math.max(0, state.troops.swift - kept.swift),
  };
  const chance = winChance(party, prey.kind, offer.power);
  const sure = partySize(party) > 0 && strikeChance(chance) === 100;

  let blocked: string | null = null;
  if (hunt !== null && mine === null) blocked = t("state.oneHunt");
  else if (restingFor > 0) blocked = `${t("state.resting")} · ${formatDuration(restingFor)}`;
  else if (partySize(state.troops) === 0) blocked = t("state.noTroops");
  else if (state.energy < offer.energy) blocked = t("state.noEnergy");

  const undecided = mine !== null && !mine.cancelled && mine.outcome === null;
  const face = undecided && state.now >= mine.arrivesAt;

  return (
    <SheetFrame
      title={t(`prey.${prey.kind}.name`)}
      testId="prey-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
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
              onOrder({ type: "sendHunt", prey: prey.id, party });
            }}
          >
            {t("action.hunt")}
          </button>
        </>
      )}
    </SheetFrame>
  );
}
