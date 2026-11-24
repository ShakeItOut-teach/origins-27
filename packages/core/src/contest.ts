/**
 * Le concours de la semaine : pendant sept jours, tous les organismes de l'océan sont classés
 * sur leur progression (puissance, armée ou butin, selon la semaine). À la fin, les cinquante
 * premiers reçoivent un coffre, d'autant plus gros qu'ils sont bien classés.
 *
 * Le joueur est mesuré à partir de son score au début de la semaine (ou à son entrée dans le
 * concours). Les organismes simulés progressent d'après la graine du monde et le jour.
 */
import { BALANCE, SEASON_DAYS } from "@o27/data";
import type { RankingId } from "@o27/data";
import { earnChest } from "./chests";
import { organismScore, playerScore } from "./power";
import { organismProfile } from "./rivals";
import { DAY_MS, MICRO } from "./types";
import type { GameEvent, PlayerState, Step } from "./types";
import { seasonDay } from "./unlock";

const RULES = BALANCE.contest;

/** La semaine de concours d'un jour de saison (0 = la première) ; -1 une fois la saison finie. */
export function contestWeek(day: number): number {
  return day > SEASON_DAYS ? -1 : Math.floor((day - 1) / RULES.days);
}

/** Ce que l'on mesure cette semaine-là. */
export function contestTheme(week: number): RankingId {
  const count = RULES.themes.length;
  return RULES.themes[((week % count) + count) % count] ?? "power";
}

/** Premier jour d'une semaine de concours. */
function firstDay(week: number): number {
  return week * RULES.days + 1;
}

/** Premier jour après une semaine de concours : le concours s'y arrête, à minuit. */
function closingDay(week: number): number {
  return Math.min(firstDay(week + 1), SEASON_DAYS + 1);
}

export interface ContestReward {
  readonly boosts: number;
  /** Ressources, en millionièmes d'unité. */
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
}

/** Ce que rapporte un rang ; `null` au-delà des places récompensées. */
export function contestRewardFor(rank: number): ContestReward | null {
  if (rank < 1 || rank > RULES.top) return null;
  const band = RULES.rewards.find((entry) => rank <= entry.toRank);
  if (band === undefined) return null;
  return {
    boosts: band.boosts,
    sugar: band.sugar * MICRO,
    bricks: band.bricks * MICRO,
    proteins: band.proteins * MICRO,
  };
}

/** La progression du joueur dans le concours en cours ; 0 s'il n'y participe pas. */
export function contestProgress(state: PlayerState): number {
  const contest = state.contest;
  if (contest === null) return 0;
  return Math.max(0, playerScore(state, contestTheme(contest.week)) - contest.base);
}

let othersKey = "";
let others: readonly { slot: number; name: string; hue: number; score: number }[] = [];

/** La progression de chaque organisme simulé, de la plus grande à la plus petite. */
function organismsProgress(
  state: PlayerState,
  week: number,
  day: number,
): readonly { slot: number; name: string; hue: number; score: number }[] {
  const key = [state.worldSeed, state.slot, week, day].join("/");
  if (key === othersKey) return others;
  const theme = contestTheme(week);
  const from = firstDay(week);
  const found: { slot: number; name: string; hue: number; score: number }[] = [];
  for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
    if (slot === state.slot) continue;
    const { name, hue } = organismProfile(state.worldSeed, slot);
    const score =
      organismScore(state.worldSeed, slot, day, theme) -
      organismScore(state.worldSeed, slot, from, theme);
    found.push({ slot, name, hue, score: Math.max(0, score) });
  }
  found.sort((one, other) => other.score - one.score || one.slot - other.slot);
  others = found;
  othersKey = key;
  return found;
}

export interface ContestRow {
  /** 1 = le premier. */
  readonly rank: number;
  readonly name: string;
  readonly hue: number;
  readonly score: number;
  readonly me: boolean;
}

export interface ContestBoard {
  readonly week: number;
  readonly theme: RankingId;
  /** Instant où le concours s'arrête. */
  readonly endsAt: number;
  /** Les premiers du concours, le joueur compris s'il en fait partie. */
  readonly rows: readonly ContestRow[];
  readonly mine: ContestRow;
}

function board(state: PlayerState, week: number, day: number, score: number): ContestBoard {
  const list = organismsProgress(state, week, day);
  // À progression égale, le joueur passe devant.
  const ahead = list.filter((entry) => entry.score > score).length;
  const mine: ContestRow = { rank: ahead + 1, name: "", hue: 0, score, me: true };
  const rows: ContestRow[] = [];
  for (let index = 0; index < list.length && rows.length < RULES.top; index++) {
    if (index === ahead) rows.push(mine);
    const entry = list[index];
    if (entry === undefined || rows.length >= RULES.top) break;
    rows.push({
      rank: index < ahead ? index + 1 : index + 2,
      name: entry.name,
      hue: entry.hue,
      score: entry.score,
      me: false,
    });
  }
  return {
    week,
    theme: contestTheme(week),
    endsAt: state.seasonStart + (closingDay(week) - 1) * DAY_MS,
    rows,
    mine,
  };
}

/** Le classement du concours en cours, tel que le joueur le voit ; `null` s'il n'y en a pas. */
export function contestBoard(state: PlayerState): ContestBoard | null {
  const contest = state.contest;
  if (contest === null) return null;
  return board(state, contest.week, seasonDay(state, state.now), contestProgress(state));
}

/**
 * Fait vivre le concours : le joueur y entre dès qu'il connaît les classements ; à chaque
 * changement de semaine, le concours qui s'achève est jugé (coffre pour les cinquante premiers)
 * et le suivant commence. À appeler à chaque minuit de saison : il ne fait rien entre deux.
 */
export function contestStep(state: PlayerState, at: number): Step {
  if (state.tier < RULES.tier) return { state, events: [] };
  const day = seasonDay(state, at);
  const week = contestWeek(day);
  if (state.contest?.week === week) return { state, events: [] };
  let current = state;
  const events: GameEvent[] = [];
  const ended = state.contest;
  if (ended !== null) {
    const theme = contestTheme(ended.week);
    const score = Math.max(0, playerScore(state, theme) - ended.base);
    const { mine } = board(state, ended.week, closingDay(ended.week), score);
    events.push({ type: "contestEnded", at, week: ended.week, theme, rank: mine.rank, score });
    current = { ...current, contest: null };
    const reward = contestRewardFor(mine.rank);
    if (reward !== null) {
      const chest = earnChest(current, {
        kind: "contest",
        at,
        level: mine.rank,
        sugar: reward.sugar,
        bricks: reward.bricks,
        proteins: reward.proteins,
        energy: 0,
        boosts: reward.boosts,
      });
      current = chest.state;
      events.push(...chest.events);
    }
  }
  if (week >= 0) {
    current = {
      ...current,
      contest: { week, base: playerScore(current, contestTheme(week)) },
    };
  }
  return { state: current, events };
}
