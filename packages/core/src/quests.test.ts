import { BALANCE, MUTATION_IDS, QUEST_IDS, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, QuestId } from "@o27/data";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  advance,
  applyOrder,
  createPlayer,
  DAY_MS,
  deserializeState,
  drawQuests,
  MICRO,
  placeOffer,
  preyOffer,
  questIsAmount,
  questsRenewAt,
  serializeState,
  visiblePlaces,
  visiblePrey,
  partyOf,
} from "./index";
import type { DailyQuests, OrderErrorCode, PlayerState, Quest } from "./index";

const T0 = 1_800_000_000_000;
const WORLD = { worldSeed: 27, slot: 4 };

/** Un joueur au palier 4, riche, avec ses quêtes du premier jour déjà tirées. */
function atTier4(seed = 7, overrides: Partial<PlayerState> = {}): PlayerState {
  const base = createPlayer(seed, T0, T0, WORLD);
  const ready: PlayerState = {
    ...base,
    tier: 4,
    counters: {
      ...base.counters,
      harvests: 10,
      organellesBuilt: 4,
      mutationsChosen: 1,
      mapHarvests: 5,
    },
    mutations: ["thrift"],
    organelles: { ...base.organelles, mitochondrion: 1, vacuole: 2, nursery: 1, nucleus: 3 },
    resources: { sugar: 300 * MICRO, bricks: 200 * MICRO, proteins: 0 },
    troops: partyOf({ hunter: 4, armored: 4, swift: 2 }),
    ...overrides,
  };
  return advance(ready, T0).state;
}

/** Remplace les quêtes du jour par celles qu'on veut tester. */
function withQuests(state: PlayerState, ...quests: [QuestId, number][]): PlayerState {
  const items: Quest[] = quests.map(([id, target]) => ({
    id,
    target: questIsAmount(id) ? target * MICRO : target,
    progress: 0,
    challenge: BALANCE.quests.pool[id].challenge,
    claimed: false,
  }));
  return { ...state, quests: { day: 1, items } };
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

function quest(state: PlayerState, index = 0): Quest {
  const found = state.quests?.items[index];
  if (found === undefined) throw new Error("quête attendue");
  return found;
}

function ids(quests: DailyQuests | null): QuestId[] {
  return (quests?.items ?? []).map((entry) => entry.id);
}

describe("tirage des quêtes du jour", () => {
  it("pas de quêtes avant le palier prévu, trois quêtes et un défi dès qu'on y arrive", () => {
    expect(advance(createPlayer(7, T0, T0, WORLD), T0 + 1000).state.quests).toBeNull();
    const quests = atTier4().quests;
    expect(quests?.day).toBe(1);
    expect(quests?.items.map((entry) => entry.challenge)).toEqual([false, false, false, true]);
    expect(new Set(ids(quests)).size).toBe(4);
  });

  it("chaque joueur a son propre tirage, et il ne suit aucune rotation", () => {
    const perPlayer = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) perPlayer.add(ids(atTier4(seed).quests).join(","));
    expect(perPlayer.size).toBeGreaterThan(40);

    // Pour un même joueur, la suite des jours ne se répète pas selon un cycle court.
    let state = atTier4(11);
    const days: string[] = [];
    for (let day = 1; day <= 27; day++) {
      days.push(ids(state.quests).slice(0, 3).sort().join(","));
      state = advance(state, T0 + day * DAY_MS).state;
    }
    for (const cycle of [1, 2, 3, 4, 5, 6, 7]) {
      const repeats = days.filter((entry, i) => i >= cycle && entry === days[i - cycle]).length;
      expect(repeats).toBeLessThan(4);
    }
  });

  it("sur une saison, toutes les quêtes finissent par sortir", () => {
    const seen = new Set<QuestId>();
    for (let seed = 1; seed <= 12; seed++) {
      let state = atTier4(seed);
      for (let day = 1; day <= 27; day++) {
        for (const id of ids(state.quests)) seen.add(id);
        state = advance(state, T0 + day * DAY_MS).state;
      }
    }
    // Les quêtes du palier des rivaux ne sortent pas pour un joueur qui n'y est pas encore.
    const expected = QUEST_IDS.filter((id) => BALANCE.quests.pool[id].tier <= 4);
    expect([...seen].sort()).toEqual([...expected].sort());
  });

  it("jamais les mêmes quêtes que la veille", () => {
    for (let seed = 1; seed <= 20; seed++) {
      let state = atTier4(seed);
      for (let day = 1; day <= 10; day++) {
        const before = ids(state.quests);
        state = advance(state, T0 + day * DAY_MS).state;
        expect(state.quests?.day).toBe(day + 1);
        for (const id of ids(state.quests)) expect(before).not.toContain(id);
      }
    }
  });

  it("l'objectif varie d'un jour à l'autre, dans les bornes prévues", () => {
    const targets = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const found = atTier4(seed).quests?.items.find((entry) => entry.id === "expeditions");
      if (found === undefined) continue;
      const { min, max } = BALANCE.quests.pool.expeditions;
      expect(found.target).toBeGreaterThanOrEqual(min);
      expect(found.target).toBeLessThanOrEqual(max);
      targets.add(found.target);
    }
    expect(targets.size).toBeGreaterThan(1);
  });

  it("ne propose jamais une quête impossible à faire", () => {
    for (let seed = 1; seed <= 80; seed++) {
      const maxed = atTier4(seed, { mutations: [...MUTATION_IDS] });
      const full: PlayerState = {
        ...maxed,
        organelles: { ...maxed.organelles, vacuole: BALANCE.higherRanks.maxLevel },
      };
      const drawn = ids(drawQuests({ ...full, quests: null }, 3));
      expect(drawn).not.toContain("mutate");
      expect(drawn).not.toContain("upgradeStore");
    }
  });

  it("le même joueur, le même jour, reçoit toujours le même tirage", () => {
    const state = atTier4(5);
    expect(drawQuests(state, 9)).toEqual(drawQuests(state, 9));
  });
});

