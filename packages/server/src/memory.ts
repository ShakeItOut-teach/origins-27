/** Une base en mémoire, avec les mêmes garanties que la vraie. Sert aux tests. */
import type { Battle, DuelSummary } from "@o27/core";
import type { Commit, Outcome, Repository, StoredPlayer } from "./service";
import type { EscortRecord, RaidRecord, Settlement, SpyRecord, WarRepository } from "./war";

export interface MemoryRepository extends Repository {
  /** Nombre d'écritures réussies, pour les tests. */
  readonly writes: () => number;
  /** Écrit plusieurs parties d'un seul coup, ou aucune si une version a bougé. */
  readonly commitMany: (writes: Settlement["writes"]) => Promise<boolean>;
}

export function createMemoryRepository(): MemoryRepository {
  const players = new Map<string, StoredPlayer>();
  const outcomes = new Map<string, Outcome>();
  let writes = 0;
  let slots = 0;
  const key = (playerId: string, orderId: string): string => `${playerId}/${orderId}`;

  return {
    writes: () => writes,
    commitMany(list) {
      if (
        list.some((entry) => (players.get(entry.playerId)?.version ?? 0) !== entry.expectedVersion)
      ) {
        return Promise.resolve(false);
      }
      for (const entry of list) {
        players.set(entry.playerId, { state: entry.state, version: entry.expectedVersion + 1 });
        writes += 1;
      }
      return Promise.resolve(true);
    },
    nextSlot: () => Promise.resolve(slots++),
    load: (playerId) => Promise.resolve(players.get(playerId) ?? null),
    findOutcome: (playerId, orderId) =>
      Promise.resolve(outcomes.get(key(playerId, orderId)) ?? null),
    commit(change: Commit) {
      const current = players.get(change.playerId)?.version ?? 0;
      if (current !== change.expectedVersion) return Promise.resolve(false);
      if (change.order !== null) {
        const orderKey = key(change.playerId, change.order.id);
        if (outcomes.has(orderKey)) return Promise.resolve(false);
        outcomes.set(orderKey, change.order.outcome);
      }
      players.set(change.playerId, { state: change.state, version: current + 1 });
      writes += 1;
      return Promise.resolve(true);
    },
  };
}

/** Une file des combats entre humains en mémoire, avec les mêmes garanties que la vraie. */
export interface MemoryWar extends WarRepository {
  /** Un humain prend une place dans l'océan (la vitrine, côté base). */
  readonly place: (slot: number, playerId: string) => void;
  readonly attacks: () => readonly MemoryAttack[];
  readonly spies: () => readonly SpyRecord[];
}

export interface MemoryAttack {
  readonly id: string;
  readonly record: RaidRecord;
  readonly defender: string;
  readonly status: "pending" | "cancelled" | "resolved" | "bounced";
  readonly summary: DuelSummary | null;
  readonly battle: Battle | null;
}

export function createMemoryWar(repo: MemoryRepository): MemoryWar {
  const owners = new Map<number, string>();
  const attacks = new Map<string, MemoryAttack>();
  const escorts = new Map<string, EscortRecord>();
  const spies: SpyRecord[] = [];
  let next = 1;
  const keyOf = (record: RaidRecord): string => `${record.attacker}/${String(record.startedAt)}`;
  const byKey = new Map<string, string>();

  return {
    place: (slot, playerId) => {
      owners.set(slot, playerId);
    },
    attacks: () => [...attacks.values()],
    spies: () => spies,
    ownerOf: (slot) => Promise.resolve(owners.get(slot) ?? null),
    syncRaid(record) {
      const defender = owners.get(record.defenderSlot);
      if (defender === undefined) return Promise.resolve();
      const known = byKey.get(keyOf(record));
      if (known === undefined) {
        const id = `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
        byKey.set(keyOf(record), id);
        attacks.set(id, {
          id,
          record,
          defender,
          status: record.cancelled ? "cancelled" : "pending",
          summary: null,
          battle: null,
        });
        return Promise.resolve();
      }
      const entry = attacks.get(known);
      if (entry?.status === "pending" && record.cancelled) {
        attacks.set(known, { ...entry, status: "cancelled" });
      }
      return Promise.resolve();
    },
    syncEscort(record) {
      escorts.set(`${record.attack}/${record.helper}`, record);
      return Promise.resolve();
    },
    findAttack(id) {
      const entry = attacks.get(id);
      return Promise.resolve(
        entry?.status === "pending"
          ? { slot: entry.record.defenderSlot, resolveAt: entry.record.resolveAt }
          : null,
      );
    },
    dueAttacks(now, playerId, limit) {
      const due = [...attacks.values()]
        .filter((entry) => entry.status === "pending" && entry.record.resolveAt <= now)
        .sort((one, other) => {
          const mine = (entry: MemoryAttack): number =>
            entry.record.attacker === playerId || entry.defender === playerId ? 0 : 1;
          return mine(one) - mine(other) || one.record.resolveAt - other.record.resolveAt;
        })
        .slice(0, limit);
      return Promise.resolve(
        due.map((entry) => ({
          id: entry.id,
          attacker: entry.record.attacker,
          defender: entry.defender,
          resolveAt: entry.record.resolveAt,
        })),
      );
    },
    escortsOf: (attack) =>
      Promise.resolve(
        [...escorts.values()]
          .filter((entry) => entry.attack === attack)
          .map((entry) => entry.helper),
      ),
    async settle(settlement) {
      const entry = attacks.get(settlement.attack);
      if (entry?.status !== "pending") return false;
      if (!(await repo.commitMany(settlement.writes))) return false;
      const summary = settlement.summary;
      attacks.set(settlement.attack, {
        ...entry,
        status: summary === null ? "cancelled" : summary.fought ? "resolved" : "bounced",
        summary,
        battle: settlement.battle,
      });
      return true;
    },
    recordSpy(record) {
      spies.push(record);
      return Promise.resolve();
    },
  };
}
