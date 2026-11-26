import { BALANCE, MAX_RELEASED_TIER, MUTATION_IDS, ORGANELLE_IDS, RESOURCE_IDS } from "@o27/data";
import type { Order } from "@o27/data";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  advance,
  applyOrder,
  capacity,
  createPlayer,
  DAY_MS,
  describeCreature,
  deserializeState,
  levelCost,
  levelDuration,
  MICRO,
  productionRate,
  seasonDay,
  serializeState,
  summarizeAbsence,
  tapYield,
} from "./index";
import type { OrderErrorCode, PlayerState } from "./index";

const T0 = 1_800_000_000_000;

function fresh(seed = 7): PlayerState {
  return createPlayer(seed, T0, T0);
}

/** Donne des ressources sans passer par le jeu, pour aller droit au cas testé. */
function give(state: PlayerState, sugar: number, bricks = 0): PlayerState {
  return { ...state, resources: { sugar: sugar * MICRO, bricks: bricks * MICRO, proteins: 0 } };
}

function ok(state: PlayerState, order: Order, now: number): PlayerState {
  const result = applyOrder(state, order, now);
  if (!result.ok) throw new Error(`ordre refusé : ${result.error}`);
  return result.state;
}

function refusal(state: PlayerState, order: Order, now: number): OrderErrorCode | null {
  const result = applyOrder(state, order, now);
  return result.ok ? null : result.error;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Un joueur au palier 1, sans rien de construit. */
function atTier1(seed = 7): PlayerState {
  return {
    ...ok(fresh(seed), { type: "harvest", taps: 10 }, T0),
    resources: { sugar: 0, bricks: 0, proteins: 0 },
  };
}

/** Un joueur qui vient d'atteindre le palier 2, avec ses trois organites du palier 1. */
function atTier2(seed = 7): PlayerState {
  let state = atTier1(seed);
  let now = T0;
  for (const organelle of ["mitochondrion", "vacuole", "cilia"] as const) {
    state = ok(give(state, 1000), { type: "build", organelle }, now);
    now += levelDuration(state, organelle, 1);
    state = advance(state, now).state;
  }
  return state;
}

describe("palier 0 : une cellule, un geste", () => {
  it("un nouveau joueur n'a rien d'autre qu'une cellule vide, et son Noyau", () => {
    const state = fresh();
    expect(state.tier).toBe(0);
    expect(state.resources).toEqual({ sugar: 0, bricks: 0, proteins: 0 });
    expect(state.organelles.nucleus).toBe(1);
    expect(ORGANELLE_IDS.every((id) => id === "nucleus" || state.organelles[id] === 0)).toBe(true);
  });

  it("seul l'ordre de récolte est accepté", () => {
    const state = give(fresh(), 1000, 1000);
    expect(refusal(state, { type: "build", organelle: "mitochondrion" }, T0)).toBe("locked");
    expect(refusal(state, { type: "upgrade", organelle: "mitochondrion" }, T0)).toBe("locked");
    expect(refusal(state, { type: "chooseMutation", mutation: "thrift" }, T0)).toBe("locked");
    expect(refusal(fresh(), { type: "harvest", taps: 1 }, T0)).toBeNull();
  });

  it("le premier toucher rapporte du sucre, le dixième ouvre le palier 1", () => {
    const result = applyOrder(fresh(), { type: "harvest", taps: 1 }, T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.resources.sugar).toBe(BALANCE.tap.yieldMilli * 1000);
    expect(result.state.tier).toBe(0);
    expect(result.events.map((e) => e.type)).toEqual(["harvested"]);

    const tenth = applyOrder(result.state, { type: "harvest", taps: 9 }, T0);
    expect(tenth.ok).toBe(true);
    if (!tenth.ok) return;
    expect(tenth.state.tier).toBe(1);
    expect(tenth.events.map((e) => e.type)).toEqual(["harvested", "tierReached"]);
  });
});

describe("récolte", () => {
  it("limite le nombre de touchers comptés d'un coup", () => {
    const state = ok(fresh(), { type: "harvest", taps: 100 }, T0);
    expect(state.counters.harvests).toBe(BALANCE.tap.burst);
    expect(refusal(state, { type: "harvest", taps: 1 }, T0)).toBe("tooFast");
  });

  it("le budget de touchers revient avec le temps", () => {
    const spent = ok(fresh(), { type: "harvest", taps: 100 }, T0);
    const later = ok(spent, { type: "harvest", taps: 100 }, T0 + 1000);
    expect(later.counters.harvests - spent.counters.harvests).toBe(
      1000 / BALANCE.tap.minIntervalMs,
    );
  });

  it("ne dépasse jamais le stockage, et refuse quand il est plein", () => {
    const full = give(fresh(), BALANCE.baseStorage.sugar - 1);
    const state = ok(full, { type: "harvest", taps: 10 }, T0);
    expect(state.resources.sugar).toBe(capacity(state, "sugar"));
    expect(refusal(state, { type: "harvest", taps: 1 }, T0 + 5000)).toBe("storageFull");
  });
});

describe("palier 1 : construire", () => {
  it("accepte la construction, refuse l'amélioration et les organites du palier 2", () => {
    const state = give(atTier1(), 1000, 1000);
    expect(refusal(state, { type: "build", organelle: "mitochondrion" }, T0)).toBeNull();
    expect(refusal(state, { type: "build", organelle: "ribosome" }, T0)).toBe("locked");
    expect(refusal(state, { type: "upgrade", organelle: "mitochondrion" }, T0)).toBe("locked");
    expect(refusal(state, { type: "chooseMutation", mutation: "thrift" }, T0)).toBe("locked");
  });

  it("la construction coûte, dure, puis produit", () => {
    const start = give(atTier1(), 1);
    const building = ok(start, { type: "build", organelle: "mitochondrion" }, T0);
    expect(building.resources.sugar).toBe(0);
    expect(building.construction?.endsAt).toBe(T0 + 5000);
    expect(productionRate(building, "sugar")).toBe(0);

    const done = advance(building, T0 + 5000);
    expect(done.state.organelles.mitochondrion).toBe(1);
    expect(done.state.construction).toBeNull();
    expect(done.events.map((e) => e.type)).toEqual(["constructionDone"]);

    const later = advance(done.state, T0 + 15_000).state;
    expect(later.resources.sugar).toBe(5 * MICRO);
  });

  it("refuse : pas assez, déjà en chantier, déjà construit", () => {
    const poor = atTier1();
    expect(refusal(poor, { type: "build", organelle: "vacuole" }, T0)).toBe("insufficient");
    const building = ok(give(poor, 1000), { type: "build", organelle: "mitochondrion" }, T0);
    expect(refusal(building, { type: "build", organelle: "vacuole" }, T0)).toBe("busy");
    const built = advance(building, T0 + 5000).state;
    expect(refusal(built, { type: "build", organelle: "mitochondrion" }, T0 + 5000)).toBe(
      "alreadyBuilt",
    );
  });

  it("la réserve agrandit le stockage ; rien n'augmente le toucher, qui vaut un dixième", () => {
    const state = atTier2();
    expect(capacity(state, "sugar")).toBe((BALANCE.baseStorage.sugar + 260) * MICRO);
    expect(tapYield()).toBe(MICRO / 10);
    expect(BALANCE.organelles.cilia.effect.kind).toBe("bonus");
  });
});

describe("palier 2 : muter", () => {
  it("le troisième organite ouvre le palier 2 et propose des mutations", () => {
    const state = atTier2();
    expect(state.tier).toBe(2);
    expect(state.counters.organellesBuilt).toBe(3);
    expect(state.mutationOffer).toHaveLength(BALANCE.mutationOffer.choices);
    expect(new Set(state.mutationOffer).size).toBe(BALANCE.mutationOffer.choices);
  });

  it("le choix d'une mutation change la créature, une seule fois", () => {
    const state = atTier2();
    const offer = state.mutationOffer ?? [];
    const outside = MUTATION_IDS.find((id) => !offer.includes(id));
    const [first] = offer;
    if (outside === undefined || first === undefined) throw new Error("offre inattendue");
    const now = state.now;
    expect(refusal(state, { type: "chooseMutation", mutation: outside }, now)).toBe("notInOffer");

    const mutated = ok(state, { type: "chooseMutation", mutation: first }, now);
    expect(mutated.mutations).toEqual([first]);
    expect(mutated.mutationOffer).toBeNull();
    expect(describeCreature(mutated).traits).toEqual([BALANCE.mutations[first].trait]);
    expect(refusal(mutated, { type: "chooseMutation", mutation: first }, now)).toBe("noOffer");
  });

  it("ne dépasse pas le dernier palier livré", () => {
    const state = atTier2();
    const [first] = state.mutationOffer ?? [];
    if (first === undefined) throw new Error("offre inattendue");
    const mutated = ok(state, { type: "chooseMutation", mutation: first }, state.now);
    expect(mutated.counters.mutationsChosen).toBe(1);
    expect(mutated.tier).toBe(3);
  });

  it("ouvre la fabrique et l'amélioration", () => {
    const tier2 = atTier2();
    const state = give({ ...tier2, organelles: { ...tier2.organelles, nucleus: 2 } }, 1000, 1000);
    const now = state.now;
    expect(refusal(state, { type: "build", organelle: "ribosome" }, now)).toBeNull();
    expect(refusal(state, { type: "upgrade", organelle: "ribosome" }, now)).toBe("notBuilt");
    const upgrading = ok(state, { type: "upgrade", organelle: "mitochondrion" }, now);
    const cost = levelCost(state, "mitochondrion", 2);
    expect(cost.bricks).toBeGreaterThan(0);
    expect(upgrading.resources.bricks).toBe(state.resources.bricks - cost.bricks);
    const done = advance(upgrading, now + levelDuration(state, "mitochondrion", 2)).state;
    expect(done.organelles.mitochondrion).toBe(2);
    expect(done.counters.organellesBuilt).toBe(3);
  });

  it("refuse d'améliorer au-delà du niveau maximal", () => {
    const base = atTier2();
    const maxed: PlayerState = {
      ...give(base, 100_000, 100_000),
      organelles: { ...base.organelles, mitochondrion: BALANCE.higherRanks.maxLevel },
    };
    expect(refusal(maxed, { type: "upgrade", organelle: "mitochondrion" }, maxed.now)).toBe(
      "maxLevel",
    );
  });

  it("une même graine donne la même offre, deux graines des créatures différentes", () => {
    expect(atTier2(11).mutationOffer).toEqual(atTier2(11).mutationOffer);
    expect(describeCreature(atTier2(11))).toEqual(describeCreature(atTier2(11)));
    const hues = new Set([1, 2, 3, 4, 5, 6].map((seed) => describeCreature(fresh(seed)).hue));
    expect(hues.size).toBeGreaterThan(1);
  });
});

describe("temps", () => {
  it("refuse une heure antérieure à l'état", () => {
    expect(refusal(fresh(), { type: "harvest", taps: 1 }, T0 - 1)).toBe("timeBackwards");
    expect(() => advance(fresh(), T0 - 1)).toThrow(RangeError);
  });

  it("compte les jours de saison à partir de 1", () => {
    const state = fresh();
    expect(seasonDay(state, T0)).toBe(1);
    expect(seasonDay(state, T0 + DAY_MS - 1)).toBe(1);
    expect(seasonDay(state, T0 + DAY_MS)).toBe(2);
  });

  it("résume une absence", () => {
    const before = ok(give(atTier1(), 1), { type: "build", organelle: "mitochondrion" }, T0);
    const step = advance(before, T0 + 8 * 3_600_000);
    const summary = summarizeAbsence(before, step.state, step.events);
    expect(summary.elapsedMs).toBe(8 * 3_600_000);
    expect(summary.constructionsDone).toEqual([{ organelle: "mitochondrion", level: 1 }]);
    expect(summary.gained.sugar).toBe(capacity(step.state, "sugar"));
  });
});

describe("garanties du moteur", () => {
  it("ne modifie jamais l'état reçu", () => {
    const state = deepFreeze(give(atTier2(), 1000, 1000));
    const copy = serializeState(state);
    applyOrder(state, { type: "harvest", taps: 5 }, state.now + 1000);
    applyOrder(state, { type: "build", organelle: "ribosome" }, state.now + 1000);
    advance(state, state.now + 100_000);
    expect(serializeState(state)).toBe(copy);
  });

  it("un ordre refusé ne change rien", () => {
    const state = atTier1();
    const result = applyOrder(state, { type: "build", organelle: "cilia" }, T0 + 60_000);
    expect(result).toEqual({ ok: false, error: "insufficient" });
  });

  const orderArb: fc.Arbitrary<Order> = fc.oneof(
    fc.record({ type: fc.constant("harvest" as const), taps: fc.integer({ min: 1, max: 100 }) }),
    fc.record({
      type: fc.constant("build" as const),
      organelle: fc.constantFrom(...ORGANELLE_IDS),
    }),
    fc.record({
      type: fc.constant("upgrade" as const),
      organelle: fc.constantFrom(...ORGANELLE_IDS),
    }),
    fc.record({
      type: fc.constant("chooseMutation" as const),
      mutation: fc.constantFrom(...MUTATION_IDS),
    }),
  );
  const stepArb = fc.record({ wait: fc.integer({ min: 0, max: 120_000 }), order: orderArb });
  const gameArb = fc.record({
    seed: fc.integer({ min: 0, max: 2 ** 32 - 1 }),
    steps: fc.array(stepArb, { maxLength: 150 }),
  });

  function play(seed: number, steps: readonly { wait: number; order: Order }[]): PlayerState[] {
    const history = [createPlayer(seed, T0, T0)];
    let state = history[0];
    let now = T0;
    for (const step of steps) {
      if (state === undefined) break;
      now += step.wait;
      const result = applyOrder(state, step.order, now);
      state = result.ok ? result.state : advance(state, now).state;
      history.push(state);
    }
    return history;
  }

  it("quoi que fasse le joueur, les invariants tiennent", () => {
    fc.assert(
      fc.property(gameArb, ({ seed, steps }) => {
        const history = play(seed, steps);
        let previous = history[0];
        for (const state of history) {
          if (previous === undefined) break;
          for (const id of RESOURCE_IDS) {
            expect(Number.isSafeInteger(state.resources[id])).toBe(true);
            expect(state.resources[id]).toBeGreaterThanOrEqual(0);
            expect(state.resources[id]).toBeLessThanOrEqual(capacity(state, id));
          }
          expect(state.now).toBeGreaterThanOrEqual(previous.now);
          expect(state.tier).toBeGreaterThanOrEqual(previous.tier);
          expect(state.tier).toBeLessThanOrEqual(MAX_RELEASED_TIER);
          expect(state.counters.harvests).toBeGreaterThanOrEqual(previous.counters.harvests);
          expect(state.mutations.length).toBeLessThanOrEqual(1);
          for (const id of ORGANELLE_IDS) {
            expect(state.organelles[id]).toBeLessThanOrEqual(BALANCE.organelles[id].maxLevel);
            if (BALANCE.organelles[id].tier > state.tier) expect(state.organelles[id]).toBe(0);
          }
          expect(deserializeState(serializeState(state))).toEqual(state);
          previous = state;
        }
      }),
      { numRuns: 200 },
    );
  });

  it("rejouer les mêmes ordres redonne exactement le même état", () => {
    fc.assert(
      fc.property(gameArb, ({ seed, steps }) => {
        const first = play(seed, steps).at(-1);
        const second = play(seed, steps).at(-1);
        if (first === undefined || second === undefined) throw new Error("partie vide");
        expect(serializeState(second)).toBe(serializeState(first));
      }),
      { numRuns: 100 },
    );
  });

  it("avancer en une fois ou en deux fois donne le même état", () => {
    fc.assert(
      fc.property(
        gameArb,
        fc.integer({ min: 0, max: 600_000 }),
        fc.integer({ min: 0, max: 600_000 }),
        ({ seed, steps }, a, b) => {
          const state = play(seed, steps).at(-1);
          if (state === undefined) throw new Error("partie vide");
          const once = advance(state, state.now + a + b).state;
          const twice = advance(advance(state, state.now + a).state, state.now + a + b).state;
          expect(serializeState(twice)).toBe(serializeState(once));
        },
      ),
      { numRuns: 200 },
    );
  });

  it("refuse une sauvegarde abîmée", () => {
    const good = serializeState(atTier2());
    expect(() => deserializeState(good.replace('"version":11', '"version":99'))).toThrow(TypeError);
    expect(() => deserializeState(good.replace('"sugar":', '"sucre":'))).toThrow(TypeError);
    expect(() => deserializeState("[]")).toThrow(TypeError);
  });
});
