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
import { along, organismHabits, organismScore } from "./power";

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
    // Dix niveaux d'organites, plus le Noyau (niveau 1 dès le départ).
    expect(cellPower(state)).toBe(11 * data.perOrganelleLevel + data.perMutation);
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
    const strong = { ...weak, troops: partyOf({ toxic: 300 }) };
    expect(ranking(strong, "power").mine.rank).toBeLessThan(ranking(weak, "power").mine.rank);
    expect(ranking(strong, "troops").mine.rank).toBeLessThan(ranking(weak, "troops").mine.rank);
    // Une cellule mieux bâtie ne change rien au classement des troupes.
    const built = {
      ...weak,
      organelles: { ...weak.organelles, mitochondrion: 5, cilia: 5, ribosome: 5, wall: 5 },
    };
    expect(ranking(built, "cell").mine.score).toBeGreaterThan(ranking(weak, "cell").mine.score);
    expect(ranking(built, "troops").mine.rank).toBe(ranking(weak, "troops").mine.rank);
    // Sans rien faire pendant dix jours, on se fait dépasser.
    const later = { ...strong, now: strong.now + 10 * DAY_MS };
    expect(ranking(later, "power").mine.rank).toBeGreaterThan(ranking(strong, "power").mine.rank);
  });

  it("piller et repousser des attaques font monter dans leurs classements", () => {
    const state = player(7, 5);
    const raider = { ...state, counters: { ...state.counters, lootTaken: 100_000 } };
    expect(ranking(raider, "loot").mine.rank).toBe(1);
    const wall = { ...state, counters: { ...state.counters, attacksRepelled: 1000 } };
    expect(ranking(wall, "defense").mine.rank).toBe(1);
  });
});

describe("l'océan des organismes simulés", () => {
  const scores = (day: number): number[] =>
    Array.from({ length: ORGANISMS }, (_, slot) => organismScore(27, slot, day, "power")).sort(
      (one, other) => other - one,
    );
  const place = (list: readonly number[], rank: number): number => list[rank - 1] ?? 0;

  it("une courbe passe en ligne droite d'un point à l'autre", () => {
    const points = [
      [1, 100],
      [5, 500],
      [9, 300],
    ] as const;
    expect(along(points, 0)).toBe(100);
    expect(along(points, 3)).toBe(300);
    expect(along(points, 7)).toBe(400);
    expect(along(points, 30)).toBe(300);
  });

  it("il est inégal : quelques-uns filent devant, beaucoup suivent, d'autres traînent", () => {
    for (const day of [9, 13, 21, 27]) {
      const list = scores(day);
      // Le premier vaut au moins trois fois l'organisme du milieu…
      expect(place(list, 1)).toBeGreaterThan(3 * place(list, 250));
      // … le 25e (le haut de la ligue des Prédateurs), au moins deux fois…
      expect(place(list, 25)).toBeGreaterThan(2 * place(list, 250));
      // … et le milieu, au moins deux fois les derniers, qui ont souvent abandonné.
      expect(place(list, 250)).toBeGreaterThan(2 * place(list, 450));
    }
  });

  it("les moins ambitieux abandonnent en route : leur score ne bouge plus", () => {
    const habits = Array.from({ length: ORGANISMS }, (_, slot) => organismHabits(27, slot));
    const quitters = habits.flatMap((entry, slot) => (entry.quitDay === null ? [] : [slot]));
    const share = (quitters.length * 100) / ORGANISMS;
    expect(share).toBeGreaterThan(BALANCE.ranking.quit.belowPercentile - 2);
    expect(share).toBeLessThan(BALANCE.ranking.quit.belowPercentile + 2);
    for (const slot of quitters) {
      const day = habits[slot]?.quitDay ?? 0;
      expect(organismScore(27, slot, 27, "power")).toBe(organismScore(27, slot, day, "power"));
      expect(habits[slot]?.percentile).toBeLessThan(BALANCE.ranking.quit.belowPercentile);
    }
    // Les autres grandissent jusqu'au bout.
    const keeper = habits.findIndex((entry) => entry.quitDay === null);
    expect(organismScore(27, keeper, 27, "power")).toBeGreaterThan(
      organismScore(27, keeper, 20, "power"),
    );
  });

  it("le classement bouge : la tête de l'océan change au fil de la saison", () => {
    const top = (day: number): number[] =>
      Array.from({ length: ORGANISMS }, (_, slot) => slot)
        .sort(
          (one, other) =>
            organismScore(27, other, day, "power") - organismScore(27, one, day, "power"),
        )
        .slice(0, 10);
    const early = top(7);
    const late = top(21);
    expect(late.filter((slot) => early.includes(slot)).length).toBeLessThan(10);
  });

  it("chaque classement suit sa catégorie : la puissance est la cellule plus les troupes", () => {
    for (const slot of [0, 17, 250, 499]) {
      for (const day of [4, 13, 27]) {
        expect(organismScore(27, slot, day, "power")).toBe(
          organismScore(27, slot, day, "cell") + organismScore(27, slot, day, "troops"),
        );
        for (const category of RANKING_IDS) {
          expect(organismScore(27, slot, day, category)).toBeGreaterThanOrEqual(0);
        }
      }
    }
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
    // Elle attend dans un coffre de ligue : rien n'entre tant qu'il n'est pas ouvert.
    expect(step.state.resources.proteins).toBe(state.resources.proteins);
    expect(step.state.chests).toEqual([
      { kind: "league", at: midnight, level: reward.league, ...expected, energy: 0, boosts: 0 },
    ]);
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
    expect(back.version).toBe(11);
    expect(back.counters.lootTaken).toBe(0);
    expect(back.counters.attacksRepelled).toBe(0);
  });
});
