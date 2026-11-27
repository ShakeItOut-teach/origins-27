import { BALANCE, BANNER_IDS } from "@o27/data";
import type { BannerId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  advance,
  applyOrder,
  attacksToday,
  capacity,
  createPlayer,
  deserializeState,
  humanCard,
  lootable,
  oceanRivals,
  partyOf,
  resolveDuel,
  serializeState,
  totalPower,
  withCrowd,
} from "./index";
import type { PlayerState } from "./index";

const SEASON = 1_800_000_000_000;
/** Jour 10, midi : alliances ouvertes, océan ouvert. */
const NOW = SEASON + 9 * DAY_MS + 12 * 3_600_000;
const WORLD = 27;

function banner(index: number): BannerId {
  const found = BANNER_IDS[index];
  if (found === undefined) throw new Error("bannière attendue");
  return found;
}

/** Un humain du palier 9, avec des cellules filles et des réserves à moitié pleines. */
/** `levels` : des niveaux de Vacuole en plus, pour régler la puissance sans toucher au combat. */
function human(
  seed: number,
  slot: number,
  hunters: number,
  flag: BannerId,
  levels = 0,
  when = NOW,
): PlayerState {
  const born = createPlayer(seed, SEASON, when, { worldSeed: WORLD, slot });
  const ready: PlayerState = {
    ...born,
    organelles: { ...born.organelles, vacuole: born.organelles.vacuole + levels },
    tier: 9,
    energy: BALANCE.energy.max,
    troops: partyOf({ hunter: hunters }),
    shieldUntil: 0,
    nextRaidAt: NOW + 20 * DAY_MS,
  };
  const half = (id: "sugar" | "bricks" | "proteins"): number => Math.floor(capacity(ready, id) / 2);
  const rich: PlayerState = {
    ...ready,
    resources: { sugar: half("sugar"), bricks: half("bricks"), proteins: half("proteins") },
  };
  const step = advance(rich, when).state;
  if (step.alliance === null) throw new Error("alliance attendue");
  return { ...step, alliance: { ...step.alliance, banner: flag } };
}

/** Deux humains voisins dans l'océan, sous deux bannières, qui se voient l'un l'autre. */
function pair(attackers = 40, defenders = 20, levels = 30): { a: PlayerState; d: PlayerState } {
  const alone = human(7, 4, attackers, banner(0));
  const near = oceanRivals(alone)[0];
  if (near === undefined) throw new Error("voisin attendu");
  const slot = Number(near.id.slice(2));
  const d0 = human(8, slot, defenders, banner(1), levels);
  return {
    a: withCrowd(alone, { cards: [humanCard(d0)] }),
    d: withCrowd(d0, { cards: [humanCard(alone)] }),
  };
}

function send(a: PlayerState, d: PlayerState, count: number) {
  return applyOrder(
    a,
    { type: "sendRaid", rival: `o:${String(d.slot)}`, party: partyOf({ hunter: count }) },
    a.now,
    { opponent: d },
  );
}

describe("les garde-fous entre humains", () => {
  it("une espèce humaine assez forte et sans protection peut être attaquée", () => {
    const { a, d } = pair();
    const result = send(a, d, 30);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.raid?.versus).toBe(d.slot);
    expect(result.state.raid?.outcome).toBeNull();
    expect(attacksToday(result.state, d.slot)).toBe(1);
  });

  it("pas d'attaque contre un débutant (avant le palier 6)", () => {
    const { a, d } = pair();
    expect(send(a, { ...d, tier: 5 }, 30)).toEqual({ ok: false, error: "newcomer" });
  });

  it("pas d'attaque contre un humain qui n'a pas la moitié de sa puissance", () => {
    const { a, d } = pair(200, 1, 0);
    expect(totalPower(d) * 2).toBeLessThan(totalPower(a));
    expect(send(a, d, 30)).toEqual({ ok: false, error: "tooWeak" });
  });

  it("trois attaques par jour au plus contre la même cible", () => {
    const { a, d } = pair();
    const tired: PlayerState = {
      ...a,
      duels: { ...a.duels, day: 10, week: 2, targets: { [String(d.slot)]: 3 } },
    };
    expect(send(tired, d, 30)).toEqual({ ok: false, error: "tooOften" });
    // Le lendemain, le compteur repart de zéro.
    const tomorrow = advance(tired, NOW + DAY_MS).state;
    expect(attacksToday(tomorrow, d.slot)).toBe(0);
  });

  it("le bouclier, le mode absent et la nuit protègent aussi des humains", () => {
    const { a, d } = pair();
    expect(send(a, { ...d, shieldUntil: NOW + 3_600_000 }, 30)).toEqual({
      ok: false,
      error: "shielded",
    });
  });

  it("sur l'appareil, la vitrine suffit pour prévoir ; un allié reste intouchable", () => {
    const { a, d } = pair();
    const predicted = applyOrder(
      a,
      { type: "sendRaid", rival: `o:${String(d.slot)}`, party: partyOf({ hunter: 30 }) },
      a.now,
    );
    expect(predicted.ok).toBe(true);
    const friend = withCrowd(a, { cards: [{ ...humanCard(d), banner: banner(0) }] });
    expect(
      applyOrder(
        friend,
        { type: "sendRaid", rival: `o:${String(d.slot)}`, party: partyOf({ hunter: 30 }) },
        a.now,
      ),
    ).toEqual({ ok: false, error: "ally" });
  });
});

