import { capacity, placeOffer, preyOffer, visiblePlaces, visiblePrey } from "@o27/core";
import type { Place, PlayerState, Prey } from "@o27/core";
import { BALANCE, PLACE_RESOURCE, UNLOCKS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { useMemo, useState } from "react";
import { MapCanvas } from "../cell/MapCanvas";
import type { MapScene } from "../cell/MapCanvas";
import { filamentReach, layoutSpots } from "../game/mapLayout";
import { formatAmount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { EnergyIcon, PreyIcon, ResourceIcon } from "./icons";
import { PreySheet } from "./PreySheet";
import { SheetFrame } from "./SheetFrame";
import { WorldView } from "./WorldView";

interface Props {
  /** La goutte reste en place quand on regarde la cellule : elle est seulement cachée. */
  readonly hidden: boolean;
  readonly state: PlayerState;
  readonly hue: number;
  readonly lang: Lang;
  /** Les proies n'existent pas avant le palier de la chasse. */
  readonly showPrey: boolean;
  /** L'océan n'existe pas avant son palier. */
  readonly showWorld: boolean;
  /** Les prédateurs de l'océan non plus. */
  readonly showPredators: boolean;
  /** Ni les événements de zone. */
  readonly showEvents: boolean;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

type Spot =
  | { readonly type: "place"; readonly place: Place; x: number; y: number; band: number }
  | { readonly type: "prey"; readonly prey: Prey; x: number; y: number; band: number };

function idOf(spot: Spot): string {
  return spot.type === "place" ? spot.place.id : spot.prey.id;
}

/** Palier où la récolte automatique s'ouvre : celui de son ordre dans la table de déblocage. */
const AUTO_TIER = UNLOCKS.find((unlock) => unlock.orders.includes("setAutoHarvest"))?.tier ?? 4;

/** La goutte : la cellule au centre, les lieux et les proies autour. */
export function MapView(props: Props) {
  const { hidden, state, hue, lang, showPrey, showWorld, showPredators, showEvents, onOrder } =
    props;
  const t = (key: TextKey): string => translate(lang, key);
  // Reculé, le joueur voit la goutte entière ; sinon, les alentours de sa cellule.
  const [far, setFar] = useState(false);
  const world = far && showWorld;
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
      {world && !hidden && (
        <WorldView
          state={state}
          hue={hue}
          lang={lang}
          showPredators={showPredators}
          showEvents={showEvents}
          onBack={() => {
            setFar(false);
          }}
          onOrder={onOrder}
        />
      )}
      <section
        className="lens"
        data-testid="map"
        aria-label={t("label.map")}
        hidden={hidden || world}
      >
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
        {state.tier >= AUTO_TIER && (
          <button
            type="button"
            className={`lens-pill lens-pill-right${state.autoHarvest ? " is-on" : ""}`}
            aria-pressed={state.autoHarvest}
            title={t("autoHarvest.text")}
            data-testid="auto-harvest"
            onClick={() => {
              onOrder({ type: "setAutoHarvest", on: !state.autoHarvest });
            }}
          >
            {t("label.autoHarvest")} : {state.autoHarvest ? t("state.on") : t("state.off")}
          </button>
        )}
        {showWorld && (
          <button
            type="button"
            className="lens-pill"
            data-testid="world-open"
            onClick={() => {
              setFar(true);
            }}
          >
            {t("action.world")}
          </button>
        )}
      </section>
      {state.tier >= AUTO_TIER && !hidden && !world && (
        <p className="auto-hint" data-testid="auto-hint">
          {t("autoHarvest.text")}
        </p>
      )}

      {open !== null && !hidden && !world && open.type === "place" && (
        <PlaceSheet state={state} place={open.place} lang={lang} onClose={close} onOrder={act} />
      )}
      {open !== null && !hidden && !world && open.type === "prey" && (
        <PreySheet
          state={state}
          lang={lang}
          target={open.prey}
          offer={preyOffer(open.prey)}
          title={t(`prey.${open.prey.kind}.name`)}
          order={(party) => ({ type: "sendHunt", prey: open.prey.id, party })}
          onClose={close}
          onOrder={act}
        />
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
