import { BALANCE } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  capacity,
  createPlayer,
  deserializeState,
  leagueRewardFor,
  partyOf,
  serializeState,
} from "./index";
import type { PlayerState, RewardChest } from "./index";
import { earnChest } from "./chests";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const NOW = SEASON + 6 * DAY_MS + HOUR;

/** Un joueur du palier 7, que personne n'attaque pendant le test. */
function player(patch: Partial<PlayerState> = {}, now = NOW): PlayerState {
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  return advance(
    {
      ...base,
      tier: 7,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
      },
      mutations: ["thrift"],
      organelles: { ...base.organelles, mitochondrion: 3, vacuole: 2, ribosome: 2, nursery: 1 },
      resources: { sugar: 50 * MICRO, bricks: 50 * MICRO, proteins: 10 * MICRO },
      troops: partyOf({ hunter: 5 }),
      shieldUntil: now + 20 * DAY_MS,
      nextRaidAt: now + 25 * DAY_MS,
      ...patch,
    },
    now,
  ).state;
}

function chest(patch: Partial<RewardChest> = {}): RewardChest {
  return {
    kind: "quest",
    at: NOW,
    level: 0,
    sugar: 80 * MICRO,
    bricks: 0,
    proteins: 0,
    energy: 0,
    boosts: 0,
    ...patch,
  };
}

describe("les coffres de récompense", () => {
  it("un coffre gagné attend ; l'ouvrir donne tout son contenu, d'un seul coup", () => {
    const state = player();
    const earned = earnChest(
      state,
      chest({ kind: "leviathan", proteins: 400 * MICRO, energy: 5, boosts: 1 }),
    );
    expect(earned.events).toEqual([{ type: "chestEarned", at: NOW, kind: "leviathan" }]);
    expect(earned.state.chests).toHaveLength(1);
    expect(earned.state.resources).toEqual(state.resources);
    const step = applyOrder(earned.state, { type: "openReward", index: 0 }, NOW);
    if (!step.ok) throw new Error("coffre refusé");
    expect(step.state.chests).toEqual([]);
    expect(step.state.resources.sugar).toBe(state.resources.sugar + 80 * MICRO);
    expect(step.state.resources.proteins).toBe(state.resources.proteins + 400 * MICRO);
    expect(step.state.energy).toBe(state.energy + 5);
    expect(step.state.boosts).toBe(1);
    expect(step.events).toContainEqual({
      type: "rewardOpened",
      at: NOW,
      kind: "leviathan",
      level: 0,
      loot: { sugar: 80 * MICRO, bricks: 0, proteins: 400 * MICRO, energy: 5, boosts: 1 },
      auto: false,
    });
  });

  it("un coffre est un cadeau : son contenu entre même si la réserve est pleine", () => {
    const full = player();
    const brim = { ...full, resources: { ...full.resources, sugar: capacity(full, "sugar") } };
    const earned = earnChest(brim, chest({ sugar: 500 * MICRO })).state;
    const opened = applyOrder(earned, { type: "openReward", index: 0 }, NOW);
    if (!opened.ok) throw new Error("coffre refusé");
    expect(opened.state.resources.sugar).toBe(capacity(full, "sugar") + 500 * MICRO);
    expect(deserializeState(serializeState(opened.state))).toEqual(opened.state);
  });

  it("on ouvre celui que l'on veut, pas un coffre qui n'existe pas, et pas avant le palier 4", () => {
    const state = player();
    const two = earnChest(
      earnChest(state, chest()).state,
      chest({ kind: "league", level: 3 }),
    ).state;
    expect(deserializeState(serializeState(two))).toEqual(two);
    const second = applyOrder(two, { type: "openReward", index: 1 }, NOW);
    if (!second.ok) throw new Error("coffre refusé");
    expect(second.state.chests.map((entry) => entry.kind)).toEqual(["quest"]);
    const missing = applyOrder(two, { type: "openReward", index: 5 }, NOW);
    expect(missing).toEqual({ ok: false, error: "noChest" });
    const empty = applyOrder(state, { type: "openReward", index: 0 }, NOW);
    expect(empty).toEqual({ ok: false, error: "noChest" });
    const early = createPlayer(7, SEASON, SEASON);
    expect(applyOrder(early, { type: "openReward", index: 0 }, SEASON)).toEqual({
      ok: false,
      error: "locked",
    });
  });

  it("au-delà de la limite, le plus ancien s'ouvre tout seul : rien n'est perdu", () => {
    const kept = BALANCE.rewardChests.kept;
    let state = player();
    const before = state.resources.sugar;
    for (let index = 0; index < kept; index++) {
      state = earnChest(state, chest({ at: NOW + index })).state;
    }
    expect(state.chests).toHaveLength(kept);
    expect(state.resources.sugar).toBe(before);
    const over = earnChest(state, chest({ at: NOW + kept, kind: "challenge" }));
    expect(over.state.chests).toHaveLength(kept);
    expect(over.state.chests[0]?.at).toBe(NOW + 1);
    expect(over.state.chests[kept - 1]?.kind).toBe("challenge");
    expect(over.state.resources.sugar).toBe(before + 80 * MICRO);
    expect(over.events.filter((event) => event.type === "rewardOpened")).toMatchObject([
      { auto: true, kind: "quest" },
    ]);
  });

  it("chaque minuit laisse un coffre de ligue ; après une absence, ils attendent tous", () => {
    const state = player();
    const back = advance(state, SEASON + 9 * DAY_MS + HOUR);
    const leagues = back.state.chests.filter((entry) => entry.kind === "league");
    expect(leagues).toHaveLength(3);
    for (const entry of leagues) {
      expect(entry.sugar).toBe(leagueRewardFor(entry.level).sugar);
      expect(entry.proteins).toBe(leagueRewardFor(entry.level).proteins);
    }
    // La réserve pleine ne fait plus perdre la récompense : elle est dans le coffre.
    const first = applyOrder(back.state, { type: "openReward", index: 0 }, back.state.now);
    if (!first.ok) throw new Error("coffre refusé");
    expect(first.state.resources.bricks).toBe(
      back.state.resources.bricks + (leagues[0]?.bricks ?? 0),
    );
    expect(first.state.chests).toHaveLength(back.state.chests.length - 1);
  });

  it("une sauvegarde d'avant les coffres n'en a aucun en attente", () => {
    const state = earnChest(player(), chest()).state;
    const saved = JSON.parse(serializeState(state)) as Record<string, unknown>;
    const old = Object.fromEntries(Object.entries(saved).filter(([key]) => key !== "chests"));
    expect(deserializeState(JSON.stringify(old)).chests).toEqual([]);
    expect(() =>
      deserializeState(JSON.stringify({ ...saved, chests: [{ kind: "trésor" }] })),
    ).toThrow(TypeError);
  });
});
