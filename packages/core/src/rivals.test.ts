import { BALANCE, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order, TroopId } from "@o27/data";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  advance,
  applyOrder,
  createPlayer,
  DAY_MS,
  defensePower,
  deserializeState,
  MICRO,
  partySize,
  raidChance,
  raidOffer,
  rivalStats,
  serializeState,
  troopCapacity,
  troopsOwned,
  visiblePrey,
  visibleRivals,
  winChance,
} from "./index";
import type { GameEvent, OrderErrorCode, PlayerState, Rival } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
/** Deuxième jour de la saison : les rivaux peuvent exister. */
const T0 = SEASON + DAY_MS + HOUR;
const WORLD = { worldSeed: 27, slot: 4 };
const NONE = { hunter: 0, armored: 0, swift: 0 };
const INCOMING = BALANCE.rivals.incoming;

function party(values: Partial<Record<TroopId, number>>): Record<TroopId, number> {
  return { ...NONE, ...values };
}

/** Un joueur qui vient d'arriver au palier 5, riche, avec les cellules filles demandées. */
function atTier5(troops: Partial<Record<TroopId, number>> = {}, seed = 7): PlayerState {
  const base = createPlayer(seed, SEASON, T0, WORLD);
  const ready: PlayerState = {
    ...base,
    tier: 4,
    counters: {
      ...base.counters,
      harvests: 10,
      organellesBuilt: 4,
      mutationsChosen: 1,
      mapHarvests: 5,
      huntsWon: 1,
    },
    mutations: ["thrift"],
    organelles: { ...base.organelles, vacuole: 5, nursery: 3 },
    resources: { sugar: 400 * MICRO, bricks: 200 * MICRO, proteins: 10 * MICRO },
    troops: party(troops),
  };
  return advance(ready, T0).state;
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

function rivals(): readonly Rival[] {
  return visibleRivals(WORLD.worldSeed, WORLD.slot);
}

function rival(index = 0): Rival {
  const found = rivals()[index];
  if (found === undefined) throw new Error("rival attendu");
  return found;
}

function strongType(target: Rival): TroopId {
  return TROOP_IDS.find((id) => STRONG_AGAINST[id] === target.kind) ?? "hunter";
}

function raid(target: Rival, group: Record<TroopId, number>): Order {
  return { type: "sendRaid", rival: target.id, party: group };
}

describe("les voisins", () => {
  it("tout joueur a six voisins, tous différents, chacun avec un nom", () => {
    for (let slot = 0; slot < 500; slot++) {
      const seen = visibleRivals(27, slot);
      expect(seen).toHaveLength(BALANCE.rivals.count);
      expect(new Set(seen.map((entry) => entry.id)).size).toBe(seen.length);
      for (const entry of seen) {
        expect(entry.name.length).toBeGreaterThanOrEqual(3);
        expect(entry.id.startsWith("r:")).toBe(true);
        expect(entry.temper).toBeGreaterThanOrEqual(BALANCE.rivals.temperMinPercent);
        expect(entry.temper).toBeLessThanOrEqual(BALANCE.rivals.temperMaxPercent);
      }
    }
  });

  it("deux joueurs qui ont le même voisin voient le même organisme", () => {
    const all = new Map<string, Rival>();
    for (let slot = 0; slot < 60; slot++) {
      for (const entry of visibleRivals(27, slot)) {
        const known = all.get(entry.id);
        if (known !== undefined) {
          expect({ ...entry, far: known.far }).toEqual(known);
        }
        all.set(entry.id, entry);
      }
    }
    expect(all.size).toBeGreaterThan(60);
  });

  it("un rival grandit avec la saison : plus fort, plus riche", () => {
    const early = rivalStats(rival(), 2);
    const late = rivalStats(rival(), 20);
    expect(late.guard).toBeGreaterThan(early.guard);
    expect(late.attack).toBeGreaterThan(early.attack);
    expect(late.sugar).toBeGreaterThan(early.sugar);
    expect(late.proteins).toBeGreaterThan(early.proteins);
  });

  it("les voisins n'ont pas tous le même nom ni le même tempérament", () => {
    const names = new Set<string>();
    const kinds = new Set<string>();
    for (let slot = 0; slot < 80; slot++) {
      for (const entry of visibleRivals(27, slot)) {
        names.add(entry.name);
        kinds.add(entry.kind);
      }
    }
    expect(names.size).toBeGreaterThan(60);
    expect(kinds.size).toBe(3);
  });
});

describe("arriver au palier des rivaux", () => {
  it("le palier s'ouvre avec une chasse gagnée au deuxième jour, et protège le nouveau venu", () => {
    const state = atTier5();
    expect(state.tier).toBe(5);
    expect(state.shieldUntil).toBe(T0 + INCOMING.firstShieldHours * HOUR);
    const wait = (state.nextRaidAt ?? 0) - state.shieldUntil;
    expect(wait).toBeGreaterThanOrEqual(INCOMING.minHours * HOUR);
    expect(wait).toBeLessThanOrEqual(INCOMING.maxHours * HOUR);
  });

  it("avant ce palier : ni espionnage ni attaque, et personne n'attaque le joueur", () => {
    const base = atTier5();
    const tier4: PlayerState = {
      ...base,
      tier: 4,
      counters: { ...base.counters, huntsWon: 0 },
      nextRaidAt: null,
      shieldUntil: 0,
    };
    expect(refusal(tier4, { type: "spyRival", rival: rival().id }, T0)).toBe("locked");
    expect(refusal(tier4, raid(rival(), party({ hunter: 1 })), T0)).toBe("locked");
    expect(advance(tier4, T0 + 20 * DAY_MS).state.nextRaidAt).toBeNull();
  });
});

describe("espionner", () => {
  it("coûte de l'énergie et renseigne pendant deux heures", () => {
    const target = rival();
    const start = atTier5();
    const spied = ok(start, { type: "spyRival", rival: target.id }, T0);
    const spy = BALANCE.rivals.spy;
    expect(spied.energy).toBe(start.energy - spy.energy);
    expect(spied.spiedUntil[target.id]).toBe(T0 + spy.hours * HOUR);
    expect(refusal(spied, { type: "spyRival", rival: target.id }, T0 + HOUR)).toBe("alreadySpied");
    const later = advance(spied, T0 + spy.hours * HOUR).state;
    expect(later.spiedUntil).toEqual({});
    expect(
      refusal(later, { type: "spyRival", rival: target.id }, T0 + spy.hours * HOUR),
    ).toBeNull();
  });

  it("refuse un rival qui n'est pas un voisin, ou sans énergie", () => {
    expect(refusal(atTier5(), { type: "spyRival", rival: "r:900:900" }, T0)).toBe("unknownRival");
    const tired = { ...atTier5(), energy: 0 };
    expect(refusal(tired, { type: "spyRival", rival: rival().id }, T0)).toBe("noEnergy");
  });
});

describe("attaquer un rival", () => {
  const target = rival();
  const strong = strongType(target);

  it("envoyer coûte de l'énergie et emmène les cellules ; la garde est celle du jour", () => {
    const start = atTier5({ [strong]: 12 });
    const offer = raidOffer(start, target, T0);
    expect(offer.guard).toBe(rivalStats(target, 2).guard);
    const sent = ok(start, raid(target, party({ [strong]: 10 })), T0);
    expect(sent.energy).toBe(start.energy - offer.energy);
    expect(sent.troops[strong]).toBe(2);
    expect(sent.raid).toMatchObject({ rival: target.id, power: offer.guard, outcome: null });
    expect(sent.raid?.returnsAt).toBe(T0 + offer.durationMs);
  });

  it("chasse et attaque ne partent pas ensemble : ce sont les mêmes cellules", () => {
    const [prey] = visiblePrey(WORLD.worldSeed, WORLD.slot);
    if (prey === undefined) throw new Error("proie attendue");
    const start = atTier5({ hunter: 6 });
    const hunting = ok(start, { type: "sendHunt", prey: prey.id, party: party({ hunter: 3 }) }, T0);
    expect(refusal(hunting, raid(target, party({ hunter: 3 })), T0 + 1)).toBe("busy");
    const raiding = ok(start, raid(target, party({ hunter: 3 })), T0);
    expect(
      refusal(raiding, { type: "sendHunt", prey: prey.id, party: party({ hunter: 3 }) }, T0 + 1),
    ).toBe("busy");
    expect(troopsOwned(raiding)).toBe(6);
  });

  it("refuse : groupe vide, cellules qu'on n'a pas, rival inconnu, pas d'énergie", () => {
    const start = atTier5({ hunter: 2 });
    expect(refusal(start, raid(target, NONE), T0)).toBe("noTroops");
    expect(refusal(start, raid(target, party({ hunter: 3 })), T0)).toBe("noTroops");
    expect(
      refusal(start, { type: "sendRaid", rival: "r:900:900", party: party({ hunter: 1 }) }, T0),
    ).toBe("unknownRival");
    expect(refusal({ ...start, energy: 1 }, raid(target, party({ hunter: 1 })), T0)).toBe(
      "noEnergy",
    );
  });

  it("toucher aide sans garantir : plus de victoires qu'en laissant faire, mais pas toutes", () => {
    const group = party({ [strong]: 6 });
    const base = winChance(group, target.kind, rivalStats(target, 2).guard);
    expect(raidChance(base, true)).toBe(
      Math.min(99, base + BALANCE.rivals.raid.strikeBonusPercent),
    );
    expect(raidChance(base, false)).toBe(base);
    let struckWins = 0;
    let idleWins = 0;
    const games = 300;
    for (let seed = 1; seed <= games; seed++) {
      const sent = ok(atTier5({ [strong]: 6 }, seed), raid(target, group), T0);
      const at = sent.raid?.arrivesAt ?? T0;
      if (ok(sent, { type: "strikeRaid" }, at).raid?.outcome?.won === true) struckWins += 1;
      if (advance(sent, sent.raid?.resolveAt ?? T0).state.raid?.outcome?.won === true)
        idleWins += 1;
    }
    expect(struckWins).toBeGreaterThan(idleWins);
    expect(struckWins).toBeLessThan(games);
  });

  it("on ne touche qu'une fois, pendant le combat ; on ne rappelle qu'avant", () => {
    const sent = ok(atTier5({ [strong]: 6 }), raid(target, party({ [strong]: 6 })), T0);
    const arrives = sent.raid?.arrivesAt ?? T0;
    expect(refusal(sent, { type: "strikeRaid" }, arrives - 1)).toBe("notFighting");
    const struck = ok(sent, { type: "strikeRaid" }, arrives);
    expect(refusal(struck, { type: "strikeRaid" }, arrives + 1)).toBe("tooLate");
    expect(refusal(sent, { type: "cancelRaid" }, arrives)).toBe("tooLate");
    expect(refusal(atTier5(), { type: "strikeRaid" }, T0)).toBe("noRaid");
    expect(refusal(atTier5(), { type: "cancelRaid" }, T0)).toBe("noRaid");
  });

  it("rappel avant l'arrivée : tout le monde rentre, énergie rendue, pas de combat compté", () => {
    const start = atTier5({ [strong]: 6 });
    const sent = ok(start, raid(target, party({ [strong]: 6 })), T0);
    const called = ok(sent, { type: "cancelRaid" }, T0 + 20_000);
    expect(called.energy).toBe(start.energy);
    const home = advance(called, T0 + 60_000).state;
    expect(home.raid).toBeNull();
    expect(home.troops[strong]).toBe(6);
    expect(home.counters.rivalFights).toBe(0);
  });

  it("victoire : le butin dépend des survivantes, le rival se referme, le combat compte", () => {
    let checked = 0;
    for (let seed = 1; seed <= 60 && checked < 5; seed++) {
      const start = atTier5({ [strong]: 14 }, seed);
      const empty: PlayerState = { ...start, resources: { sugar: 0, bricks: 0, proteins: 0 } };
      const offer = raidOffer(empty, target, T0);
      const sent = ok(empty, raid(target, party({ [strong]: 14 })), T0);
      const struck = ok(sent, { type: "strikeRaid" }, sent.raid?.arrivesAt ?? T0);
      if (struck.raid?.outcome?.won !== true) continue;
      checked += 1;
      const losses = partySize(struck.raid.outcome.losses);
      const back = advance(struck, T0 + offer.durationMs);
      const home = back.state;
      expect(home.raid).toBeNull();
      expect(home.troops[strong]).toBe(14 - losses);
      expect(home.counters.rivalFights).toBe(1);
      const carried = home.resources.sugar + 2 * home.resources.bricks;
      expect(carried).toBeGreaterThan(0);
      expect(carried).toBeLessThanOrEqual((14 - losses) * BALANCE.rivals.raid.carryPerCell * MICRO);
      expect(home.resources.sugar).toBeLessThanOrEqual(offer.sugar * MICRO);
      expect(home.resources.bricks).toBeLessThanOrEqual(offer.bricks * MICRO);
      expect(refusal(home, raid(target, party({ [strong]: 1 })), T0 + offer.durationMs)).toBe(
        "rivalClosed",
      );
      const reopened = T0 + offer.durationMs + offer.restMs;
      expect(
        refusal(advance(home, reopened).state, raid(target, party({ [strong]: 1 })), reopened),
      ).toBeNull();
    }
    expect(checked).toBe(5);
  });

  it("défaite : rien de pris, des pertes mais jamais toutes, et le rival reste ouvert", () => {
    const weak = TROOP_IDS.find((id) => STRONG_AGAINST[id] !== target.kind) ?? "hunter";
    let defeats = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const start = atTier5({ [weak]: 3 }, seed);
      const empty: PlayerState = { ...start, resources: { sugar: 0, bricks: 0, proteins: 0 } };
      const offer = raidOffer(empty, target, T0);
      const home = advance(
        ok(empty, raid(target, party({ [weak]: 3 })), T0),
        T0 + offer.durationMs,
      ).state;
      if (home.resources.sugar > 0) continue;
      defeats += 1;
      expect(home.resources).toEqual({ sugar: 0, bricks: 0, proteins: 0 });
      expect(home.troops[weak]).toBeGreaterThanOrEqual(1);
      expect(home.counters.rivalFights).toBe(1);
      expect(home.placeReadyAt[target.id]).toBeUndefined();
    }
    expect(defeats).toBeGreaterThan(10);
  });
});

