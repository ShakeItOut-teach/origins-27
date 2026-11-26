import { BALANCE, MUTATION_IDS, PREY_KINDS, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, TroopId } from "@o27/data";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  advance,
  applyOrder,
  capacity,
  createPlayer,
  deserializeState,
  lossesFor,
  MICRO,
  maxTrainable,
  nextMutationPrice,
  partyPower,
  partySize,
  preyOffer,
  serializeState,
  strikeChance,
  canTrain,
  trainMs,
  troopsOwned,
  upkeepRate,
  unattendedChance,
  visiblePrey,
  winChance,
  partyOf,
} from "./index";
import type { OrderErrorCode, Prey, PlayerState } from "./index";

const T0 = 1_800_000_000_000;
const WORLD = { worldSeed: 27, slot: 4 };
const WINDOW = BALANCE.hunt.strikeWindowSeconds * 1000;
const NONE = partyOf();

function party(values: Partial<Record<TroopId, number>>): Record<TroopId, number> {
  return { ...NONE, ...values };
}

/** Un joueur au palier 4, Pouponnière construite, riche, avec les cellules filles demandées. */
function atTier4(troops: Partial<Record<TroopId, number>> = {}, seed = 7): PlayerState {
  const base = createPlayer(seed, T0, T0, WORLD);
  return {
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
    organelles: { ...base.organelles, vacuole: 5, nursery: 1 },
    resources: { sugar: 500 * MICRO, bricks: 300 * MICRO, proteins: 0 },
    troops: party(troops),
  };
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

function prey(band: number): Prey {
  const found = visiblePrey(WORLD.worldSeed, WORLD.slot).find((entry) => entry.band === band);
  if (found === undefined) throw new Error("proie attendue");
  return found;
}

/** Le type de cellule fille qui compte double contre cette proie. */
function strongType(target: Prey): TroopId {
  const found = TROOP_IDS.find((id) => STRONG_AGAINST[id] === target.kind);
  if (found === undefined) throw new Error("type attendu");
  return found;
}

function hunt(target: Prey, group: Record<TroopId, number>): Order {
  return { type: "sendHunt", prey: target.id, party: group };
}

describe("les proies de la goutte", () => {
  it("tout joueur voit trois proies, une par distance et une de chaque sorte", () => {
    for (let slot = 0; slot < 500; slot++) {
      const seen = visiblePrey(27, slot);
      expect(seen.map((entry) => entry.band)).toEqual([0, 1, 2]);
      expect(new Set(seen.map((entry) => entry.kind)).size).toBe(PREY_KINDS.length);
      expect(new Set(seen.map((entry) => entry.id)).size).toBe(3);
      expect(seen.every((entry) => entry.id.startsWith("h:"))).toBe(true);
    }
  });

  it("plus la proie est loin, plus elle est forte et plus elle rapporte", () => {
    const [near, mid, far] = [0, 1, 2].map((band) => preyOffer(prey(band)));
    if (near === undefined || mid === undefined || far === undefined) throw new Error("offres");
    expect(mid.power).toBeGreaterThan(near.power);
    expect(far.power).toBeGreaterThan(mid.power);
    expect(far.proteins).toBeGreaterThan(mid.proteins);
    expect(far.durationMs).toBeGreaterThan(mid.durationMs);
  });
});

describe("force, chances et pertes", () => {
  it("la cellule du bon type compte double", () => {
    expect(partyPower(party({ hunter: 3 }), "soft")).toBe(6);
    expect(partyPower(party({ hunter: 3 }), "fleeing")).toBe(3);
    expect(partyPower(party(partyOf({ hunter: 1, armored: 1, swift: 1 })), "aggressive")).toBe(4);
  });

  it("à force égale, une chance sur deux ; jamais 0 ni 100", () => {
    expect(winChance(party({ swift: 6 }), "soft", 6)).toBe(50);
    expect(winChance(party({ hunter: 3 }), "soft", 6)).toBe(50);
    expect(winChance(party({ hunter: 500 }), "soft", 1)).toBe(99);
    expect(winChance(party({ swift: 1 }), "soft", 500)).toBe(1);
  });

  it("toucher : victoire certaine à partir d'une chance sur quatre, chances doublées en dessous", () => {
    const limit = BALANCE.hunt.certainFromPercent;
    expect(strikeChance(limit)).toBe(100);
    expect(strikeChance(80)).toBe(100);
    expect(strikeChance(limit - 1)).toBe(2 * (limit - 1));
    expect(strikeChance(10)).toBe(20);
  });

  it("on perd moins en gagnant qu'en perdant, et jamais tout le groupe", () => {
    fc.assert(
      fc.property(
        fc.record({
          hunter: fc.integer({ min: 0, max: 40 }),
          armored: fc.integer({ min: 0, max: 40 }),
          swift: fc.integer({ min: 0, max: 40 }),
        }),
        fc.integer({ min: 1, max: 99 }),
        (some, chance) => {
          const group = partyOf(some);
          fc.pre(partySize(group) > 0);
          const win = lossesFor(group, chance, true);
          const defeat = lossesFor(group, chance, false);
          expect(partySize(win)).toBeLessThanOrEqual(partySize(defeat));
          expect(partySize(defeat)).toBeLessThan(partySize(group));
          for (const id of TROOP_IDS) {
            expect(win[id]).toBeGreaterThanOrEqual(0);
            expect(defeat[id]).toBeLessThanOrEqual(group[id]);
          }
        },
      ),
    );
  });
});

describe("la Pouponnière", () => {
  it("s'ouvre au palier 4 ; chaque niveau accélère les naissances", () => {
    const state = atTier4();
    expect(canTrain(state)).toBe(true);
    expect(canTrain({ ...state, organelles: { ...state.organelles, nursery: 0 } })).toBe(false);
    const base = BALANCE.troops.hunter.seconds * 1000;
    expect(trainMs({ ...state, organelles: { ...state.organelles, nursery: 1 } }, "hunter")).toBe(
      base,
    );
    const fast = trainMs({ ...state, organelles: { ...state.organelles, nursery: 5 } }, "hunter");
    expect(fast).toBe(Math.floor(base / 2));
    const tier3 = { ...state, tier: 3, counters: { ...state.counters, mapHarvests: 0 } };
    expect(refusal(tier3, { type: "build", organelle: "nursery" }, T0)).toBe("locked");
    expect(refusal(tier3, { type: "trainTroop", troop: "hunter", count: 1 }, T0)).toBe("locked");
  });

  it("les cellules filles naissent l'une après l'autre, payées d'avance", () => {
    const cost = BALANCE.troops.swift.cost;
    const start = atTier4();
    const seconds = trainMs(start, "swift");
    const ordered = ok(start, { type: "trainTroop", troop: "swift", count: 3 }, T0);
    expect(ordered.resources.sugar).toBe(start.resources.sugar - 3 * cost.sugar * MICRO);
    expect(ordered.resources.bricks).toBe(start.resources.bricks - 3 * cost.bricks * MICRO);
    expect(ordered.troops.swift).toBe(0);
    expect(advance(ordered, T0 + seconds - 1).state.troops.swift).toBe(0);
    expect(advance(ordered, T0 + seconds).state.troops.swift).toBe(1);
    expect(advance(ordered, T0 + 2 * seconds).state.troops.swift).toBe(2);
    const done = advance(ordered, T0 + 3 * seconds);
    expect(done.state.troops.swift).toBe(3);
    expect(done.state.training).toBeNull();
    expect(done.events.filter((event) => event.type === "troopBorn")).toHaveLength(3);
  });

  it("aucun plafond de nombre ; « Max » dépense jusqu'à 90 % des ressources", () => {
    const rich = {
      ...atTier4(),
      resources: {
        sugar: 1_000_000 * MICRO,
        bricks: 1_000_000 * MICRO,
        proteins: 1_000_000 * MICRO,
      },
    };
    const cost = BALANCE.troops.swift.cost;
    const most = maxTrainable(rich, "swift");
    const bySugar = Math.floor((1_000_000 * 90) / (100 * cost.sugar));
    const byBricks = cost.bricks > 0 ? Math.floor((1_000_000 * 90) / (100 * cost.bricks)) : bySugar;
    expect(most).toBe(Math.min(bySugar, byBricks));
    expect(most).toBeGreaterThan(20);
    const ordered = ok(rich, { type: "trainTroop", troop: "swift", count: most }, T0);
    expect(ordered.training?.remaining).toBe(most);
    expect(ordered.resources.sugar).toBeGreaterThanOrEqual(rich.resources.sugar / 10);
    expect(
      maxTrainable({ ...rich, resources: { sugar: 0, bricks: 0, proteins: 0 } }, "swift"),
    ).toBe(0);
  });

  it("refuse : sans Pouponnière, pendant une naissance, sans ressources", () => {
    const start = atTier4();
    const noNursery = { ...start, organelles: { ...start.organelles, nursery: 0 } };
    expect(refusal(noNursery, { type: "trainTroop", troop: "hunter", count: 1 }, T0)).toBe(
      "notBuilt",
    );
    const busy = ok(start, { type: "trainTroop", troop: "hunter", count: 1 }, T0);
    expect(refusal(busy, { type: "trainTroop", troop: "hunter", count: 1 }, T0)).toBe("busy");
    const poor = { ...start, resources: { sugar: MICRO, bricks: 0, proteins: 0 } };
    expect(refusal(poor, { type: "trainTroop", troop: "hunter", count: 1 }, T0)).toBe(
      "insufficient",
    );
  });

  it("il n'y a plus de plafond : on fait naître autant de cellules qu'on peut en payer", () => {
    const rich = {
      ...atTier4({ hunter: 60, swift: 40 }),
      resources: { sugar: 5000 * MICRO, bricks: 5000 * MICRO, proteins: 0 },
    };
    const ordered = ok(rich, { type: "trainTroop", troop: "hunter", count: 20 }, T0);
    expect(troopsOwned(ordered)).toBe(120);
  });

  it("les cellules parties en chasse mangent toujours ; celles qui vont naître, pas encore", () => {
    const perCell = BALANCE.troopUpkeep.milliPerSecond;
    const target = prey(0);
    const home = atTier4({ hunter: 10 });
    expect(upkeepRate(home)).toBe(10 * perCell);
    const away = ok(home, hunt(target, party({ hunter: 10 })), T0);
    expect(away.troops.hunter).toBe(0);
    expect(troopsOwned(away)).toBe(10);
    expect(upkeepRate(away)).toBe(10 * perCell);
    const ordered = ok(home, { type: "trainTroop", troop: "swift", count: 3 }, T0);
    expect(upkeepRate(ordered)).toBe(10 * perCell);
  });
});

describe("l'entretien des cellules filles", () => {
  const perCell = BALANCE.troopUpkeep.milliPerSecond;

  it("chaque cellule fille consomme du sucre, seconde après seconde", () => {
    const state = {
      ...atTier4({ hunter: 10 }),
      organelles: { ...atTier4().organelles, mitochondrion: 0 },
      resources: { sugar: 100 * MICRO, bricks: 0, proteins: 0 },
    };
    const later = advance(state, T0 + 60_000).state;
    expect(later.resources.sugar).toBe(100 * MICRO - 10 * perCell * 60_000);
    expect(later.troops.hunter).toBe(10);
  });

  it("une cellule qui produit assez garde toute son armée", () => {
    const state = atTier4({ hunter: 10 });
    const fed = { ...state, organelles: { ...state.organelles, mitochondrion: 2 } };
    const later = advance(fed, T0 + 3_600_000);
    expect(later.state.troops.hunter).toBe(10);
    expect(later.events.some((event) => event.type === "troopsStarved")).toBe(false);
    expect(later.state.resources.sugar).toBeGreaterThanOrEqual(fed.resources.sugar);
  });

  it("réserve vide : la famine frappe par vagues, jusqu'à ce que la production suffise", () => {
    const base = atTier4({ hunter: 60, swift: 40 });
    // Une Centrale de niveau 1 nourrit 500 / 15 = 33 cellules filles.
    const state = {
      ...base,
      organelles: { ...base.organelles, mitochondrion: 1 },
      mutations: [],
      resources: { sugar: 10 * MICRO, bricks: 0, proteins: 0 },
    };
    const fed = Math.floor(500 / perCell);
    const emptyAt = T0 + Math.ceil((10 * MICRO) / (100 * perCell - 500));
    const before = advance(state, emptyAt - 1);
    expect(before.state.troops.hunter + before.state.troops.swift).toBe(100);
    expect(before.state.resources.sugar).toBeGreaterThan(0);

    // Réserve vide : personne ne meurt tout de suite. La vague arrive à la minute suivante.
    const wave = BALANCE.troopUpkeep.famineSeconds * 1000;
    const firstWave = (Math.floor(emptyAt / wave) + 1) * wave;
    const waiting = advance(state, firstWave - 1);
    expect(waiting.events.some((event) => event.type === "troopsStarved")).toBe(false);
    expect(waiting.state.resources.sugar).toBe(0);

    const after = advance(state, firstWave);
    const starved = after.events.find((event) => event.type === "troopsStarved");
    const perWave = Math.ceil((100 * BALANCE.troopUpkeep.faminePercent) / 100);
    expect(starved).toEqual({ type: "troopsStarved", at: firstWave, count: perWave });
    expect(after.state.troops.hunter + after.state.troops.swift).toBe(100 - perWave);
    // Les plus nombreuses meurent d'abord.
    expect(after.state.troops.hunter).toBeLessThan(60);

    // Vague après vague, il ne reste que ce que la cellule peut nourrir ; puis plus personne ne meurt.
    const settled = advance(state, firstWave + 3_600_000);
    const dead = settled.events.reduce(
      (sum, event) => sum + (event.type === "troopsStarved" ? event.count : 0),
      0,
    );
    expect(dead).toBe(100 - fed);
    expect(settled.state.troops.hunter + settled.state.troops.swift).toBe(fed);
    const muchLater = advance(settled.state, settled.state.now + 86_400_000);
    expect(muchLater.events.some((event) => event.type === "troopsStarved")).toBe(false);
  });

  it("les cellules en sortie ne meurent pas en route, mais la famine les attend au retour", () => {
    const base = atTier4({ hunter: 80 });
    const state = {
      ...base,
      organelles: { ...base.organelles, mitochondrion: 1 },
      mutations: [],
      resources: { sugar: 0, bricks: 0, proteins: 0 },
    };
    const away = ok(state, hunt(prey(0), party({ hunter: 80 })), T0);
    const out = advance(away, (away.hunt?.arrivesAt ?? 0) - 1);
    expect(out.events.some((event) => event.type === "troopsStarved")).toBe(false);
    expect(partySize(out.state.hunt?.party ?? party({}))).toBe(80);
    const back = advance(away, (away.hunt?.returnsAt ?? 0) + 3_600_000);
    expect(back.events.some((event) => event.type === "troopsStarved")).toBe(true);
    expect(back.state.troops.hunter).toBeLessThanOrEqual(Math.floor(500 / perCell));
  });
});

describe("la chasse", () => {
  const target = prey(0);
  const offer = preyOffer(target);
  const strong = strongType(target);
  const half = (offer.durationMs - WINDOW) / 2;

  it("envoyer coûte de l'énergie et emmène les cellules choisies", () => {
    const sent = ok(atTier4({ [strong]: 6 }), hunt(target, party({ [strong]: 4 })), T0);
    expect(sent.energy).toBe(BALANCE.energy.max - offer.energy);
    expect(sent.troops[strong]).toBe(2);
    expect(sent.hunt).toMatchObject({
      prey: target.id,
      kind: target.kind,
      arrivesAt: T0 + half,
      resolveAt: T0 + half + WINDOW,
      returnsAt: T0 + offer.durationMs,
      outcome: null,
    });
  });

  it("refuse : groupe vide, cellules qu'on n'a pas, proie inconnue, deuxième chasse, énergie", () => {
    const state = atTier4({ hunter: 2 });
    expect(refusal(state, hunt(target, NONE), T0)).toBe("noTroops");
    expect(refusal(state, hunt(target, party({ hunter: 3 })), T0)).toBe("noTroops");
    expect(refusal(state, hunt(target, party({ swift: 1 })), T0)).toBe("noTroops");
    expect(
      refusal(state, { type: "sendHunt", prey: "h:900:900", party: party({ hunter: 1 }) }, T0),
    ).toBe("unknownPrey");
    const sent = ok(state, hunt(target, party({ hunter: 1 })), T0);
    expect(refusal(sent, hunt(prey(1), party({ hunter: 1 })), T0 + 1)).toBe("busy");
    expect(refusal({ ...state, energy: 0 }, hunt(target, party({ hunter: 1 })), T0)).toBe(
      "noEnergy",
    );
  });

  it("toucher la proie avec un groupe sérieux : victoire certaine, quelle que soit la graine", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const group = party({ [strong]: 3 });
      const sent = ok(atTier4({ [strong]: 3 }, seed), hunt(target, group), T0);
      expect(winChance(group, target.kind, offer.power)).toBeGreaterThanOrEqual(
        BALANCE.hunt.certainFromPercent,
      );
      const struck = ok(sent, { type: "strikeHunt" }, T0 + half + 1000);
      expect(struck.hunt?.outcome).toMatchObject({ won: true, struck: true });
    }
  });

  it("on ne touche qu'une fois, et seulement pendant le combat", () => {
    const sent = ok(atTier4({ [strong]: 3 }), hunt(target, party({ [strong]: 3 })), T0);
    expect(refusal(sent, { type: "strikeHunt" }, T0 + half - 1)).toBe("notFighting");
    const struck = ok(sent, { type: "strikeHunt" }, T0 + half);
    expect(refusal(struck, { type: "strikeHunt" }, T0 + half + 1)).toBe("tooLate");
    // Fenêtre passée : le sort a déjà décidé.
    expect(refusal(sent, { type: "strikeHunt" }, T0 + half + WINDOW)).toBe("tooLate");
    expect(refusal(atTier4(), { type: "strikeHunt" }, T0)).toBe("noHunt");
  });

  it("ne pas toucher coûte quelques points de chance, jamais en dessous de 1", () => {
    expect(unattendedChance(50)).toBe(50 - BALANCE.hunt.unattendedPenaltyPercent);
    expect(unattendedChance(3)).toBe(1);
  });

  it("sans toucher, le sort décide à la fin de la fenêtre, selon les chances annoncées", () => {
    const group = party({ [strong]: 3 });
    const chance = unattendedChance(winChance(group, target.kind, offer.power));
    let wins = 0;
    const games = 400;
    for (let seed = 1; seed <= games; seed++) {
      const sent = ok(atTier4({ [strong]: 3 }, seed), hunt(target, group), T0);
      expect(advance(sent, T0 + half + WINDOW - 1).state.hunt?.outcome).toBeNull();
      const resolved = advance(sent, T0 + half + WINDOW).state;
      expect(resolved.hunt?.outcome?.struck).toBe(false);
      if (resolved.hunt?.outcome?.won === true) wins += 1;
    }
    expect((100 * wins) / games).toBeGreaterThan(chance - 10);
    expect((100 * wins) / games).toBeLessThan(chance + 10);
  });

  it("victoire : les survivantes rentrent avec les protéines, la proie se repose", () => {
    const group = party({ [strong]: 3 });
    const sent = ok(atTier4({ [strong]: 3 }), hunt(target, group), T0);
    const struck = ok(sent, { type: "strikeHunt" }, T0 + half);
    const losses = partySize(struck.hunt?.outcome?.losses ?? NONE);
    const home = advance(struck, T0 + offer.durationMs);
    expect(home.state.hunt).toBeNull();
    expect(home.state.resources.proteins).toBe(offer.proteins);
    expect(home.state.troops[strong]).toBe(3 - losses);
    expect(home.state.counters.huntsWon).toBe(1);
    expect(home.events.find((event) => event.type === "huntReturned")).toMatchObject({
      won: true,
      gained: offer.proteins,
      lost: 0,
      losses,
    });
    expect(refusal(home.state, hunt(target, party({ [strong]: 1 })), T0 + offer.durationMs)).toBe(
      "placeResting",
    );
  });

  it("défaite : pas de protéines, des pertes, mais toujours une survivante", () => {
    const far = prey(2);
    const farOffer = preyOffer(far);
    const weak = TROOP_IDS.find((id) => STRONG_AGAINST[id] !== far.kind) ?? "hunter";
    let defeats = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const sent = ok(atTier4({ [weak]: 4 }, seed), hunt(far, party({ [weak]: 4 })), T0);
      const home = advance(sent, T0 + farOffer.durationMs).state;
      if (home.counters.huntsWon === 1) continue;
      defeats += 1;
      expect(home.resources.proteins).toBe(0);
      expect(home.troops[weak]).toBeGreaterThanOrEqual(1);
      expect(home.troops[weak]).toBeLessThan(4);
      expect(home.placeReadyAt).toEqual({});
    }
    expect(defeats).toBeGreaterThan(15);
  });

  it("rappel avant la proie : retour dix fois plus rapide, énergie rendue, tout le monde rentre", () => {
    const sent = ok(atTier4({ swift: 5 }), hunt(target, party({ swift: 5 })), T0);
    const elapsed = 10_000;
    const called = ok(sent, { type: "cancelHunt" }, T0 + elapsed);
    expect(called.energy).toBe(BALANCE.energy.max);
    expect(called.hunt?.returnsAt).toBe(T0 + elapsed + elapsed / BALANCE.expedition.cancelSpeedup);
    const home = advance(called, T0 + elapsed + 1000).state;
    expect(home.hunt).toBeNull();
    expect(home.troops.swift).toBe(5);
    expect(home.counters.huntsWon).toBe(0);
    expect(home.resources.proteins).toBe(0);
  });

  it("une fois face à la proie, on ne peut plus rappeler", () => {
    const sent = ok(atTier4({ swift: 5 }), hunt(target, party({ swift: 5 })), T0);
    expect(refusal(sent, { type: "cancelHunt" }, T0 + half)).toBe("tooLate");
    expect(refusal(atTier4(), { type: "cancelHunt" }, T0)).toBe("noHunt");
  });

  it("une chasse et une expédition peuvent être en route en même temps", () => {
    const sent = ok(atTier4({ swift: 2 }), hunt(target, party({ swift: 2 })), T0);
    const both = applyOrder(sent, { type: "sendExpedition", place: "x" }, T0 + 1);
    expect(both.ok ? null : both.error).toBe("unknownPlace");
  });
});

