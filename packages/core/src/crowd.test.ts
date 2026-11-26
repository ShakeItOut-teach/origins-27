import { BALANCE } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  advance,
  applyOrder,
  cellDistance,
  contestBoard,
  createPlayer,
  depositLeft,
  gatherOffer,
  gazette,
  deserializeState,
  humanCard,
  humanCount,
  oceanDeposits,
  oceanRivals,
  othersTaken,
  playerCell,
  ranking,
  readCrowd,
  rivalName,
  serializeState,
  withCrowd,
} from "./index";
import type { HumanCard, PlayerState } from "./index";

const SEASON = 1_800_000_000_000;
const WORLD = { worldSeed: 27, slot: 4 };
const HOUR = 3_600_000;

function player(day: number, patch: Partial<PlayerState> = {}): PlayerState {
  const now = SEASON + (day - 1) * DAY_MS + 3_600_000;
  return { ...createPlayer(7, SEASON, now, WORLD), ...patch };
}

function card(slot: number, power: number, patch: Partial<HumanCard> = {}): HumanCard {
  return {
    slot,
    name: `Humanus ${String(slot)}`,
    hue: 120,
    tier: 9,
    zone: 1,
    scores: { power, cell: power, troops: 0, loot: 0, defense: 0 },
    week: 0,
    contest: 0,
    seenAt: SEASON,
    family: null,
    banner: null,
    given: 0,
    ...patch,
  };
}

describe("la vitrine : ce que les autres humains voient d'un joueur", () => {
  it("porte sa place, son espèce et ses scores, rien de plus", () => {
    const state = player(10, { tier: 9 });
    const shown = humanCard(state);
    expect(shown.slot).toBe(4);
    expect(shown.seenAt).toBe(state.now);
    expect(shown.scores.power).toBe(ranking(state, "power").mine.score);
    expect(Object.keys(shown).sort()).toEqual(
      [
        "banner",
        "contest",
        "family",
        "given",
        "hue",
        "name",
        "scores",
        "seenAt",
        "slot",
        "tier",
        "week",
        "zone",
      ].sort(),
    );
  });

  it("se relit telle quelle", () => {
    const shown = humanCard(player(10, { tier: 9 }));
    expect(readCrowd({ cards: [JSON.parse(JSON.stringify(shown))] }).cards).toEqual([shown]);
  });
});

describe("relire une foule venue du réseau", () => {
  it("ignore une vitrine mal formée sans perdre les autres", () => {
    const crowd = readCrowd({
      cards: [card(1, 10), { slot: -1 }, { ...card(2, 5), name: "" }, "x", card(3, 7)],
    });
    expect(crowd.cards.map((entry) => entry.slot)).toEqual([1, 3]);
  });

  it("garde la vitrine la plus récente d'une même place", () => {
    const crowd = readCrowd([card(1, 10, { seenAt: 5 }), card(1, 99, { seenAt: 9 })]);
    expect(crowd.cards).toHaveLength(1);
    expect(crowd.cards[0]?.scores.power).toBe(99);
  });

  it("n'accepte rien d'autre qu'une liste", () => {
    expect(readCrowd(null).cards).toEqual([]);
    expect(readCrowd({ cards: "non" }).cards).toEqual([]);
  });
});

describe("le même océan : un humain prend la place d'un organisme simulé", () => {
  it("dans le classement, avec son nom, son score et le badge humain", () => {
    const alone = player(10, { tier: 9 });
    const shared = withCrowd(alone, { cards: [card(11, 999_999_999)] });
    const rows = ranking(shared, "power").rows;
    expect(rows[0]).toMatchObject({ name: "Humanus 11", human: true, me: false });
    expect(rows).toHaveLength(BALANCE.world.organisms);
    expect(rows.filter((row) => row.human && !row.me)).toHaveLength(1);
    expect(ranking(alone, "power").rows.filter((row) => row.human && !row.me)).toHaveLength(0);
  });

  it("le joueur est compté comme humain, et jamais deux fois", () => {
    const state = withCrowd(player(10, { tier: 9 }), { cards: [card(4, 1), card(8, 1)] });
    expect(ranking(state, "power").mine.human).toBe(true);
    expect(humanCount(state)).toBe(2);
  });

  it("un humain plus fort ne peut que faire reculer le joueur, d'une place au plus", () => {
    const alone = player(10, { tier: 9 });
    const before = ranking(alone, "power").mine.rank;
    const after = ranking(withCrowd(alone, { cards: [card(11, 999_999_999)] }), "power").mine.rank;
    expect(after).toBeGreaterThanOrEqual(before);
    expect(after).toBeLessThanOrEqual(before + 1);
  });

  it("dans le concours, avec sa progression de la semaine", () => {
    const base = advance(player(9, { tier: 9 }), SEASON + 9 * DAY_MS).state;
    const week = base.contest?.week ?? 0;
    const shared = withCrowd(base, {
      cards: [card(11, 1, { week, contest: 999_999_999 }), card(12, 1, { week: week + 1 })],
    });
    const board = contestBoard(shared);
    expect(board?.rows[0]).toMatchObject({ name: "Humanus 11", human: true });
  });

  it("dans l'océan : on voit son nom, et le serveur refuse de l'espionner ou de l'attaquer", () => {
    const plain = player(12, { tier: BALANCE.ocean.tier });
    const base = { ...plain, organelles: { ...plain.organelles, receptor: 3 }, spies: 6 };
    const target = oceanRivals(base)[0];
    expect(target).toBeDefined();
    if (target === undefined) return;
    const slot = Number(target.id.slice(2));
    const shared = withCrowd(base, { cards: [card(slot, 1)] });
    const seen = oceanRivals(shared).find((rival) => rival.id === target.id);
    expect(seen).toMatchObject({ name: "Humanus " + String(slot), human: true });
    expect(rivalName(shared, target.id)).toBe("Humanus " + String(slot));
    const spy = applyOrder(shared, { type: "spyRival", rival: target.id }, shared.now);
    expect(spy).toEqual({ ok: false, error: "human" });
    expect(applyOrder(base, { type: "spyRival", rival: target.id }, base.now).ok).toBe(true);
  });

  it("la foule n'entre jamais dans la sauvegarde", () => {
    const state = withCrowd(player(10, { tier: 9 }), { cards: [card(11, 5)] });
    const again = deserializeState(serializeState(state));
    expect(again.crowd).toBeUndefined();
    expect(serializeState(again)).toBe(serializeState(state));
  });
});

