/**
 * Les rapports : le journal de ce qui est arrivé à la cellule. Attaques envoyées, attaques
 * subies, chasses, récoltes, frappes du Léviathan, famines. Le moteur le tient dans l'état du
 * joueur, pour qu'il le retrouve sur n'importe quel appareil et après une longue absence.
 */
import type { GameEvent, PlayerState, Report } from "./types";

/** Nombre de rapports gardés en tout, et parmi eux le nombre de récoltes. */
export const REPORTS_KEPT = 40;
export const HARVESTS_KEPT = 15;
/** Des vagues de famine rapprochées ne font qu'un seul rapport. */
const FAMINE_MERGE_MS = 3_600_000;

const EMPTY = { sugar: 0, bricks: 0, proteins: 0, lost: 0, troops: 0 };

/** Le rapport que mérite un événement ; `null` pour tout ce qui ne se raconte pas. */
function reportOf(event: GameEvent): Report | null {
  if (event.type === "expeditionReturned") {
    if (event.cancelled) return null;
    return {
      ...EMPTY,
      at: event.at,
      kind: "harvest",
      won: true,
      who: event.place,
      [event.resource]: event.gained,
      lost: event.lost,
    };
  }
  if (event.type === "huntReturned") {
    if (event.cancelled) return null;
    return {
      ...EMPTY,
      at: event.at,
      kind: "hunt",
      won: event.won,
      who: event.prey,
      proteins: event.gained,
      lost: event.lost,
      troops: event.losses,
    };
  }
  if (event.type === "raidReturned") {
    if (event.cancelled) return null;
    return {
      ...EMPTY,
      at: event.at,
      kind: "raid",
      won: event.won,
      who: event.rival,
      sugar: event.gained.sugar,
      bricks: event.gained.bricks,
      proteins: event.gained.proteins,
      lost: event.lost,
      troops: event.losses,
      ...(event.battle === undefined ? {} : { battle: event.battle }),
    };
  }
  if (event.type === "attackRepelled") {
    return {
      ...EMPTY,
      at: event.at,
      kind: "defense",
      won: true,
      who: event.rival,
      troops: event.troopsLost,
      battle: event.battle,
    };
  }
  if (event.type === "attackSuffered") {
    return {
      ...EMPTY,
      at: event.at,
      kind: "defense",
      won: false,
      who: event.rival,
      sugar: event.sugar,
      bricks: event.bricks,
      proteins: event.proteins,
      troops: event.troopsLost,
      battle: event.battle,
    };
  }
  if (event.type === "escortReturned") {
    if (!event.fought) return null;
    return {
      ...EMPTY,
      at: event.at,
      kind: "escort",
      won: event.held,
      who: `o:${String(event.slot)}`,
      troops: event.losses,
      ...(event.battle === undefined ? {} : { battle: event.battle }),
    };
  }
  if (event.type === "leviathanRepelled") {
    return { ...EMPTY, at: event.at, kind: "leviathan", won: true, who: event.event };
  }
  if (event.type === "leviathanStruck") {
    return {
      ...EMPTY,
      at: event.at,
      kind: "leviathan",
      won: false,
      who: event.event,
      sugar: event.sugar,
      bricks: event.bricks,
      proteins: event.proteins,
      troops: event.troopsLost,
    };
  }
  if (event.type === "troopsStarved") {
    return { ...EMPTY, at: event.at, kind: "famine", won: false, who: "", troops: event.count };
  }
  return null;
}

/** Ajoute un rapport en tête du journal, sans le laisser grossir ni se remplir de récoltes. */
function add(reports: readonly Report[], report: Report): readonly Report[] {
  const latest = reports[0];
  if (
    report.kind === "famine" &&
    latest?.kind === "famine" &&
    report.at - latest.at <= FAMINE_MERGE_MS
  ) {
    return [{ ...latest, troops: latest.troops + report.troops }, ...reports.slice(1)];
  }
  // Les récoltes sont fréquentes : les plus anciennes cèdent la place avant les combats.
  let harvests = 0;
  const kept = [report, ...reports].filter((entry) => {
    if (entry.kind !== "harvest") return true;
    harvests += 1;
    return harvests <= HARVESTS_KEPT;
  });
  return kept.slice(0, REPORTS_KEPT);
}

/** Range dans le journal ce que ces événements racontent. */
export function trackReports(state: PlayerState, events: readonly GameEvent[]): PlayerState {
  let reports = state.reports;
  for (const event of events) {
    const report = reportOf(event);
    if (report !== null) reports = add(reports, report);
  }
  return reports === state.reports ? state : { ...state, reports };
}
