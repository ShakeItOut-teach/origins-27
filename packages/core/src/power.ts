/**
 * La puissance, les classements et les ligues.
 * La puissance d'un joueur se calcule à partir de son état. Celle des organismes simulés se
 * calcule à partir de la graine du monde, de leur place et du jour : elle grandit avec la saison,
 * plus ou moins vite selon leur ambition.
 */
import { BALANCE, ORGANELLE_IDS, SEASON_DAYS, TROOP_IDS } from "@o27/data";
import type { RankingId, ResourceId } from "@o27/data";
import { earnChest } from "./chests";
import { crowdStamp, humansBySlot } from "./crowd";
import { evolutionLevels } from "./evolutions";
import { organismZone, rankOf } from "./ocean";
import { organismProfile } from "./rivals";
import { createRng } from "./rng";
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
    evolutionLevels(state) * data.perEvolutionLevel +
    state.zone * data.perZone
  );
}

/** Ce que valent les cellules filles, à la maison comme en sortie. */
export function troopPower(state: PlayerState): number {
  let weight = 0;
  for (const id of TROOP_IDS) {
    const count = state.troops[id] + (state.hunt?.party[id] ?? 0) + (state.raid?.party[id] ?? 0);
    // Une cellule vaut la moyenne de ce qu'elle apporte à l'attaque et à la défense.
    weight += count * (BALANCE.troops[id].power + BALANCE.troops[id].defense);
  }
  return Math.floor((weight * BALANCE.power.perTroop) / 2);
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

/** La valeur d'une courbe en un point : la ligne droite entre ses deux voisins. */
export function along(points: readonly (readonly [number, number])[], x: number): number {
  const first = points[0];
  if (first === undefined) return 0;
  if (x <= first[0]) return first[1];
  for (let index = 1; index < points.length; index++) {
    const point = points[index];
    const previous = points[index - 1];
    if (point === undefined || previous === undefined) continue;
    if (x <= point[0]) {
      return (
        previous[1] + ((point[1] - previous[1]) * (x - previous[0])) / (point[0] - previous[0])
      );
    }
  }
  return points[points.length - 1]?.[1] ?? 0;
}

/** Ce qui distingue un organisme simulé des autres. */
export interface OrganismHabits {
  /** Son ambition : 100 pour le plus ambitieux de l'océan, 0 pour le moins ambitieux. */
  readonly percentile: number;
  /** Le jour où il abandonne, ou `null` s'il joue jusqu'au bout. */
  readonly quitDay: number | null;
  /** Ses penchants, en pourcentage d'un organisme moyen. */
  readonly troops: number;
  readonly raider: number;
  readonly defender: number;
  /** Positif : il part vite puis ralentit ; négatif : l'inverse. */
  readonly pace: number;
  /** Ses petites différences d'un jour à l'autre avec ses semblables, en pourcentage. */
  readonly jitter: number;
}

export function organismHabits(worldSeed: number, slot: number): OrganismHabits {
  const data = BALANCE.ranking;
  const count = BALANCE.world.organisms;
  const ambition = rankOf(worldSeed, slot);
  const percentile = count > 1 ? (100 * (count - 1 - ambition)) / (count - 1) : 100;
  const rng = createRng((worldSeed ^ 0x9e3779b9 ^ Math.imul(slot + 1, 0xc2b2ae35)) >>> 0);
  rng.next();
  rng.next();
  const troops = 70 + rng.int(61);
  const raider = rng.int(201);
  const defender = 30 + rng.int(141);
  const pace = rng.int(2 * data.pacePercent + 1) - data.pacePercent;
  const quitDay = data.quit.fromDay + rng.int(data.quit.toDay - data.quit.fromDay + 1);
  // Le tempérament qui règle sa force sur la carte le distingue un peu de ses voisins de rang.
  const { temper } = organismProfile(worldSeed, slot);
  return {
    percentile,
    quitDay: percentile < data.quit.belowPercentile ? quitDay : null,
    troops,
    raider,
    defender,
    pace,
    jitter: 100 + (temper - 100) / 3,
  };
}

/**
 * Le score d'un organisme simulé un jour donné : celui d'un organisme moyen ce jour-là, que son
 * ambition, son allure et ses penchants font monter ou descendre. Un organisme qui abandonne
 * garde le score de son dernier jour.
 */
export function organismScore(
  worldSeed: number,
  slot: number,
  day: number,
  category: RankingId,
): number {
  const data = BALANCE.ranking;
  const habits = organismHabits(worldSeed, slot);
  const last = habits.quitDay === null ? day : Math.min(day, habits.quitDay);
  const drive = along(data.drive, habits.percentile);
  const lean = (spread: number): number => 100 + ((drive - 100) * spread) / 100;
  const late = Math.min(1, Math.max(0, (last - 1) / (SEASON_DAYS - 1)));
  const pace = 100 + habits.pace * (1 - 2 * late);
  const grown = (curve: readonly (readonly [number, number])[], spread: number): number =>
    (along(curve, last) * lean(spread) * habits.jitter * pace) / 1_000_000;
  const zone = organismZone(rankOf(worldSeed, slot), last);
  const cell = Math.round(grown(data.median.cell, data.spread.cell)) + zone * BALANCE.power.perZone;
  const troops = Math.round((grown(data.median.troops, data.spread.troops) * habits.troops) / 100);
  switch (category) {
    case "power":
      return cell + troops;
    case "cell":
      return cell;
    case "troops":
      return troops;
    case "loot":
      return Math.round((grown(data.median.loot, data.spread.loot) * habits.raider) / 100);
    case "defense":
      return Math.floor(
        (along(data.median.defense, last) * lean(data.spread.defense) * habits.defender) / 10_000,
      );
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
  /** Un vrai joueur (le joueur lui-même compris), et non un organisme simulé. */
  readonly human: boolean;
}

export interface Ranking {
  /** Tous les organismes de l'océan, du premier au dernier, le joueur compris. */
  readonly rows: readonly RankRow[];
  readonly mine: RankRow;
}

let othersKey = "";
interface Other {
  readonly slot: number;
  readonly name: string;
  readonly hue: number;
  readonly score: number;
  readonly human: boolean;
}

let others: readonly Other[] = [];

/** Le classement de l'océan dans une catégorie, à l'instant de l'état du joueur. */
export function ranking(state: PlayerState, category: RankingId): Ranking {
  const day = seasonDay(state, state.now);
  const key = [state.worldSeed, state.slot, day, category, crowdStamp(state)].join("/");
  if (key !== othersKey) {
    const humans = humansBySlot(state);
    const found: Other[] = [];
    for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
      if (slot === state.slot) continue;
      // Un vrai joueur prend la place de l'organisme simulé : son nom, son score.
      const human = humans.get(slot);
      if (human !== undefined) {
        const { name, hue } = human;
        found.push({ slot, name, hue, score: human.scores[category], human: true });
        continue;
      }
      const { name, hue } = organismProfile(state.worldSeed, slot);
      const score = organismScore(state.worldSeed, slot, day, category);
      found.push({ slot, name, hue, score, human: false });
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
    if (index === ahead) {
      rows.push({ rank: ahead + 1, name: "", hue: 0, score, me: true, human: true });
    }
    rows.push({
      rank: index < ahead ? index + 1 : index + 2,
      name: entry.name,
      hue: entry.hue,
      score: entry.score,
      me: false,
      human: entry.human,
    });
  });
  const mine: RankRow = { rank: ahead + 1, name: "", hue: 0, score, me: true, human: true };
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
 * Minuit : le joueur reçoit la récompense de sa ligue, d'après son rang de puissance, dans un
 * coffre qu'il ouvrira lui-même.
 */
export function leagueStep(state: PlayerState, at: number): Step {
  if (state.tier < BALANCE.ranking.tier) return { state, events: [] };
  const { mine, rows } = ranking(state, "power");
  const league = leagueOf(mine.rank, rows.length);
  const loot = leagueRewardFor(league);
  const earned = earnChest(
    { ...state, counters: { ...state.counters, leagueEntered: state.counters.leagueEntered + 1 } },
    { kind: "league", at, level: league, ...loot, energy: 0, boosts: 0 },
  );
  return {
    state: earned.state,
    events: [{ type: "leagueReward", at, league, rank: mine.rank, loot }, ...earned.events],
  };
}
