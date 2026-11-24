import { BALANCE, RANKING_IDS } from "@o27/data";
import type { Order } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  cellDistance,
  cellPower,
  createPlayer,
  deserializeState,
  findPredator,
  leagueOf,
  leagueRewardFor,
  oceanPredators,
  playerCell,
  playerScore,
  predatorOffer,
  ranking,
  serializeState,
  totalPower,
  troopPower,
  zoneAt,
  partyOf,
} from "./index";
import type { OrderErrorCode, PlayerState, Predator } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const WORLD = { worldSeed: 27, slot: 4 };
const ORGANISMS = BALANCE.world.organisms;

/** Un joueur du palier demandé, au jour demandé, que personne ne vient déranger. */
function player(tier: number, day: number, zone = 0): PlayerState {
  const now = SEASON + (day - 1) * DAY_MS + HOUR;
  const base = createPlayer(7, SEASON, now, WORLD);
  return advance(
    {
      ...base,
      tier,
      zone,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
        rivalFights: tier >= 7 ? 3 : tier >= 6 ? 1 : 0,
      },
      mutations: ["thrift"],
      organelles: { ...base.organelles, mitochondrion: 2, vacuole: 5, nursery: 3 },
      resources: { sugar: 100 * MICRO, bricks: 100 * MICRO, proteins: 10 * MICRO },
      troops: partyOf({ hunter: 10, armored: 5, swift: 5 }),
      shieldUntil: now + 20 * DAY_MS,
      nextRaidAt: now + 25 * DAY_MS,
    },
    now,
  ).state;
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

function nearestPredator(state: PlayerState, zone: number, level = 0): Predator {
  const home = playerCell(state);
  const found = oceanPredators(state.worldSeed, state.now)
    .filter(
      (entry) => entry.zone === zone && entry.level === level && entry.endsAt - state.now > HOUR,
    )
    .sort((one, other) => cellDistance(home, one) - cellDistance(home, other))[0];
  if (found === undefined) throw new Error("prédateur attendu");
  return found;
}

describe("la puissance", () => {
  it("additionne la cellule et les troupes, sorties comprises", () => {
    const state = player(7, 5);
    const data = BALANCE.power;
    expect(cellPower(state)).toBe(10 * data.perOrganelleLevel + data.perMutation);
    expect(troopPower(state)).toBe(20 * data.perTroop);
    expect(totalPower(state)).toBe(cellPower(state) + troopPower(state));
    expect(cellPower({ ...state, zone: 2 })).toBe(cellPower(state) + 2 * data.perZone);

    const predator = nearestPredator(state, 0);
    const out = ok(
      state,
      { type: "huntPredator", predator: predator.id, party: state.troops },
      state.now,
    );
    expect(out.troops.hunter).toBe(0);
    expect(troopPower(out)).toBe(troopPower(state));
  });
});

describe("les classements", () => {
  it("chaque classement range tout l'océan, le joueur compris, sans trou", () => {
    const state = player(7, 5);
    for (const category of RANKING_IDS) {
      const { rows, mine } = ranking(state, category);
      expect(rows).toHaveLength(ORGANISMS);
      expect(rows.filter((row) => row.me)).toEqual([mine]);
      expect(mine.score).toBe(playerScore(state, category));
      rows.forEach((row, index) => {
        expect(row.rank).toBe(index + 1);
        expect(row.score).toBeLessThanOrEqual(rows[index - 1]?.score ?? Infinity);
        if (!row.me) expect(row.name).not.toBe("");
      });
    }
  });

  it("plus fort, on monte ; les organismes simulés grandissent avec la saison", () => {
    const weak = player(7, 5);
    const strong = {
      ...weak,
      organelles: { ...weak.organelles, mitochondrion: 5, cilia: 5, ribosome: 5, wall: 5 },
    };
    expect(ranking(strong, "power").mine.rank).toBeLessThan(ranking(weak, "power").mine.rank);
    expect(ranking(strong, "cell").mine.rank).toBeLessThan(ranking(weak, "cell").mine.rank);
    expect(ranking(strong, "troops").mine.rank).toBe(ranking(weak, "troops").mine.rank);
    const later = { ...weak, now: weak.now + 10 * DAY_MS };
    expect(ranking(later, "power").mine.rank).toBeGreaterThan(ranking(weak, "power").mine.rank);
  });

  it("piller et repousser des attaques font monter dans leurs classements", () => {
    const state = player(7, 5);
    const raider = { ...state, counters: { ...state.counters, lootTaken: 100_000 } };
    expect(ranking(raider, "loot").mine.rank).toBe(1);
    const wall = { ...state, counters: { ...state.counters, attacksRepelled: 1000 } };
    expect(ranking(wall, "defense").mine.rank).toBe(1);
  });
});

