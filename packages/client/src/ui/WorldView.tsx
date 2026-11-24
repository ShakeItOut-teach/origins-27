import {
  ZONE_COUNT,
  capacity,
  depositLeft,
  depthAt,
  eventCovers,
  findEvent,
  findPredator,
  gatherOffer,
  leviathanBeaten,
  migrateOffer,
  oceanOrganisms,
  oceanPredators,
  oceanRivals,
  playerCell,
  playerDeposit,
  playerDeposits,
  predatorOffer,
  seasonDay,
  visibleEvents,
  zoneOpenDay,
} from "@o27/core";
import type { Deposit, PlayerState } from "@o27/core";
import { BALANCE, RESOURCE_IDS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { OceanCanvas } from "../cell/OceanCanvas";
import type { OceanScene } from "../cell/OceanCanvas";
import { filamentReach } from "../game/mapLayout";
import {
  formatAmount,
  formatAway,
  formatCountdown,
  formatDepth,
  formatDuration,
  translate,
} from "../game/text";
import type { Lang } from "../game/text";
import { labelSpot, panCamera, project, SPAN, TOUCH_SPAN, zoomCamera } from "../game/worldView";
import type { WorldCamera } from "../game/worldView";
import { EventSheet, EventsSheet } from "./EventsSheet";
import { EnergyIcon, ResourceIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";
import { PreySheet } from "./PreySheet";
import { RivalSheet } from "./RivalsView";

interface Props {
  readonly state: PlayerState;
  readonly hue: number;
  readonly lang: Lang;
  /** Les prédateurs n'existent pas avant leur palier. */
  readonly showPredators: boolean;
  /** Les événements de zone non plus. */
  readonly showEvents: boolean;
  /** Revenir à la goutte proche. */
  readonly onBack: () => void;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

const OCEAN = BALANCE.ocean;

/** Le nom d'une zone ; l'indice `ZONE_COUNT` désigne la terre ferme. */
function zoneName(lang: Lang, zone: number): string {
  return translate(lang, `zone.${String(zone)}.name` as TextKey);
}

/** L'océan entier : on le fait glisser, on recule, on touche un organisme ou un gisement. */
export function WorldView(props: Props) {
  const { state, hue, lang, showPredators, showEvents, onBack, onOrder } = props;
  const t = (key: TextKey): string => translate(lang, key);
  const home = useMemo(() => playerCell(state), [state.worldSeed, state.slot, state.zone]);
  const [camera, setCamera] = useState<WorldCamera>({ x: home.x, y: home.y, span: SPAN.start });
  const [selected, setSelected] = useState<string | null>(null);
  const [rising, setRising] = useState(false);
  const [listing, setListing] = useState(false);
  // L'océan occupe tout l'écran : on mesure sa forme pour que les cases restent carrées.
  const frame = useRef<HTMLElement>(null);
  const [aspect, setAspect] = useState(1);
  useLayoutEffect(() => {
    const element = frame.current;
    if (element === null) return;
    const measure = (): void => {
      setAspect(element.clientHeight / Math.max(1, element.clientWidth));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  const day = seasonDay(state, state.now);
  const rivals = oceanRivals(state);
  const deposits = playerDeposits(state, state.now);
  const events = showEvents ? visibleEvents(state) : [];
  const predators = showPredators ? oceanPredators(state.worldSeed, state.now) : [];
  const raid = state.raid;
  const trip = state.expedition;
  const hunt = state.hunt;

  // Les doigts posés sur la carte : un seul fait glisser, deux écartés font reculer.
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const onDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (fingers.current.size === 1) dragged.current = false;
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const before = fingers.current.get(event.pointerId);
    if (before === undefined) return;
    const size = Math.min(event.currentTarget.clientWidth, event.currentTarget.clientHeight);
    const now = { x: event.clientX, y: event.clientY };
    const other = [...fingers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other !== undefined) {
      const was = Math.hypot(before.x - other.x, before.y - other.y);
      const is = Math.hypot(now.x - other.x, now.y - other.y);
      if (was > 0 && is > 0) {
        dragged.current = true;
        setCamera((current) => zoomCamera(current, was / is));
      }
    } else {
      const dx = now.x - before.x;
      const dy = now.y - before.y;
      if (!dragged.current && Math.hypot(dx, dy) < 6) return;
      dragged.current = true;
      setCamera((current) => panCamera(current, dx / size, dy / size));
    }
    fingers.current.set(event.pointerId, now);
  };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    fingers.current.delete(event.pointerId);
  };

  const reachable = new Map(rivals.map((rival) => [rival.id, rival]));
  const organisms: OceanScene["organisms"][number][] = [];
  for (const organism of oceanOrganisms(state.worldSeed, day)) {
    if (organism.slot === state.slot) continue;
    if (organism.x === home.x && organism.y === home.y) continue;
    const id = `o:${String(organism.slot)}`;
    const closed = (state.placeReadyAt[id] ?? 0) > state.now;
    organisms.push({
      x: organism.x,
      y: organism.y,
      hue: organism.hue,
      tone: reachable.has(id) ? (closed ? "closed" : "reach") : "above",
    });
  }

  const trails: OceanScene["trails"][number][] = [];
  const raided = raid === null ? undefined : reachable.get(raid.rival);
  if (raid !== null && raided !== undefined) {
    trails.push({
      x: raided.x,
      y: raided.y,
      reach: filamentReach(
        { ...raid, leavesAt: raid.resolveAt },
        BALANCE.expedition.cancelSpeedup,
        state.now,
      ),
    });
  }
  // Le groupe est parti chasser un prédateur, ou affronter le Léviathan d'un événement.
  const hunted =
    hunt === null
      ? null
      : (findPredator(state.worldSeed, hunt.prey, hunt.startedAt) ??
        findEvent(state.worldSeed, hunt.prey, hunt.startedAt));
  if (hunt !== null && hunted !== null) {
    trails.push({
      x: hunted.x,
      y: hunted.y,
      reach: filamentReach(
        { ...hunt, leavesAt: hunt.resolveAt },
        BALANCE.expedition.cancelSpeedup,
        state.now,
      ),
    });
  }
  // Le gisement visé peut s'être vidé depuis le départ : on le retrouve à l'heure du départ.
  const tripTarget = trip === null ? null : playerDeposit(state, trip.place, trip.startedAt);
  if (trip !== null && tripTarget !== null) {
    const arrivesAt =
      trip.startedAt + gatherOffer(state, tripTarget, trip.startedAt).durationMs / 2;
    trails.push({
      x: tripTarget.x,
      y: tripTarget.y,
      reach: filamentReach(
        { ...trip, arrivesAt, leavesAt: arrivesAt },
        BALANCE.expedition.cancelSpeedup,
        state.now,
      ),
    });
  }

  const scene: OceanScene = {
    camera,
    zones: OCEAN.zones.map((zone, index) => ({
      outer: zone.outer,
      open: day >= zone.openDay,
      mine: index === state.zone,
    })),
    landRadius: OCEAN.landRadius,
    organisms,
    deposits: deposits.map((deposit) => ({
      x: deposit.x,
      y: deposit.y,
      kind: deposit.kind,
      fill: depositLeft(deposit, state.taken, state.now) / deposit.total,
      reachable: deposit.zone <= state.zone,
    })),
    predators: predators.map((predator) => ({
      x: predator.x,
      y: predator.y,
      level: predator.level,
      reachable: predator.zone <= state.zone,
      gone: (state.placeReadyAt[predator.id] ?? 0) > state.now,
    })),
    events: events.map((event) => ({
      x: event.x,
      y: event.y,
      radius: event.radius,
      kind: event.kind,
      reachable: event.zone <= state.zone || eventCovers(event, home),
      beaten: event.kind === "leviathan" && leviathanBeaten(state, event),
    })),
    home: { x: home.x, y: home.y, hue },
    trails,
  };

  const touchable = camera.span <= TOUCH_SPAN;
  const seen = (x: number, y: number): { x: number; y: number } | null => {
    const point = project(camera, x, y, aspect);
    return point.x < 0.04 || point.x > 0.96 || point.y < 0.04 || point.y > 0.96 ? null : point;
  };
  const openRival = rivals.find((rival) => rival.id === selected) ?? null;
  const openDeposit = deposits.find((deposit) => deposit.id === selected) ?? null;
  const openPredator = predators.find((predator) => predator.id === selected) ?? null;
  const openEvent = events.find((event) => event.id === selected) ?? null;
  const mine = project(camera, home.x, home.y, aspect);
  const offer = migrateOffer(state, state.now);

  // La profondeur de chaque frontière, écrite là où elle passe le plus près du regard.
  const borders = [
    ...OCEAN.zones.slice(1).map((zone, index) => ({
      radius: zone.outer,
      depth: zone.depth,
      zone: index + 1,
      openDay: day >= zone.openDay ? null : zone.openDay,
    })),
    { radius: OCEAN.landRadius, depth: OCEAN.shoreDepth, zone: ZONE_COUNT, openDay: null },
  ];

  return (
    <>
      <section
        ref={frame}
        className="lens lens-world"
        data-testid="world"
        aria-label={t("label.world")}
      >
        <div
          className="world-clip"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          onWheel={(event) => {
            setCamera((current) => zoomCamera(current, event.deltaY > 0 ? 1.15 : 1 / 1.15));
          }}
        >
          <OceanCanvas scene={scene} />
          {borders.map((border) => {
            const spot = labelSpot(camera, border.radius, aspect);
            if (spot.x < 0.12 || spot.x > 0.88 || spot.y < 0.1 || spot.y > 0.9) return null;
            return (
              <span
                key={border.zone}
                className="isobath"
                style={{
                  left: `${String(Math.max(0.34, Math.min(0.66, spot.x)) * 100)}%`,
                  top: `${String(spot.y * 100)}%`,
                }}
                data-testid={`isobath-${String(border.zone)}`}
              >
                {t("label.depth").replace("{n}", formatDepth(border.depth, lang))} ·{" "}
                {zoneName(lang, border.zone)}
                {border.openDay !== null && camera.span <= 150 && (
                  <span className="isobath-day">
                    {t("label.opensDay").replace("{n}", String(border.openDay))}
                  </span>
                )}
              </span>
            );
          })}
          {touchable &&
            events.map((event) => {
              const point = seen(event.x, event.y);
              if (point === null) return null;
              const target = hunt !== null && hunt.prey === event.id ? hunt : null;
              const closed = event.zone > state.zone && !eventCovers(event, home);
              return (
                <button
                  key={event.id}
                  type="button"
                  className={`organism organism-event is-${event.kind}${closed ? " is-closed" : ""}${target !== null ? " is-target" : ""}`}
                  style={{ left: `${String(point.x * 100)}%`, top: `${String(point.y * 100)}%` }}
                  aria-label={t(`event.${event.kind}.name`)}
                  data-testid={`event-${event.id}`}
                  data-kind={event.kind}
                  onClick={() => {
                    if (!dragged.current) setSelected(event.id);
                  }}
                >
                  <span className="slot-timer event-tag">
                    {t(`event.${event.kind}.name`)} ·{" "}
                    {target !== null
                      ? formatDuration(target.returnsAt - state.now)
                      : formatCountdown(event.endsAt - state.now, lang)}
                  </span>
                </button>
              );
            })}
          {touchable &&
            deposits.map((deposit) => {
              const point = seen(deposit.x, deposit.y);
              if (point === null) return null;
              const target = trip !== null && trip.place === deposit.id ? trip : null;
              return (
                <button
                  key={deposit.id}
                  type="button"
                  className={`organism organism-deposit${deposit.zone > state.zone ? " is-closed" : ""}${target !== null ? " is-target" : ""}`}
                  style={{ left: `${String(point.x * 100)}%`, top: `${String(point.y * 100)}%` }}
                  aria-label={t(`deposit.${deposit.kind}.name`)}
                  data-testid={`deposit-${deposit.id}`}
                  data-zone={deposit.zone}
                  onClick={() => {
                    if (!dragged.current) setSelected(deposit.id);
                  }}
                >
                  {target !== null && (
                    <span className="slot-timer">
                      {formatDuration(target.returnsAt - state.now)}
                    </span>
                  )}
                </button>
              );
            })}
          {touchable &&
            predators.map((predator) => {
              const point = seen(predator.x, predator.y);
              if (point === null) return null;
              const target = hunt !== null && hunt.prey === predator.id ? hunt : null;
              const gone = (state.placeReadyAt[predator.id] ?? 0) > state.now;
              return (
                <button
                  key={predator.id}
                  type="button"
                  className={`organism organism-predator${predator.zone > state.zone || gone ? " is-closed" : ""}${target !== null ? " is-target" : ""}`}
                  style={{ left: `${String(point.x * 100)}%`, top: `${String(point.y * 100)}%` }}
                  aria-label={t(`predator.${String(predator.level)}.name` as TextKey)}
                  data-testid={`predator-${predator.id}`}
                  data-zone={predator.zone}
                  data-level={predator.level}
                  onClick={() => {
                    if (!dragged.current) setSelected(predator.id);
                  }}
                >
                  {target !== null && (
                    <span className="slot-timer">
                      {formatDuration(target.returnsAt - state.now)}
                    </span>
                  )}
                </button>
              );
            })}
          {touchable &&
            rivals.map((rival) => {
              const point = seen(rival.x, rival.y);
              if (point === null) return null;
              const closedFor = (state.placeReadyAt[rival.id] ?? 0) - state.now;
              const target = raid !== null && raid.rival === rival.id ? raid : null;
              return (
                <button
                  key={rival.id}
                  type="button"
                  className={`organism${closedFor > 0 ? " is-closed" : ""}${target !== null ? " is-target" : ""}`}
                  style={{ left: `${String(point.x * 100)}%`, top: `${String(point.y * 100)}%` }}
                  aria-label={rival.name}
                  data-testid={`organism-${rival.id}`}
                  data-steps={rival.steps}
                  onClick={() => {
                    if (!dragged.current) setSelected(rival.id);
                  }}
                >
                  {target !== null && (
                    <span className="slot-timer">
                      {formatDuration(target.returnsAt - state.now)}
                    </span>
                  )}
                  {target === null && closedFor > 0 && (
                    <span className="slot-timer">{formatAway(closedFor, lang)}</span>
                  )}
                </button>
              );
            })}
          <button
            type="button"
            className="organism organism-home"
            style={{ left: `${String(mine.x * 100)}%`, top: `${String(mine.y * 100)}%` }}
            aria-label={t("label.you")}
            data-testid="world-home"
            onClick={() => {
              if (!dragged.current) onBack();
            }}
          />
          {!touchable && (
            <p className="world-hint" data-testid="world-hint">
              {t("label.worldHint")}
            </p>
          )}
        </div>
        <div className="world-hud" data-testid="world-hud">
          {RESOURCE_IDS.map((id) => (
            <span key={id} className="world-hud-item">
              <ResourceIcon id={id} />
              {formatAmount(state.resources[id], lang)}
            </span>
          ))}
          <span className="world-hud-item">
            <EnergyIcon />
            {state.energy}/{BALANCE.energy.max}
          </span>
        </div>
        <button type="button" className="lens-pill" data-testid="world-back" onClick={onBack}>
          {t("action.worldBack")}
        </button>
        <button
          type="button"
          className="lens-pill lens-pill-right"
          data-testid="migrate-open"
          onClick={() => {
            setRising(true);
          }}
        >
          {t("action.migrate")}
        </button>
        {events.length > 0 && (
          <button
            type="button"
            className="lens-pill lens-pill-events"
            data-testid="events-open"
            onClick={() => {
              setListing(true);
            }}
          >
            {t("label.events")} · {events.filter((event) => event.zone <= state.zone).length}
          </button>
        )}
        <p className="world-place" data-testid="world-place">
          {zoneName(lang, state.zone)} ·{" "}
          {t("label.depth").replace("{n}", formatDepth(depthAt(home.x, home.y), lang))} ·{" "}
          {t("label.day").replace("{n}", String(day))}
        </p>
        <button
          type="button"
          className="lens-corner lens-corner-left"
          aria-label={t("action.zoomOut")}
          data-testid="zoom-out"
          disabled={camera.span >= SPAN.max}
          onClick={() => {
            setCamera((current) => zoomCamera(current, 1.6));
          }}
        >
          −
        </button>
        <button
          type="button"
          className="lens-corner lens-corner-right"
          aria-label={t("action.zoomIn")}
          data-testid="zoom-in"
          disabled={camera.span <= SPAN.min}
          onClick={() => {
            setCamera((current) => zoomCamera(current, 1 / 1.6));
          }}
        >
          +
        </button>
      </section>

      {openRival !== null && (
        <RivalSheet
          state={state}
          rival={openRival}
          lang={lang}
          onClose={() => {
            setSelected(null);
          }}
          onOrder={onOrder}
        />
      )}
      {openPredator !== null && (
        <PreySheet
          state={state}
          lang={lang}
          target={openPredator}
          offer={predatorOffer(state, openPredator, state.now)}
          title={`${t(`predator.${String(openPredator.level)}.name` as TextKey)} · ${t("label.level")} ${String(openPredator.level + 1)}`}
          note={`${t(`predator.${String(openPredator.level)}.text` as TextKey)} ${zoneName(lang, openPredator.zone)} · ${t("label.depth").replace("{n}", formatDepth(depthAt(openPredator.x, openPredator.y), lang))}`}
          closed={
            openPredator.zone > state.zone
              ? t("state.zoneClosed")
              : (state.placeReadyAt[openPredator.id] ?? 0) > state.now &&
                  hunt?.prey !== openPredator.id
                ? t("state.predatorGone")
                : null
          }
          order={(party) => ({ type: "huntPredator", predator: openPredator.id, party })}
          {...(state.tier >= BALANCE.companion.tier && state.companion === null
            ? {
                tame: {
                  label: t("action.tame"),
                  note: t("companion.tameText"),
                  order: (party) => ({
                    type: "tamePredator",
                    predator: openPredator.id,
                    party,
                  }),
                },
              }
            : {})}
          onClose={() => {
            setSelected(null);
          }}
          onOrder={(order) => {
            const sent = onOrder(order);
            if (sent && (order.type === "huntPredator" || order.type === "tamePredator")) {
              setSelected(null);
            }
          }}
        />
      )}
      {openEvent !== null && (
        <EventSheet
          state={state}
          lang={lang}
          event={openEvent}
          onClose={() => {
            setSelected(null);
          }}
          onOrder={onOrder}
        />
      )}
      {listing && (
        <EventsSheet
          state={state}
          lang={lang}
          onClose={() => {
            setListing(false);
          }}
          onPick={(event) => {
            // On va voir : la carte se centre sur l'événement, assez près pour le toucher.
            setListing(false);
            setCamera((current) => ({
              x: event.x,
              y: event.y,
              span: Math.min(current.span, TOUCH_SPAN),
            }));
          }}
        />
      )}
      {openDeposit !== null && (
        <DepositSheet
          state={state}
          deposit={openDeposit}
          lang={lang}
          onClose={() => {
            setSelected(null);
          }}
          onOrder={onOrder}
        />
      )}
      {rising && (
        <SheetFrame
          title={
            offer === null
              ? zoneName(lang, state.zone)
              : `${t("label.migrateTo")} ${zoneName(lang, offer.zone)}`
          }
          testId="migrate-sheet"
          closeLabel={t("action.close")}
          onClose={() => {
            setRising(false);
          }}
        >
          {offer === null ? (
            <p className="sheet-building" data-testid="migrate-status">
              {t("state.surface")}
            </p>
          ) : (
            <>
              <p className="sheet-role">
                {t(`zone.${String(offer.zone)}.science` as TextKey)} · {t("label.migrateText")}
              </p>
              <div className="costs">
                {RESOURCE_IDS.map((id) => (
                  <span
                    key={id}
                    className={`cost${state.resources[id] < offer.cost[id] ? " is-missing" : ""}`}
                  >
                    <ResourceIcon id={id} />
                    {formatAmount(offer.cost[id], lang)}
                  </span>
                ))}
              </div>
              {(() => {
                let blocked: string | null = null;
                if (!offer.open) {
                  blocked = `${t("state.zoneNotOpen")} (${t("label.opensDay").replace("{n}", String(zoneOpenDay(offer.zone)))})`;
                } else if (state.expedition !== null || state.hunt !== null || raid !== null) {
                  blocked = t("state.migrateBusy");
                } else if (RESOURCE_IDS.some((id) => state.resources[id] < offer.cost[id])) {
                  blocked = t("state.missing");
                }
                return (
                  <>
                    {blocked !== null && (
                      <p className="sheet-building" data-testid="migrate-status">
                        {blocked}
                      </p>
                    )}
                    <button
                      type="button"
                      className="button"
                      disabled={blocked !== null}
                      data-testid="migrate-send"
                      onClick={() => {
                        if (onOrder({ type: "migrate" })) {
                          setRising(false);
                          const moved = playerCell({ ...state, zone: offer.zone });
                          setCamera({ x: moved.x, y: moved.y, span: SPAN.start });
                        }
                      }}
                    >
                      {t("action.migrate")}
                    </button>
                  </>
                );
              })()}
            </>
          )}
        </SheetFrame>
      )}
    </>
  );
}

/** Fiche d'un gisement commun : ce qu'il reste, ce que l'on peut en rapporter, un bouton. */
function DepositSheet(props: {
  readonly state: PlayerState;
  readonly deposit: Deposit;
  readonly lang: Lang;
  readonly onClose: () => void;
  readonly onOrder: (order: Order) => boolean;
}) {
  const { state, deposit, lang, onClose, onOrder } = props;
  const t = (key: TextKey): string => translate(lang, key);
  const offer = gatherOffer(state, deposit, state.now);
  const left = depositLeft(deposit, state.taken, state.now);
  const trip = state.expedition;
  const mine = trip !== null && trip.place === deposit.id ? trip : null;
  const room = capacity(state, offer.resource) - state.resources[offer.resource];

  let blocked: string | null = null;
  if (deposit.zone > state.zone) blocked = t("state.zoneClosed");
  else if (trip !== null && mine === null) blocked = t("state.oneAtATime");
  else if (left <= 0) blocked = t("state.depleted");
  else if (state.energy < offer.energy) blocked = t("state.noEnergy");

  return (
    <SheetFrame
      title={t(`deposit.${deposit.kind}.name`)}
      testId="deposit-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role" data-testid="deposit-zone">
        {translate(lang, `zone.${String(deposit.zone)}.name` as TextKey)} ·{" "}
        {t("label.depth").replace("{n}", formatDepth(depthAt(deposit.x, deposit.y), lang))}
      </p>
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
      <p className="sheet-role" data-testid="deposit-left">
        {t("label.left")} : <strong>{formatAmount(left, lang)}</strong> /{" "}
        {formatAmount(deposit.total, lang)} ·{" "}
        {deposit.steady ? t("label.steady") : t("label.shared")}
      </p>
      {(deposit.id.startsWith("v:") || offer.bloomPercent > 0) && (
        <p className="sheet-level" data-testid="deposit-event">
          {deposit.id.startsWith("v:") && <span className="badge">{t("label.eventDeposit")}</span>}
          {offer.bloomPercent > 0 &&
            ` ${t("label.blooming").replace("{n}", String(offer.bloomPercent))}`}
        </p>
      )}

      {mine !== null ? (
        <>
          <p className="sheet-building" data-testid="deposit-status">
            {mine.cancelled ? t("state.returning") : t("state.away")} ·{" "}
            {formatDuration(mine.returnsAt - state.now)}
          </p>
          {!mine.cancelled && (
            <button
              type="button"
              className="button button-quiet"
              data-testid="deposit-cancel"
              onClick={() => {
                if (onOrder({ type: "cancelExpedition" })) onClose();
              }}
            >
              {t("action.cancelExpedition")}
            </button>
          )}
        </>
      ) : (
        <>
          {blocked !== null && (
            <p className="sheet-building" data-testid="deposit-status">
              {blocked}
            </p>
          )}
          {blocked === null && room < offer.loot && (
            <p className="sheet-building" data-testid="deposit-warning">
              {t("state.overflow")}
            </p>
          )}
          <button
            type="button"
            className="button"
            disabled={blocked !== null}
            data-testid="deposit-send"
            onClick={() => {
              if (onOrder({ type: "gather", deposit: deposit.id })) onClose();
            }}
          >
            {t("action.gather")}
          </button>
        </>
      )}
    </SheetFrame>
  );
}
