/**
 * Le calendrier de la saison : tout ce qui s'ouvre à date fixe, pour que le joueur voie
 * toujours le compte à rebours. À partir du palier 6, le jeu parle en jours, pas en paliers.
 */
import { BALANCE, MAX_RELEASED_TIER, SEASON_DAYS, UNLOCKS } from "@o27/data";
import { DAY_MS } from "./types";
import type { PlayerState } from "./types";
import { seasonDay } from "./unlock";

export interface CalendarEntry {
  /** Ce qui s'ouvre : un palier (de nouvelles mécaniques), une zone de l'océan, la fin. */
  readonly kind: "tier" | "zone" | "end";
  /** Numéro du palier ou de la zone ; 0 pour la fin de saison. */
  readonly index: number;
  /** Jour de saison de l'ouverture (1 = premier jour). */
  readonly day: number;
  /** Instant de l'ouverture. */
  readonly at: number;
  /** Déjà ouvert pour ce joueur ? */
  readonly open: boolean;
}

/** Toutes les ouvertures datées de la saison, dans l'ordre. */
export function seasonCalendar(state: PlayerState): readonly CalendarEntry[] {
  const today = seasonDay(state, state.now);
  const startOf = (day: number): number => state.seasonStart + (day - 1) * DAY_MS;
  const entries: CalendarEntry[] = [];
  for (const unlock of UNLOCKS) {
    // Seuls les paliers qui ne demandent qu'une date entrent au calendrier.
    if (unlock.minDay === null || unlock.condition !== null) continue;
    if (unlock.tier > MAX_RELEASED_TIER) continue;
    entries.push({
      kind: "tier",
      index: unlock.tier,
      day: unlock.minDay,
      at: startOf(unlock.minDay),
      open: state.tier >= unlock.tier,
    });
  }
  BALANCE.ocean.zones.forEach((zone, index) => {
    if (zone.openDay <= 1) return;
    entries.push({
      kind: "zone",
      index,
      day: zone.openDay,
      at: startOf(zone.openDay),
      open: today >= zone.openDay,
    });
  });
  entries.push({
    kind: "end",
    index: 0,
    day: SEASON_DAYS + 1,
    at: startOf(SEASON_DAYS + 1),
    open: today > SEASON_DAYS,
  });
  return entries.sort((one, other) => one.at - other.at || (one.kind < other.kind ? -1 : 1));
}

/** La prochaine ouverture à venir ; `null` quand tout est ouvert. */
export function nextOpening(state: PlayerState): CalendarEntry | null {
  return seasonCalendar(state).find((entry) => entry.at > state.now) ?? null;
}