describe("les ligues", () => {
  it("le rang donne la ligue, de la plus haute à la plus basse", () => {
    const last = BALANCE.leagues.length - 1;
    expect(leagueOf(1, 500)).toBe(0);
    expect(leagueOf(5, 500)).toBe(0);
    expect(leagueOf(6, 500)).toBe(1);
    expect(leagueOf(500, 500)).toBe(last);
    let previous = 0;
    for (let rank = 1; rank <= 500; rank++) {
      const league = leagueOf(rank, 500);
      expect(league).toBeGreaterThanOrEqual(previous);
      previous = league;
    }
    for (let league = 1; league <= last; league++) {
      expect(leagueRewardFor(league).sugar).toBeLessThan(leagueRewardFor(league - 1).sugar);
    }
  });

  it("chaque minuit, le joueur du palier 7 reçoit la récompense de sa ligue", () => {
    const state = player(7, 5);
    const midnight = SEASON + 5 * DAY_MS;
    const step = advance(state, midnight);
    const reward = step.events.find((event) => event.type === "leagueReward");
    if (reward?.type !== "leagueReward") throw new Error("récompense attendue");
    const expected = leagueRewardFor(reward.league);
    expect(reward.loot.proteins).toBe(expected.proteins);
    expect(reward.rank).toBeGreaterThanOrEqual(1);
    expect(step.state.resources.proteins).toBe(state.resources.proteins + expected.proteins);
    expect(step.state.counters.leagueEntered).toBe(1);
    // Deux minuits : deux récompenses.
    const two = advance(state, midnight + DAY_MS);
    expect(two.events.filter((event) => event.type === "leagueReward")).toHaveLength(2);
  });

  it("avant le palier 7, pas de récompense de ligue", () => {
    // Troisième jour : le palier 7 ne s'ouvre qu'au minuit suivant, après la distribution.
    const state = player(6, 3);
    expect(state.tier).toBe(6);
    const step = advance(state, SEASON + 3 * DAY_MS);
    expect(step.events.some((event) => event.type === "leagueReward")).toBe(false);
    expect(step.state.tier).toBe(7);
  });
});

describe("les prédateurs de l'océan", () => {
  const at = SEASON + 4 * DAY_MS + HOUR;

  it("ils sont les mêmes pour tous, dans l'eau, plus forts et plus nourrissants en haut", () => {
    const predators = oceanPredators(27, at);
    expect(predators.length).toBeGreaterThan(60);
    expect(oceanPredators(27, at)).toBe(predators);
    for (const predator of predators) {
      expect(zoneAt(predator.x, predator.y)).toBe(predator.zone);
      expect(findPredator(27, predator.id, at)).toEqual(predator);
      expect(findPredator(27, predator.id, predator.endsAt)).toBeNull();
      expect(predator.power).toBeGreaterThan(0);
    }
    const power = (zone: number): number =>
      predators.find((entry) => entry.zone === zone && entry.level === 0)?.power ?? 0;
    expect(power(1)).toBeGreaterThan(power(0));
    expect(new Set(predators.map((entry) => entry.level)).size).toBe(
      BALANCE.predators.levels.length,
    );
  });

  it("chasser un prédateur demande le palier 7, des troupes, et qu'il soit à sa portée", () => {
    const state = player(7, 5);
    const predator = nearestPredator(state, 0);
    const party = state.troops;
    const order: Order = { type: "huntPredator", predator: predator.id, party };
    const early = player(6, 3);
    expect(refusal(early, order, early.now)).toBe("locked");
    expect(refusal(state, { ...order, predator: "p:0:0:1" }, state.now)).toBe("unknownPredator");
    expect(
      refusal(state, { ...order, party: partyOf({ hunter: 0, armored: 0, swift: 0 }) }, state.now),
    ).toBe("noTroops");
    const above = nearestPredator(state, 1);
    expect(refusal(state, { ...order, predator: above.id }, state.now)).toBe("zoneClosed");
    const sent = ok(state, order, state.now);
    expect(refusal(sent, order, state.now)).toBe("busy");
  });

  it("vaincu, le prédateur donne ses protéines et ne revient pas", () => {
    const state = player(7, 5);
    const predator = nearestPredator(state, 0);
    const offer = predatorOffer(state, predator, state.now);
    const order: Order = { type: "huntPredator", predator: predator.id, party: state.troops };
    const sent = ok(state, order, state.now);
    expect(sent.hunt?.power).toBe(predator.power);
    expect(sent.hunt?.returnsAt).toBe(state.now + offer.durationMs);
    const fought = ok(sent, { type: "strikeHunt" }, sent.hunt?.arrivesAt ?? 0);
    const back = advance(fought, fought.hunt?.returnsAt ?? 0).state;
    expect(back.hunt).toBeNull();
    // Vingt cellules contre le plus faible des prédateurs : la victoire est acquise.
    expect(back.resources.proteins).toBe(state.resources.proteins + predator.proteins);
    expect(back.counters.huntsWon).toBe(state.counters.huntsWon + 1);
    expect(refusal(back, order, back.now)).toBe("placeResting");
    expect(deserializeState(serializeState(sent))).toEqual(sent);
  });
});

describe("la sauvegarde", () => {
  it("une sauvegarde d'avant les classements repart avec des compteurs à zéro", () => {
    const state = player(6, 3);
    const old = JSON.parse(serializeState(state)) as { version: number; counters: object };
    old.version = 6;
    old.counters = Object.fromEntries(
      Object.entries(old.counters).filter(
        ([key]) => key !== "lootTaken" && key !== "attacksRepelled",
      ),
    );
    const back = deserializeState(JSON.stringify(old));
    expect(back.version).toBe(9);
    expect(back.counters.lootTaken).toBe(0);
    expect(back.counters.attacksRepelled).toBe(0);
  });
});
