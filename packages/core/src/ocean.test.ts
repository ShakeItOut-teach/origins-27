import { BALANCE } from "@o27/data";
import type { Order } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  ZONE_COUNT,
  advance,
  applyOrder,
  cellDistance,
  cellIn,
  createPlayer,
  depositLeft,
  depositLoad,
  depthAt,
  deserializeState,
  findDeposit,
  gatherOffer,
  migrateOffer,
  nearRivals,
  oceanDeposits,
  oceanOrganisms,
  oceanRadius,
  oceanRivals,
  organismZone,
  playerCell,
  raidOffer,
  rankOf,
  reachableRivals,
  ringCells,
  rivalName,
  rivalStats,
  serializeState,
  zoneAt,
  zoneInner,
  zoneOpenDay,
} from "./index";
import type { Deposit, OrderErrorCode, PlayerState } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const OCEAN = BALANCE.ocean;
const ORGANISMS = BALANCE.world.organisms;
const WORLD = { worldSeed: 27, slot: 4 };

/** Un instant du jour de saison demandé (1 = premier jour). */
function dayAt(day: number): number {
  return SEASON + (day - 1) * DAY_MS + HOUR;
}

/** Un joueur du palier 6, riche, que personne ne vient déranger pendant le test. */
function atTier6(day: number, zone = 0): PlayerState {
  const now = dayAt(day);
  const base = createPlayer(7, SEASON, now, WORLD);
  return advance(
    {
      ...base,
      tier: 6,
      zone,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
        rivalFights: 1,
      },
      mutations: ["thrift"],
      organelles: { ...base.organelles, mitochondrion: 1, vacuole: 5, nursery: 3 },
      resources: { sugar: 100 * MICRO, bricks: 100 * MICRO, proteins: 10 * MICRO },
      troops: { hunter: 6, armored: 0, swift: 0 },
      shieldUntil: now + 20 * DAY_MS,
      nextRaidAt: now + 25 * DAY_MS,
    },
    now,
  ).state;
}

/** Le même joueur un palier plus bas : il n'a encore affronté aucun rival. */
function atTier5(state: PlayerState): PlayerState {
  return { ...state, tier: 5, counters: { ...state.counters, rivalFights: 0 } };
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

/** Le gisement le plus proche du joueur dans la zone demandée, encore bien garni. */
function nearestDeposit(state: PlayerState, zone: number): Deposit {
  const home = playerCell(state);
  const found = oceanDeposits(state.worldSeed, state.now)
    .filter((deposit) => deposit.zone === zone && deposit.endsAt - state.now > HOUR)
    .sort((one, other) => cellDistance(home, one) - cellDistance(home, other))[0];
  if (found === undefined) throw new Error("gisement attendu");
  return found;
}

describe("la forme de l'océan", () => {
  it("la terre ferme est au centre, les abysses au bord, la roche au-delà", () => {
    expect(zoneAt(0, 0)).toBe(ZONE_COUNT);
    expect(zoneAt(oceanRadius(), 0)).toBe(0);
    expect(zoneAt(oceanRadius() + 1, 0)).toBe(-1);
    expect(zoneAt(OCEAN.landRadius + 1, 0)).toBe(ZONE_COUNT - 1);
    for (let zone = 0; zone < ZONE_COUNT; zone++) {
      expect(zoneAt(0, zoneInner(zone) + 1)).toBe(zone);
    }
  });

  it("on remonte en allant vers le centre : la profondeur ne fait que diminuer", () => {
    expect(depthAt(oceanRadius(), 0)).toBe(OCEAN.zones[0]?.depth);
    expect(depthAt(0, 0)).toBe(0);
    let previous = Number.POSITIVE_INFINITY;
    for (let x = oceanRadius(); x >= 0; x--) {
      const depth = depthAt(x, 0);
      expect(depth).toBeLessThanOrEqual(previous);
      previous = depth;
    }
  });

  it("les zones s'ouvrent l'une après l'autre au fil de la saison", () => {
    expect(zoneOpenDay(0)).toBe(1);
    for (let zone = 1; zone < ZONE_COUNT; zone++) {
      expect(zoneOpenDay(zone)).toBeGreaterThan(zoneOpenDay(zone - 1));
      expect(zoneOpenDay(zone)).toBeLessThan(27);
    }
    expect(OCEAN.migrate).toHaveLength(ZONE_COUNT - 1);
  });
});

describe("les places des organismes", () => {
  it("chaque zone a assez de places, toutes dans la zone, jamais collées", () => {
    for (let zone = 0; zone < ZONE_COUNT; zone++) {
      const cells = ringCells(27, zone);
      expect(cells.length).toBeGreaterThanOrEqual(OCEAN.zones[zone]?.entrants ?? 0);
      const seen = new Set<string>();
      for (const cell of cells) {
        expect(zoneAt(cell.x, cell.y)).toBe(zone);
        // Aucune autre place dans la case ni dans les huit cases autour.
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            expect(seen.has(`${String(cell.x + dx)}:${String(cell.y + dy)}`)).toBe(false);
          }
        }
      }
      for (const cell of cells) seen.add(`${String(cell.x)}:${String(cell.y)}`);
      expect(seen.size).toBe(cells.length);
    }
  });

  it("chaque place a son rang, et le premier jour tout le monde est dans les abysses", () => {
    const ranks = new Set<number>();
    for (let slot = 0; slot < ORGANISMS; slot++) ranks.add(rankOf(27, slot));
    expect(ranks.size).toBe(ORGANISMS);
    const first = oceanOrganisms(27, 1);
    expect(first).toHaveLength(ORGANISMS);
    expect(first.every((organism) => organism.zone === 0)).toBe(true);
    expect(
      new Set(first.map((organism) => `${String(organism.x)}:${String(organism.y)}`)).size,
    ).toBe(ORGANISMS);
  });

  it("les organismes remontent avec la saison, jamais avant l'ouverture, et pas tous", () => {
    for (let rank = 0; rank < ORGANISMS; rank += 13) {
      let previous = 0;
      for (let day = 1; day <= 27; day++) {
        const zone = organismZone(rank, day);
        expect(zone).toBeGreaterThanOrEqual(previous);
        expect(day).toBeGreaterThan(zone === 0 ? 0 : zoneOpenDay(zone));
        previous = zone;
      }
    }
    const last = oceanOrganisms(27, 27);
    const top = last.filter((organism) => organism.zone === ZONE_COUNT - 1);
    expect(top).toHaveLength(OCEAN.zones[ZONE_COUNT - 1]?.entrants ?? 0);
    expect(
      new Set(last.map((organism) => `${String(organism.x)}:${String(organism.y)}`)).size,
    ).toBe(ORGANISMS);
  });
});

