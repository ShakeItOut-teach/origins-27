/** Une base en mémoire, avec les mêmes garanties que la vraie. Sert aux tests. */
import type { Commit, Outcome, Repository, StoredPlayer } from "./service";

export interface MemoryRepository extends Repository {
  /** Nombre d'écritures réussies, pour les tests. */
  readonly writes: () => number;
}

export function createMemoryRepository(): MemoryRepository {
  const players = new Map<string, StoredPlayer>();
  const outcomes = new Map<string, Outcome>();
  let writes = 0;
  const key = (playerId: string, orderId: string): string => `${playerId}/${orderId}`;

  return {
    writes: () => writes,
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
