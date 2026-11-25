import { BALANCE, CRISIS_KINDS, DRILL_IDS } from "@o27/data";
import type { MutationId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  crisisFamily,
  crisisKind,
  crisisOf,
  crisisPercent,
  createPlayer,
  defensePower,
  deserializeState,
  drillMaxLevel,
  drillOffer,
  foePower,
  maxLevelOf,
  partyOf,
  productionRate,
  serializeState,
  speciesOf,
  troopUnlocked,
  visiblePlaces,
} from "./index";
import type { PlayerState } from "./index";
import { spared } from "./hunt";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;

/** Un joueur bien installé, à une heure du jour demandé. */
function player(day: number, patch: Partial<PlayerState> = {}, tier = 9): PlayerState {
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
      organelles: { ...base.organelles, mitochondrion: 5, vacuole: 5, ribosome: 3, nursery: 1 },
      resources: { sugar: 100_000 * MICRO, bricks: 100_000 * MICRO, proteins: 100_000 * MICRO },
      troops: partyOf({ hunter: 20 }),
      shieldUntil: now + 40 * DAY_MS,
      nextRaidAt: now + 40 * DAY_MS,
      ...patch,
    },
    now,
  ).state;
}

describe("la recherche militaire", () => {
  it("s'ouvre au jour 5 ; chaque niveau coûte le double du précédent ; les plus hauts attendent les rangs supérieurs", () => {
    const early = { ...player(4), tier: 7 };
    expect(applyOrder(early, { type: "drill", power: "fury" }, early.now)).toEqual({
      ok: false,
      error: "locked",
    });
    const state = player(6);
    const first = drillOffer(state, "fury");
    expect(first.cost.sugar).toBe(BALANCE.drills.cost.sugar * MICRO);
    const step = applyOrder(state, { type: "drill", power: "fury" }, state.now);
    if (!step.ok) throw new Error("recherche refusée");
    expect(step.state.drills.fury).toBe(1);
    expect(step.state.resources.sugar).toBe(state.resources.sugar - first.cost.sugar);
    expect(step.events).toContainEqual({
      type: "drillLearned",
      at: state.now,
      power: "fury",
      level: 1,
    });
    expect(drillOffer(step.state, "fury").cost.sugar).toBe(2 * first.cost.sugar);
    const top = { ...state, drills: { ...state.drills, fury: drillMaxLevel(state) - 1 } };
    expect(drillOffer(top, "fury").cost.sugar).toBe(
      first.cost.sugar * 2 ** (drillMaxLevel(state) - 1),
    );
    const maxed = { ...state, drills: { ...state.drills, fury: drillMaxLevel(state) } };
    expect(applyOrder(maxed, { type: "drill", power: "fury" }, state.now)).toEqual({
      ok: false,
      error: "maxLevel",
    });
    // Les niveaux les plus chers attendent une réserve assez grande pour les payer.
    expect(drillMaxLevel(state)).toBe(3);
    expect(drillMaxLevel({ ...state, tier: 10 })).toBe(5);
    expect(drillMaxLevel({ ...state, tier: 12 })).toBe(8);
    const poor = { ...state, resources: { sugar: 0, bricks: 0, proteins: 0 } };
    expect(applyOrder(poor, { type: "drill", power: "fury" }, state.now)).toEqual({
      ok: false,
      error: "insufficient",
    });
    expect(deserializeState(serializeState(step.state))).toEqual(step.state);
  });

  it("donne de petits pouvoirs : frapper plus fort, mieux défendre, perdre moins de cellules", () => {
    const state = player(6);
    const drilled = { ...state, drills: { fury: 5, guard: 5, survival: 4, haste: 0 } };
    expect(foePower(drilled, 1000)).toBeLessThan(foePower(state, 1000));
    expect(defensePower(drilled)).toBeGreaterThan(defensePower(state));
    const losses = partyOf({ hunter: 10, toxic: 5 });
    expect(spared(state, losses)).toEqual(losses);
    expect(spared(drilled, losses)).toEqual(partyOf({ hunter: 8, toxic: 4 }));
    for (const id of DRILL_IDS) expect(BALANCE.drills.powers[id].percentPerLevel).not.toBe(0);
  });
});