describe("les gisements communs", () => {
  const at = dayAt(3);

  it("ils sont les mêmes pour tous, dans l'eau, et plus riches près de la surface", () => {
    const deposits = oceanDeposits(27, at);
    expect(deposits.length).toBeGreaterThan(150);
    expect(oceanDeposits(27, at)).toBe(deposits);
    for (const deposit of deposits) {
      expect(zoneAt(deposit.x, deposit.y)).toBe(deposit.zone);
      expect(deposit.total).toBe(OCEAN.deposit.loads * depositLoad(deposit.kind, deposit.zone));
      expect(findDeposit(27, deposit.id, at)).toEqual(deposit);
    }
    for (let zone = 1; zone < ZONE_COUNT; zone++) {
      expect(depositLoad("debris", zone)).toBeGreaterThan(depositLoad("debris", zone - 1));
    }
    expect(new Set(deposits.map((deposit) => deposit.kind)).size).toBe(3);
  });

  it("un gisement se vide avec le temps, jusqu'à disparaître", () => {
    for (const deposit of oceanDeposits(27, at).slice(0, 40)) {
      const now = depositLeft(deposit, {}, at);
      const later = depositLeft(deposit, {}, Math.min(deposit.endsAt, at + HOUR));
      expect(now).toBeGreaterThan(0);
      expect(now).toBeLessThanOrEqual(deposit.total);
      expect(later).toBeLessThan(now);
      expect(depositLeft(deposit, {}, deposit.endsAt)).toBe(0);
      expect(depositLeft(deposit, { [deposit.id]: deposit.total }, at)).toBe(0);
      expect(findDeposit(27, deposit.id, deposit.endsAt)).toBeNull();
    }
  });

  it("récolter demande le palier 6", () => {
    const state = atTier5(atTier6(3));
    const deposit = nearestDeposit(state, 0);
    expect(refusal(state, { type: "gather", deposit: deposit.id }, state.now)).toBe("locked");
  });

  it("ce que le joueur charge n'est plus dans le gisement, et rentre dans sa réserve", () => {
    const state = atTier6(3);
    const deposit = nearestDeposit(state, 0);
    const offer = gatherOffer(state, deposit, state.now);
    const resource = offer.resource;
    expect(offer.loot).toBe(depositLoad(deposit.kind, 0));
    expect(offer.durationMs).toBeGreaterThanOrEqual(OCEAN.deposit.minSeconds * 1000);

    const sent = ok(state, { type: "gather", deposit: deposit.id }, state.now);
    expect(sent.energy).toBe(state.energy - offer.energy);
    expect(sent.taken[deposit.id]).toBe(offer.loot);
    expect(depositLeft(deposit, sent.taken, state.now)).toBe(
      depositLeft(deposit, {}, state.now) - offer.loot,
    );
    expect(refusal(sent, { type: "gather", deposit: deposit.id }, state.now)).toBe("busy");

    const back = advance(sent, state.now + offer.durationMs);
    expect(back.state.expedition).toBeNull();
    expect(back.state.resources[resource]).toBeGreaterThanOrEqual(
      state.resources[resource] + offer.loot,
    );
    expect(back.state.counters.mapHarvests).toBe(state.counters.mapHarvests + 1);
    // Le gisement ne « se repose » pas : on peut y retourner tant qu'il en reste.
    expect(back.state.placeReadyAt[deposit.id]).toBeUndefined();
    ok(back.state, { type: "gather", deposit: deposit.id }, back.state.now);
  });

  it("un gisement vidé, disparu ou trop haut est refusé", () => {
    const state = atTier6(3);
    const deposit = nearestDeposit(state, 0);
    const emptied = { ...state, taken: { [deposit.id]: deposit.total } };
    expect(refusal(emptied, { type: "gather", deposit: deposit.id }, state.now)).toBe("depleted");
    expect(refusal(state, { type: "gather", deposit: "d:0:0:1" }, state.now)).toBe("unknownPlace");
    const above = nearestDeposit(state, 1);
    expect(refusal(state, { type: "gather", deposit: above.id }, state.now)).toBe("zoneClosed");
    ok({ ...state, zone: 1 }, { type: "gather", deposit: above.id }, state.now);
  });

  it("les gisements disparus sont oubliés à la récolte suivante", () => {
    const state = { ...atTier6(3), taken: { "d:0:0:1": 5 * MICRO } };
    const deposit = nearestDeposit(state, 0);
    const sent = ok(state, { type: "gather", deposit: deposit.id }, state.now);
    expect(Object.keys(sent.taken)).toEqual([deposit.id]);
  });
});

