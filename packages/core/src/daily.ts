/** Le bilan du jour : combats gagnés et perdus, pour la Gazette. Remis à zéro chaque minuit de saison. */
import type { DailyRecord, GameEvent, PlayerState } from "./types";
import { seasonDay } from "./unlock";

/** +1 pour une victoire, -1 pour une défaite, 0 pour tout le reste. */
function verdict(event: GameEvent): number {
  if (event.type === "huntResolved" || event.type === "raidResolved") return event.won ? 1 : -1;
  if (event.type === "attackRepelled" || event.type === "leviathanRepelled") return 1;
  if (event.type === "attackSuffered" || event.type === "leviathanStruck") return -1;
  return 0;
}

/** Compte les combats de ces événements dans le bilan de leur jour. */
export function trackDaily(state: PlayerState, events: readonly GameEvent[]): PlayerState {
  let daily: DailyRecord = state.daily;
  for (const event of events) {
    const result = verdict(event);
    if (result === 0) continue;
    const day = seasonDay(state, event.at);
    if (day !== daily.day) daily = { day, wins: 0, losses: 0 };
    daily =
      result > 0 ? { ...daily, wins: daily.wins + 1 } : { ...daily, losses: daily.losses + 1 };
  }
  return daily === state.daily ? state : { ...state, daily };
}
