import { BALANCE, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { TroopId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  applyOrder,
  battleAdvice,
  createPlayer,
  defensePower,
  deserializeState,
  partyOf,
  partySize,
  raidForce,
  serializeState,
  visibleRivals,
} from "./index";
import type { Battle, PlayerState, Rival } from "./index";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const T0 = SEASON + DAY_MS + HOUR;
const WORLD = { worldSeed: 27, slot: 4 };

function party(values: Partial<Record<TroopId, number>>): Record<TroopId, number> {
  return { ...partyOf(), ...values };
}

/** Un joueur du palier 5, bouclier tombé, une attaque prévue sept heures après. */
function player(troops: Partial<Record<TroopId, number>>, seed = 7): PlayerState {
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
    organelles: { ...base.organelles, mitochondrion: 1, vacuole: 5, nursery: 3, wall: 2 },
    resources: { sugar: 400 * MICRO, bricks: 200 * MICRO, proteins: 10 * MICRO },
    troops: party(troops),
  };
  const state = advance(ready, T0).state;
  return { ...state, shieldUntil: T0, nextRaidAt: T0 + 7 * HOUR };
}

const target: Rival = (() => {
  const found = visibleRivals(WORLD.worldSeed, WORLD.slot)[0];
  if (found === undefined) throw new Error("rival attendu");
  return found;
})();
const strong: TroopId = TROOP_IDS.find((id) => STRONG_AGAINST[id] === target.kind) ?? "hunter";

/** Une attaque menée jusqu'au retour : l'état final et le détail du combat. */
function raidTo(group: Partial<Record<TroopId, number>>, struck: boolean) {
  const start = player(group);
  const result = applyOrder(start, { type: "sendRaid", rival: target.id, party: party(group) }, T0);
  if (!result.ok) throw new Error(result.error);
  const sent = result.state;
  const raid = sent.raid;
  if (raid === null) throw new Error("attaque attendue");
  let fought = sent;
  if (struck) {
    const hit = applyOrder(sent, { type: "strikeRaid" }, raid.arrivesAt);
    if (!hit.ok) throw new Error(hit.error);
    fought = hit.state;
  }
  const back = advance(fought, raid.returnsAt).state;
  const report = back.reports[0];
  if (report?.battle === undefined) throw new Error("rapport détaillé attendu");
  return { raid, back, report, battle: report.battle };
}

function sum(battle: Battle["attacker"]): number {
  return (
    battle.troops.reduce((total, entry) => total + entry.count * entry.each, 0) +
    battle.lines.reduce((total, entry) => total + entry.value, 0)
  );
}

