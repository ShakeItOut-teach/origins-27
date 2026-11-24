import { BALANCE, GENE_FAMILIES } from "@o27/data";
import type { GeneFamily, MutationId, Order } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  cellDistance,
  companionEffects,
  companionForm,
  companionPercent,
  companionPoints,
  createPlayer,
  defensePower,
  deserializeState,
  foePower,
  oceanPredators,
  partyOf,
  playerCell,
  serializeState,
  shareOffer,
} from "./index";
import type { Companion, OrderErrorCode, PlayerState, Predator } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const NOW = SEASON + 6 * DAY_MS + HOUR;
const RULES = BALANCE.companion;
const ALL_GENES: MutationId[] = ["fastMetabolism", "voracity", "flagellum", "armorPlates"];

/** Un compagnon de l'espèce demandée, avec les gènes demandés. */
function pet(species: number, genes: Partial<Record<GeneFamily, number>> = {}): Companion {
  return { species, genes: { metabolism: 0, predation: 0, mobility: 0, resilience: 0, ...genes } };
}

/** Un joueur riche du palier 8, qui possède un gène de chaque famille. */
function player(companion: Companion | null = null, tier = 8): PlayerState {
  const now = tier >= 8 ? NOW : SEASON + 3 * DAY_MS + HOUR;
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  return advance(
    {
      ...base,
      tier,
      companion,
      mutations: ALL_GENES,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 4,
        mapHarvests: 5,
        huntsWon: 1,
      },
      organelles: { ...base.organelles, mitochondrion: 3, vacuole: 5, nursery: 1 },
      resources: { sugar: 600 * MICRO, bricks: 600 * MICRO, proteins: 700 * MICRO },
      troops: partyOf({ hunter: 30, armored: 30, swift: 30 }),
      shieldUntil: now + 20 * DAY_MS,
      nextRaidAt: now + 25 * DAY_MS,
    },
    now,
  ).state;
}

function refusal(state: PlayerState, order: Order, now: number): OrderErrorCode | null {
  const result = applyOrder(state, order, now);
  return result.ok ? null : result.error;
}

function ok(state: PlayerState, order: Order, now: number): PlayerState {
  const result = applyOrder(state, order, now);
  if (!result.ok) throw new Error(`ordre refusé : ${result.error}`);
  return result.state;
}

function weakest(state: PlayerState): Predator {
  const home = playerCell(state);
  const found = oceanPredators(state.worldSeed, state.now)
    .filter((entry) => entry.zone === 0 && entry.level === 0 && entry.endsAt - state.now > HOUR)
    .sort((one, other) => cellDistance(home, one) - cellDistance(home, other))[0];
  if (found === undefined) throw new Error("prédateur attendu");
  return found;
}

describe("apprivoiser", () => {
  it("demande le palier 8 et de ne pas avoir déjà un compagnon", () => {
    const state = player();
    const predator = weakest(state);
    const order: Order = { type: "tamePredator", predator: predator.id, party: state.troops };
    const early = player(null, 7);
    expect(refusal(early, order, early.now)).toBe("locked");
    expect(refusal(player(pet(1)), order, NOW)).toBe("hasCompanion");
    expect(refusal(state, { ...order, predator: "p:0:0:1" }, NOW)).toBe("unknownPredator");
  });

  it("le prédateur battu rentre avec le groupe : pas de protéines, un compagnon tout jeune", () => {
    const state = player();
    const predator = weakest(state);
    const sent = ok(
      state,
      { type: "tamePredator", predator: predator.id, party: state.troops },
      NOW,
    );
    expect(sent.taming).toBe(predator.level);
    expect(sent.hunt?.proteins).toBe(0);
    expect(deserializeState(serializeState(sent))).toEqual(sent);
    const struck = ok(sent, { type: "strikeHunt" }, sent.hunt?.arrivesAt ?? 0);
    const step = advance(struck, struck.hunt?.returnsAt ?? 0);
    expect(step.state.taming).toBeNull();
    expect(step.state.companion).toEqual(pet(predator.level));
    expect(step.state.resources.proteins).toBe(state.resources.proteins);
    expect(companionForm(pet(predator.level)).stage).toBe(0);
    expect(companionEffects(pet(predator.level))).toEqual([]);
    expect(deserializeState(serializeState(step.state))).toEqual(step.state);
  });

  it("une chasse ordinaire n'apprivoise personne ; relâcher libère la place", () => {
    const state = player();
    const predator = weakest(state);
    const sent = ok(
      state,
      { type: "huntPredator", predator: predator.id, party: state.troops },
      NOW,
    );
    expect(sent.taming).toBeNull();
    const struck = ok(sent, { type: "strikeHunt" }, sent.hunt?.arrivesAt ?? 0);
    expect(advance(struck, struck.hunt?.returnsAt ?? 0).state.companion).toBeNull();
    expect(refusal(state, { type: "releaseCompanion" }, NOW)).toBe("noCompanion");
    expect(ok(player(pet(2)), { type: "releaseCompanion" }, NOW).companion).toBeNull();
  });
});

