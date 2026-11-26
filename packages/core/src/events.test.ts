import { BALANCE, ZONE_EVENT_KINDS } from "@o27/data";
import type { Order, ZoneEventKind } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  ZONE_COUNT,
  advance,
  applyOrder,
  cellIn,
  createPlayer,
  defensePower,
  depositLeft,
  depositLoad,
  deserializeState,
  eventCovers,
  eventDeposits,
  findEvent,
  gatherOffer,
  leviathanBeaten,
  leviathanOffer,
  leviathanPower,
  leviathanThreat,
  oceanEvents,
  oceanRadius,
  oceanRivals,
  partyOf,
  playerAnoxia,
  playerDeposits,
  productionRate,
  raidOffer,
  reinforcements,
  rivalStats,
  rivalWeakened,
  seasonDay,
  serializeState,
  visibleEvents,
  zoneAt,
} from "./index";
import type { OrderErrorCode, PlayerState, ZoneEvent } from "./index";
import { cellTroubles } from "./events";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const DATA = BALANCE.events;
/** Les événements s'ouvrent au jour 9 : la saison a alors huit jours pleins. */
const OPEN = SEASON + 8 * DAY_MS;

interface Setup {
  readonly seed?: number;
  readonly slot?: number;
  readonly now?: number;
  readonly tier?: number;
  readonly patch?: Partial<PlayerState>;
}

