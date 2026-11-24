import { BALANCE, SEASON_DAYS } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  contestBoard,
  contestProgress,
  contestRewardFor,
  contestTheme,
  contestWeek,
  createPlayer,
  deserializeState,
  partyOf,
  playerScore,
  serializeState,
} from "./index";
import type { PlayerState } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const RULES = BALANCE.contest;

/** Un joueur qui connaît les classements, posé à une heure du jour demandé. */
function player(day: number, patch: Partial<PlayerState> = {}, tier = 7): PlayerState {
  const now = SEASON + (day - 1) * DAY_MS + HOUR;
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  return advance(
    {
      ...base,
      tier,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
      },
      mutations: ["thrift"],
      organelles: { ...base.organelles, mitochondrion: 3, vacuole: 3, ribosome: 2, nursery: 1 },
      resources: { sugar: 100 * MICRO, bricks: 100 * MICRO, proteins: 10 * MICRO },
      troops: partyOf({ hunter: 5 }),
      shieldUntil: now + 40 * DAY_MS,
      nextRaidAt: now + 40 * DAY_MS,
      ...patch,
    },
    now,
  ).state;
}

describe("le concours de la semaine", () => {
  it("dure sept jours, change de thème chaque semaine, et s'arrête avec la saison", () => {
    expect([1, 7, 8, 14, 15, 22, 27].map((day) => contestWeek(day))).toEqual([0, 0, 1, 1, 2, 3, 3]);
    expect(contestWeek(SEASON_DAYS + 1)).toBe(-1);
    expect([0, 1, 2, 3].map((week) => contestTheme(week))).toEqual(RULES.themes.slice(0, 4));
    expect(contestTheme(0)).toBe("power");
  });

  it("le joueur y entre dès qu'il connaît les classements, avec une progression nulle", () => {
    // Les classements s'ouvrent au jour 4 : la veille, pas de concours.
    expect(player(3, {}, 6).contest).toBeNull();
    const state = player(5);
    expect(state.contest).toEqual({ week: 0, base: playerScore(state, "power") });
    expect(contestProgress(state)).toBe(0);
    expect(deserializeState(serializeState(state))).toEqual(state);
  });

  it("la progression compte ce qui a été gagné depuis l'entrée, jamais moins que zéro", () => {
    const state = player(5);
    const grown = { ...state, troops: partyOf({ hunter: 45 }) };
    expect(contestProgress(grown)).toBe(playerScore(grown, "power") - playerScore(state, "power"));
    expect(contestProgress(grown)).toBeGreaterThan(0);
    expect(contestProgress({ ...state, troops: partyOf() })).toBe(0);
  });

  it("le classement montre les cinquante premiers, du plus fort au moins fort, et la place du joueur", () => {
    const state = player(6);
    const board = contestBoard(state);
    if (board === null) throw new Error("concours attendu");
    expect(board.theme).toBe("power");
    expect(board.endsAt).toBe(SEASON + 7 * DAY_MS);
    expect(board.rows.length).toBeLessThanOrEqual(RULES.top);
    expect(board.rows.map((row) => row.score)).toEqual(
      [...board.rows.map((row) => row.score)].sort((a, b) => b - a),
    );
    expect(board.rows.map((row) => row.rank)).toEqual(board.rows.map((_, index) => index + 1));
    // Sans rien faire, le joueur est derrière ceux qui ont progressé.
    expect(board.mine.rank).toBeGreaterThan(RULES.top);
    expect(board.rows.some((row) => row.me)).toBe(false);
    // Avec une grosse armée, il prend la tête.
    const strong = contestBoard({ ...state, troops: partyOf({ toxic: 4000 }) });
    expect(strong?.mine.rank).toBe(1);
    expect(strong?.rows[0]).toMatchObject({ rank: 1, me: true });
    expect(strong?.rows).toHaveLength(RULES.top);
  });

  it("à la fin de la semaine, le premier ouvre un coffre plein, et le concours suivant commence", () => {
    const state = player(6);
    const strong = {
      ...state,
      troops: partyOf({ toxic: 4000 }),
      organelles: { ...state.organelles, mitochondrion: 5 },
    };
    const midnight = SEASON + 7 * DAY_MS;
    // Les réserves sont larges : ici seule la fin du concours nous intéresse.
    const step = advance(
      { ...strong, resources: { sugar: 10 ** 15, bricks: 0, proteins: 0 } },
      midnight,
    );
    const ended = step.events.find((event) => event.type === "contestEnded");
    expect(ended).toMatchObject({ at: midnight, week: 0, theme: "power", rank: 1 });
    const chest = step.state.chests.find((entry) => entry.kind === "contest");
    const reward = contestRewardFor(1);
    expect(chest).toMatchObject({ level: 1, at: midnight, energy: 0, ...reward });
    expect(reward?.boosts).toBe(RULES.rewards[0]?.boosts);
    // La deuxième semaine mesure autre chose, à partir du score de minuit.
    expect(step.state.contest).toEqual({
      week: 1,
      base: playerScore(step.state, contestTheme(1)),
    });
    expect(contestProgress(step.state)).toBe(0);
    expect(deserializeState(serializeState(step.state))).toEqual(step.state);
  });

  it("au-delà de la cinquantième place, pas de coffre ; les récompenses décroissent avec le rang", () => {
    const idle = player(6);
    const step = advance(idle, SEASON + 7 * DAY_MS);
    const ended = step.events.find((event) => event.type === "contestEnded");
    if (ended?.type !== "contestEnded") throw new Error("fin de concours attendue");
    expect(ended.rank).toBeGreaterThan(RULES.top);
    expect(step.state.chests.some((entry) => entry.kind === "contest")).toBe(false);
    expect(contestRewardFor(RULES.top + 1)).toBeNull();
    expect(contestRewardFor(0)).toBeNull();
    let last = Number.POSITIVE_INFINITY;
    for (const rank of [1, 2, 3, 4, 10, 11, 25, 26, 50]) {
      const reward = contestRewardFor(rank);
      if (reward === null) throw new Error("récompense attendue");
      expect(reward.sugar).toBeLessThanOrEqual(last);
      expect(reward.boosts).toBeGreaterThan(0);
      last = reward.sugar;
    }
    expect(contestRewardFor(1)?.boosts).toBeGreaterThan(contestRewardFor(50)?.boosts ?? 0);
  });

  it("après une longue absence, chaque semaine a été jugée à son heure ; la saison finie, plus de concours", () => {
    const state = player(5);
    const back = advance(state, SEASON + (SEASON_DAYS + 1) * DAY_MS + HOUR);
    const ends = back.events.filter((event) => event.type === "contestEnded");
    expect(ends.map((event) => event.week)).toEqual([0, 1, 2, 3]);
    expect(ends.map((event) => event.at)).toEqual([
      SEASON + 7 * DAY_MS,
      SEASON + 14 * DAY_MS,
      SEASON + 21 * DAY_MS,
      SEASON + SEASON_DAYS * DAY_MS,
    ]);
    expect(back.state.contest).toBeNull();
    expect(contestBoard(back.state)).toBeNull();
  });

  it("avancer d'une traite ou en plusieurs fois donne le même état à travers un changement de semaine", () => {
    const start = player(7, { troops: partyOf({ hunter: 60 }) });
    const to = SEASON + 7 * DAY_MS + 3 * HOUR;
    const once = advance(start, to).state;
    const twice = advance(advance(start, SEASON + 7 * DAY_MS - 5).state, to).state;
    const thrice = advance(advance(start, SEASON + 7 * DAY_MS).state, to).state;
    expect(serializeState(twice)).toBe(serializeState(once));
    expect(serializeState(thrice)).toBe(serializeState(once));
  });

  it("une sauvegarde d'avant les concours y entre en revenant", () => {
    const state = player(9);
    const saved = JSON.parse(serializeState(state)) as Record<string, unknown>;
    const old = Object.fromEntries(Object.entries(saved).filter(([key]) => key !== "contest"));
    const back = deserializeState(JSON.stringify(old));
    expect(back.contest).toBeNull();
    expect(advance(back, state.now + 1000).state.contest?.week).toBe(1);
  });
});