describe("être attaqué", () => {
  const attacks = (events: readonly GameEvent[]) =>
    events.filter((event) => event.type === "attackRepelled" || event.type === "attackSuffered");

  it("la défense compte les cellules à la maison et la Paroi, jamais zéro", () => {
    const bare = atTier5();
    expect(defensePower(bare)).toBe(1);
    expect(defensePower(atTier5({ hunter: 4, swift: 2 }))).toBe(7);
    const walled = { ...bare, organelles: { ...bare.organelles, wall: 2 } };
    const perLevel = BALANCE.organelles.wall.effect;
    expect(defensePower(walled)).toBe(
      1 + 2 * (perLevel.kind === "defense" ? perLevel.perLevel : 0),
    );
  });

  it("personne n'attaque un joueur protégé", () => {
    const state = atTier5();
    const step = advance(state, state.shieldUntil);
    expect(attacks(step.events)).toHaveLength(0);
  });

  it("une fois la protection finie, une attaque arrive à l'heure prévue", () => {
    const state = atTier5();
    const due = state.nextRaidAt ?? 0;
    expect(attacks(advance(state, due - 1).events)).toHaveLength(0);
    const step = advance(state, due);
    expect(attacks(step.events)).toHaveLength(1);
    expect(step.state.counters.rivalFights).toBe(1);
    expect(step.state.nextRaidAt).toBeGreaterThan(due);
  });

  it("attaque subie : un cinquième du sucre et des briques, jamais les protéines, puis protection", () => {
    let suffered = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const state = atTier5({ hunter: 5 }, seed);
      const due = state.nextRaidAt ?? 0;
      const before = advance(state, due - 1).state;
      const step = advance(state, due);
      const event = step.events.find((entry) => entry.type === "attackSuffered");
      if (event?.type !== "attackSuffered") continue;
      suffered += 1;
      const loss = INCOMING.lossPercent;
      expect(event.sugar).toBe(Math.floor((before.resources.sugar * loss) / 100));
      expect(step.state.resources.sugar).toBe(before.resources.sugar - event.sugar);
      expect(step.state.resources.bricks).toBe(before.resources.bricks - event.bricks);
      expect(step.state.resources.proteins).toBe(before.resources.proteins);
      expect(partySize(step.state.troops)).toBe(5 - event.troopsLost);
      expect(event.troopsLost).toBe(Math.floor((5 * INCOMING.troopLossPercent) / 100));
      expect(step.state.shieldUntil).toBe(due + INCOMING.shieldHours * HOUR);
      expect(step.state.nextRaidAt).toBeGreaterThanOrEqual(
        step.state.shieldUntil + INCOMING.minHours * HOUR,
      );
    }
    expect(suffered).toBeGreaterThan(5);
  });

  it("une bonne défense repousse bien plus souvent qu'une cellule nue", () => {
    const repelled = (troops: number, wall: number): number => {
      let count = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const base = atTier5({ armored: troops }, seed);
        const state = { ...base, organelles: { ...base.organelles, wall } };
        const step = advance(state, state.nextRaidAt ?? 0);
        if (step.events.some((event) => event.type === "attackRepelled")) count += 1;
      }
      return count;
    };
    const bare = repelled(0, 0);
    const guarded = repelled(15, 4);
    expect(guarded).toBeGreaterThan(bare + 60);
    expect(guarded).toBeLessThanOrEqual(200);
  });

  it("sur une saison entière : des attaques régulières, jamais pendant une protection", () => {
    let state = atTier5({ hunter: 4 });
    let last = 0;
    let total = 0;
    for (let hour = 1; hour <= 20 * 24; hour++) {
      const shield = state.shieldUntil;
      const step = advance(state, T0 + hour * HOUR);
      for (const event of attacks(step.events)) {
        total += 1;
        expect(event.at).toBeGreaterThanOrEqual(shield);
        expect(event.at).toBeGreaterThan(last);
        last = event.at;
      }
      state = step.state;
      expect(state.resources.sugar).toBeGreaterThanOrEqual(0);
      expect(partySize(state.troops)).toBeGreaterThanOrEqual(0);
    }
    // Entre une attaque toutes les 5 h et une toutes les 19 h (délai + protection).
    expect(total).toBeGreaterThan(20);
    expect(total).toBeLessThan(100);
  });
});