describe("progression des quêtes", () => {
  it("toucher la cellule : le sucre récolté compte, sans dépasser l'objectif", () => {
    const start = withQuests({ ...atTier4(), resources: { sugar: 0, bricks: 0, proteins: 0 } }, [
      "tapSugar",
      5,
    ]);
    const once = ok(start, { type: "harvest", taps: 30 }, T0 + 5000);
    expect(quest(once).progress).toBe(3 * MICRO);
    const more = ok(once, { type: "harvest", taps: 30 }, T0 + 10_000);
    expect(quest(more).progress).toBe(5 * MICRO);
  });

  it("construire : compte à la fin du chantier ; améliorer la Réserve a sa propre quête", () => {
    const start = withQuests(atTier4(), ["build", 2], ["upgradeStore", 1]);
    const started = ok(start, { type: "upgrade", organelle: "mitochondrion" }, T0);
    expect(quest(started).progress).toBe(0);
    const done = advance(started, T0 + 3_600_000).state;
    expect(quest(done, 0).progress).toBe(1);
    expect(quest(done, 1).progress).toBe(0);
    const store = advance(
      ok(done, { type: "upgrade", organelle: "vacuole" }, T0 + 3_600_000),
      T0 + 7_200_000,
    ).state;
    expect(quest(store, 0).progress).toBe(2);
    expect(quest(store, 1).progress).toBe(1);
  });

  it("expéditions : nombre, butin par ressource, et expédition lointaine", () => {
    const places = visiblePlaces(WORLD.worldSeed, WORLD.slot);
    const far = places.find((place) => place.band === 2);
    const near = places.find((place) => place.band === 0);
    if (far === undefined || near === undefined) throw new Error("lieux attendus");
    const start = withQuests(
      { ...atTier4(), resources: { sugar: 0, bricks: 0, proteins: 0 } },
      ["expeditions", 3],
      ["farExpedition", 1],
      ["bricksFromMap", 500],
      ["sugarFromMap", 500],
    );
    const nearBack = advance(
      ok(start, { type: "sendExpedition", place: near.id }, T0),
      T0 + placeOffer(near).durationMs,
    ).state;
    expect(quest(nearBack, 0).progress).toBe(1);
    expect(quest(nearBack, 1).progress).toBe(0);
    const nearOffer = placeOffer(near);
    expect(quest(nearBack, nearOffer.resource === "bricks" ? 2 : 3).progress).toBe(nearOffer.loot);

    const t1 = T0 + placeOffer(near).durationMs;
    const farBack = advance(
      ok(nearBack, { type: "sendExpedition", place: far.id }, t1),
      t1 + placeOffer(far).durationMs,
    ).state;
    expect(quest(farBack, 0).progress).toBe(2);
    expect(quest(farBack, 1).progress).toBe(1);
  });

  it("une expédition rappelée ne compte pas", () => {
    const [near] = visiblePlaces(WORLD.worldSeed, WORLD.slot);
    if (near === undefined) throw new Error("lieu attendu");
    const start = withQuests(atTier4(), ["expeditions", 3]);
    const sent = ok(start, { type: "sendExpedition", place: near.id }, T0);
    const home = advance(ok(sent, { type: "cancelExpedition" }, T0 + 5000), T0 + 60_000).state;
    expect(quest(home).progress).toBe(0);
  });

  it("naissances et chasses : gagner, gagner en touchant, gagner sans perte", () => {
    const [prey] = visiblePrey(WORLD.worldSeed, WORLD.slot);
    if (prey === undefined) throw new Error("proie attendue");
    const strong = TROOP_IDS.find((id) => STRONG_AGAINST[id] === prey.kind) ?? "hunter";
    const start = withQuests(
      atTier4(7, { troops: partyOf({ hunter: 3, armored: 3, swift: 1 }) }),
      ["trainCells", 2],
      ["winHunts", 1],
      ["strikeWin", 1],
      ["cleanHunt", 1],
      ["challengeFarHunt", 1],
    );
    const born = advance(
      ok(start, { type: "trainTroop", troop: "swift", count: 2 }, T0),
      T0 + 60_000,
    ).state;
    expect(quest(born, 0).progress).toBe(2);

    const party = partyOf({ [strong]: born.troops[strong] });
    const sent = ok(born, { type: "sendHunt", prey: prey.id, party }, T0 + 60_000);
    const struck = ok(sent, { type: "strikeHunt" }, sent.hunt?.arrivesAt ?? T0);
    expect(quest(struck, 2).progress).toBe(1);
    expect(quest(struck, 1).progress).toBe(0);
    const home = advance(struck, T0 + 60_000 + preyOffer(prey).durationMs).state;
    expect(quest(home, 1).progress).toBe(1);
    expect(quest(home, 3).progress).toBe(1);
    // La proie proche n'est pas la proie lointaine du défi.
    expect(quest(home, 4).progress).toBe(0);
  });

  it("choisir une mutation compte", () => {
    const start = withQuests(
      { ...atTier4(), resources: { sugar: 0, bricks: 0, proteins: 50 * MICRO } },
      ["mutate", 1],
    );
    const offered = ok(start, { type: "buyMutation" }, T0);
    const [choice] = offered.mutationOffer ?? [];
    if (choice === undefined) throw new Error("choix attendu");
    expect(quest(ok(offered, { type: "chooseMutation", mutation: choice }, T0)).progress).toBe(1);
  });
});

