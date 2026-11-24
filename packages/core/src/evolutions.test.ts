import { BALANCE, EVOLUTION_BRANCHES, EVOLUTION_IDS, SEASON_DAYS } from "@o27/data";
import type { EvolutionId, Order } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  capacity,
  cellPower,
  createPlayer,
  deserializeState,
  evolutionPercent,
  nextOpening,
  researchOffer,
  seasonCalendar,
  seasonDraw,
  serializeState,
} from "./index";
import type { OrderErrorCode, PlayerState } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const RULES = BALANCE.research;
const WORLD = { worldSeed: 27, slot: 4 };

/** Un joueur riche du palier 7 (quatrième jour), avec un Noyau du niveau demandé. */
function player(nucleus = 1, tier = 7): PlayerState {
  const now = SEASON + 3 * DAY_MS + HOUR;
  const base = createPlayer(7, SEASON, now, WORLD);
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
      organelles: { ...base.organelles, mitochondrion: 2, vacuole: 5, nucleus },
      resources: { sugar: 650 * MICRO, bricks: 650 * MICRO, proteins: 400 * MICRO },
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

/** Une évolution que la saison de ce monde permet d'exprimer, favorisée ou non. */
function awake(favoured: boolean, worldSeed = WORLD.worldSeed): EvolutionId {
  const draw = seasonDraw(worldSeed);
  const found = EVOLUTION_IDS.find(
    (id) => !draw.dormant.includes(id) && draw.favoured.includes(id) === favoured,
  );
  if (found === undefined) throw new Error("évolution attendue");
  return found;
}

describe("le tirage de la saison", () => {
  it("dans chaque branche, une évolution dort et une autre est favorisée", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const draw = seasonDraw(seed);
      for (const branch of EVOLUTION_BRANCHES) {
        const inBranch = (id: EvolutionId): boolean => BALANCE.evolutions[id].branch === branch;
        expect(draw.dormant.filter(inBranch)).toHaveLength(RULES.dormantPerBranch);
        expect(draw.favoured.filter(inBranch)).toHaveLength(1);
      }
      expect(draw.favoured.some((id) => draw.dormant.includes(id))).toBe(false);
      expect(seasonDraw(seed)).toEqual(draw);
    }
  });

  it("deux saisons ne se ressemblent pas", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const draw = seasonDraw(seed);
      seen.add([...draw.dormant, "|", ...draw.favoured].join(","));
    }
    expect(seen.size).toBeGreaterThan(15);
  });
});