describe("la récolte automatique", () => {
  /** Un joueur du palier 4 sans production, pour que seule la récolte remplisse la réserve. */
  function gatherer(): PlayerState {
    const base = player(2, { resources: { sugar: 0, bricks: 0, proteins: 0 } }, 4);
    return { ...base, organelles: { ...base.organelles, mitochondrion: 0, ribosome: 0 } };
  }

  it("s'ouvre au palier 4 ; les cellules repartent seules tant qu'il reste de l'énergie", () => {
    const early = { ...createPlayer(7, SEASON, SEASON), tier: 3 };
    expect(applyOrder(early, { type: "setAutoHarvest", on: true }, SEASON)).toEqual({
      ok: false,
      error: "locked",
    });
    const state = gatherer();
    const on = applyOrder(state, { type: "setAutoHarvest", on: true }, state.now);
    if (!on.ok) throw new Error("réglage refusé");
    expect(on.state.autoHarvest).toBe(true);
    const [place] = visiblePlaces(state.worldSeed, state.slot);
    if (place === undefined) throw new Error("lieu attendu");
    const sent = applyOrder(on.state, { type: "sendExpedition", place: place.id }, state.now);
    if (!sent.ok) throw new Error("expédition refusée");
    const back = advance(sent.state, sent.state.expedition?.returnsAt ?? 0);
    // Rentrées, elles sont déjà reparties : vers un autre lieu, celui-ci se repose.
    expect(back.events.map((event) => event.type)).toContain("expeditionReturned");
    expect(back.events.filter((event) => event.type === "expeditionSent")).toHaveLength(1);
    expect(back.state.expedition).not.toBeNull();
    expect(back.state.expedition?.place).not.toBe(place.id);
    expect(deserializeState(serializeState(back.state))).toEqual(back.state);
    // Sans le réglage, elles restent à la maison.
    const manual = applyOrder(state, { type: "sendExpedition", place: place.id }, state.now);
    if (!manual.ok) throw new Error("expédition refusée");
    expect(
      advance(manual.state, manual.state.expedition?.returnsAt ?? 0).state.expedition,
    ).toBeNull();
    // Laissées à elles-mêmes, elles s'arrêtent quand l'énergie manque.
    const later = advance(back.state, back.state.now + 6 * HOUR);
    const count = later.events.filter((event) => event.type === "expeditionSent").length;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(40);
  });

  it("avancer d'une traite ou en plusieurs fois donne le même état", () => {
    const base = gatherer();
    const [place] = visiblePlaces(base.worldSeed, base.slot);
    if (place === undefined) throw new Error("lieu attendu");
    const start = applyOrder(
      { ...base, autoHarvest: true },
      { type: "sendExpedition", place: place.id },
      base.now,
    );
    if (!start.ok) throw new Error("expédition refusée");
    const to = base.now + 3 * HOUR;
    const once = advance(start.state, to).state;
    const twice = advance(advance(start.state, base.now + 47 * 60_000 + 13).state, to).state;
    expect(serializeState(twice)).toBe(serializeState(once));
  });
});

