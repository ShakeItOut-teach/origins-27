import { capacity, placeOffer, visiblePlaces } from "@o27/core";
import type { Place, PlayerState } from "@o27/core";
import { BALANCE, PLACE_RESOURCE } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { useMemo, useState } from "react";
import { MapCanvas } from "../cell/MapCanvas";
import type { MapScene } from "../cell/MapCanvas";
import { filamentReach, layoutPlaces } from "../game/mapLayout";
import { formatAmount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { EnergyIcon, ResourceIcon } from "./icons";

interface Props {
  /** La goutte reste en place quand on regarde la cellule : elle est seulement cachée. */
  readonly hidden: boolean;
  readonly state: PlayerState;
  readonly hue: number;
  readonly lang: Lang;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

/** La goutte : la cellule au centre, les lieux autour, une expédition à la fois. */
export function MapView({ hidden, state, hue, lang, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [selected, setSelected] = useState<string | null>(null);
  const placed = useMemo(
    () => layoutPlaces(visiblePlaces(state.worldSeed, state.slot)),
    [state.worldSeed, state.slot],
  );
  const trip = state.expedition;
  const target = placed.find((entry) => entry.place.id === trip?.place);

  const scene: MapScene = {
    seed: state.seed,
    hue,
    places: placed.map((entry) => ({
      x: entry.x,
      y: entry.y,
      bricks: entry.place.kind === "debris",
      resting: (state.placeReadyAt[entry.place.id] ?? 0) > state.now,
    })),
    filament:
      trip !== null && target !== undefined
        ? {
            x: target.x,
            y: target.y,
            reach: filamentReach(
              trip,
              placeOffer(target.place).durationMs,
              BALANCE.expedition.cancelSpeedup,
              state.now,
            ),
            returning: !trip.cancelled && state.now - trip.startedAt > trip.returnsAt - state.now,
          }
        : null,
  };

  const open = placed.find((entry) => entry.place.id === selected)?.place ?? null;

  return (
    <>
      <section className="lens" data-testid="map" aria-label={t("label.map")} hidden={hidden}>
        <MapCanvas scene={scene} />
        {placed.map(({ place, x, y }) => {
          const restingFor = (state.placeReadyAt[place.id] ?? 0) - state.now;
          const isTarget = trip?.place === place.id;
          return (
            <button
              key={place.id}
              type="button"
              className={`place place-${place.kind}${restingFor > 0 ? " is-resting" : ""}${isTarget ? " is-target" : ""}`}
              style={{ left: `${String(x * 100)}%`, top: `${String(y * 100)}%` }}
              aria-label={t(`place.${place.kind}.name`)}
              data-testid={`place-${place.id}`}
              data-band={place.band}
              onClick={() => {
                setSelected(place.id);
              }}
            >
              <ResourceIcon id={PLACE_RESOURCE[place.kind]} />
              {isTarget && (
                <span className="slot-timer">{formatDuration(trip.returnsAt - state.now)}</span>
              )}
              {!isTarget && restingFor > 0 && (
                <span className="slot-timer">{formatDuration(restingFor)}</span>
              )}
            </button>
          );
        })}
      </section>

      {open !== null && !hidden && (
        <PlaceSheet
          state={state}
          place={open}
          lang={lang}
          onClose={() => {
            setSelected(null);
          }}
          onOrder={(order) => {
            if (onOrder(order)) setSelected(null);
          }}
        />
      )}
    </>
  );
}

interface SheetProps {
  readonly state: PlayerState;
  readonly place: Place;
  readonly lang: Lang;
  readonly onClose: () => void;
  readonly onOrder: (order: Order) => void;
}

/** Fiche d'un lieu : un gain, une durée, un coût, un bouton. */
function PlaceSheet({ state, place, lang, onClose, onOrder }: SheetProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const offer = placeOffer(place);
  const trip = state.expedition;
  const isTarget = trip?.place === place.id;
  const restingFor = (state.placeReadyAt[place.id] ?? 0) - state.now;
  const room = capacity(state, offer.resource) - state.resources[offer.resource];

  let blocked: string | null = null;
  if (trip !== null && !isTarget) blocked = t("state.oneAtATime");
  else if (restingFor > 0) blocked = `${t("state.resting")} · ${formatDuration(restingFor)}`;
  else if (state.energy < offer.energy) blocked = t("state.noEnergy");

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        data-testid="place-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>{t(`place.${place.kind}.name`)}</h2>
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>

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

        {isTarget ? (
          <>
            <p className="sheet-building" data-testid="place-status">
              {trip.cancelled ? t("state.returning") : t("state.away")} ·{" "}
              {formatDuration(trip.returnsAt - state.now)}
            </p>
            {!trip.cancelled && (
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
      </div>
    </div>
  );
}