describe("coffres", () => {
  const done = (): PlayerState => {
    const start = withQuests(
      { ...atTier4(), resources: { sugar: 0, bricks: 0, proteins: 0 } },
      ["tapSugar", 2],
      ["challengeHunts", 3],
    );
    return ok(start, { type: "harvest", taps: 20 }, T0 + 5000);
  };

  it("une quête terminée donne un coffre, à ouvrir une seule fois", () => {
    const state = done();
    const before = state.resources.sugar + state.resources.bricks + state.resources.proteins;
    const result = applyOrder(state, { type: "claimQuest", index: 0 }, T0 + 6000);
    if (!result.ok) throw new Error("coffre attendu");
    const opened = result.events.find((event) => event.type === "chestOpened");
    if (opened?.type !== "chestOpened") throw new Error("événement attendu");
    expect(Object.keys(opened.loot)).toHaveLength(1);
    const after = result.state;
    const total = after.resources.sugar + after.resources.bricks + after.resources.proteins;
    expect(total > before || after.energy > state.energy).toBe(true);
    expect(quest(after).claimed).toBe(true);
    expect(refusal(after, { type: "claimQuest", index: 0 }, T0 + 7000)).toBe("alreadyClaimed");
  });

  it("refuse d'ouvrir le coffre d'une quête pas finie ou qui n'existe pas", () => {
    const state = done();
    expect(refusal(state, { type: "claimQuest", index: 1 }, T0 + 6000)).toBe("questNotDone");
    expect(refusal(state, { type: "claimQuest", index: 7 }, T0 + 6000)).toBe("noQuest");
  });

  it("le coffre d'un défi contient deux récompenses, plus grosses", () => {
    const base = atTier4();
    const quests: DailyQuests = {
      day: 1,
      items: [{ id: "challengeHunts", target: 3, progress: 3, challenge: true, claimed: false }],
    };
    const result = applyOrder({ ...base, quests }, { type: "claimQuest", index: 0 }, T0 + 1000);
    if (!result.ok) throw new Error("coffre attendu");
    const opened = result.events.find((event) => event.type === "chestOpened");
    if (opened?.type !== "chestOpened") throw new Error("événement attendu");
    expect(Object.keys(opened.loot)).toHaveLength(BALANCE.chests.challengeDraws);
    for (const [kind, amount] of Object.entries(opened.loot)) {
      expect(amount).toBe(BALANCE.chests.challenge[kind as keyof typeof BALANCE.chests.challenge]);
    }
  });

  it("un coffre est un cadeau : son contenu entre même si la réserve ou la jauge est pleine", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const base = atTier4(seed);
      const full: PlayerState = {
        ...base,
        energy: BALANCE.energy.max,
        resources: { sugar: 9000 * MICRO, bricks: 9000 * MICRO, proteins: 9000 * MICRO },
        quests: {
          day: 1,
          items: [{ id: "build", target: 1, progress: 1, challenge: false, claimed: false }],
        },
      };
      const after = ok(full, { type: "claimQuest", index: 0 }, T0 + 1000);
      const gained =
        after.resources.sugar +
        after.resources.bricks +
        after.resources.proteins -
        27_000 * MICRO +
        (after.energy - full.energy) * MICRO;
      expect(gained).toBeGreaterThan(0);
    }
  });

  it("à minuit : les coffres gagnés non ouverts sont mis de côté, puis de nouvelles quêtes arrivent", () => {
    const state = done();
    expect(questsRenewAt(state)).toBe(T0 + DAY_MS);
    const almost = advance(state, T0 + DAY_MS - 1);
    expect(almost.state.quests?.day).toBe(1);
    const next = advance(state, T0 + DAY_MS);
    expect(next.state.quests?.day).toBe(2);
    // Rien n'est perdu, et rien ne s'ouvre sans le joueur : le coffre l'attend.
    expect(next.events.filter((event) => event.type === "chestOpened")).toHaveLength(0);
    expect(next.events.filter((event) => event.type === "chestEarned")).toHaveLength(1);
    expect(next.state.chests).toHaveLength(1);
    expect(next.state.chests[0]?.kind).toBe("quest");
    expect(next.state.resources).toEqual(almost.state.resources);
    expect(next.state.quests?.items.every((entry) => entry.progress === 0)).toBe(true);
  });

  it("ce qui se passe après minuit compte pour les quêtes du nouveau jour", () => {
    const [near] = visiblePlaces(WORLD.worldSeed, WORLD.slot);
    if (near === undefined) throw new Error("lieu attendu");
    const start = withQuests(atTier4(), ["expeditions", 4]);
    const late = T0 + DAY_MS - 10_000;
    const sent = ok(start, { type: "sendExpedition", place: near.id }, late);
    const after = advance(sent, T0 + DAY_MS + 3_600_000).state;
    const counted = after.quests?.items.find(
      (entry) => entry.id === "expeditions" || entry.id === "challengeExpeditions",
    );
    if (counted !== undefined) expect(counted.progress).toBe(1);
    expect(after.quests?.day).toBe(2);
  });
});