describe("les gisements vraiment partagés", () => {
  it("ce que les autres humains ont pris n'est plus là pour le joueur", () => {
    const base = player(12, { tier: BALANCE.ocean.tier });
    const home = playerCell(base);
    const deposit = oceanDeposits(27, base.now)
      .filter((entry) => entry.zone === 0 && !entry.steady && entry.endsAt - base.now > HOUR)
      .sort((one, other) => cellDistance(home, one) - cellDistance(home, other))[0];
    expect(deposit).toBeDefined();
    if (deposit === undefined) return;
    const alone = depositLeft(deposit, base.taken, base.now);
    expect(alone).toBeGreaterThan(0);

    const half = Math.floor(alone / 2);
    const some = withCrowd(base, { cards: [], taken: { [deposit.id]: half } });
    expect(othersTaken(some, deposit.id)).toBe(half);
    expect(depositLeft(deposit, base.taken, base.now, othersTaken(some, deposit.id))).toBe(
      alone - half,
    );

    const emptied = withCrowd(base, { cards: [], taken: { [deposit.id]: deposit.total } });
    expect(gatherOffer(emptied, deposit, emptied.now).loot).toBe(0);
    expect(applyOrder(emptied, { type: "gather", deposit: deposit.id }, emptied.now)).toEqual({
      ok: false,
      error: "depleted",
    });
  });

  it("la part du joueur lui-même n'est pas comptée deux fois", () => {
    const base = { ...player(12, { tier: BALANCE.ocean.tier }), taken: { "d:1:1:5": 300 } };
    const shared = withCrowd(base, { cards: [], taken: { "d:1:1:5": 1000 } });
    expect(othersTaken(shared, "d:1:1:5")).toBe(700);
    expect(othersTaken(withCrowd(base, { cards: [], taken: { "d:1:1:5": 200 } }), "d:1:1:5")).toBe(
      0,
    );
  });

  it("relit les prises venues de la base, et écarte ce qui n'est pas un gisement", () => {
    const crowd = readCrowd({ cards: [], taken: { "d:1:-2:3": "1500", autre: 4, "d:0:0:1": -1 } });
    expect(crowd.taken).toEqual({ "d:1:-2:3": 1500 });
  });
});

describe("la part des familles de gènes chez les humains", () => {
  it("n'est publiée qu'à partir de trois humains qui ont des gènes", () => {
    const base = player(14, { tier: 9 });
    const two = withCrowd(base, {
      cards: [card(11, 1, { family: "predation" }), card(12, 1, { family: "mobility" })],
    });
    expect(gazette(two).families).toBeNull();
    const three = withCrowd(base, {
      cards: [
        card(11, 1, { family: "predation" }),
        card(12, 1, { family: "predation" }),
        card(13, 1, { family: "mobility" }),
        card(14, 1, { family: "resilience" }),
      ],
    });
    // Le joueur n'a aucun gène : il n'est pas compté.
    expect(gazette(three).families).toEqual({
      metabolism: 0,
      predation: 50,
      mobility: 25,
      resilience: 25,
    });
  });

  it("une vitrine d'avant les familles compte comme sans gène", () => {
    const old: Record<string, unknown> = { ...card(11, 1, { family: "predation" }) };
    delete old.family;
    expect(readCrowd([old]).cards[0]?.family).toBeNull();
  });
});
