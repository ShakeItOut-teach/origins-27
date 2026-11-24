import { BALANCE, GENE_FAMILIES, MUTATION_IDS, TROOP_IDS } from "@o27/data";
import type { MutationId, Order } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  createPlayer,
  defensePower,
  deserializeState,
  familyGenes,
  foePower,
  genesMissing,
  hasLineage,
  mutationPool,
  partyOf,
  partyPower,
  productionRate,
  serializeState,
  totalPower,
  trainMs,
  travelMs,
  troopUnlocked,
  upkeepRate,
} from "./index";
import type { OrderErrorCode, PlayerState } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const NOW = SEASON + 6 * DAY_MS + HOUR;
const GENES = BALANCE.genes;

/** Un joueur riche du palier demandé, avec les mutations demandées, que personne ne dérange. */
function player(tier: number, mutations: readonly MutationId[] = []): PlayerState {
  // Le palier 8 s'ouvre à date fixe : un joueur du palier 7 vit donc au quatrième jour.
  const now = tier >= 8 ? NOW : SEASON + 3 * DAY_MS + HOUR;
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  return advance(
    {
      ...base,
      tier,
      mutations,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: Math.max(1, mutations.length),
        mapHarvests: 5,
        huntsWon: 1,
        rivalFights: tier >= 7 ? 3 : 1,
        leagueEntered: tier >= 8 ? 1 : 0,
      },
      organelles: { ...base.organelles, mitochondrion: 3, vacuole: 5, nursery: 1, wall: 2 },
      resources: { sugar: 600 * MICRO, bricks: 600 * MICRO, proteins: 300 * MICRO },
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

describe("les familles de gènes", () => {
  it("chaque famille compte trois gènes, et chaque cellule de rang 2 a la sienne", () => {
    for (const family of GENE_FAMILIES) {
      const genes = MUTATION_IDS.filter((id) => BALANCE.mutations[id].family === family);
      expect(genes).toHaveLength(GENES.lineageGenes);
      const troops = TROOP_IDS.filter((id) => BALANCE.troops[id].family === family);
      expect(troops).toHaveLength(1);
    }
  });

  it("les nouvelles mutations n'entrent dans le tirage qu'au palier 8", () => {
    const early = mutationPool(player(7));
    expect(early).toHaveLength(6);
    expect(early.every((id) => BALANCE.mutations[id].tier < GENES.tier)).toBe(true);
    expect(mutationPool(player(8))).toHaveLength(MUTATION_IDS.length);
    expect(mutationPool(player(8, ["thrift", "voracity"]))).toHaveLength(MUTATION_IDS.length - 2);
    // Au palier 7, celui qui a les six premières ne peut plus muter ; au palier 8, si.
    const six: MutationId[] = MUTATION_IDS.filter((id) => BALANCE.mutations[id].tier < GENES.tier);
    const seven = player(7, six);
    expect(refusal(seven, { type: "buyMutation" }, seven.now)).toBe("noMoreMutations");
    const bought = ok(player(8, six), { type: "buyMutation" }, NOW);
    expect(bought.mutationOffer?.every((id) => BALANCE.mutations[id].tier === GENES.tier)).toBe(
      true,
    );
  });

  it("on compte les gènes par famille ; trois ouvrent la lignée, au palier 8 seulement", () => {
    const state = player(8, ["fastMetabolism", "digestivePouch", "voracity"]);
    expect(familyGenes(state, "metabolism")).toBe(2);
    expect(familyGenes(state, "predation")).toBe(1);
    expect(hasLineage(state, "metabolism")).toBe(false);
    const full = player(8, ["fastMetabolism", "digestivePouch", "thrift"]);
    expect(hasLineage(full, "metabolism")).toBe(true);
    expect(hasLineage({ ...full, tier: 7 }, "metabolism")).toBe(false);
  });
});

describe("les lignées", () => {
  it("Métabolisme : la cellule produit plus de sucre, donc nourrit plus de troupes", () => {
    const two = player(8, ["fastMetabolism", "digestivePouch"]);
    const three = player(8, ["fastMetabolism", "digestivePouch", "thrift"]);
    expect(productionRate(three, "sugar")).toBeGreaterThan(productionRate(two, "sugar"));
    expect(productionRate({ ...three, tier: 7 }, "sugar")).toBe(productionRate(two, "sugar"));
  });

  it("Prédation : les adversaires pèsent moins lourd", () => {
    const lineage = player(8, ["voracity", "harpoon", "swarming"]);
    expect(foePower(player(8), 120)).toBe(120);
    expect(foePower(lineage, 120)).toBe(100);
    expect(foePower(lineage, 1)).toBe(1);
  });

  it("Mobilité : les trajets dans l'océan raccourcissent, le gène puis la lignée", () => {
    const plain = travelMs(player(8), 600_000);
    const gene = travelMs(player(8, ["flagellum"]), 600_000);
    const lineage = travelMs(player(8, ["flagellum", "swiftCilia", "quickDivision"]), 600_000);
    expect(plain).toBe(600_000);
    expect(gene).toBe(480_000);
    expect(lineage).toBeLessThan(gene);
  });

  it("Résilience : la cellule se défend mieux, le gène puis la lignée", () => {
    const troops = partyOf({ hunter: 10 });
    const plain = defensePower({ ...player(8), troops });
    const gene = defensePower({ ...player(8, ["armorPlates"]), troops });
    const lineage = defensePower({
      ...player(8, ["armorPlates", "dormancy", "thickWall"]),
      troops,
    });
    expect(plain).toBe(1 + 10 + 2 * 4);
    expect(gene).toBe(Math.floor((plain * 125) / 100));
    expect(lineage).toBeGreaterThan(gene);
  });

  it("les autres gènes : moins d'entretien, des naissances plus rapides", () => {
    const troops = partyOf({ hunter: 20 });
    expect(upkeepRate({ ...player(8, ["dormancy"]), troops })).toBeLessThan(
      upkeepRate({ ...player(8), troops }),
    );
    expect(trainMs(player(8, ["swarming"]), "hunter")).toBe(
      Math.floor((trainMs(player(8), "hunter") * 75) / 100),
    );
  });
});

describe("les cellules filles de rang 2", () => {
  const two: MutationId[] = ["voracity", "harpoon"];

  it("il faut le palier 8 et deux gènes de la famille", () => {
    expect(troopUnlocked(player(8), "hunter")).toBe(true);
    expect(genesMissing(player(8), "toxic")).toBe(2);
    expect(genesMissing(player(8, ["voracity"]), "toxic")).toBe(1);
    expect(troopUnlocked(player(8, two), "toxic")).toBe(true);
    expect(troopUnlocked(player(7, two), "toxic")).toBe(false);
    expect(troopUnlocked(player(8, two), "guardian")).toBe(false);
    const order: Order = { type: "trainTroop", troop: "toxic", count: 1 };
    expect(refusal(player(8), order, NOW)).toBe("geneMissing");
    const seven = player(7, two);
    expect(refusal(seven, order, seven.now)).toBe("geneMissing");
  });

  it("elles coûtent des protéines, naissent plus lentement, mangent double", () => {
    const state = player(8, two);
    const data = BALANCE.troops.toxic;
    const ordered = ok(state, { type: "trainTroop", troop: "toxic", count: 2 }, NOW);
    expect(ordered.resources.proteins).toBe(state.resources.proteins - 2 * data.proteins * MICRO);
    expect(ordered.resources.sugar).toBe(state.resources.sugar - 2 * data.cost.sugar * MICRO);
    const poor = { ...state, resources: { ...state.resources, proteins: 0 } };
    expect(refusal(poor, { type: "trainTroop", troop: "toxic", count: 1 }, NOW)).toBe(
      "insufficient",
    );
    const born = advance(ordered, NOW + 2 * trainMs(state, "toxic")).state;
    expect(born.troops.toxic).toBe(2);
    expect(trainMs(state, "toxic")).toBeGreaterThan(trainMs(state, "hunter"));
    expect(upkeepRate({ ...state, troops: partyOf({ toxic: 5 }) })).toBe(
      upkeepRate({ ...state, troops: partyOf({ hunter: 10 }) }),
    );
  });

  it("chacune a son rôle : frapper, défendre, porter", () => {
    expect(partyPower(partyOf({ toxic: 10 }), "aggressive")).toBe(40);
    expect(partyPower(partyOf({ toxic: 10 }), "soft")).toBe(80);
    expect(partyPower(partyOf({ carrier: 10 }), "soft")).toBe(10);
    const state = { ...player(8), organelles: { ...player(8).organelles, wall: 0 } };
    expect(defensePower({ ...state, troops: partyOf({ guardian: 10 }) })).toBe(51);
    expect(defensePower({ ...state, troops: partyOf({ toxic: 10 }) })).toBe(11);
    // À entretien égal, une armée de rang 2 frappe plus fort qu'une armée de rang 1.
    expect(partyPower(partyOf({ toxic: 10 }), "fleeing")).toBeGreaterThan(
      partyPower(partyOf({ hunter: 20 }), "fleeing"),
    );
    expect(totalPower({ ...state, troops: partyOf({ guardian: 10 }) })).toBeGreaterThan(
      totalPower({ ...state, troops: partyOf({ hunter: 10 }) }),
    );
  });

  it("une sauvegarde d'avant le palier 8 n'a simplement aucune cellule de rang 2", () => {
    const state = { ...player(7), troops: partyOf({ hunter: 4 }) };
    const old = JSON.parse(serializeState(state)) as { version: number; troops: object };
    old.version = 7;
    old.troops = { hunter: 4, armored: 0, swift: 0 };
    const back = deserializeState(JSON.stringify(old));
    expect(back.version).toBe(9);
    expect(back.troops).toEqual(partyOf({ hunter: 4 }));
    const full = { ...player(8, two), troops: partyOf({ toxic: 3, hunter: 2 }) };
    expect(deserializeState(serializeState(full))).toEqual(full);
  });
});