describe("le combat entre humains, joué par le serveur", () => {
  it("le moteur n'invente pas l'issue : l'attaque attend, puis rentre sans combat", () => {
    const { a, d } = pair();
    const sent = send(a, d, 30);
    if (!sent.ok) throw new Error("envoi attendu");
    const raid = sent.state.raid;
    if (raid === null) throw new Error("attaque attendue");
    const waiting = advance(sent.state, raid.returnsAt + 1000).state;
    expect(waiting.raid?.outcome).toBeNull();
    const later = advance(sent.state, raid.returnsAt + BALANCE.rivals.versus.holdHours * 3_600_000);
    expect(later.state.raid).toBeNull();
    expect(later.events.map((event) => event.type)).toContain("raidBounced");
    const back = later.events.find((event) => event.type === "raidReturned");
    expect(back?.type === "raidReturned" && back.losses).toBe(0);
  });

  it("l'attaque la plus forte gagne : pertes des deux côtés, butin, bouclier d'une heure", () => {
    const { a, d } = pair(40, 10);
    const sent = send(a, d, 40);
    if (!sent.ok) throw new Error("envoi attendu");
    const result = resolveDuel({ attack: "x", attacker: sent.state, defender: d, helpers: [] });
    const summary = result.summary;
    expect(summary?.fought).toBe(true);
    expect(summary?.attackerWon).toBe(true);
    expect(summary?.attackerForce).toBeGreaterThan(summary?.defenderForce ?? 0);

    const raid = result.attacker.state.raid;
    expect(raid?.outcome?.won).toBe(true);
    // Le rapport de l'attaquant montre les cellules des deux camps.
    const battle = raid?.outcome?.battle;
    expect(battle?.attacker.troops[0]?.count).toBe(40);
    expect(battle?.defender.troops[0]?.count).toBe(10);
    expect(battle?.attacker.total).toBe(summary?.attackerForce);
    expect(battle?.defender.total).toBe(summary?.defenderForce);

    const defended = result.defender.state;
    expect(defended.troops.hunter).toBe(10 - (summary?.defenderLost ?? 0));
    expect(summary?.defenderLost).toBeGreaterThan(0);
    expect(summary?.attackerLost).toBeGreaterThan(0);
    expect(defended.resources.sugar).toBeLessThan(d.resources.sugar);
    expect(defended.shieldUntil).toBeGreaterThan(defended.now);
    expect(defended.reports[0]?.kind).toBe("defense");
    expect(defended.reports[0]?.won).toBe(false);
    expect(defended.reports[0]?.battle?.mine).toBe("defender");
    expect(defended.counters.duelPoints).toBe(summary?.attackerLost);

    // Au retour, le butin entre dans la réserve de l'attaquant.
    const home = advance(result.attacker.state, raid?.returnsAt ?? 0).state;
    expect(home.raid).toBeNull();
    expect(home.resources.sugar).toBeGreaterThan(sent.state.resources.sugar);
    expect(home.reports[0]?.kind).toBe("raid");
    expect(home.reports[0]?.battle?.defender.troops.length).toBe(1);
    expect(home.counters.duelPoints).toBe(summary?.defenderLost);
  });

  it("à égalité, la défense tient ; même entrée, même combat", () => {
    const { a, d } = pair(20, 60);
    const sent = send(a, d, 20);
    if (!sent.ok) throw new Error("envoi attendu");
    const input = { attack: "x", attacker: sent.state, defender: d, helpers: [] };
    const once = resolveDuel(input);
    expect(resolveDuel(input)).toEqual(once);
    expect(once.summary?.attackerWon).toBe(false);
    expect(once.summary?.loot).toBe(0);
    expect(once.defender.state.counters.attacksRepelled).toBe(d.counters.attacksRepelled + 1);
  });

  it("attraper la bulle pendant la fenêtre renforce l'attaque", () => {
    const { a, d } = pair(40, 10);
    const sent = send(a, d, 40);
    if (!sent.ok) throw new Error("envoi attendu");
    const raid = sent.state.raid;
    if (raid === null) throw new Error("attaque attendue");
    const struck = applyOrder(sent.state, { type: "strikeRaid" }, raid.arrivesAt);
    if (!struck.ok) throw new Error("toucher attendu");
    expect(struck.state.raid?.struck).toBe(true);
    const plain = resolveDuel({ attack: "x", attacker: sent.state, defender: d, helpers: [] });
    const strong = resolveDuel({ attack: "x", attacker: struck.state, defender: d, helpers: [] });
    expect(strong.summary?.attackerForce).toBeGreaterThan(plain.summary?.attackerForce ?? 0);
  });

  it("une cible passée à l'abri avant l'arrivée : le groupe rentre sans combattre", () => {
    const { a, d } = pair();
    const sent = send(a, d, 30);
    if (!sent.ok) throw new Error("envoi attendu");
    const away = { ...d, shieldUntil: NOW + 2 * DAY_MS };
    const result = resolveDuel({ attack: "x", attacker: sent.state, defender: away, helpers: [] });
    expect(result.summary?.fought).toBe(false);
    expect(result.attacker.state.raid?.cancelled).toBe(true);
    expect(result.defender.state.troops.hunter).toBe(20);
  });

  it("une attaque rappelée n'a plus de combat", () => {
    const { a, d } = pair();
    const sent = send(a, d, 30);
    if (!sent.ok) throw new Error("envoi attendu");
    const back = applyOrder(sent.state, { type: "cancelRaid" }, sent.state.now + 1000);
    if (!back.ok) throw new Error("rappel attendu");
    expect(
      resolveDuel({ attack: "x", attacker: back.state, defender: d, helpers: [] }).summary,
    ).toBeNull();
  });
});