describe("palier 11 : la crise de saison, l'espèce, le rang 4", () => {
  const rules = BALANCE.crisis;

  it("s'ouvre au jour 17 : niveaux jusqu'à 15 et cellules filles de rang 4", () => {
    const predation: MutationId[] = ["voracity", "harpoon", "swarming"];
    const before = player(16, { mutations: predation });
    expect(before.tier).toBe(10);
    expect(maxLevelOf(before, "nucleus")).toBe(10);
    expect(troopUnlocked(before, "chaetognath")).toBe(false);
    const open = player(17, { mutations: predation });
    expect(open.tier).toBe(11);
    expect(maxLevelOf(open, "nucleus")).toBe(15);
    expect(troopUnlocked(open, "chaetognath")).toBe(true);
    expect(troopUnlocked(open, "rotifer")).toBe(true);
    expect(BALANCE.troops.chaetognath.power).toBeGreaterThan(BALANCE.troops.rotifer.power * 2);
  });

  it("la crise est la même pour tout un monde, annoncée deux jours avant, et dure un jour", () => {
    expect(CRISIS_KINDS).toContain(crisisKind(27));
    expect(crisisKind(27)).toBe(crisisKind(27));
    const kinds = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((seed) => crisisKind(seed));
    expect(new Set(kinds).size).toBeGreaterThan(1);
    expect(crisisOf(player(rules.day - rules.warningDays - 1))).toBeNull();
    const warned = crisisOf(player(rules.day - 1));
    expect(warned?.phase).toBe("warning");
    expect(warned?.startsAt).toBe(SEASON + (rules.day - 1) * DAY_MS);
    expect(crisisPercent(player(rules.day - 1))).toBe(0);
    expect(crisisOf(player(rules.day))?.phase).toBe("on");
    expect(crisisOf(player(rules.day + rules.days))?.phase).toBe("done");
    expect(crisisPercent(player(rules.day + rules.days))).toBe(0);
  });

  it("le premier y perd un quart de sa production, les derniers y gagnent, les gènes préparent", () => {
    const last = player(rules.day, { troops: partyOf() });
    expect(crisisPercent(last)).toBe(rules.bonusPercent);
    const first = player(rules.day, { troops: partyOf({ chaetognath: 5000 }) });
    expect(crisisPercent(first)).toBe(-rules.maxMalusPercent);
    // Deux gènes de la bonne famille divisent le malus par deux.
    const family = crisisFamily(crisisKind(27));
    const genes = (Object.keys(BALANCE.mutations) as MutationId[])
      .filter((id) => BALANCE.mutations[id].family === family)
      .slice(0, 2);
    const ready = player(rules.day, { troops: partyOf({ chaetognath: 5000 }), mutations: genes });
    expect(crisisOf(ready)?.adapted).toBe(true);
    expect(crisisPercent(ready)).toBe(Math.trunc(-rules.maxMalusPercent / 2));
  });

  it("la crise pèse sur la réserve à l'heure exacte, quelle que soit la façon d'avancer", () => {
    const base = player(rules.day - 1, { troops: partyOf() });
    const start: PlayerState = {
      ...base,
      troops: partyOf({ chaetognath: 5000 }),
      resources: { sugar: 10 ** 14, bricks: 0, proteins: 0 },
      organelles: { ...base.organelles, vacuole: 15, ribosome: 5 },
    };
    const from = SEASON + (rules.day - 1) * DAY_MS;
    const to = from + 2 * HOUR;
    const once = advance(start, to).state;
    const twice = advance(advance(start, from - 5).state, to).state;
    const thrice = advance(advance(start, from + 77).state, to).state;
    expect(serializeState(twice)).toBe(serializeState(once));
    expect(serializeState(thrice)).toBe(serializeState(once));
    // Dix minutes de crise, réserve vidée au départ : la production tourne au ralenti.
    const opening = advance(start, from).state;
    const emptied = { ...opening, resources: { ...opening.resources, bricks: 0 } };
    const later = advance(emptied, from + 600_000).state;
    const slowed = Math.floor(
      (productionRate(later, "bricks") * (100 + crisisPercent(later))) / 100,
    );
    expect(crisisPercent(later)).toBeLessThan(0);
    expect(later.resources.bricks).toBe(slowed * 600_000);
  });

  it("l'espèce porte un nom latin et un cousin fossile, toujours les mêmes pour une même cellule", () => {
    const plain = player(17);
    const species = speciesOf(plain);
    expect(species.name).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
    expect(speciesOf(plain)).toEqual(species);
    const hunter = speciesOf(player(17, { mutations: ["voracity", "harpoon", "swarming"] }));
    expect(hunter.family).toBe("predation");
    expect(["Lyco", "Phago", "Toxo", "Dino"].some((root) => hunter.name.startsWith(root))).toBe(
      true,
    );
    expect(speciesOf(player(17, { zone: 3 })).name).not.toBe(species.name);
    expect(speciesOf({ ...plain, alliance: null }).name.endsWith("originis")).toBe(true);
  });
});
