import { BALANCE } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  createPlayer,
  deserializeState,
  plannedLevel,
  serializeState,
} from "./index";
import type { PlayerState } from "./index";

const SEASON = 1_800_000_000_000;
const RULES = BALANCE.buildQueue;

/** Un joueur bien pourvu, au palier demandé, au deuxième jour. */
function player(tier: number): PlayerState {
  const now = SEASON + DAY_MS + 3_600_000;
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  return {
    ...base,
    tier,
    counters: { ...base.counters, harvests: 10, organellesBuilt: 3, mutationsChosen: 1 },
    organelles: { ...base.organelles, mitochondrion: 2, vacuole: 2, ribosome: 1 },
    resources: { sugar: 1000 * MICRO, bricks: 1000 * MICRO, proteins: 0 },
    shieldUntil: now + 40 * DAY_MS,
    nextRaidAt: now + 40 * DAY_MS,
  };
}

function ok(state: PlayerState, order: Parameters<typeof applyOrder>[1]): PlayerState {
  const result = applyOrder(state, order, state.now);
  if (!result.ok) throw new Error(`refusé : ${result.error}`);
  return result.state;
}

describe("la file de chantiers", () => {
  it("avant son palier, un seul chantier à la fois", () => {
    const busy = ok(player(RULES.tier - 1), { type: "upgrade", organelle: "mitochondrion" });
    expect(applyOrder(busy, { type: "upgrade", organelle: "vacuole" }, busy.now)).toEqual({
      ok: false,
      error: "busy",
    });
  });

  it("on met en file ce qu'on peut payer, payé d'avance, jusqu'à la taille de la file", () => {
    let state = ok(player(RULES.tier), { type: "upgrade", organelle: "mitochondrion" });
    const before = state.resources.sugar;
    const queued = applyOrder(state, { type: "upgrade", organelle: "mitochondrion" }, state.now);
    if (!queued.ok) throw new Error("file refusée");
    // Le même organite, un niveau de plus que celui en chantier.
    expect(queued.state.buildQueue[0]).toMatchObject({ organelle: "mitochondrion", toLevel: 4 });
    expect(queued.state.resources.sugar).toBeLessThan(before);
    expect(queued.events).toContainEqual({
      type: "constructionQueued",
      at: state.now,
      organelle: "mitochondrion",
      toLevel: 4,
    });
    expect(plannedLevel(queued.state, "mitochondrion")).toBe(4);
    state = queued.state;
    // Bâtir un organite neuf peut aussi attendre ; on ne le bâtit pas deux fois.
    state = ok(state, { type: "build", organelle: "cilia" });
    expect(applyOrder(state, { type: "build", organelle: "cilia" }, state.now)).toEqual({
      ok: false,
      error: "alreadyBuilt",
    });
    while (state.buildQueue.length < RULES.size) {
      state = ok(state, { type: "upgrade", organelle: "vacuole" });
    }
    expect(applyOrder(state, { type: "upgrade", organelle: "ribosome" }, state.now)).toEqual({
      ok: false,
      error: "busy",
    });
    expect(deserializeState(serializeState(state))).toEqual(state);
  });

  it("chaque chantier démarre tout seul quand le précédent s'achève", () => {
    let state = ok(player(RULES.tier), { type: "upgrade", organelle: "mitochondrion" });
    state = ok(state, { type: "upgrade", organelle: "vacuole" });
    state = ok(state, { type: "upgrade", organelle: "mitochondrion" });
    const firstEnd = state.construction?.endsAt ?? 0;
    const step = advance(state, firstEnd);
    expect(step.state.organelles.mitochondrion).toBe(3);
    expect(step.state.construction).toMatchObject({ organelle: "vacuole", toLevel: 3 });
    expect(step.state.construction?.endsAt).toBeGreaterThan(firstEnd);
    expect(step.events).toContainEqual(
      expect.objectContaining({ type: "constructionStarted", at: firstEnd, organelle: "vacuole" }),
    );
    // Absent toute une journée : les trois chantiers sont faits.
    const later = advance(state, state.now + DAY_MS).state;
    expect(later.organelles).toMatchObject({ mitochondrion: 4, vacuole: 3 });
    expect(later.construction).toBeNull();
    expect(later.buildQueue).toEqual([]);
  });

  it("on retire le dernier de la file, et il est remboursé", () => {
    const start = ok(player(RULES.tier), { type: "upgrade", organelle: "mitochondrion" });
    expect(applyOrder(start, { type: "unqueue" }, start.now)).toEqual({
      ok: false,
      error: "queueEmpty",
    });
    const queued = ok(start, { type: "upgrade", organelle: "vacuole" });
    const back = ok(queued, { type: "unqueue" });
    expect(back.resources).toEqual(start.resources);
    expect(back.buildQueue).toEqual([]);
    expect(applyOrder(player(RULES.tier - 1), { type: "unqueue" }, start.now)).toEqual({
      ok: false,
      error: "locked",
    });
  });
});
