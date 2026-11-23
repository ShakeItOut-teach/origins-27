/**
 * Couche de jeu du client.
 * Pour l'instant la partie tourne sur le moteur dans le navigateur et se sauvegarde sur
 * l'appareil. Quand le serveur sera branché, seul ce fichier changera : l'interface
 * continue d'afficher un état et d'envoyer des ordres.
 */
import { advance, applyOrder, createPlayer, deserializeState, serializeState } from "@o27/core";
import type { GameEvent, OrderResult, PlayerState } from "@o27/core";
import type { Order } from "@o27/data";

const SAVE_KEY = "o27.partie-locale.v1";
const TICK_MS = 250;
const SAVE_EVERY_MS = 5000;

export interface GameStore {
  readonly getState: () => PlayerState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly onEvents: (listener: (events: readonly GameEvent[]) => void) => () => void;
  readonly send: (order: Order) => OrderResult;
  readonly start: () => () => void;
}

export interface StoreDeps {
  readonly clock: () => number;
  readonly storage: Pick<Storage, "getItem" | "setItem">;
  readonly newSeed: () => number;
}

function load(deps: StoreDeps): PlayerState {
  const now = deps.clock();
  const saved = deps.storage.getItem(SAVE_KEY);
  if (saved !== null) {
    try {
      return deserializeState(saved);
    } catch {
      // Sauvegarde illisible : on repart d'une cellule neuve plutôt que de bloquer le joueur.
    }
  }
  return createPlayer(deps.newSeed(), now, now);
}

export function createStore(deps: StoreDeps): GameStore {
  let state = load(deps);
  let lastSave = 0;
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(events: readonly GameEvent[]) => void>();

  /** L'horloge de l'appareil peut reculer ; le jeu, jamais. */
  const now = (): number => Math.max(deps.clock(), state.now);

  const save = (): void => {
    deps.storage.setItem(SAVE_KEY, serializeState(state));
    lastSave = state.now;
  };

  const commit = (next: PlayerState, events: readonly GameEvent[], forceSave: boolean): void => {
    state = next;
    if (forceSave || state.now - lastSave >= SAVE_EVERY_MS) save();
    for (const listener of listeners) listener();
    if (events.length > 0) for (const listener of eventListeners) listener(events);
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onEvents(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    send(order) {
      const result = applyOrder(state, order, now());
      if (result.ok) commit(result.state, result.events, true);
      return result;
    },
    start() {
      const tick = (): void => {
        const step = advance(state, now());
        commit(step.state, step.events, step.events.length > 0);
      };
      tick();
      const timer = setInterval(tick, TICK_MS);
      return () => {
        clearInterval(timer);
        save();
      };
    },
  };
}