/** Un joueur du palier 9, bien installé, que personne n'attaque pendant le test. */
function player(setup: Setup = {}): PlayerState {
  const now = setup.now ?? OPEN + HOUR;
  const base = createPlayer(7, SEASON, now, {
    worldSeed: setup.seed ?? 27,
    slot: setup.slot ?? 4,
  });
  return advance(
    {
      ...base,
      tier: setup.tier ?? 9,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
      },
      mutations: ["thrift"],
      organelles: { ...base.organelles, mitochondrion: 5, ribosome: 3, vacuole: 5, nursery: 1 },
      resources: { sugar: 500 * MICRO, bricks: 500 * MICRO, proteins: 100 * MICRO },
      troops: partyOf({ hunter: 20 }),
      shieldUntil: 0,
      nextRaidAt: now + 30 * DAY_MS,
      ...setup.patch,
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

/** Tous les événements d'une sorte vus pendant la saison, en regardant l'océan toutes les six heures. */
function seen(seed: number, kind: ZoneEventKind): ZoneEvent[] {
  const found = new Map<string, ZoneEvent>();
  for (let at = OPEN; at < SEASON + 27 * DAY_MS; at += 6 * HOUR) {
    for (const event of oceanEvents(seed, at)) if (event.kind === kind) found.set(event.id, event);
  }
  return [...found.values()];
}

/** Une place des abysses dont la cellule sera touchée par un événement de cette sorte, après le jour 9. */
function troubled(kind: "anoxia" | "leviathan"): { slot: number; event: ZoneEvent } {
  for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
    const troubles = cellTroubles(27, cellIn(27, slot, 0), SEASON);
    const event = troubles.find((entry) => entry.kind === kind && entry.startsAt > OPEN + DAY_MS);
    if (event === undefined) continue;
    // Un seul trouble de cette sorte à la fois sur cette cellule : le test suit celui-là, sans
    // qu'un voisin vienne s'y mêler. (Vrai quelle que soit la taille de l'océan.)
    const alone = troubles.every(
      (other) =>
        other === event ||
        other.kind !== kind ||
        other.startsAt > event.endsAt + HOUR ||
        other.endsAt < event.startsAt,
    );
    if (alone) return { slot, event };
  }
  throw new Error(`aucune cellule touchée par : ${kind}`);
}

describe("les événements de zone", () => {
  it("sont les mêmes pour tous, en cours, dans l'eau, et se retrouvent par leur identifiant", () => {
    const at = OPEN + 3 * DAY_MS + 17 * 60_000;
    const events = oceanEvents(27, at);
    expect(events.length).toBeGreaterThan(3);
    expect(oceanEvents(27, at)).toEqual(events);
    expect(oceanEvents(28, at)).not.toEqual(events);
    for (const event of events) {
      expect(event.startsAt).toBeLessThanOrEqual(at);
      expect(event.endsAt).toBeGreaterThan(at);
      expect(event.endsAt - event.startsAt).toBe(DATA[event.kind].hours * HOUR);
      expect(event.radius).toBe(DATA[event.kind].radius);
      expect(zoneAt(event.x, event.y)).toBe(event.zone);
      expect(event.zone).toBeGreaterThanOrEqual(0);
      expect(event.zone).toBeLessThan(ZONE_COUNT);
      expect(findEvent(27, event.id, at)).toEqual(event);
      expect(findEvent(27, event.id, event.endsAt)).toBeNull();
    }
    expect(findEvent(27, "e:0:0:1", at)).toBeNull();
    expect(findEvent(27, "nimporte", at)).toBeNull();
  });

  it("une saison voit passer les quatre sortes, sans que l'océan en soit couvert", () => {
    for (const kind of ZONE_EVENT_KINDS) expect(seen(27, kind).length).toBeGreaterThan(5);
    // « Couvert » se mesure à la taille de l'océan : jamais plus de cinq quartiers sur six
    // touchés à la fois (c'était 70 événements pour 84 quartiers, avant l'agrandissement).
    const districts = (Math.PI * oceanRadius() ** 2) / DATA.district ** 2;
    for (let at = OPEN; at < SEASON + 27 * DAY_MS; at += 2 * DAY_MS + HOUR) {
      const count = oceanEvents(27, at).length;
      expect(count).toBeGreaterThan(2);
      expect(count).toBeLessThan((districts * 5) / 6);
    }
  });

  it("n'existent pas avant le jour 9", () => {
    const early = player({ now: SEASON + 5 * DAY_MS + HOUR, tier: 8 });
    expect(early.tier).toBe(8);
    expect(visibleEvents(early)).toEqual([]);
    expect(playerDeposits(early, early.now).some((deposit) => deposit.id.startsWith("v:"))).toBe(
      false,
    );
    expect(playerAnoxia(early)).toBeNull();
    const event = oceanEvents(27, early.now).find((entry) => entry.kind === "leviathan");
    if (event !== undefined) {
      expect(
        refusal(early, { type: "huntLeviathan", event: event.id, party: early.troops }, early.now),
      ).toBe("locked");
    }
    // À minuit du neuvième jour, tout s'ouvre.
    const open = advance(early, OPEN).state;
    expect(open.tier).toBe(9);
    expect(visibleEvents(open).length).toBeGreaterThan(0);
  });

  it("le joueur voit les événements du plus proche au plus lointain", () => {
    const state = player();
    const home = cellIn(27, 4, 0);
    const distances = visibleEvents(state).map(
      (event) => (event.x - home.x) ** 2 + (event.y - home.y) ** 2,
    );
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });
});

describe("éruption et efflorescence", () => {
  it("une éruption fait naître des gisements trois fois plus riches, que l'on récolte", () => {
    const eruption = seen(27, "eruption").find((event) => event.zone === 0);
    if (eruption === undefined) throw new Error("éruption attendue dans les abysses");
    const at = eruption.startsAt + HOUR;
    const deposits = eventDeposits(eruption);
    expect(deposits.length).toBeGreaterThan(0);
    expect(deposits.length).toBeLessThanOrEqual(DATA.eruption.deposits);
    for (const deposit of deposits) {
      expect(deposit.load).toBe(
        Math.floor((depositLoad(deposit.kind, deposit.zone) * DATA.eruption.loadPercent) / 100),
      );
      expect(deposit.steady).toBe(false);
      expect(eventCovers(eruption, deposit)).toBe(true);
    }
    const state = player({ now: at });
    const rich = deposits.find((deposit) => deposit.zone === 0);
    if (rich === undefined) throw new Error("gisement attendu");
    expect(playerDeposits(state, at).some((deposit) => deposit.id === rich.id)).toBe(true);
    const offer = gatherOffer(state, rich, at);
    expect(offer.loot).toBe(rich.load);
    const sent = ok(state, { type: "gather", deposit: rich.id }, at);
    expect(sent.expedition?.place).toBe(rich.id);
    expect(sent.taken[rich.id]).toBe(offer.loot);
    expect(deserializeState(serializeState(sent))).toEqual(sent);
    const back = advance(sent, sent.expedition?.returnsAt ?? 0);
    expect(back.state.expedition).toBeNull();
    expect(back.events.some((event) => event.type === "expeditionReturned")).toBe(true);
    // Un joueur du palier 8 ne peut pas y toucher : pour lui, ce gisement n'existe pas.
    const early = player({ now: SEASON + 5 * DAY_MS, tier: 8 });
    expect(refusal(early, { type: "gather", deposit: rich.id }, early.now)).toBe("unknownPlace");
    // L'événement fini, le gisement disparaît.
    const late = player({ now: eruption.endsAt + HOUR });
    expect(refusal(late, { type: "gather", deposit: rich.id }, late.now)).toBe("unknownPlace");
  });

  it("une efflorescence ne se vide pas, et toute récolte dans sa zone rapporte moitié plus", () => {
    const bloom = seen(27, "bloom").find((event) => event.zone === 0);
    if (bloom === undefined) throw new Error("efflorescence attendue dans les abysses");
    const [deposit] = eventDeposits(bloom).filter((entry) => entry.zone === 0);
    if (deposit === undefined) throw new Error("gisement attendu");
    expect(deposit.steady).toBe(true);
    expect(depositLeft(deposit, {}, bloom.endsAt - 1000)).toBe(deposit.total);
    expect(depositLeft(deposit, { [deposit.id]: deposit.load }, bloom.startsAt)).toBe(
      deposit.total - deposit.load,
    );
    const state = player({ now: bloom.startsAt + HOUR });
    const offer = gatherOffer(state, deposit, state.now);
    expect(offer.bloomPercent).toBe(DATA.bloom.gatherPercent);
    expect(offer.loot).toBe(Math.floor((deposit.load * (100 + DATA.bloom.gatherPercent)) / 100));
    // Avant le palier 9, l'efflorescence ne nourrit personne.
    const early = { ...state, tier: 8 };
    expect(gatherOffer(early, deposit, state.now).bloomPercent).toBe(0);
  });
});

describe("la zone anoxique", () => {
  it("ralentit la production tant qu'elle dure, à l'heure exacte", () => {
    const { slot, event } = troubled("anoxia");
    const before = player({ slot, now: event.startsAt - HOUR, patch: { troops: partyOf() } });
    expect(playerAnoxia(before)).toBeNull();
    const full = productionRate(before, "sugar");
    const during = advance(before, event.startsAt + HOUR).state;
    expect(playerAnoxia(during)?.id).toBe(event.id);
    expect(productionRate(during, "sugar")).toBe(
      Math.floor((full * (100 + DATA.anoxia.productionPercent)) / 100),
    );
    const after = advance(during, event.endsAt).state;
    expect(playerAnoxia(after)).toBeNull();
    expect(productionRate(after, "sugar")).toBe(full);
  });

  it("avancer d'une traite ou en plusieurs fois donne la même réserve", () => {
    const { slot, event } = troubled("anoxia");
    const empty = { sugar: 0, bricks: 0, proteins: 0 };
    const start = player({
      slot,
      now: event.startsAt - 60_000,
      patch: { troops: partyOf(), resources: empty },
    });
    const to = event.startsAt + 90_000;
    const once = advance(start, to).state;
    const twice = advance(advance(start, event.startsAt - 7).state, to).state;
    const thrice = advance(advance(start, event.startsAt + 13).state, to).state;
    expect(serializeState(twice)).toBe(serializeState(once));
    expect(serializeState(thrice)).toBe(serializeState(once));
    // Une minute à plein régime, puis une minute et demie au ralenti.
    const full = productionRate(start, "sugar");
    const slow = Math.floor((full * (100 + DATA.anoxia.productionPercent)) / 100);
    expect(once.resources.sugar).toBe(full * 60_000 + slow * 90_000);
  });

  it("affaiblit la garde des organismes qui s'y trouvent", () => {
    const anoxia = seen(27, "anoxia").find((event) => event.zone === 0);
    if (anoxia === undefined) throw new Error("zone anoxique attendue dans les abysses");
    const at = anoxia.startsAt + HOUR;
    let checked = 0;
    for (let slot = 0; slot < BALANCE.world.organisms && checked === 0; slot += 7) {
      const state = player({ slot, now: at });
      const inside = oceanRivals(state).find((rival) => eventCovers(anoxia, rival));
      const outside = oceanRivals(state).find((rival) => !rivalWeakened(state, rival, at));
      if (inside === undefined || outside === undefined) continue;
      const day = seasonDay(state, at);
      expect(rivalWeakened(state, inside, at)).toBe(true);
      expect(raidOffer(state, inside, at).weakened).toBe(true);
      expect(raidOffer(state, inside, at).guard).toBe(
        Math.max(
          1,
          Math.floor((rivalStats(inside, day).guard * (100 + DATA.anoxia.guardPercent)) / 100),
        ),
      );
      expect(raidOffer(state, outside, at).guard).toBe(rivalStats(outside, day).guard);
      expect(rivalWeakened({ ...state, tier: 8 }, inside, at)).toBe(false);
      checked += 1;
    }
    expect(checked).toBe(1);
  });
});

describe("le Léviathan", () => {
  const strikeMs = DATA.leviathan.strikeHours * HOUR;

  it("frappe à heure fixe la cellule mal défendue et dévore un dixième de tout", () => {
    const { slot, event } = troubled("leviathan");
    const first = event.startsAt + strikeMs;
    const state = player({ slot, now: first - 1000 });
    expect(leviathanThreat(state)).toEqual({ event, strikesAt: first });
    const attack = Math.round(
      (leviathanPower(state, event, first) * DATA.leviathan.strikePercent) / 100,
    );
    expect(attack).toBeGreaterThan(defensePower(state) + reinforcements(state, first));
    const step = advance(state, first);
    const struck = step.events.find((entry) => entry.type === "leviathanStruck");
    expect(struck).toMatchObject({ at: first, event: event.id, troopsLost: 2 });
    expect(step.state.troops.hunter).toBe(18);
    if (struck?.type !== "leviathanStruck") throw new Error("frappe attendue");
    expect(struck.bricks).toBe(Math.floor((step.state.resources.bricks + struck.bricks) / 10));
    expect(step.state.daily).toEqual({ day: seasonDay(state, first), wins: 0, losses: 1 });
    // La frappe suivante vient six heures plus tard, pas avant.
    expect(leviathanThreat(step.state)?.strikesAt).toBe(first + strikeMs);
    expect(
      advance(step.state, first + strikeMs - 1).events.some((e) => e.type === "leviathanStruck"),
    ).toBe(false);
    expect(deserializeState(serializeState(step.state))).toEqual(step.state);
  });

  it("ne trouve pas une cellule à l'abri, et recule devant une bonne défense", () => {
    const { slot, event } = troubled("leviathan");
    const first = event.startsAt + strikeMs;
    const hidden = player({ slot, now: first - 1000, patch: { shieldUntil: first + HOUR } });
    const quiet = advance(hidden, first);
    expect(quiet.events.some((entry) => entry.type.startsWith("leviathan"))).toBe(false);
    expect(quiet.state.troops).toEqual(hidden.troops);
    const strong = player({
      slot,
      now: first - 1000,
      patch: { troops: partyOf({ guardian: 300 }) },
    });
    const held = advance(strong, first);
    expect(held.events.find((entry) => entry.type === "leviathanRepelled")).toMatchObject({
      at: first,
      event: event.id,
    });
    expect(held.state.troops.guardian).toBe(300);
    expect(held.state.daily.wins).toBe(1);
  });

  it("vaincu, il rapporte beaucoup et ne menace plus le joueur", () => {
    const { slot, event } = troubled("leviathan");
    const at = event.startsAt + 60_000;
    const state = player({ slot, now: at, patch: { troops: partyOf({ toxic: 400 }) } });
    const offer = leviathanOffer(state, event, at);
    expect(offer.power).toBe(leviathanPower(state, event, at));
    expect(offer.proteins).toBeGreaterThan(300 * MICRO);
    expect(leviathanBeaten(state, event)).toBe(false);
    const order: Order = { type: "huntLeviathan", event: event.id, party: state.troops };
    expect(refusal(state, { ...order, event: "e:0:0:1" }, at)).toBe("unknownEvent");
    expect(refusal(state, { ...order, party: partyOf() }, at)).toBe("noTroops");
    const sent = ok(state, order, at);
    expect(sent.hunt?.prey).toBe(event.id);
    expect(sent.energy).toBe(state.energy - DATA.leviathan.energy);
    expect(deserializeState(serializeState(sent))).toEqual(sent);
    const fought = ok(sent, { type: "strikeHunt" }, sent.hunt?.arrivesAt ?? 0);
    expect(fought.hunt?.outcome?.won).toBe(true);
    const home = advance(fought, fought.hunt?.returnsAt ?? 0);
    expect(home.state.hunt).toBeNull();
    // Sa récompense attend dans un coffre : rien n'entre tant qu'il n'est pas ouvert.
    expect(home.state.resources.proteins).toBe(state.resources.proteins);
    expect(home.state.chests).toEqual([
      {
        kind: "leviathan",
        at: fought.hunt?.returnsAt,
        level: 0,
        sugar: 0,
        bricks: 0,
        proteins: offer.proteins,
        energy: DATA.leviathan.energyGain,
        boosts: DATA.leviathan.boosts,
      },
    ]);
    const opened = ok(home.state, { type: "openReward", index: 0 }, home.state.now);
    expect(opened.resources.proteins).toBe(state.resources.proteins + offer.proteins);
    expect(opened.energy).toBe(fought.energy + DATA.leviathan.energyGain);
    expect(opened.chests).toEqual([]);
    expect(leviathanBeaten(home.state, event)).toBe(true);
    expect(leviathanThreat(home.state)).toBeNull();
    const rest = advance(home.state, event.endsAt + HOUR);
    expect(rest.events.some((entry) => entry.type.startsWith("leviathan"))).toBe(false);
    expect(refusal(home.state, order, home.state.now)).toBe("placeResting");
  });

  it("on ne l'affronte pas plus haut que sa propre zone", () => {
    const high = seen(27, "leviathan").find(
      (event) => event.zone > 0 && !eventCovers(event, cellIn(27, 4, 0)),
    );
    if (high === undefined) throw new Error("Léviathan attendu plus haut");
    const state = player({ now: high.startsAt + HOUR });
    expect(
      refusal(state, { type: "huntLeviathan", event: high.id, party: state.troops }, state.now),
    ).toBe("zoneClosed");
  });
});