describe("le rapport détaillé d'une attaque", () => {
  it("raconte les nombres du combat : cellules, garde, issue, pertes", () => {
    for (const count of [1, 5, 20, 60]) {
      const { raid, report, battle } = raidTo({ [strong]: count, hunter: 2 }, false);
      expect(battle.mine).toBe("attacker");
      expect(battle.kind).toBe(target.kind);
      // Chaque camp vaut exactement la somme de ses morceaux.
      expect(sum(battle.attacker)).toBe(battle.attacker.total);
      expect(sum(battle.defender)).toBe(battle.defender.total);
      expect(battle.attacker.total).toBe(raidForce(raid.party, raid.kind, false));
      expect(battle.defender.total).toBe(raid.power);
      expect(battle.attackerWon).toBe(report.won);
      expect(battle.attackerWon).toBe(battle.attacker.total > battle.defender.total);
      // Les cellules du bon type comptent double, et les pertes sont celles du rapport.
      const typed = battle.attacker.troops.find((entry) => entry.troop === strong);
      expect(typed?.strong).toBe(strong !== "hunter");
      expect(battle.attacker.troops.reduce((total, entry) => total + entry.lost, 0)).toBe(
        report.troops,
      );
      expect(battle.defender.lossPercent).toBeNull();
      expect(battle.attacker.lossPercent).toBeGreaterThanOrEqual(
        BALANCE.rivals.combat.minLossPercent,
      );
    }
  });

  it("la bulle touchée apparaît comme une ligne de +25 %", () => {
    const { raid, battle } = raidTo({ [strong]: 12 }, true);
    const strike = battle.attacker.lines.find((entry) => entry.key === "strike");
    expect(strike?.percent).toBe(BALANCE.rivals.raid.strikeAttackPercent);
    expect(battle.attacker.total).toBe(raidForce(raid.party, raid.kind, true));
  });

  it("dit ce qui manquait, et avec quelles cellules le combler", () => {
    let lost = 0;
    let won = 0;
    for (const count of [1, 2, 4, 8, 16, 32, 64]) {
      const { battle } = raidTo({ [strong]: count }, false);
      const advice = battleAdvice(battle);
      if (advice.won) {
        won += 1;
        expect(advice.missing).toBe(0);
        expect(advice.troop).toBeNull();
        continue;
      }
      lost += 1;
      expect(advice.missing).toBe(battle.defender.total - battle.attacker.total + 1);
      expect(advice.troop).toBe(strong);
      const each = battle.attacker.troops[0]?.each ?? 1;
      // Le conseil suffit tout juste : une cellule de moins ne suffirait pas.
      expect(advice.troopCount * each).toBeGreaterThanOrEqual(advice.missing);
      expect((advice.troopCount - 1) * each).toBeLessThan(advice.missing);
      const strike = Math.floor((battle.attacker.total * 25) / 100);
      expect(advice.strikeWouldWin).toBe(battle.attacker.total + strike > battle.defender.total);
    }
    expect(lost).toBeGreaterThan(0);
    expect(won).toBeGreaterThan(0);
  });

  it("le détail se garde dans la sauvegarde, et une vieille sauvegarde reste lisible", () => {
    const { back } = raidTo({ [strong]: 10 }, false);
    expect(deserializeState(serializeState(back))).toEqual(back);
    const saved = JSON.parse(serializeState(back)) as { reports: Record<string, unknown>[] };
    const old = {
      ...saved,
      reports: saved.reports.map((entry) =>
        Object.fromEntries(Object.entries(entry).filter(([name]) => name !== "battle")),
      ),
    };
    const read = deserializeState(JSON.stringify(old));
    expect(read.reports[0]?.battle).toBeUndefined();
    const broken = {
      ...saved,
      reports: saved.reports.map((entry) => ({ ...entry, battle: { mine: "spectateur" } })),
    };
    expect(() => deserializeState(JSON.stringify(broken))).toThrow(TypeError);
  });

  it("une attaque en route garde son combat jusqu'au retour, même après une sauvegarde", () => {
    const start = player({ [strong]: 10 });
    const sent = applyOrder(
      start,
      { type: "sendRaid", rival: target.id, party: party({ [strong]: 10 }) },
      T0,
    );
    if (!sent.ok || sent.state.raid === null) throw new Error("attaque attendue");
    const fought = advance(sent.state, sent.state.raid.resolveAt).state;
    expect(fought.raid?.outcome?.battle).toBeDefined();
    const reread = deserializeState(serializeState(fought));
    expect(reread).toEqual(fought);
  });
});

describe("le rapport détaillé d'une défense", () => {
  it("la défense vaut ses cellules, sa membrane et sa Paroi, ses bonus et ses renforts", () => {
    let seen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = player({ hunter: 4 + seed, swift: 3 }, seed);
      const due = state.nextRaidAt ?? 0;
      const before = advance(state, due - 1).state;
      const step = advance(state, due);
      const event = step.events.find(
        (entry) => entry.type === "attackRepelled" || entry.type === "attackSuffered",
      );
      if (event === undefined || !("battle" in event)) continue;
      seen += 1;
      const battle = event.battle;
      expect(battle.mine).toBe("defender");
      expect(sum(battle.attacker)).toBe(battle.attacker.total);
      expect(sum(battle.defender)).toBe(battle.defender.total);
      // Sans alliance, pas de renfort : la défense est celle de la cellule.
      expect(battle.defender.total).toBe(defensePower(before));
      expect(battle.attackerWon).toBe(event.type === "attackSuffered");
      expect(battle.attackerWon).toBe(battle.defender.total < battle.attacker.total);
      expect(battle.defender.troops.reduce((total, entry) => total + entry.lost, 0)).toBe(
        event.troopsLost,
      );
      expect(partySize(before.troops) - partySize(step.state.troops)).toBe(event.troopsLost);
      expect(step.state.reports[0]?.battle).toEqual(battle);
      const advice = battleAdvice(battle);
      if (!advice.won) {
        expect(advice.missing).toBe(battle.attacker.total - battle.defender.total);
      }
    }
    expect(seen).toBeGreaterThan(10);
  });
});