describe("remonter", () => {
  const rich = { sugar: 650 * MICRO, bricks: 650 * MICRO, proteins: 400 * MICRO };

  it("une zone fermée ne s'ouvre qu'à son jour", () => {
    const early = { ...atTier6(3), resources: rich };
    expect(migrateOffer(early, early.now)?.open).toBe(false);
    expect(refusal(early, { type: "migrate" }, early.now)).toBe("zoneClosed");
  });

  it("remonter coûte, déplace la cellule et ouvre de nouveaux voisins", () => {
    const state = { ...atTier6(zoneOpenDay(1)), resources: rich };
    const offer = migrateOffer(state, state.now);
    if (offer === null) throw new Error("offre attendue");
    expect(offer.zone).toBe(1);
    const moved = ok(state, { type: "migrate" }, state.now);
    expect(moved.zone).toBe(1);
    expect(moved.resources.sugar).toBe(rich.sugar - offer.cost.sugar);
    expect(moved.resources.bricks).toBe(rich.bricks - offer.cost.bricks);
    expect(moved.resources.proteins).toBe(rich.proteins - offer.cost.proteins);
    const home = playerCell(moved);
    expect(zoneAt(home.x, home.y)).toBe(1);
    expect(home).toEqual(cellIn(moved.worldSeed, moved.slot, 1));
    expect(depthAt(home.x, home.y)).toBeLessThan(depthAt(playerCell(state).x, playerCell(state).y));
  });

  it("on ne remonte ni sans ressources, ni avec des cellules dehors, ni plus haut que la surface", () => {
    const poor = atTier6(zoneOpenDay(1));
    expect(refusal(poor, { type: "migrate" }, poor.now)).toBe("insufficient");
    const state = { ...poor, resources: rich };
    const deposit = nearestDeposit(state, 0);
    const busy = ok(state, { type: "gather", deposit: deposit.id }, state.now);
    expect(refusal(busy, { type: "migrate" }, state.now)).toBe("busy");
    const top = { ...atTier6(26, ZONE_COUNT - 1), resources: rich };
    expect(migrateOffer(top, top.now)).toBeNull();
    expect(refusal(top, { type: "migrate" }, top.now)).toBe("surface");
  });

  it("avant le palier 6, on ne remonte pas", () => {
    const state = atTier5({ ...atTier6(zoneOpenDay(1)), resources: rich });
    expect(refusal(state, { type: "migrate" }, state.now)).toBe("locked");
  });
});

