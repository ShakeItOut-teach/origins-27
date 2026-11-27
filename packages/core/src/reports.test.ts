import { BALANCE } from "@o27/data";
import type { Order } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  HARVESTS_KEPT,
  MICRO,
  REPORTS_KEPT,
  advance,
  applyOrder,
  attackWarning,
  cellDistance,
  cellIn,
  createPlayer,
  deserializeState,
  isAlly,
  oceanDeposits,
  oceanRivals,
  partyOf,
  playerCell,
  serializeState,
} from "./index";
import type { Battle, OrderErrorCode, PlayerState, Report, ZoneEvent } from "./index";
import { cellTroubles } from "./events";
import { trackReports } from "./reports";

const HOUR = 3_600_000;
/** Une défense repoussée, détaillée : une cellule et la membrane contre une attaque de 1. */
const REPELLED: Battle = {
  mine: "defender",
  attacker: {
    troops: [],
    lines: [{ key: "rivalAttack", value: 1, percent: 0 }],
    total: 1,
    lossPercent: null,
  },
  defender: {
    troops: [{ troop: "hunter", count: 1, each: 1, strong: false, lost: 0 }],
    lines: [{ key: "wall", value: 1, percent: 0 }],
    total: 2,
    lossPercent: 8,
  },
  attackerWon: false,
  kind: null,
};
const MINUTE = 60_000;
const SEASON = 1_800_000_000_000;
const OPEN = SEASON + 8 * DAY_MS;
const NOW = OPEN + 2 * DAY_MS + HOUR;

/** Un joueur du palier 9, bien installé, que personne n'attaque pendant le test. */
function player(patch: Partial<PlayerState> = {}, now = NOW, slot = 4): PlayerState {
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot });
  return advance(
    {
      ...base,
      tier: 9,
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
        ribosome: 3,
        vacuole: 5,
        nursery: 1,
        nucleus: 6,
      },
      resources: { sugar: 600 * MICRO, bricks: 600 * MICRO, proteins: 300 * MICRO },
      troops: partyOf({ hunter: 20 }),
      shieldUntil: 0,
      nextRaidAt: now + 30 * DAY_MS,
      ...patch,
    },
    now,
  ).state;
}

function ok(state: PlayerState, order: Order, now = state.now): PlayerState {
  const result = applyOrder(state, order, now);
  if (!result.ok) throw new Error(`ordre refusé : ${result.error}`);
  return result.state;
}

function refusal(state: PlayerState, order: Order, now = state.now): OrderErrorCode | null {
  const result = applyOrder(state, order, now);
  return result.ok ? null : result.error;
}

/** Une place des abysses que tiendra un Léviathan, lui aussi dans les abysses. */
function leviathan(): { slot: number; event: ZoneEvent } {
  for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
    const event = cellTroubles(27, cellIn(27, slot, 0), SEASON).find(
      (entry) => entry.kind === "leviathan" && entry.zone === 0 && entry.startsAt > OPEN + DAY_MS,
    );
    if (event !== undefined) return { slot, event };
  }
  throw new Error("Léviathan attendu");
}

