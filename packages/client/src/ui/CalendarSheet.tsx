import { seasonCalendar } from "@o27/core";
import type { CalendarEntry, PlayerState } from "@o27/core";
import type { TextKey } from "@o27/data";
import { formatCountdown, translate } from "../game/text";
import type { Lang } from "../game/text";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
}

/** Le nom de ce qui s'ouvre : une nouveauté du jeu, une zone de l'océan, ou la fin. */
export function openingName(lang: Lang, entry: CalendarEntry): string {
  if (entry.kind === "end") return translate(lang, "calendar.end");
  return translate(
    lang,
    (entry.kind === "tier"
      ? `unlock.${String(entry.index)}.title`
      : `zone.${String(entry.index)}.name`) as TextKey,
  );
}

/** Le calendrier de la saison : chaque ouverture, son jour, et le temps qu'il reste. */
export function CalendarSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  return (
    <SheetFrame
      title={t("label.calendar")}
      testId="calendar-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("calendar.text")}</p>
      <ol className="calendar" data-testid="calendar-list">
        {seasonCalendar(state).map((entry) => {
          const left = entry.at - state.now;
          return (
            <li
              key={`${entry.kind}-${String(entry.index)}`}
              className={`calendar-row${left <= 0 ? " is-open" : ""}`}
              data-testid={`calendar-${entry.kind}-${String(entry.index)}`}
            >
              <span className="calendar-day">
                {t("label.day").replace("{n}", String(entry.day))}
              </span>
              <span className="calendar-name">{openingName(lang, entry)}</span>
              <span className="calendar-left">
                {left <= 0 ? t("state.open") : formatCountdown(left, lang)}
              </span>
            </li>
          );
        })}
      </ol>
    </SheetFrame>
  );
}