describe("exprimer une évolution", () => {
  it("demande le palier 7, un Noyau, et une évolution que la saison n'a pas endormie", () => {
    const id = awake(false);
    const order: Order = { type: "research", evolution: id };
    const state = player();
    expect(
      refusal({ ...state, tier: 6, seasonStart: state.now - 2 * DAY_MS }, order, state.now),
    ).toBe("locked");
    expect(
      refusal({ ...state, organelles: { ...state.organelles, nucleus: 0 } }, order, state.now),
    ).toBe("notBuilt");
    const asleep = seasonDraw(WORLD.worldSeed).dormant[0];
    if (asleep === undefined) throw new Error("évolution dormante attendue");
    expect(refusal(state, { type: "research", evolution: asleep }, state.now)).toBe("dormant");
    expect(
      refusal({ ...state, resources: { sugar: 0, bricks: 0, proteins: 0 } }, order, state.now),
    ).toBe("insufficient");
  });

  it("coûte, dure, puis s'exprime ; le Noyau n'en mène qu'une à la fois", () => {
    const id = awake(false);
    const state = player();
    const offer = researchOffer(state, id);
    expect(offer.toLevel).toBe(1);
    expect(offer.durationMs).toBe(BALANCE.evolutions[id].seconds * 1000);
    const started = ok(state, { type: "research", evolution: id }, state.now);
    expect(started.resources.proteins).toBe(state.resources.proteins - offer.cost.proteins);
    expect(started.research).toEqual({
      evolution: id,
      toLevel: 1,
      endsAt: state.now + offer.durationMs,
    });
    expect(refusal(started, { type: "research", evolution: awake(true) }, state.now)).toBe(
      "researching",
    );
    expect(advance(started, state.now + offer.durationMs - 1).state.evolutions[id]).toBe(0);
    const done = advance(started, state.now + offer.durationMs);
    expect(done.state.evolutions[id]).toBe(1);
    expect(done.state.research).toBeNull();
    expect(done.events).toContainEqual({
      type: "evolutionDone",
      at: state.now + offer.durationMs,
      evolution: id,
      level: 1,
    });
    expect(deserializeState(serializeState(started))).toEqual(started);
  });

  it("chaque niveau coûte plus et dure plus ; le Noyau doit suivre, et accélère", () => {
    const id = awake(false);
    const one = { ...player(1), evolutions: { ...player(1).evolutions, [id]: 1 } };
    expect(researchOffer(one, id).blocked).toBe("needsNucleus");
    const three = { ...player(3), evolutions: { ...player(3).evolutions, [id]: 1 } };
    const first = researchOffer(player(3), id);
    const second = researchOffer(three, id);
    expect(second.blocked).toBeNull();
    expect(second.cost.sugar).toBeGreaterThan(first.cost.sugar);
    expect(second.durationMs).toBeGreaterThan(first.durationMs);
    expect(first.durationMs).toBeLessThan(researchOffer(player(1), id).durationMs);
    const top = { ...player(5), evolutions: { ...player(5).evolutions, [id]: RULES.maxLevel } };
    expect(researchOffer(top, id).blocked).toBe("maxLevel");
    // Même le dernier niveau reste payable avec une Réserve au maximum.
    const last = {
      ...player(5),
      evolutions: { ...player(5).evolutions, [id]: RULES.maxLevel - 1 },
    };
    expect(researchOffer(last, id).cost.sugar).toBeLessThanOrEqual(capacity(last, "sugar"));
  });

  it("une évolution exprimée agit ; favorisée par la saison, elle agit plus fort", () => {
    const plain = awake(false);
    const lucky = awake(true);
    const state = player();
    const stat = (id: EvolutionId) => BALANCE.evolutions[id].stat;
    const per = (id: EvolutionId) => BALANCE.evolutions[id].percentPerLevel;
    const with2 = (id: EvolutionId): PlayerState => ({
      ...state,
      evolutions: { ...state.evolutions, [id]: 2 },
    });
    expect(evolutionPercent(state, stat(plain))).toBe(0);
    expect(evolutionPercent(with2(plain), stat(plain))).toBe(2 * per(plain));
    expect(evolutionPercent(with2(lucky), stat(lucky))).toBe(
      Math.trunc((2 * per(lucky) * RULES.favouredPercent) / 100),
    );
    expect(cellPower(with2(plain))).toBe(cellPower(state) + 2 * BALANCE.power.perEvolutionLevel);
  });

  it("une sauvegarde d'avant les évolutions n'a rien exprimé, et trois organites de moins", () => {
    const state = player();
    const saved = JSON.parse(serializeState(state)) as Record<string, unknown> & {
      organelles: Record<string, number>;
    };
    const old = {
      ...Object.fromEntries(
        Object.entries(saved).filter(([key]) => key !== "evolutions" && key !== "research"),
      ),
      version: 8,
      organelles: Object.fromEntries(
        Object.entries(saved.organelles).filter(
          ([id]) => !["golgi", "nucleus", "lysosome"].includes(id),
        ),
      ),
    };
    const back = deserializeState(JSON.stringify(old));
    expect(back.version).toBe(11);
    expect(back.research).toBeNull();
    expect(EVOLUTION_IDS.every((id) => back.evolutions[id] === 0)).toBe(true);
    expect(back.organelles.nucleus).toBe(0);
  });
});

describe("le calendrier de la saison", () => {
  it("liste les ouvertures à date fixe, dans l'ordre, jusqu'à la fin de la saison", () => {
    const state = player();
    const calendar = seasonCalendar(state);
    expect(calendar.map((entry) => entry.at)).toEqual(
      [...calendar.map((entry) => entry.at)].sort((a, b) => a - b),
    );
    expect(calendar.filter((entry) => entry.kind === "tier").map((entry) => entry.day)).toEqual([
      3, 4, 5, 9, 13, 17,
    ]);
    expect(calendar.filter((entry) => entry.kind === "zone").map((entry) => entry.day)).toEqual(
      BALANCE.ocean.zones.slice(1).map((zone) => zone.openDay),
    );
    const end = calendar[calendar.length - 1];
    expect(end).toMatchObject({ kind: "end", day: SEASON_DAYS + 1 });
    for (const entry of calendar) {
      expect(entry.at).toBe(SEASON + (entry.day - 1) * DAY_MS);
      if (entry.kind !== "tier") expect(entry.open).toBe(entry.at <= state.now);
    }
  });

  it("le prochain rendez-vous est toujours celui qui vient ; à l'heure dite, il est ouvert", () => {
    const state = player();
    const next = nextOpening(state);
    expect(next).toMatchObject({ kind: "tier", index: 8, day: 5, open: false });
    if (next === null) throw new Error("ouverture attendue");
    const after = advance(state, next.at).state;
    expect(after.tier).toBe(8);
    expect(
      seasonCalendar(after).find((entry) => entry.index === 8 && entry.kind === "tier")?.open,
    ).toBe(true);
    expect(nextOpening(after)?.at).toBeGreaterThan(next.at);
    const over = advance(state, SEASON + (SEASON_DAYS + 1) * DAY_MS).state;
    expect(nextOpening(over)).toBeNull();
  });
});