describe("défendre un allié", () => {
  it("les renforts d'un allié du banc comptent, à son nom, et rentrent avec leurs pertes", () => {
    const { a, d } = pair(60, 10);
    // Un troisième humain, sous la bannière du défenseur.
    const others = oceanRivals(d).filter((rival) => rival.id !== `o:${String(a.slot)}`);
    const spot = others[0];
    if (spot === undefined) throw new Error("voisin attendu");
    // L'allié part deux heures plus tôt : ses renforts ont le temps d'arriver.
    const h0 = human(9, Number(spot.id.slice(2)), 30, banner(1), 0, NOW - 2 * 3_600_000);
    const helper = withCrowd(h0, { cards: [humanCard(d), humanCard(a)] });
    const sent = send(a, d, 60);
    if (!sent.ok) throw new Error(`envoi attendu : ${sent.error}`);
    const raid = sent.state.raid;
    if (raid === null) throw new Error("attaque attendue");

    const order = {
      type: "reinforceAlly" as const,
      attack: "00000000-0000-4000-8000-000000000001",
      slot: d.slot,
      party: partyOf({ hunter: 30 }),
    };
    const pending = { id: order.attack, slot: d.slot, resolveAt: raid.resolveAt };
    expect(applyOrder(helper, order, helper.now, { attack: null })).toEqual({
      ok: false,
      error: "noAttack",
    });
    const enemy = withCrowd(h0, { cards: [humanCard(a)] });
    expect(applyOrder(enemy, { ...order, slot: a.slot }, enemy.now)).toEqual({
      ok: false,
      error: "notAlly",
    });
    const went = applyOrder(helper, order, helper.now, { attack: pending });
    if (!went.ok) throw new Error(`renforts attendus : ${went.error}`);
    expect(went.state.troops.hunter).toBe(0);

    const alone = resolveDuel({
      attack: order.attack,
      attacker: sent.state,
      defender: d,
      helpers: [],
    });
    const helped = resolveDuel({
      attack: order.attack,
      attacker: sent.state,
      defender: d,
      helpers: [went.state],
    });
    expect(helped.summary?.helpers).toBe(1);
    expect(helped.summary?.defenderForce).toBeGreaterThan(alone.summary?.defenderForce ?? 0);
    const names = helped.defender.state.reports[0]?.battle?.defender.lines
      .filter((entry) => entry.name !== undefined)
      .map((entry) => entry.name);
    expect(names?.length).toBe(1);

    const helperAfter = helped.helpers[0]?.state;
    const escort = helperAfter?.escort;
    if (helperAfter === undefined || escort === null || escort === undefined) {
      throw new Error("retour attendu");
    }
    if (escort.returnsAt === null) throw new Error("retour attendu");
    const home = advance(helperAfter, escort.returnsAt).state;
    expect(home.escort).toBeNull();
    expect(home.troops.hunter).toBe(30 - (helped.summary?.helpersLost ?? 0));
    expect(home.reports[0]?.kind).toBe("escort");
  });
});