describe("les rivaux de l'océan", () => {
  it("au palier 6, on atteint tous les organismes de sa zone et des zones plus profondes", () => {
    const state = atTier6(zoneOpenDay(1) + 3);
    const seen = oceanRivals(state);
    expect(reachableRivals(state)).toBe(seen);
    expect(seen.every((rival) => rival.zone === 0)).toBe(true);
    expect(seen.some((rival) => rival.id === `o:${String(state.slot)}`)).toBe(false);
    expect(new Set(seen.map((rival) => rival.id)).size).toBe(seen.length);
    seen.forEach((rival, index) => {
      expect(rival.steps).toBeGreaterThanOrEqual(seen[index - 1]?.steps ?? 1);
      expect(rivalName(state, rival.id)).toBe(rival.name);
    });
    expect(nearRivals(state)).toEqual(seen.slice(0, BALANCE.rivals.count));

    const higher = oceanRivals({ ...state, zone: 1 });
    expect(higher.some((rival) => rival.zone === 1)).toBe(true);
    expect(higher.every((rival) => rival.zone <= 1)).toBe(true);
  });

  it("plus loin, c'est plus long ; plus haut, c'est plus riche et mieux gardé", () => {
    const state = atTier6(zoneOpenDay(1) + 3, 1);
    const seen = oceanRivals(state);
    const near = seen[0];
    const far = seen[seen.length - 1];
    if (near === undefined || far === undefined) throw new Error("rivaux attendus");
    expect(raidOffer(state, far, state.now).durationMs).toBeGreaterThan(
      raidOffer(state, near, state.now).durationMs,
    );
    expect(raidOffer(state, near, state.now).durationMs).toBe(
      (BALANCE.rivals.raid.stepSeconds * near.steps + BALANCE.hunt.strikeWindowSeconds) * 1000,
    );
    const deep = rivalStats({ ...near, temper: 100, zone: 0 }, 9);
    const high = rivalStats({ ...near, temper: 100, zone: 1 }, 9);
    expect(high.sugar).toBeGreaterThan(deep.sugar);
    expect(high.guard).toBeGreaterThan(deep.guard);
  });

  it("on peut espionner et attaquer un organisme de l'océan ; avant le palier 6, non", () => {
    const state = atTier6(3);
    const target = oceanRivals(state)[0];
    if (target === undefined) throw new Error("rival attendu");
    const party = { hunter: 6, armored: 0, swift: 0 };
    const before = atTier5(state);
    expect(refusal(before, { type: "spyRival", rival: target.id }, state.now)).toBe("unknownRival");
    ok(state, { type: "spyRival", rival: target.id }, state.now);
    const sent = ok(state, { type: "sendRaid", rival: target.id, party }, state.now);
    expect(sent.raid?.rival).toBe(target.id);
    const back = advance(sent, sent.raid?.returnsAt ?? 0).state;
    expect(back.raid).toBeNull();
    expect(back.counters.rivalFights).toBe(state.counters.rivalFights + 1);
  });
});

describe("la sauvegarde", () => {
  it("la zone et les gisements entamés survivent à une sauvegarde", () => {
    const state = { ...atTier6(8, 1) };
    const deposit = nearestDeposit(state, 1);
    const sent = ok(state, { type: "gather", deposit: deposit.id }, state.now);
    const back = deserializeState(serializeState(sent));
    expect(back).toEqual(sent);
    expect(serializeState(back)).toBe(serializeState(sent));
  });

  it("une sauvegarde d'avant l'océan place le joueur dans les abysses", () => {
    const state = atTier6(3);
    const old = JSON.parse(serializeState(state)) as Record<string, unknown>;
    old.version = 5;
    delete old.zone;
    delete old.taken;
    const back = deserializeState(JSON.stringify(old));
    expect(back.version).toBe(7);
    expect(back.zone).toBe(0);
    expect(back.taken).toEqual({});
  });
});