describe("l'accélérateur", () => {
  const boostMs = BALANCE.boost.minutes * MINUTE;

  it("vaincre un Léviathan en donne un", () => {
    const { slot, event } = leviathan();
    const at = event.startsAt + MINUTE;
    const state = player({ troops: partyOf({ toxic: 600 }) }, at, slot);
    expect(state.boosts).toBe(0);
    const sent = ok(state, { type: "huntLeviathan", event: event.id, party: state.troops }, at);
    const fought = ok(sent, { type: "strikeHunt" }, sent.hunt?.arrivesAt ?? 0);
    const back = advance(fought, fought.hunt?.returnsAt ?? 0);
    // Il attend dans le coffre du Léviathan : on l'a quand on ouvre le coffre.
    expect(back.state.boosts).toBe(0);
    expect(back.state.chests[0]).toMatchObject({
      kind: "leviathan",
      boosts: BALANCE.events.leviathan.boosts,
    });
    expect(deserializeState(serializeState(back.state))).toEqual(back.state);
    const opened = applyOrder(back.state, { type: "openReward", index: 0 }, back.state.now);
    if (!opened.ok) throw new Error("coffre refusé");
    expect(opened.state.boosts).toBe(BALANCE.events.leviathan.boosts);
    expect(opened.events).toContainEqual({
      type: "boostGained",
      at: back.state.now,
      count: BALANCE.events.leviathan.boosts,
    });
    // Une chasse ordinaire n'en donne pas.
    expect(back.state.reports[0]).toMatchObject({ kind: "hunt", won: true, who: event.id });
  });

  it("retire une heure à l'évolution en cours, ou la termine s'il reste moins", () => {
    const state = player({ boosts: 2 });
    expect(refusal(state, { type: "useBoost", target: "research" })).toBe("nothingToBoost");
    const started = ok(state, { type: "research", evolution: "venom" });
    const left = (started.research?.endsAt ?? 0) - started.now;
    expect(left).toBeGreaterThan(0);
    const step = applyOrder(started, { type: "useBoost", target: "research" }, started.now);
    if (!step.ok) throw new Error("accélérateur refusé");
    const saved = Math.min(left, boostMs);
    expect(step.events).toContainEqual({
      type: "boostUsed",
      at: started.now,
      target: "research",
      savedMs: saved,
    });
    expect(step.state.boosts).toBe(1);
    if (left <= boostMs) {
      // Il restait moins d'une heure : l'évolution est exprimée sur-le-champ.
      expect(step.state.research).toBeNull();
      expect(step.state.evolutions.venom).toBe(1);
    } else {
      expect(step.state.research?.endsAt).toBe((started.research?.endsAt ?? 0) - boostMs);
    }
  });

  it("termine un chantier, se dépense un par un, et ne s'invente pas", () => {
    const state = player({ boosts: 1 });
    expect(refusal(state, { type: "useBoost", target: "construction" })).toBe("nothingToBoost");
    const building = ok(state, { type: "upgrade", organelle: "nursery" });
    const done = ok(building, { type: "useBoost", target: "construction" });
    expect(done.construction).toBeNull();
    expect(done.organelles.nursery).toBe(building.organelles.nursery + 1);
    expect(done.boosts).toBe(0);
    // Plus d'accélérateur : le chantier suivant prend son temps.
    const rich = { sugar: 5000 * MICRO, bricks: 5000 * MICRO, proteins: 0 };
    const again = ok({ ...done, resources: rich }, { type: "upgrade", organelle: "ribosome" });
    expect(again.construction).not.toBeNull();
    expect(refusal(again, { type: "useBoost", target: "construction" })).toBe("noBoost");
    // Avant les classements et le concours, l'accélérateur n'existe pas encore.
    const early = { ...player({ boosts: 1 }, SEASON + 2 * DAY_MS), tier: 6 };
    expect(refusal(early, { type: "useBoost", target: "construction" })).toBe("locked");
  });
});

describe("l'attaque qui approche", () => {
  const lead = BALANCE.rivals.incoming.warningMinutes * MINUTE;

  it("le joueur est prévenu dix minutes avant, pas plus tôt", () => {
    const far = player({ nextRaidAt: NOW + lead + MINUTE });
    expect(attackWarning(far)).toBeNull();
    const near = advance(far, NOW + 2 * MINUTE).state;
    expect(attackWarning(near)).toBe(NOW + lead + MINUTE);
    expect(attackWarning({ ...near, nextRaidAt: null })).toBeNull();
    // L'attaque passée, plus d'alerte : la suivante est loin.
    const after = advance(near, NOW + lead + 2 * MINUTE).state;
    expect(attackWarning(after)).toBeNull();
  });

  it("pas d'alerte si l'attaque doit tomber pendant la nuit du joueur", () => {
    const at = NOW + 5 * MINUTE;
    const minute = Math.floor((at % DAY_MS) / MINUTE);
    const asleep = player({ nextRaidAt: at, nightStart: (minute + 1440 - 30) % 1440 });
    expect(attackWarning(asleep)).toBeNull();
    const awake = player({ nextRaidAt: at, nightStart: (minute + 600) % 1440 });
    expect(attackWarning(awake)).toBe(at);
  });
});

