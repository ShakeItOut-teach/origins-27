/**
 * Couche de jeu du client.
 *
 * Sans serveur (développement, tests) : la partie tourne sur le moteur dans le navigateur.
 * Avec serveur : le moteur local sert à prévoir l'effet d'un ordre tout de suite, puis
 * l'écran s'aligne sur la réponse du serveur, qui fait foi. Les ordres partent un par un,
 * dans l'ordre ; un envoi raté est réessayé avec le même identifiant, donc jamais compté deux fois.
 */
import {
  MICRO,
  advance,
  applyOrder,
  createPlayer,
  deserializeState,
  serializeState,
  summarizeAbsence,
} from "@o27/core";
import type { AbsenceSummary, GameEvent, OrderResult, PlayerState } from "@o27/core";
import type { Order } from "@o27/data";

const SAVE_KEY = "o27.partie-locale.v1";
const TICK_MS = 250;
const SAVE_EVERY_MS = 5000;
/** Les touchers sont regroupés et envoyés au plus une fois par ce délai. */
const TAP_FLUSH_MS = 800;
const RETRY_MS = 3000;
/** Nombre maximal de touchers dans un seul ordre (limite du schéma). */
const MAX_TAPS_PER_ORDER = 100;
/** En dessous de cette durée, on ne parle pas d'absence. */
export const ABSENCE_MIN_MS = 5 * 60_000;

export interface GameStore {
  readonly getState: () => PlayerState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly onEvents: (listener: (events: readonly GameEvent[]) => void) => () => void;
  readonly send: (order: Order) => OrderResult;
  readonly start: () => () => void;
  /** Ce qui s'est passé depuis la dernière visite, s'il y a quelque chose à raconter. */
  readonly getAbsence: () => AbsenceSummary | null;
  /** Faux tant qu'on attend le premier état du serveur pour un joueur sans partie connue. */
  readonly isReady: () => boolean;
}

/** Le serveur, vu du client. Une promesse rejetée veut dire « pas de réponse, réessayer ». */
export interface Remote {
  readonly fetchState: () => Promise<{
    readonly state: PlayerState;
    readonly absence: AbsenceSummary;
  }>;
  readonly sendOrder: (orderId: string, order: Order) => Promise<{ readonly state: PlayerState }>;
}

export interface StoreDeps {
  readonly clock: () => number;
  readonly storage: Pick<Storage, "getItem" | "setItem">;
  readonly newSeed: () => number;
  readonly remote?: Remote;
  readonly newId?: () => string;
}

function loadSaved(deps: StoreDeps): PlayerState | null {
  const saved = deps.storage.getItem(SAVE_KEY);
  if (saved === null) return null;
  try {
    return deserializeState(saved);
  } catch {
    // Sauvegarde illisible : on fait comme s'il n'y en avait pas.
    return null;
  }
}

function worthTelling(summary: AbsenceSummary): boolean {
  const gained = summary.gained.sugar >= MICRO || summary.gained.bricks >= MICRO;
  return summary.elapsedMs >= ABSENCE_MIN_MS && (gained || summary.constructionsDone.length > 0);
}

export function createStore(deps: StoreDeps): GameStore {
  const { remote } = deps;
  const saved = loadSaved(deps);
  const firstNow = deps.clock();
  let state = saved ?? createPlayer(deps.newSeed(), firstNow, firstNow);
  let ready = remote === undefined || saved !== null;
  let lastSave = 0;
  let started = false;
  let absence: AbsenceSummary | null = null;
  /** Écart entre l'horloge du serveur et celle de l'appareil. */
  let clockOffset = 0;
  let tapBuffer = 0;
  let tapTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let stopped = false;
  const queue: { readonly id: string; readonly order: Order }[] = [];
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(events: readonly GameEvent[]) => void>();

  /** L'horloge de l'appareil peut reculer ; le jeu, jamais. */
  const now = (): number => Math.max(deps.clock() + clockOffset, state.now);

  const save = (): void => {
    // Tant que le serveur n'a pas répondu, la cellule affichée n'est pas celle du joueur.
    if (!ready) return;
    deps.storage.setItem(SAVE_KEY, serializeState(state));
    lastSave = state.now;
  };

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const commit = (next: PlayerState, events: readonly GameEvent[], forceSave: boolean): void => {
    state = next;
    if (forceSave || state.now - lastSave >= SAVE_EVERY_MS) save();
    notify();
    if (events.length > 0) for (const listener of eventListeners) listener(events);
  };

  /** Le serveur fait foi : son état remplace la prévision, sauf si des ordres attendent encore. */
  const adopt = (server: PlayerState): void => {
    clockOffset = server.now - deps.clock();
    if (queue.length > 0 || tapBuffer > 0) return;
    state = advance(server, Math.max(deps.clock() + clockOffset, server.now)).state;
    ready = true;
    save();
    notify();
  };

  const newId = (): string => (deps.newId ?? (() => crypto.randomUUID()))();

  const pump = (): void => {
    const head = queue[0];
    if (remote === undefined || inFlight || stopped || head === undefined) return;
    inFlight = true;
    remote.sendOrder(head.id, head.order).then(
      (reply) => {
        inFlight = false;
        queue.shift();
        adopt(reply.state);
        pump();
      },
      () => {
        inFlight = false;
        retryTimer = setTimeout(pump, RETRY_MS);
      },
    );
  };

  const flushTaps = (): void => {
    if (tapTimer !== null) clearTimeout(tapTimer);
    tapTimer = null;
    while (tapBuffer > 0) {
      const taps = Math.min(tapBuffer, MAX_TAPS_PER_ORDER);
      tapBuffer -= taps;
      queue.push({ id: newId(), order: { type: "harvest", taps } });
    }
    pump();
  };

  const forward = (order: Order): void => {
    if (order.type === "harvest") {
      tapBuffer += order.taps;
      tapTimer ??= setTimeout(flushTaps, TAP_FLUSH_MS);
      return;
    }
    flushTaps();
    queue.push({ id: newId(), order });
    pump();
  };

  const sync = (): void => {
    if (remote === undefined || stopped) return;
    remote.fetchState().then(
      (reply) => {
        if (absence === null && worthTelling(reply.absence)) absence = reply.absence;
        adopt(reply.state);
        notify();
      },
      () => {
        retryTimer = setTimeout(sync, RETRY_MS);
      },
    );
  };

  return {
    getState: () => state,
    getAbsence: () => absence,
    isReady: () => ready,
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
      if (result.ok) {
        commit(result.state, result.events, true);
        if (remote !== undefined) forward(order);
      }
      return result;
    },
    start() {
      stopped = false;
      const tick = (): void => {
        const before = state;
        const step = advance(state, now());
        if (!started) {
          started = true;
          // Avec un serveur, c'est lui qui raconte l'absence.
          if (remote === undefined) {
            const summary = summarizeAbsence(before, step.state, step.events);
            if (worthTelling(summary)) absence = summary;
          }
        }
        commit(step.state, step.events, step.events.length > 0);
      };
      tick();
      sync();
      const timer = setInterval(tick, TICK_MS);
      return () => {
        clearInterval(timer);
        if (remote !== undefined) flushTaps();
        stopped = true;
        if (tapTimer !== null) clearTimeout(tapTimer);
        if (retryTimer !== null) clearTimeout(retryTimer);
        save();
      };
    },
  };
}