describe("garanties du moteur avec les quêtes", () => {
  const order = fc.oneof(
    fc.constantFrom<Order>(
      { type: "harvest", taps: 5 },
      { type: "upgrade", organelle: "mitochondrion" },
      { type: "upgrade", organelle: "vacuole" },
      { type: "trainTroop", troop: "swift", count: 2 },
      { type: "strikeHunt" },
      { type: "buyMutation" },
    ),
    fc.integer({ min: 0, max: 4 }).map((index): Order => ({ type: "claimQuest", index })),
    fc
      .constantFrom(...visiblePlaces(WORLD.worldSeed, WORLD.slot))
      .map((place): Order => ({ type: "sendExpedition", place: place.id })),
    fc.constantFrom(...visiblePrey(WORLD.worldSeed, WORLD.slot)).map((prey): Order => ({
      type: "sendHunt",
      prey: prey.id,
      party: partyOf({ hunter: 2, armored: 2, swift: 1 }),
    })),
  );
  // Des attentes parfois longues : on traverse plusieurs minuits.
  const steps = fc.array(
    fc.tuple(
      order,
      fc.oneof(fc.integer({ min: 0, max: 600_000 }), fc.integer({ min: 0, max: 30 * 3_600_000 })),
    ),
    { minLength: 1, maxLength: 40 },
  );

  it("un coffre ne s'ouvre jamais deux fois et l'avancement ne dépasse jamais l'objectif", () => {
    fc.assert(
      fc.property(steps, (sequence) => {
        let state = atTier4();
        let now = T0;
        let opened = 0;
        let claimable = 0;
        for (const [next, wait] of sequence) {
          now += wait;
          const result = applyOrder(state, next, now);
          const step = result.ok ? result : advance(state, now);
          opened += step.events.filter((event) => event.type === "chestOpened").length;
          state = step.state;
          for (const entry of state.quests?.items ?? []) {
            expect(entry.progress).toBeGreaterThanOrEqual(0);
            expect(entry.progress).toBeLessThanOrEqual(entry.target);
          }
          expect(state.quests?.day).toBe(Math.floor((now - T0) / DAY_MS) + 1);
          claimable = Math.max(claimable, opened);
        }
        expect(opened).toBeLessThanOrEqual(4 * (Math.floor((now - T0) / DAY_MS) + 1));
      }),
    );
  });

  it("avancer en une fois ou en plusieurs donne le même état, même à travers plusieurs minuits", () => {
    fc.assert(
      fc.property(
        steps,
        fc.array(fc.integer({ min: 1, max: 40 * 3_600_000 }), { minLength: 1, maxLength: 6 }),
        (sequence, pauses) => {
          let state = atTier4();
          let now = T0;
          for (const [next, wait] of sequence) {
            now += wait;
            const result = applyOrder(state, next, now);
            if (result.ok) state = result.state;
          }
          const end = now + pauses.reduce((sum, pause) => sum + pause, 0);
          let stepped = state;
          let at = now;
          for (const pause of pauses) {
            at += pause;
            stepped = advance(stepped, at).state;
          }
          expect(serializeState(stepped)).toBe(serializeState(advance(state, end).state));
        },
      ),
    );
    // Cent parties rejouées sur plusieurs jours : plus long que les 5 s par défaut quand toute la
    // suite tourne en même temps. On garde toutes les parties ; on attend plus longtemps.
  }, 20_000);

  it("sauvegarder puis relire rend les mêmes quêtes", () => {
    const state = ok(atTier4(), { type: "harvest", taps: 5 }, T0 + 5000);
    expect(deserializeState(serializeState(state))).toEqual(state);
  });

  it("une sauvegarde d'avant les quêtes en reçoit dès que le temps avance", () => {
    const current = JSON.parse(serializeState(atTier4())) as Record<string, unknown>;
    const old = Object.fromEntries(Object.entries(current).filter(([key]) => key !== "quests"));
    const back = deserializeState(JSON.stringify({ ...old, version: 3 }));
    expect(back.quests).toBeNull();
    expect(advance(back, T0 + 1000).state.quests?.items).toHaveLength(4);
  });

  it("refuse une sauvegarde dont les quêtes sont abîmées", () => {
    const text = serializeState(atTier4());
    expect(() => deserializeState(text.replace(/"id":"[a-zA-Z]+"/, '"id":"tricher"'))).toThrow(
      TypeError,
    );
    expect(() => deserializeState(text.replace('"claimed":false', '"claimed":1'))).toThrow(
      TypeError,
    );
  });
});
