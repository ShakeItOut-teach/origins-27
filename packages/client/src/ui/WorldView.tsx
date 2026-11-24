import { slotCell, worldOrganisms, worldRivals } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { WorldCanvas } from "../cell/WorldCanvas";
import type { WorldScene } from "../cell/WorldCanvas";
import { filamentReach } from "../game/mapLayout";
import { formatAway, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";
import { floating, panCamera, project, SPAN, TOUCH_SPAN, zoomCamera } from "../game/worldView";
import type { WorldCamera } from "../game/worldView";
import { RivalSheet } from "./RivalsView";

interface Props {
  readonly state: PlayerState;
  readonly hue: number;
  readonly lang: Lang;
  /** Revenir à la goutte proche. */
  readonly onBack: () => void;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

/** Case d'un organisme, lue dans son identifiant « r:colonne:ligne ». */
function cellOf(id: string): { column: number; row: number } {
  const [, column, row] = id.split(":");
  return floating(Number(column), Number(row));
}

/** La goutte entière : on la fait glisser, on recule, on touche un organisme à portée. */
export function WorldView({ state, hue, lang, onBack, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const home = useMemo(() => slotCell(state.slot), [state.slot]);
  const [camera, setCamera] = useState<WorldCamera>({ x: home.x, y: home.y, span: SPAN.start });
  const [selected, setSelected] = useState<string | null>(null);
  const rivals = worldRivals(state.worldSeed, state.slot);
  const raid = state.raid;

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
    const size = event.currentTarget.clientWidth;
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
  const dots: WorldScene["dots"][number][] = [];
  for (const organism of worldOrganisms(state.worldSeed)) {
    if (organism.slot === state.slot) continue;
    const id = `r:${String(organism.column)}:${String(organism.row)}`;
    const closed = (state.placeReadyAt[id] ?? 0) > state.now;
    dots.push({
      ...floating(organism.column, organism.row),
      hue: organism.hue,
      tone: reachable.has(id) ? (closed ? "closed" : "reach") : "far",
    });
  }
  // Les voisins au bord de la goutte comptent aussi, même hors des places numérotées.
  const drawn = new Set(
    worldOrganisms(state.worldSeed).map(
      (organism) => `r:${String(organism.column)}:${String(organism.row)}`,
    ),
  );
  for (const rival of rivals) {
    if (drawn.has(rival.id)) continue;
    const cell = cellOf(rival.id);
    const closed = (state.placeReadyAt[rival.id] ?? 0) > state.now;
    dots.push({ ...cell, hue: rival.hue, tone: closed ? "closed" : "reach" });
  }

  const scene: WorldScene = {
    camera,
    dots,
    home: { column: home.x, row: home.y, hue },
    reach: BALANCE.rivals.world.reach,
    trail:
      raid === null
        ? null
        : {
            ...cellOf(raid.rival),
            reach: filamentReach(
              { ...raid, leavesAt: raid.resolveAt },
              BALANCE.expedition.cancelSpeedup,
              state.now,
            ),
          },
  };

  const touchable = camera.span <= TOUCH_SPAN;
  const open = rivals.find((rival) => rival.id === selected) ?? null;
  const mine = project(camera, home.x, home.y);

  return (
    <>
      <section className="lens lens-world" data-testid="world" aria-label={t("label.world")}>
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
          <WorldCanvas scene={scene} />
          {touchable &&
            rivals.map((rival) => {
              const cell = cellOf(rival.id);
              const point = project(camera, cell.column, cell.row);
              if (point.x < 0.04 || point.x > 0.96 || point.y < 0.04 || point.y > 0.96) return null;
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
        <button type="button" className="lens-pill" data-testid="world-back" onClick={onBack}>
          {t("action.worldBack")}
        </button>
        <button
          type="button"
          className="lens-corner lens-corner-left"
          aria-label={t("action.zoomOut")}
          data-testid="zoom-out"
          disabled={camera.span >= SPAN.max}
          onClick={() => {
            setCamera((current) => zoomCamera(current, 1.5));
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
            setCamera((current) => zoomCamera(current, 1 / 1.5));
          }}
        >
          +
        </button>
      </section>

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
    </>
  );
}
