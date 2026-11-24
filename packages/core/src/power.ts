/**
 * La puissance, les classements et les ligues.
 * La puissance d'un joueur se calcule à partir de son état. Celle des organismes simulés se
 * calcule à partir de la graine du monde, de leur place et du jour : elle grandit avec la saison.
 */
import { BALANCE, ORGANELLE_IDS, TROOP_IDS } from "@o27/data";
import type { RankingId, ResourceId } from "@o27/data";
import { organismZone, rankOf } from "./ocean";
import { organismProfile } from "./rivals";
import { createRng } from "./rng";
import { capacity } from "./stats";
import { MICRO } from "./types";
import type { PlayerState, Step } from "./types";
import { seasonDay } from "./unlock";

/** Ce que vaut la cellule : ses organites, ses mutations, la zone qu'elle a atteinte. */
export function cellPower(state: PlayerState): number {
  const data = BALANCE.power;
  let levels = 0;
  for (const id of ORGANELLE_IDS) levels += state.organelles[id];
  return (
    levels * data.perOrganelleLevel +
    state.mutations.length * data.perMutation +
    state.zone * data.perZone
  );
}

/** Ce que valent les cellules filles, à la maison comme en sortie. */
export function troopPower(state: PlayerState): number {
  let count = 0;
  for (const id of TROOP_IDS) {
    count += state.troops[id] + (state.hunt?.party[id] ?? 0) + (state.raid?.party[id] ?? 0);
  }
  return count * BALANCE.power.perTroop;
}

export function totalPower(state: PlayerState): number {
  return cellPower(state) + troopPower(state);
}

/** Le score du joueur dans un classement. */
export function playerScore(state: PlayerState, category: RankingId): number {
  switch (category) {
    case "power":
      return totalPower(state);
    case "cell":
      return cellPower(state);
    case "troops":
      return troopPower(state);
    case "loot":
      return state.counters.lootTaken;
    case "defense":
      return state.counters.attacksRepelled;
  }
}

/** Le score d'un organisme simulé un jour donné. */
function organismScore(worldSeed: number, slot: number, day: number, category: RankingId): number {
  const data = BALANCE.ranking;
  const { temper } = organismProfile(worldSeed, slot);
  const rng = createRng((worldSeed ^ 0x9e3779b9 ^ Math.imul(slot + 1, 0xc2b2ae35)) >>> 0);
  rng.next();
  rng.next();
  // Chaque organisme a ses penchants : plus ou moins de troupes, de pillages, de défense.
  const troopShare = 25 + rng.int(31);
  const raider = 20 + rng.int(161);
  const defender = 30 + rng.int(141);
  const zone = organismZone(rankOf(worldSeed, slot), day);
  const power = Math.round(
    ((data.power.base + data.power.perDay * (day - 1)) * temper * (100 + data.zonePercent * zone)) /
      10_000,
  );
  const troops = Math.round((power * troopShare) / 100);
  switch (category) {
    case "power":
      return power;
    case "cell":
      return power - troops;
    case "troops":
      return troops;
    case "loot":
      return Math.round((data.lootPerDay * (day - 1) * temper * raider) / 10_000);
    case "defense":
      return Math.floor((data.defensePerHundredDays * (day - 1) * defender) / 10_000);
  }
}

export interface RankRow {
  /** 1 = le premier. */
  readonly rank: number;
  readonly name: string;
  readonly hue: number;
  readonly score: number;
  /** Est-ce le joueur lui-même ? Son nom est alors vide. */
  readonly me: boolean;
}

export interface Ranking {
  /** Tous les organismes de l'océan, du premier au dernier, le joueur compris. */
  readonly rows: readonly RankRow[];
  readonly mine: RankRow;
}

let othersKey = "";
let others: readonly { slot: number; name: string; hue: number; score: number }[] = [];

/** Le classement de l'océan dans une catégorie, à l'instant de l'état du joueur. */
export function ranking(state: PlayerState, category: RankingId): Ranking {
  const day = seasonDay(state, state.now);
  const key = [state.worldSeed, state.slot, day, category].join("/");
  if (key !== othersKey) {
    const found: { slot: number; name: string; hue: number; score: number }[] = [];
    for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
      if (slot === state.slot) continue;
      const { name, hue } = organismProfile(state.worldSeed, slot);
      found.push({ slot, name, hue, score: organismScore(state.worldSeed, slot, day, category) });
    }
    found.sort((one, other) => other.score - one.score || one.slot - other.slot);
    others = found;
    othersKey = key;
  }
  const score = playerScore(state, category);
  // À score égal, le joueur passe devant : il ne perd jamais une place sur une égalité.
  const ahead = others.filter((entry) => entry.score > score).length;
  const rows: RankRow[] = [];
  others.forEach((entry, index) => {
    if (index === ahead) rows.push({ rank: ahead + 1, name: "", hue: 0, score, me: true });
    rows.push({
      rank: index < ahead ? index + 1 : index + 2,
      name: entry.name,
      hue: entry.hue,
      score: entry.score,
      me: false,
    });
  });
  const mine: RankRow = { rank: ahead + 1, name: "", hue: 0, score, me: true };
  if (ahead >= others.length) rows.push(mine);
  return { rows, mine };
}

/** La ligue d'un rang : 0 pour la plus haute. */
export function leagueOf(rank: number, total: number): number {
  const leagues = BALANCE.leagues;
  for (let index = 0; index < leagues.length; index++) {
    const league = leagues[index];
    if (league !== undefined && rank * 100 <= total * league.topPercent) return index;
  }
  return leagues.length - 1;
}

/** Ce que rapporte une ligue chaque minuit, en millionièmes d'unité. */
export function leagueRewardFor(league: number): Readonly<Record<ResourceId, number>> {
  const percent = BALANCE.leagues[league]?.rewardPercent ?? 0;
  const base = BALANCE.leagueReward;
  const scaled = (amount: number): number => Math.floor((amount * percent * MICRO) / 100);
  return {
    sugar: scaled(base.sugar),
    bricks: scaled(base.bricks),
    proteins: scaled(base.proteins),
  };
}

/**
 * Minuit : le joueur reçoit la récompense de sa ligue, d'après son rang de puissance.
 * Ce qui ne tient pas dans la réserve est perdu.
 */
export function leagueStep(state: PlayerState, at: number): Step {
  if (state.tier < BALANCE.ranking.tier) return { state, events: [] };
  const { mine, rows } = ranking(state, "power");
  const league = leagueOf(mine.rank, rows.length);
  const reward = leagueRewardFor(league);
  const gain = (id: ResourceId): number =>
    Math.min(Math.max(0, capacity(state, id) - state.resources[id]), reward[id]);
  const loot = { sugar: gain("sugar"), bricks: gain("bricks"), proteins: gain("proteins") };
  return {
    state: {
      ...state,
      resources: {
        sugar: state.resources.sugar + loot.sugar,
        bricks: state.resources.bricks + loot.bricks,
        proteins: state.resources.proteins + loot.proteins,
      },
      counters: { ...state.counters, leagueEntered: state.counters.leagueEntered + 1 },
    },
    events: [{ type: "leagueReward", at, league, rank: mine.rank, loot }],
  };
}
