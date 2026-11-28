import { BALANCE, BANNER_IDS } from "@o27/data";
import type { BannerId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  advance,
  applyOrder,
  bannerRelation,
  candidates,
  createPlayer,
  deserializeState,
  isLeader,
  readCrowd,
  serializeState,
  slotRelation,
  voteOpensAt,
  withCrowd,
} from "./index";
import type { Crowd, HumanCard, PlayerState, Politics } from "./index";

const SEASON = 1_800_000_000_000;
/** Jour 12, midi : alliances ouvertes au jour 9, vote ouvert au jour 11. */
const NOW = SEASON + 11 * DAY_MS + 12 * 3_600_000;

function card(slot: number, banner: BannerId | null): HumanCard {
  return {
    slot,
    name: `Humanus ${String(slot)}`,
    hue: 10,
    tier: 9,
    zone: 0,
    scores: { power: 1, cell: 1, troops: 0, loot: 0, defense: 0, duel: 0 },
    week: 0,
    contest: 0,
    seenAt: SEASON,
    family: null,
    banner,
    given: 0,
    shield: 0,
  };
}

/** Un joueur du palier 9, rangé sous `banner`, avec cette foule autour de lui. */
function player(banner: BannerId, crowd: Crowd, now = NOW): PlayerState {
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  const ready = advance({ ...base, tier: 9, nextRaidAt: now + 30 * DAY_MS }, now).state;
  if (ready.alliance === null) throw new Error("alliance attendue");
  return withCrowd({ ...ready, alliance: { ...ready.alliance, banner } }, crowd);
}

function banner(index: number): BannerId {
  const found = BANNER_IDS[index];
  if (found === undefined) throw new Error("bannière attendue");
  return found;
}

const MINE = banner(0);
const OTHER = banner(1);
const THIRD = banner(2);

function politics(patch: Partial<Politics>): Politics {
  return { leaders: {}, wars: [], votes: {}, ...patch };
}

describe("alliés, neutres, ennemis", () => {
  it("sa bannière est alliée, les autres neutres ; une guerre les rend ennemies, dans les deux sens", () => {
    const peace = player(MINE, { cards: [card(11, MINE), card(12, OTHER)] });
    expect(bannerRelation(peace, MINE)).toBe("ally");
    expect(bannerRelation(peace, OTHER)).toBe("neutral");
    expect(bannerRelation(peace, null)).toBe("neutral");
    expect(slotRelation(peace, 11)).toBe("ally");
    expect(slotRelation(peace, 12)).toBe("neutral");

    const declared = player(MINE, {
      cards: [card(11, MINE), card(12, OTHER)],
      politics: politics({ wars: [[OTHER, MINE]] }),
    });
    expect(bannerRelation(declared, OTHER)).toBe("enemy");
    expect(slotRelation(declared, 12)).toBe("enemy");
    expect(bannerRelation(declared, THIRD)).toBe("neutral");
  });

  it("sans alliance, aucune couleur", () => {
    const base = createPlayer(7, SEASON, NOW, { worldSeed: 27, slot: 4 });
    expect(bannerRelation(base, MINE)).toBeNull();
  });
});

describe("le chef de bannière", () => {
  it("le vote s'ouvre deux jours après les alliances, pour un humain du banc ou soi-même", () => {
    const crowd = { cards: [card(11, MINE), card(12, OTHER)] };
    const opens = voteOpensAt(player(MINE, crowd));
    expect(opens).toBe(SEASON + (8 + BALANCE.alliance.leader.voteAfterDays) * DAY_MS);

    const early = player(MINE, crowd, opens - 3_600_000);
    expect(applyOrder(early, { type: "voteLeader", slot: 11 }, early.now)).toEqual({
      ok: false,
      error: "voteClosed",
    });

    const state = player(MINE, crowd);
    expect(candidates(state)).toEqual([4, 11]);
    expect(applyOrder(state, { type: "voteLeader", slot: 12 }, state.now)).toEqual({
      ok: false,
      error: "notAlly",
    });
    const voted = applyOrder(state, { type: "voteLeader", slot: 11 }, state.now);
    if (!voted.ok) throw new Error("vote refusé");
    expect(voted.state.alliance?.vote).toBe(11);
    expect(voted.events).toContainEqual({ type: "leaderVoted", at: state.now, slot: 11 });
    const again = deserializeState(serializeState(voted.state));
    expect(again.alliance?.vote).toBe(11);
  });

  it("seul le chef déclare la guerre et fait la paix", () => {
    const crowd = { cards: [card(11, MINE), card(12, OTHER)] };
    const member = player(MINE, { ...crowd, politics: politics({ leaders: { [MINE]: 11 } }) });
    expect(isLeader(member)).toBe(false);
    expect(applyOrder(member, { type: "declareWar", banner: OTHER }, member.now)).toEqual({
      ok: false,
      error: "notLeader",
    });

    const chief = player(MINE, { ...crowd, politics: politics({ leaders: { [MINE]: 4 } }) });
    expect(isLeader(chief)).toBe(true);
    expect(applyOrder(chief, { type: "declareWar", banner: MINE }, chief.now)).toEqual({
      ok: false,
      error: "sameAlliance",
    });
    const war = applyOrder(chief, { type: "declareWar", banner: OTHER }, chief.now);
    if (!war.ok) throw new Error("guerre refusée");
    expect(war.events).toContainEqual({ type: "warDeclared", at: chief.now, banner: OTHER });
    // Les membres de la bannière ennemie passent en rouge tout de suite.
    expect(slotRelation(war.state, 12)).toBe("enemy");
    expect(applyOrder(war.state, { type: "declareWar", banner: OTHER }, chief.now)).toEqual({
      ok: false,
      error: "alreadyAtWar",
    });

    const peace = applyOrder(war.state, { type: "makePeace", banner: OTHER }, chief.now);
    if (!peace.ok) throw new Error("paix refusée");
    expect(slotRelation(peace.state, 12)).toBe("neutral");
    expect(applyOrder(peace.state, { type: "makePeace", banner: OTHER }, chief.now)).toEqual({
      ok: false,
      error: "notAtWar",
    });
  });

  it("une guerre déclarée par l'autre camp ne se défait que par lui", () => {
    const chief = player(MINE, {
      cards: [card(12, OTHER)],
      politics: politics({ leaders: { [MINE]: 4 }, wars: [[OTHER, MINE]] }),
    });
    expect(applyOrder(chief, { type: "makePeace", banner: OTHER }, chief.now)).toEqual({
      ok: false,
      error: "notAtWar",
    });
  });
});

describe("la politique venue du serveur", () => {
  it("relit chefs, guerres et voix, et écarte ce qui est mal formé", () => {
    const crowd = readCrowd({
      cards: [],
      politics: {
        leaders: { [MINE]: "11", zzz: 3, [OTHER]: -1 },
        wars: [[MINE, OTHER], [MINE, MINE], ["zzz", OTHER], "x"],
        votes: { [MINE]: { "11": 2, "12": "1", abc: 4 } },
      },
    });
    expect(crowd.politics).toEqual({
      leaders: { [MINE]: 11 },
      wars: [[MINE, OTHER]],
      votes: { [MINE]: { "11": 2, "12": 1 } },
    });
    expect(readCrowd({ cards: [] }).politics).toBeUndefined();
  });
});