describe("garanties du moteur avec les rivaux", () => {
  const order = fc.oneof(
    fc.constantFrom<Order>(
      { type: "harvest", taps: 4 },
      { type: "strikeRaid" },
      { type: "cancelRaid" },
      { type: "strikeHunt" },
      { type: "build", organelle: "wall" },
      { type: "trainTroop", troop: "armored", count: 2 },
      { type: "claimQuest", index: 0 },
    ),
    fc.constantFrom(...rivals()).map((entry): Order => ({ type: "spyRival", rival: entry.id })),
    fc
      .tuple(
        fc.constantFrom(...rivals()),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
      )
      .map(([entry, hunter, swift]): Order => raid(entry, { hunter, armored: 0, swift })),
    fc.constantFrom(...visiblePrey(WORLD.worldSeed, WORLD.slot)).map((prey): Order => ({
      type: "sendHunt",
      prey: prey.id,
      party: { hunter: 2, armored: 0, swift: 2 },
    })),
  );
  const steps = fc.array(
    fc.tuple(
      order,
      fc.oneof(fc.integer({ min: 0, max: 400_000 }), fc.integer({ min: 0, max: 20 * HOUR })),
    ),
    { minLength: 1, maxLength: 40 },
  );

  it("quoi qu'on envoie : rien de négatif, jamais plus de cellules que la Pouponnière n'en loge", () => {
    fc.assert(
      fc.property(steps, (sequence) => {
        let state = atTier5({ hunter: 8, swift: 6 });
        let now = T0;
        for (const [next, wait] of sequence) {
          now += wait;
          const result = applyOrder(state, next, now);
          state = result.ok ? result.state : advance(state, now).state;
          for (const id of TROOP_IDS) expect(state.troops[id]).toBeGreaterThanOrEqual(0);
          expect(troopsOwned(state)).toBeLessThanOrEqual(troopCapacity(state));
          expect(state.resources.sugar).toBeGreaterThanOrEqual(0);
          expect(state.resources.bricks).toBeGreaterThanOrEqual(0);
          expect(state.resources.proteins).toBeGreaterThanOrEqual(0);
          expect(state.energy).toBeGreaterThanOrEqual(0);
          expect(state.nextRaidAt).toBeGreaterThan(now);
          expect(state.hunt === null || state.raid === null).toBe(true);
        }
      }),
    );
  });

  it("avancer en une fois ou en plusieurs donne le même état, attaques subies comprises", () => {
    fc.assert(
      fc.property(
        steps,
        fc.array(fc.integer({ min: 1, max: 30 * HOUR }), { minLength: 1, maxLength: 6 }),
        (sequence, pauses) => {
          let state = atTier5({ hunter: 8, swift: 6 });
          let now = T0;
          for (const [next, wait] of sequence) {
            now += wait;
            const result = applyOrder(state, next, now);
            if (result.ok) state = result.state;
          }
          const end = now + pauses.reduce((sum, pause) => sum + pause, 0);
          let stepped = state;
          let at = now;
          for (const pause of pauses) {
            at += pause;
            stepped = advance(stepped, at).state;
          }
          expect(serializeState(stepped)).toBe(serializeState(advance(state, end).state));
        },
      ),
    );
  });

  it("sauvegarder puis relire rend le même état : espionnage, attaque en route, attaque jouée", () => {
    const target = rival();
    const spied = ok(atTier5({ hunter: 6 }), { type: "spyRival", rival: target.id }, T0);
    const sent = ok(spied, raid(target, party({ hunter: 6 })), T0);
    const fought = advance(sent, sent.raid?.resolveAt ?? T0).state;
    for (const state of [spied, sent, fought]) {
      expect(deserializeState(serializeState(state))).toEqual(state);
    }
  });

  it("une sauvegarde d'avant les rivaux est convertie, et reçoit sa protection au bon moment", () => {
    const current = JSON.parse(serializeState(atTier5({ hunter: 3 }))) as Record<string, unknown>;
    const gone = ["raid", "spiedUntil", "shieldUntil", "nextRaidAt"];
    const organelles = { ...(current.organelles as Record<string, number>) };
    const old = Object.fromEntries(Object.entries(current).filter(([key]) => !gone.includes(key)));
    const text = JSON.stringify({
      ...old,
      version: 4,
      organelles: Object.fromEntries(Object.entries(organelles).filter(([key]) => key !== "wall")),
    });
    const back = deserializeState(text);
    expect(back.version).toBe(5);
    expect(back.organelles.wall).toBe(0);
    expect(back.nextRaidAt).toBeNull();
    expect(back.troops.hunter).toBe(3);
    const later = advance(back, T0 + 1000).state;
    expect(later.shieldUntil).toBe(T0 + 1000 + INCOMING.firstShieldHours * HOUR);
  });

  it("refuse une sauvegarde dont l'attaque est abîmée", () => {
    const sent = ok(atTier5({ hunter: 4 }), raid(rival(), party({ hunter: 4 })), T0);
    const text = serializeState(sent);
    expect(() => deserializeState(text.replace(/"rival":"r:[^"]+"/, '"rival":"ailleurs"'))).toThrow(
      TypeError,
    );
  });
});