describe("les protéines paient l'évolution", () => {
  it("acheter une mutation coûte des protéines et propose un nouveau choix", () => {
    const start = atTier4();
    const price = nextMutationPrice(start);
    expect(price).toBe((BALANCE.mutationPrices[0] ?? 0) * MICRO);
    expect(refusal(start, { type: "buyMutation" }, T0)).toBe("insufficient");

    const rich = { ...start, resources: { ...start.resources, proteins: price + MICRO } };
    const bought = ok(rich, { type: "buyMutation" }, T0);
    expect(bought.resources.proteins).toBe(MICRO);
    expect(bought.mutationOffer).toHaveLength(3);
    expect(bought.mutationOffer).not.toContain("thrift");
    expect(refusal(bought, { type: "buyMutation" }, T0)).toBe("offerPending");

    const [choice] = bought.mutationOffer ?? [];
    if (choice === undefined) throw new Error("choix attendu");
    const mutated = ok(bought, { type: "chooseMutation", mutation: choice }, T0);
    expect(mutated.mutations).toEqual(["thrift", choice]);
    expect(nextMutationPrice(mutated)).toBe((BALANCE.mutationPrices[1] ?? 0) * MICRO);
  });

  it("plus rien à acheter quand toutes les mutations sont prises", () => {
    const start = atTier4();
    const all = {
      ...start,
      mutations: [...MUTATION_IDS],
      resources: { ...start.resources, proteins: capacity(start, "proteins") },
    };
    expect(refusal(all, { type: "buyMutation" }, T0)).toBe("noMoreMutations");
  });

  it("une chasse gagnée ouvre le palier 5 au deuxième jour de la saison, à minuit pile", () => {
    const target = prey(0);
    const strong = strongType(target);
    const sent = ok(atTier4({ [strong]: 3 }), hunt(target, party({ [strong]: 3 })), T0);
    const struck = ok(sent, { type: "strikeHunt" }, sent.hunt?.arrivesAt ?? T0);
    const day = 86_400_000;
    expect(advance(struck, T0 + day - 1).state.tier).toBe(4);
    const opened = advance(struck, T0 + day);
    expect(opened.state.tier).toBe(5);
    expect(opened.events).toContainEqual({ type: "tierReached", at: T0 + day, tier: 5 });
    // Revenir trois jours plus tard donne le même instant d'ouverture.
    const late = advance(struck, T0 + 4 * day);
    expect(late.events).toContainEqual({ type: "tierReached", at: T0 + day, tier: 5 });
    // Les paliers suivants s'ouvrent ensuite à date fixe, sans rien demander de plus.
    expect(advance(struck, T0 + 30 * day).state.tier).toBeGreaterThan(5);
  });
});

