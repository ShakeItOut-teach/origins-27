import { BALANCE, ORGANELLE_IDS } from "@o27/data";
import type { MutationId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  capacity,
  createPlayer,
  levelCost,
  levelDuration,
  maxLevelOf,
  partyOf,
  productionRate,
  troopUnlocked,
} from "./index";
import type { PlayerState } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const RULES = BALANCE.higherRanks;
/** Le niveau 10, ouvert au jour 9. */
const TEN = 10;

/** Un joueur dont tous les organites sont au niveau 5, à une heure du jour demandé. */
function player(day: number, mutations: MutationId[] = ["thrift"]): PlayerState {
  const now = SEASON + (day - 1) * DAY_MS + HOUR;
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  const five = Object.fromEntries(ORGANELLE_IDS.map((id) => [id, 5])) as PlayerState["organelles"];
  return advance(
    {
      ...base,
      tier: 9,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 9,
        mutationsChosen: mutations.length,
        mapHarvests: 5,
        huntsWon: 1,
      },
      mutations,
      organelles: five,
      resources: { sugar: 10_000 * MICRO, bricks: 10_000 * MICRO, proteins: 1000 * MICRO },
      troops: partyOf({ hunter: 10 }),
      shieldUntil: now + 40 * DAY_MS,
      nextRaidAt: now + 40 * DAY_MS,
    },
    now,
  ).state;
}

describe("palier 10 : les rangs supérieurs", () => {
  it("aucun plafond daté : dès le jour 1, qui a de quoi payer dépasse le niveau 5", () => {
    const first = player(1);
    for (const id of ORGANELLE_IDS) expect(maxLevelOf(first, id)).toBe(RULES.maxLevel);
    const sent = applyOrder(first, { type: "upgrade", organelle: "mitochondrion" }, first.now);
    expect(sent.ok).toBe(true);
    // Mais c'est un long chantier : au moins une heure et demie, avant les bonus.
    expect(levelDuration(first, "mitochondrion", 6)).toBeGreaterThanOrEqual(
      (RULES.minMinutesPerLevel * 60_000 * 80) / 100,
    );
    const top = { ...first, organelles: { ...first.organelles, mitochondrion: RULES.maxLevel } };
    expect(applyOrder(top, { type: "upgrade", organelle: "mitochondrion" }, top.now)).toEqual({
      ok: false,
      error: "maxLevel",
    });
    // Le palier 10 arrive toujours au jour 13, avec ses cellules filles de rang 3.
    const before = player(12);
    expect(before.tier).toBe(9);
    const open = advance(before, SEASON + 12 * DAY_MS);
    expect(open.state.tier).toBe(10);
    expect(open.events).toContainEqual({ type: "tierReached", at: SEASON + 12 * DAY_MS, tier: 10 });
  });

  it("un niveau supérieur est un long chantier, de plus en plus cher, mais moins vite qu'avant", () => {
    const state = player(13);
    expect(state.tier).toBe(10);
    const fifth = levelCost(state, "nucleus", 5).sugar;
    const sixth = levelCost(state, "nucleus", 6).sugar;
    const tenth = levelCost(state, "nucleus", 10).sugar;
    expect(sixth).toBe(Math.floor((fifth * RULES.costGrowthPercent) / 100));
    expect(tenth).toBeGreaterThan(sixth);
    expect(tenth).toBeLessThan(fifth * 5);
    for (const id of ORGANELLE_IDS) {
      for (let level = 6; level <= TEN; level++) {
        expect(levelDuration(state, id, level)).toBeGreaterThanOrEqual(
          ((level - 5) * RULES.minMinutesPerLevel * 60_000 * 80) / 100,
        );
        expect(levelDuration(state, id, level)).toBeGreaterThan(
          levelDuration(state, id, level - 1),
        );
      }
    }
    // Les niveaux 1 à 5 n'ont pas changé.
    expect(levelDuration(state, "mitochondrion", 2)).toBeLessThan(60_000);
  });

  it("on monte jusqu'au niveau 10 : la production suit, la réserve grandit aussi vite que les prix", () => {
    let state = player(9);
    const rate = productionRate(state, "sugar");
    const store = capacity(state, "sugar");
    for (let level = 6; level <= TEN; level++) {
      const sent = applyOrder(state, { type: "upgrade", organelle: "mitochondrion" }, state.now);
      if (!sent.ok) throw new Error(`niveau ${String(level)} refusé : ${sent.error}`);
      state = advance(sent.state, sent.state.construction?.endsAt ?? 0).state;
      state = { ...state, resources: { sugar: 10 ** 11, bricks: 10 ** 11, proteins: 0 } };
    }
    expect(state.organelles.mitochondrion).toBe(TEN);
    // Deux fois plus de niveaux, au moins deux fois plus de production.
    expect(productionRate(state, "sugar")).toBeGreaterThanOrEqual(rate * 2);
    // Et rien n'empêche de continuer.
    expect(applyOrder(state, { type: "upgrade", organelle: "mitochondrion" }, state.now).ok).toBe(
      true,
    );
    const big = { ...state, organelles: { ...state.organelles, vacuole: 10 } };
    expect(capacity(big, "sugar")).toBeGreaterThan(store * 3);
    // De quoi payer le plus cher des niveaux 10.
    for (const id of ORGANELLE_IDS) {
      expect(levelCost(big, id, 10).sugar).toBeLessThanOrEqual(capacity(big, "sugar"));
      expect(levelCost(big, id, 10).bricks).toBeLessThanOrEqual(capacity(big, "bricks"));
    }
  });

  it("trois gènes d'une famille ouvrent sa cellule fille de rang 3, pas avant le jour 13", () => {
    const predation: MutationId[] = ["voracity", "harpoon", "swarming"];
    const early = player(12, predation);
    expect(troopUnlocked(early, "toxic")).toBe(true);
    expect(troopUnlocked(early, "rotifer")).toBe(false);
    const open = player(13, predation);
    expect(troopUnlocked(open, "rotifer")).toBe(true);
    expect(troopUnlocked(open, "tardigrade")).toBe(false);
    expect(troopUnlocked(player(13, ["voracity", "harpoon"]), "rotifer")).toBe(false);
    const born = applyOrder(open, { type: "trainTroop", troop: "rotifer", count: 2 }, open.now);
    expect(born.ok).toBe(true);
    expect(BALANCE.troops.rotifer.power).toBeGreaterThan(BALANCE.troops.toxic.power * 2);
    expect(BALANCE.troops.tardigrade.defense).toBeGreaterThan(BALANCE.troops.guardian.defense * 2);
    expect(BALANCE.troops.salp.carry).toBeGreaterThan(BALANCE.troops.carrier.carry * 2);
  });
});
