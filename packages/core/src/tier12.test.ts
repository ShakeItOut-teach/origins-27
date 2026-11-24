import { APEX_LINEAGES, BALANCE } from "@o27/data";
import type { MutationId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  apexArrivals,
  apexLineage,
  apexOffer,
  apexRewardFor,
  applyOrder,
  createPlayer,
  deserializeState,
  maxLevelOf,
  partyOf,
  serializeState,
  troopUnlocked,
} from "./index";
import type { PlayerState } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const RULES = BALANCE.apex;

/** Un joueur prêt à sortir des eaux, à une heure du jour demandé. */
function player(day: number, patch: Partial<PlayerState> = {}): PlayerState {
  const now = SEASON + (day - 1) * DAY_MS + HOUR;
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  return advance(
    {
      ...base,
      tier: 9,
      zone: 3,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
      },
      mutations: ["thrift"],
      organelles: {
        ...base.organelles,
        mitochondrion: 5,
        vacuole: 5,
        nucleus: RULES.nucleusLevel,
      },
      resources: { sugar: 10 ** 12, bricks: 10 ** 12, proteins: 10 ** 12 },
      troops: partyOf({ hunter: 20 }),
      shieldUntil: now + 40 * DAY_MS,
      nextRaidAt: now + 40 * DAY_MS,
      ...patch,
    },
    now,
  ).state;
}

describe("palier 12 : la course à l'APEX", () => {
  it("s'ouvre au jour 21 : niveaux jusqu'à 20, cellules filles de rang 5, sortie des eaux", () => {
    const predation: MutationId[] = ["voracity", "harpoon", "swarming"];
    const before = player(20, { mutations: predation });
    expect(before.tier).toBe(11);
    expect(apexOffer(before).blocked).toBe("locked");
    expect(applyOrder(before, { type: "leaveWater" }, before.now)).toEqual({
      ok: false,
      error: "locked",
    });
    const open = player(21, { mutations: predation });
    expect(open.tier).toBe(12);
    expect(maxLevelOf(open, "vacuole")).toBe(20);
    expect(troopUnlocked(open, "eurypterid")).toBe(true);
    expect(troopUnlocked(before, "eurypterid")).toBe(false);
    expect(apexOffer(open).blocked).toBeNull();
  });

  it("il faut la zone éclairée, un Noyau évolué et de très grosses réserves", () => {
    const state = player(22);
    expect(apexOffer({ ...state, zone: 2 }).blocked).toBe("zoneClosed");
    const low = { ...state, organelles: { ...state.organelles, nucleus: RULES.nucleusLevel - 1 } };
    expect(apexOffer(low).blocked).toBe("needsNucleus");
    const poor = { ...state, resources: { sugar: 0, bricks: 0, proteins: 0 } };
    expect(applyOrder(poor, { type: "leaveWater" }, state.now)).toEqual({
      ok: false,
      error: "insufficient",
    });
    expect(apexOffer(state).cost.sugar).toBe(RULES.cost.sugar * MICRO);
  });

  it("sortir des eaux prend un jour ; à l'arrivée, la place est fixée et un coffre attend", () => {
    const state = player(21);
    const sent = applyOrder(state, { type: "leaveWater" }, state.now);
    if (!sent.ok) throw new Error("sortie refusée");
    const endsAt = state.now + RULES.hours * HOUR;
    expect(sent.state.apex).toEqual({ endsAt, place: 0 });
    expect(sent.state.resources.sugar).toBe(state.resources.sugar - RULES.cost.sugar * MICRO);
    expect(applyOrder(sent.state, { type: "leaveWater" }, state.now)).toEqual({
      ok: false,
      error: "busy",
    });
    expect(deserializeState(serializeState(sent.state))).toEqual(sent.state);
    expect(advance(sent.state, endsAt - 1).state.apex?.place).toBe(0);
    const landed = advance(sent.state, endsAt);
    // Parti le premier jour possible : il arrive parmi les tout premiers.
    const place = landed.state.apex?.place ?? 0;
    expect(place).toBeGreaterThanOrEqual(1);
    expect(place).toBeLessThanOrEqual(5);
    expect(landed.events).toContainEqual({
      type: "apexReached",
      at: endsAt,
      place,
      lineage: apexLineage(state),
    });
    const chest = landed.state.chests.find((entry) => entry.kind === "apex");
    expect(chest).toMatchObject({ level: place, ...apexRewardFor(place) });
    expect(deserializeState(serializeState(landed.state))).toEqual(landed.state);
    // Une seule fois : le temps qui passe ne le fait pas arriver de nouveau.
    const later = advance(landed.state, endsAt + DAY_MS);
    expect(later.events.some((event) => event.type === "apexReached")).toBe(false);
  });

  it("les organismes simulés sortent des eaux jour après jour : plus on tarde, plus on est loin", () => {
    const state = player(21);
    const start = SEASON + (RULES.firstDay - 1) * DAY_MS;
    expect(apexArrivals(state, start - 1)).toBe(0);
    expect(apexArrivals(state, start + DAY_MS)).toBeGreaterThan(RULES.perDay - 5);
    expect(apexArrivals(state, start + 3 * DAY_MS)).toBeGreaterThan(
      apexArrivals(state, start + DAY_MS),
    );
    const late = player(26);
    const sent = applyOrder(late, { type: "leaveWater" }, late.now);
    if (!sent.ok) throw new Error("sortie refusée");
    const landed = advance(sent.state, sent.state.apex?.endsAt ?? 0).state;
    expect(landed.apex?.place).toBeGreaterThan(100);
    // Les récompenses décroissent avec la place.
    expect(apexRewardFor(1)?.boosts).toBeGreaterThan(apexRewardFor(200)?.boosts ?? 0);
    expect(apexRewardFor(0)).toBeNull();
  });

  it("la lignée de la terre ferme suit les gènes du joueur", () => {
    const base = player(21);
    const with_ = (mutations: MutationId[]) => apexLineage({ ...base, mutations });
    expect(with_(["voracity", "harpoon", "swarming"])).toBe("tyrannosaur");
    expect(with_(["voracity", "harpoon", "flagellum"])).toBe("dromaeosaur");
    expect(with_(["thickWall", "armorPlates", "dormancy"])).toBe("ankylosaur");
    expect(with_(["thickWall", "armorPlates", "voracity"])).toBe("triceratops");
    expect(with_(["swiftCilia", "quickDivision", "flagellum"])).toBe("pterosaur");
    expect(with_(["fastMetabolism", "digestivePouch", "thrift"])).toBe("brachiosaur");
    for (const lineage of [with_([]), with_(["thrift"])]) expect(APEX_LINEAGES).toContain(lineage);
  });
});