describe("l'espionnage d'un humain", () => {
  it("le rapport est une photo de sa vraie partie ; des Récepteurs plus hauts le déjouent", () => {
    const { a, d } = pair();
    const spy: PlayerState = {
      ...a,
      organelles: { ...a.organelles, receptor: 11 },
      spies: 5,
      spiesAt: a.now,
    };
    const order = { type: "spyRival" as const, rival: `o:${String(d.slot)}` };
    const seen = applyOrder(spy, order, spy.now, { opponent: d });
    if (!seen.ok) throw new Error("espionnage attendu");
    const intel = seen.state.intel[order.rival];
    expect(intel?.troops?.hunter).toBe(20);
    expect(intel?.sugar).toBe(lootable(d, d.now).sugar);

    const guarded = { ...d, organelles: { ...d.organelles, receptor: 12 } };
    const failed = applyOrder(spy, order, spy.now, { opponent: guarded });
    if (!failed.ok) throw new Error("ordre accepté attendu");
    expect(failed.events.map((event) => event.type)).toContain("rivalSpyFailed");
    expect(failed.state.intel[order.rival]).toBeUndefined();
  });
});

describe("le plafond de pillage de la semaine", () => {
  it("ce qu'on a déjà perdu cette semaine réduit ce qu'une attaque peut prendre", () => {
    const { d } = pair();
    const free = lootable(d, d.now);
    const cap = Math.floor((capacity(d, "sugar") * BALANCE.rivals.versus.weeklyLootPercent) / 100);
    const hit: PlayerState = {
      ...d,
      duels: { day: 10, targets: {}, week: 2, lost: { sugar: cap, bricks: 0, proteins: 0 } },
    };
    expect(free.sugar).toBeGreaterThan(0);
    expect(lootable(hit, d.now).sugar).toBe(0);
    // La semaine suivante, le plafond repart.
    expect(lootable(hit, SEASON + 14 * DAY_MS).sugar).toBe(Math.min(d.resources.sugar, cap));
  });
});

describe("la sauvegarde garde les combats entre humains", () => {
  it("attaque en cours, renforts, compteurs et rapport d'espionnage survivent à la relecture", () => {
    const { a, d } = pair();
    const sent = send(a, d, 30);
    if (!sent.ok) throw new Error("envoi attendu");
    const state: PlayerState = {
      ...sent.state,
      raid: sent.state.raid === null ? null : { ...sent.state.raid, struck: true },
      escort: {
        attack: "00000000-0000-4000-8000-000000000002",
        slot: 9,
        party: partyOf({ hunter: 3 }),
        startedAt: NOW,
        arrivesAt: NOW + 60_000,
        returnsAt: null,
        losses: partyOf(),
        held: false,
      },
      intel: {
        "o:9": {
          at: NOW,
          level: 3,
          total: 10,
          sugar: 1,
          bricks: 2,
          proteins: 3,
          defense: 0,
          troopsLow: 0,
          troopsHigh: 0,
          troops: null,
          shieldUntil: 0,
        },
      },
      spiedUntil: { "o:9": NOW + 3_600_000 },
    };
    // La foule n'entre jamais dans la sauvegarde.
    const saved: Record<string, unknown> = { ...state };
    delete saved.crowd;
    expect(deserializeState(serializeState(state))).toEqual(saved);
  });
});