describe("garanties du moteur avec la chasse", () => {
  const targets = visiblePrey(WORLD.worldSeed, WORLD.slot);
  const order = fc.oneof(
    fc.constantFrom<Order>(
      { type: "harvest", taps: 3 },
      { type: "strikeHunt" },
      { type: "cancelHunt" },
      { type: "buyMutation" },
      { type: "trainTroop", troop: "hunter", count: 2 },
      { type: "trainTroop", troop: "armored", count: 1 },
      { type: "trainTroop", troop: "swift", count: 4 },
    ),
    fc
      .tuple(
        fc.constantFrom(...targets),
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
      )
      .map(([target, hunter, armored, swift]): Order =>
        hunt(target, partyOf({ hunter, armored, swift })),
      ),
  );
  const steps = fc.array(fc.tuple(order, fc.integer({ min: 0, max: 400_000 })), {
    minLength: 1,
    maxLength: 50,
  });

  it("quoi qu'on envoie : rien de négatif, et jamais de famine tant qu'il reste du sucre", () => {
    fc.assert(
      fc.property(steps, (sequence) => {
        let state = atTier4();
        let now = T0;
        for (const [next, wait] of sequence) {
          now += wait;
          const result = applyOrder(state, next, now);
          state = result.ok ? result.state : advance(state, now).state;
          for (const id of TROOP_IDS) expect(state.troops[id]).toBeGreaterThanOrEqual(0);
          expect(troopsOwned(state)).toBeGreaterThanOrEqual(0);
          expect(state.resources.proteins).toBeGreaterThanOrEqual(0);
          expect(state.resources.proteins).toBeLessThanOrEqual(capacity(state, "proteins"));
          expect(state.resources.sugar).toBeGreaterThanOrEqual(0);
          expect(state.resources.bricks).toBeGreaterThanOrEqual(0);
          expect(state.energy).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("avancer en une fois ou en plusieurs donne le même état, tirages compris", () => {
    fc.assert(
      fc.property(
        steps,
        fc.array(fc.integer({ min: 1, max: 900_000 }), { minLength: 1, maxLength: 6 }),
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
  });

  it("sauvegarder puis relire rend le même état : naissances, chasse en route, chasse jouée", () => {
    const target = prey(1);
    const training = ok(
      atTier4({ swift: 4 }),
      { type: "trainTroop", troop: "hunter", count: 2 },
      T0,
    );
    const sent = ok(training, hunt(target, party({ swift: 4 })), T0);
    const fought = advance(sent, sent.hunt?.resolveAt ?? T0).state;
    for (const state of [training, sent, fought]) {
      expect(deserializeState(serializeState(state))).toEqual(state);
    }
  });

  it("une sauvegarde d'avant la chasse est convertie : ni protéines ni cellules, rien de perdu", () => {
    const current = JSON.parse(serializeState(atTier4())) as Record<string, unknown>;
    const resources = { ...(current.resources as Record<string, number>) };
    const organelles = { ...(current.organelles as Record<string, number>) };
    const old = Object.fromEntries(
      Object.entries(current).filter(([key]) => !["troops", "training", "hunt"].includes(key)),
    );
    const text = JSON.stringify({
      ...old,
      version: 2,
      resources: { sugar: resources.sugar, bricks: resources.bricks },
      organelles: Object.fromEntries(
        Object.entries(organelles).filter(([key]) => key !== "nursery"),
      ),
    });
    const back = deserializeState(text);
    expect(back.version).toBe(11);
    expect(back.resources).toEqual({ sugar: 500 * MICRO, bricks: 300 * MICRO, proteins: 0 });
    expect(back.organelles.nursery).toBe(0);
    expect(back.troops).toEqual(NONE);
    expect(back.counters.mapHarvests).toBe(5);
  });

  it("refuse une sauvegarde dont la chasse est abîmée", () => {
    const sent = ok(atTier4({ swift: 2 }), hunt(prey(0), party({ swift: 2 })), T0);
    const text = serializeState(sent);
    expect(() => deserializeState(text.replace('"outcome":null', '"outcome":3'))).toThrow(
      TypeError,
    );
    expect(() => deserializeState(text.replace(/"prey":"h:[^"]+"/, '"prey":"ailleurs"'))).toThrow(
      TypeError,
    );
  });
});