describe("le journal des rapports", () => {
  it("raconte une récolte dans l'océan", () => {
    // Réserves vides : tout le chargement trouvera sa place.
    const state = player({ resources: { sugar: 0, bricks: 0, proteins: 0 }, troops: partyOf() });
    const home = playerCell(state);
    const deposit = oceanDeposits(27, NOW)
      .filter((entry) => entry.zone === 0 && entry.endsAt - NOW > 2 * HOUR)
      .sort((one, other) => cellDistance(home, one) - cellDistance(home, other))[0];
    if (deposit === undefined) throw new Error("gisement attendu");
    const sent = ok(state, { type: "gather", deposit: deposit.id });
    expect(sent.reports).toEqual([]);
    const back = advance(sent, sent.expedition?.returnsAt ?? 0).state;
    const [report] = back.reports;
    expect(report).toMatchObject({
      at: sent.expedition?.returnsAt,
      kind: "harvest",
      won: true,
      who: deposit.id,
      troops: 0,
    });
    expect((report?.sugar ?? 0) + (report?.bricks ?? 0) + (report?.proteins ?? 0)).toBeGreaterThan(
      0,
    );
    expect(deserializeState(serializeState(back))).toEqual(back);
    // Une récolte rappelée ne se raconte pas.
    const called = ok(sent, { type: "cancelExpedition" }, sent.now + 1000);
    expect(advance(called, called.expedition?.returnsAt ?? 0).state.reports).toEqual([]);
  });

  it("raconte une attaque envoyée, avec son butin et ses pertes", () => {
    const state = player({ troops: partyOf({ toxic: 300 }), zone: 1 });
    const foe = oceanRivals(state).find((rival) => !isAlly(state, rival));
    if (foe === undefined) throw new Error("rival attendu");
    const sent = ok(state, { type: "sendRaid", rival: foe.id, party: state.troops });
    const fought = ok(sent, { type: "strikeRaid" }, sent.raid?.arrivesAt ?? 0);
    const back = advance(fought, fought.raid?.returnsAt ?? 0).state;
    const report = back.reports.find((entry) => entry.kind === "raid");
    expect(report).toMatchObject({ won: true, who: foe.id });
    expect(report?.sugar).toBeGreaterThan(0);
  });

  it("raconte les attaques subies, repoussées ou non, de la plus récente à la plus ancienne", () => {
    const strong = player({ nextRaidAt: NOW + HOUR, troops: partyOf({ guardian: 400 }) });
    const held = advance(strong, NOW + 2 * HOUR).state;
    expect(held.reports[0]).toMatchObject({ kind: "defense", won: true, sugar: 0 });
    // Même victorieuse, la défense perd des cellules : peu, parce qu'elle dominait.
    expect(held.reports[0]?.troops).toBeGreaterThan(0);
    expect(held.reports[0]?.troops).toBeLessThanOrEqual(
      Math.floor((400 * BALANCE.rivals.combat.minLossPercent) / 100),
    );
    const weak = player({ nextRaidAt: NOW + HOUR, troops: partyOf({ hunter: 10 }), zone: 1 });
    const days = advance({ ...weak, alliance: null }, NOW + 12 * DAY_MS).state;
    const defenses = days.reports.filter((entry) => entry.kind === "defense");
    expect(defenses.length).toBeGreaterThan(2);
    expect(defenses.some((entry) => !entry.won && entry.sugar + entry.bricks > 0)).toBe(true);
    expect(days.reports.map((entry) => entry.at)).toEqual(
      [...days.reports.map((entry) => entry.at)].sort((a, b) => b - a),
    );
    for (const entry of defenses) expect(entry.who).toMatch(/^o:\d+$/);
  });

  it("raconte une frappe du Léviathan", () => {
    const { slot, event } = leviathan();
    const first = event.startsAt + BALANCE.events.leviathan.strikeHours * HOUR;
    const state = player({}, first - 1000, slot);
    const struck = advance(state, first).state;
    expect(struck.reports[0]).toMatchObject({
      at: first,
      kind: "leviathan",
      won: false,
      who: event.id,
      troops: 2,
    });
  });

  it("des famines rapprochées ne font qu'un rapport", () => {
    const hungry = player({
      troops: partyOf({ hunter: 2000 }),
      resources: { sugar: 0, bricks: 0, proteins: 0 },
    });
    const later = advance(hungry, NOW + 20 * MINUTE).state;
    const famines = later.reports.filter((entry) => entry.kind === "famine");
    expect(famines).toHaveLength(1);
    expect(famines[0]?.troops).toBe(2000 - later.troops.hunter);
    expect(famines[0]?.troops).toBeGreaterThan(100);
  });

  it("ne grossit pas sans fin, et les récoltes ne chassent pas les combats", () => {
    let state = player();
    const fight: Report = {
      at: NOW,
      kind: "defense",
      won: true,
      who: "o:12",
      sugar: 0,
      bricks: 0,
      proteins: 0,
      lost: 0,
      troops: 0,
    };
    state = { ...state, reports: [fight] };
    for (let index = 1; index <= 60; index++) {
      state = trackReports(state, [
        {
          type: "expeditionReturned",
          at: NOW + index * MINUTE,
          place: "d:1:2:3",
          resource: "sugar",
          gained: MICRO,
          lost: 0,
          cancelled: false,
        },
      ]);
    }
    expect(state.reports.filter((entry) => entry.kind === "harvest")).toHaveLength(HARVESTS_KEPT);
    expect(state.reports).toContainEqual(fight);
    for (let index = 1; index <= 60; index++) {
      state = trackReports(state, [
        {
          type: "attackRepelled",
          at: NOW + HOUR + index * MINUTE,
          rival: "o:7",
          troopsLost: 0,
          battle: REPELLED,
        },
      ]);
    }
    expect(state.reports).toHaveLength(REPORTS_KEPT);
    expect(state.reports[0]?.at).toBe(NOW + HOUR + 60 * MINUTE);
    expect(deserializeState(serializeState(state))).toEqual(state);
  });

  it("une sauvegarde d'avant le journal repart avec un journal vide et aucun accélérateur", () => {
    const state = player({ boosts: 3 });
    const saved = JSON.parse(serializeState(state)) as Record<string, unknown>;
    const old = Object.fromEntries(
      Object.entries(saved).filter(([key]) => key !== "reports" && key !== "boosts"),
    );
    const back = deserializeState(JSON.stringify(old));
    expect(back.reports).toEqual([]);
    expect(back.boosts).toBe(0);
    expect(() =>
      deserializeState(JSON.stringify({ ...saved, reports: [{ kind: "rumeur" }] })),
    ).toThrow(TypeError);
  });
});