describe("partager ses gènes", () => {
  it("coûte des protéines, de plus en plus, et demande de posséder un gène de la famille", () => {
    const state = player(pet(1));
    expect(shareOffer(state, "predation")).toEqual({
      price: (RULES.sharePrices[0] ?? 0) * MICRO,
      blocked: null,
    });
    const fed = ok(state, { type: "shareGene", family: "predation" }, NOW);
    expect(fed.companion?.genes.predation).toBe(1);
    expect(fed.resources.proteins).toBe(
      state.resources.proteins - shareOffer(state, "predation").price,
    );
    expect(shareOffer(fed, "predation").price).toBeGreaterThan(
      shareOffer(state, "predation").price,
    );
    const without = { ...state, mutations: ALL_GENES.filter((id) => id !== "voracity") };
    expect(refusal(without, { type: "shareGene", family: "predation" }, NOW)).toBe("geneMissing");
    expect(refusal(player(), { type: "shareGene", family: "predation" }, NOW)).toBe("noCompanion");
    const poor = { ...state, resources: { ...state.resources, proteins: 0 } };
    expect(refusal(poor, { type: "shareGene", family: "predation" }, NOW)).toBe("insufficient");
  });

  it("adulte, il ne grandit plus ; et l'on peut toujours payer le dernier gène", () => {
    const adult = player(pet(1, { predation: RULES.adultAt }));
    expect(companionPoints(adult.companion ?? pet(0))).toBe(RULES.adultAt);
    expect(refusal(adult, { type: "shareGene", family: "predation" }, NOW)).toBe("grown");
    expect(RULES.sharePrices).toHaveLength(RULES.adultAt);
    expect(Math.max(...RULES.sharePrices)).toBeLessThan(700);
  });
});

describe("l'arbre d'évolution du compagnon", () => {
  it("la première forme suit la famille la plus reçue : une force, une faiblesse", () => {
    for (const family of GENE_FAMILIES) {
      const form = companionForm(pet(1, { [family]: RULES.firstFormAt }));
      expect(form).toEqual({ stage: 1, family, second: null, pure: false });
      const effects = companionEffects(pet(0, { [family]: RULES.firstFormAt }));
      expect(effects.filter((effect) => !effect.weakness)).toHaveLength(1);
      expect(effects.filter((effect) => effect.weakness)).toHaveLength(1);
      expect(effects[0]?.stat).toBe(RULES.families[family].stat);
    }
  });

  it("adulte pur : plus fort, mais sa faiblesse s'aggrave", () => {
    const first = companionEffects(pet(0, { predation: 2 }));
    const pure = companionEffects(pet(0, { predation: 5 }));
    expect(companionForm(pet(0, { predation: 5 })).pure).toBe(true);
    expect(pure[0]?.percent).toBeGreaterThan(first[0]?.percent ?? 0);
    expect(pure[1]?.percent).toBeLessThan(first[1]?.percent ?? 0);
  });

  it("adulte mêlé : il garde un peu de sa seconde famille, et sa faiblesse reste légère", () => {
    const mixed = pet(0, { predation: 3, resilience: 2 });
    expect(companionForm(mixed)).toEqual({
      stage: 2,
      family: "predation",
      second: "resilience",
      pure: false,
    });
    const effects = companionEffects(mixed);
    expect(effects.map((effect) => effect.stat)).toEqual(["attack", "defense", "defense"]);
    expect(effects[0]?.percent).toBe(RULES.families.predation.bonus[1]);
    expect(effects[1]?.percent).toBe(RULES.families.resilience.bonus[0]);
    expect(effects[2]).toEqual({
      stat: "defense",
      percent: RULES.families.predation.weakness.percent[0],
      weakness: true,
    });
    // La seconde famille compense ici la faiblesse de la première.
    expect(companionPercent(player(mixed), "defense")).toBeGreaterThan(0);
  });

  it("chaque espèce est plus forte dans sa famille de prédilection", () => {
    const genes = { predation: 5 };
    const anomalocaris = companionEffects(pet(2, genes))[0]?.percent ?? 0;
    const ottoia = companionEffects(pet(0, genes))[0]?.percent ?? 0;
    expect(RULES.species[2]?.affinity).toBe("predation");
    expect(anomalocaris).toBe(Math.trunc((ottoia * RULES.affinityPercent) / 100));
  });

  it("ses forces et ses faiblesses comptent dans les combats du joueur", () => {
    const plain = player();
    const hunter = player(pet(2, { predation: 5 }));
    expect(foePower(hunter, 200)).toBeLessThan(foePower(plain, 200));
    expect(defensePower(hunter)).toBeLessThan(defensePower(plain));
    const guard = player(pet(0, { resilience: 5 }));
    expect(defensePower(guard)).toBeGreaterThan(defensePower(plain));
  });

  it("une sauvegarde d'avant le compagnon n'en a pas", () => {
    const state = player(pet(1, { mobility: 2 }));
    const saved = JSON.parse(serializeState(state)) as Record<string, unknown>;
    const old = {
      ...Object.fromEntries(
        Object.entries(saved).filter(([key]) => key !== "companion" && key !== "taming"),
      ),
      version: 9,
    };
    const back = deserializeState(JSON.stringify(old));
    expect(back.version).toBe(10);
    expect(back.companion).toBeNull();
    expect(back.taming).toBeNull();
  });
});
