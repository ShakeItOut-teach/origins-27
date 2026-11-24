/**
 * La Gazette de l'océan : le résumé du jour. Rien n'est stocké, sauf le bilan des combats du
 * joueur : tout le reste se lit dans les classements, les bannières et les événements.
 */
import { BALANCE, FOSSIL_IDS, SEASON_DAYS } from "@o27/data";
import type { BannerId, FossilId, ZoneEventKind } from "@o27/data";
import { bannerList } from "./alliance";
import type { BannerRow } from "./alliance";
import { oceanEvents } from "./events";
import { leagueOf, ranking } from "./power";
import type { RankRow } from "./power";
import { createRng } from "./rng";
import { DAY_MS } from "./types";
import type { PlayerState } from "./types";
import { seasonDay } from "./unlock";

export type GazetteNews =
  | { readonly kind: "zoneOpens"; readonly zone: number }
  | { readonly kind: "event"; readonly event: ZoneEventKind; readonly zone: number }
  | { readonly kind: "lastDays"; readonly days: number }
  | { readonly kind: "leader"; readonly name: string; readonly me: boolean }
  | { readonly kind: "allianceLeads"; readonly banner: BannerId };

export interface Gazette {
  readonly day: number;
  /** Jours qu'il reste avant la fin de la saison ; 0 quand elle est finie. */
  readonly daysLeft: number;
  /** La nouvelle du jour ; `null` par calme plat. */
  readonly headline: GazetteNews | null;
  readonly briefs: readonly GazetteNews[];
  readonly top: readonly RankRow[];
  readonly leading: BannerRow | null;
  /** Le premier du classement du butin. */
  readonly raider: RankRow | null;
  readonly rank: number;
  readonly league: number;
  readonly wins: number;
  readonly losses: number;
  readonly fossil: FossilId;
}

let fossilSeed = -1;
let fossilOrder: readonly FossilId[] = [];

/** Le fossile d'un jour de saison : chaque saison les montre dans un ordre différent. */
export function fossilOfDay(worldSeed: number, day: number): FossilId {
  if (fossilSeed !== worldSeed) {
    const rng = createRng((worldSeed ^ 0x68e31da4) >>> 0);
    rng.next();
    rng.next();
    const order: FossilId[] = [...FOSSIL_IDS];
    for (let index = order.length - 1; index > 0; index--) {
      const other = rng.int(index + 1);
      const moved = order[index];
      const swapped = order[other];
      if (moved === undefined || swapped === undefined) continue;
      order[index] = swapped;
      order[other] = moved;
    }
    fossilOrder = order;
    fossilSeed = worldSeed;
  }
  const count = fossilOrder.length;
  return fossilOrder[(((day - 1) % count) + count) % count] ?? "trilobite";
}

/** La Gazette du jour, telle que ce joueur la lit. */
export function gazette(state: PlayerState): Gazette {
  const day = seasonDay(state, state.now);
  const daysLeft = Math.max(0, SEASON_DAYS + 1 - day);
  const dayStart = state.seasonStart + (day - 1) * DAY_MS;
  const power = ranking(state, "power");
  const loot = ranking(state, "loot");
  const banners = bannerList(state);

  const news: GazetteNews[] = [];
  BALANCE.ocean.zones.forEach((zone, index) => {
    if (zone.openDay === day && index > 0) news.push({ kind: "zoneOpens", zone: index });
  });
  // Les événements nés aujourd'hui, le Léviathan d'abord : c'est lui qui fait peur.
  const born = oceanEvents(state.worldSeed, state.now)
    .filter((event) => event.startsAt >= dayStart)
    .sort(
      (one, other) =>
        Number(other.kind === "leviathan") - Number(one.kind === "leviathan") ||
        (one.id < other.id ? -1 : 1),
    );
  for (const event of born.slice(0, 4)) {
    news.push({ kind: "event", event: event.kind, zone: event.zone });
  }
  if (daysLeft > 0 && daysLeft <= 3) news.push({ kind: "lastDays", days: daysLeft });

  const headline = news[0] ?? null;
  const briefs: GazetteNews[] = news.slice(1);
  const first = power.rows[0];
  if (first !== undefined) briefs.push({ kind: "leader", name: first.name, me: first.me });
  const leading = banners[0] ?? null;
  if (leading !== null) briefs.push({ kind: "allianceLeads", banner: leading.banner });

  const mine = state.daily.day === day ? state.daily : { wins: 0, losses: 0 };
  return {
    day,
    daysLeft,
    headline,
    briefs,
    top: power.rows.slice(0, 3),
    leading,
    raider: loot.rows[0] ?? null,
    rank: power.mine.rank,
    league: leagueOf(power.mine.rank, power.rows.length),
    wins: mine.wins,
    losses: mine.losses,
    fossil: fossilOfDay(state.worldSeed, day),
  };
}
