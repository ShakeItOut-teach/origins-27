import {
  cellDistance,
  depthAt,
  eventCovers,
  leviathanBeaten,
  leviathanKind,
  leviathanOffer,
  leviathanThreat,
  playerCell,
  visibleEvents,
} from "@o27/core";
import type { PlayerState, ZoneEvent } from "@o27/core";
import type { Order, TextKey } from "@o27/data";
import { formatCountdown, formatDepth, translate } from "../game/text";
import type { Lang } from "../game/text";
import { PreySheet } from "./PreySheet";
import { SheetFrame } from "./SheetFrame";

/** Où est l'événement par rapport à la cellule du joueur : « vous y êtes » ou « à N cases ». */
function whereText(state: PlayerState, lang: Lang, event: ZoneEvent): string {
  const home = playerCell(state);
  if (eventCovers(event, home)) return translate(lang, "label.youAreIn");
  return translate(lang, "label.cellsAway").replace("{n}", String(cellDistance(home, event)));
}

function placeText(lang: Lang, event: ZoneEvent): string {
  return `${translate(lang, `zone.${String(event.zone)}.name` as TextKey)} · ${translate(
    lang,
    "label.depth",
  ).replace("{n}", formatDepth(depthAt(event.x, event.y), lang))}`;
}

interface ListProps {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
  /** Toucher un événement : l'ouvrir ou le montrer sur la carte. */
  readonly onPick?: (event: ZoneEvent) => void;
}

/** La liste des événements en cours dans les zones que le joueur peut atteindre. */
export function EventsSheet({ state, lang, onClose, onPick }: ListProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const events = visibleEvents(state).filter(
    (event) => event.zone <= state.zone || eventCovers(event, playerCell(state)),
  );
  return (
    <SheetFrame
      title={t("label.events")}
      testId="events-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      {events.length === 0 && (
        <p className="sheet-role" data-testid="events-none">
          {t("state.noEvents")}
        </p>
      )}
      <ul className="event-list" data-testid="events-list">
        {events.slice(0, 12).map((event) => (
          <li key={event.id}>
            <button
              type="button"
              className={`event-row is-${event.kind}`}
              data-testid={`event-row-${event.id}`}
              data-kind={event.kind}
              disabled={onPick === undefined}
              onClick={() => {
                onPick?.(event);
              }}
            >
              <span className="event-dot" aria-hidden="true" />
              <span className="event-name">
                <strong>{t(`event.${event.kind}.name`)}</strong>
                <small>
                  {placeText(lang, event)} · {whereText(state, lang, event)}
                </small>
              </span>
              <span className="event-left">{formatCountdown(event.endsAt - state.now, lang)}</span>
            </button>
          </li>
        ))}
      </ul>
    </SheetFrame>
  );
}

interface SheetProps {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly event: ZoneEvent;
  readonly onClose: () => void;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

/** La fiche d'un événement. Le Léviathan s'affronte comme une proie ; les autres s'expliquent. */
export function EventSheet({ state, lang, event, onClose, onOrder }: SheetProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const ends = `${t("label.endsIn")} ${formatCountdown(event.endsAt - state.now, lang)}`;
  if (event.kind === "leviathan") {
    const inRange = eventCovers(event, playerCell(state));
    const threat = leviathanThreat(state);
    const strike =
      threat !== null && threat.event.id === event.id
        ? ` ${t("label.inRange")} ${t("label.nextStrike")} ${formatCountdown(threat.strikesAt - state.now, lang)}.`
        : "";
    return (
      <PreySheet
        state={state}
        lang={lang}
        target={{ id: event.id, kind: leviathanKind(event) }}
        offer={leviathanOffer(state, event, state.now)}
        title={t("event.leviathan.name")}
        note={`${t("event.leviathan.text")} ${placeText(lang, event)} · ${ends}.${strike}`}
        closed={
          leviathanBeaten(state, event) && state.hunt?.prey !== event.id
            ? t("event.leviathan.beaten")
            : event.zone > state.zone && !inRange
              ? t("state.zoneClosed")
              : null
        }
        order={(party) => ({ type: "huntLeviathan", event: event.id, party })}
        onClose={onClose}
        onOrder={(order) => {
          if (onOrder(order) && order.type === "huntLeviathan") onClose();
        }}
      />
    );
  }
  return (
    <SheetFrame
      title={t(`event.${event.kind}.name`)}
      testId="event-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role" data-testid="event-text">
        {t(`event.${event.kind}.text`)}
      </p>
      <p className="sheet-level" data-testid="event-place">
        {placeText(lang, event)} · {whereText(state, lang, event)}
      </p>
      <p className="sheet-building" data-testid="event-left">
        {ends}
      </p>
    </SheetFrame>
  );
}
