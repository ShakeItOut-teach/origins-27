/**
 * Le cœur du serveur : recevoir un ordre, avancer le temps, appliquer la règle, enregistrer.
 * Aucune règle de jeu ici, tout passe par `core`. Aucun accès direct à la base non plus :
 * la base est derrière `Repository`, ce qui permet de tester sans Supabase.
 */
import {
  advance,
  applyOrder,
  createPlayer,
  deserializeState,
  serializeState,
  summarizeAbsence,
} from "@o27/core";
import type { AbsenceSummary, GameEvent, OrderErrorCode, PlayerState } from "@o27/core";
import { OrderRequestSchema } from "@o27/data";

/** Ce qu'un ordre a donné. Enregistré tel quel : le rejouer renvoie la même chose. */
export type Outcome =
  | { readonly ok: true; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: OrderErrorCode };

export interface StoredPlayer {
  /** État sérialisé par `core`. */
  readonly state: string;
  /** Numéro de version : augmente de 1 à chaque écriture. */
  readonly version: number;
}

export interface Commit {
  readonly playerId: string;
  /** Version lue avant le calcul ; 0 pour un joueur qui n'existe pas encore. */
  readonly expectedVersion: number;
  readonly state: string;
  readonly order: { readonly id: string; readonly outcome: Outcome } | null;
}

export interface Repository {
  readonly load: (playerId: string) => Promise<StoredPlayer | null>;
  readonly findOutcome: (playerId: string, orderId: string) => Promise<Outcome | null>;
  /**
   * Écrit l'état et l'ordre d'un seul coup. Renvoie `false`, sans rien écrire, si la
   * version a changé entre-temps (un autre ordre du même joueur est passé avant).
   */
  readonly commit: (change: Commit) => Promise<boolean>;
}

export interface ServerDeps {
  readonly repo: Repository;
  /** L'heure du serveur. Celle du client n'est jamais lue. */
  readonly clock: () => number;
  readonly newSeed: () => number;
  /** Début de la saison en cours, en millisecondes. */
  readonly seasonStart: number;
}

export type OrderReply =
  | { readonly status: "done"; readonly outcome: Outcome; readonly state: PlayerState }
  /** La demande n'a pas la forme attendue. */
  | { readonly status: "invalid" }
  /** La saison n'a pas commencé. */
  | { readonly status: "closed" }
  /** Trop d'ordres en même temps pour ce joueur : le client réessaie. */
  | { readonly status: "busy" };

export type StateReply =
  | {
      readonly status: "done";
      readonly state: PlayerState;
      readonly absence: AbsenceSummary;
      readonly created: boolean;
    }
  | { readonly status: "closed" }
  | { readonly status: "busy" };

const MAX_ATTEMPTS = 4;

interface Loaded {
  readonly state: PlayerState;
  readonly version: number;
}

async function loadOrCreate(deps: ServerDeps, playerId: string, now: number): Promise<Loaded> {
  const stored = await deps.repo.load(playerId);
  if (stored !== null) return { state: deserializeState(stored.state), version: stored.version };
  return { state: createPlayer(deps.newSeed(), deps.seasonStart, now), version: 0 };
}

/** Applique un ordre pour un joueur déjà identifié. `body` vient du client : rien n'y est sûr. */
export async function handleOrder(
  deps: ServerDeps,
  playerId: string,
  body: unknown,
): Promise<OrderReply> {
  const parsed = OrderRequestSchema.safeParse(body);
  if (!parsed.success) return { status: "invalid" };
  const { orderId, order } = parsed.data;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const clock = deps.clock();
    if (clock < deps.seasonStart) return { status: "closed" };
    const loaded = await loadOrCreate(deps, playerId, clock);

    const already = await deps.repo.findOutcome(playerId, orderId);
    if (already !== null) return { status: "done", outcome: already, state: loaded.state };

    // L'horloge du serveur peut reculer d'un rien ; le jeu, jamais.
    const now = Math.max(clock, loaded.state.now);
    const step = advance(loaded.state, now);
    const result = applyOrder(step.state, order, now);
    const state = result.ok ? result.state : step.state;
    const outcome: Outcome = result.ok
      ? { ok: true, events: [...step.events, ...result.events] }
      : { ok: false, error: result.error };

    const written = await deps.repo.commit({
      playerId,
      expectedVersion: loaded.version,
      state: serializeState(state),
      order: { id: orderId, outcome },
    });
    if (written) return { status: "done", outcome, state };
  }
  return { status: "busy" };
}

/** Renvoie l'état à jour. Crée le joueur à sa première visite. */
export async function handleState(deps: ServerDeps, playerId: string): Promise<StateReply> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const clock = deps.clock();
    if (clock < deps.seasonStart) return { status: "closed" };
    const loaded = await loadOrCreate(deps, playerId, clock);
    const now = Math.max(clock, loaded.state.now);
    const step = advance(loaded.state, now);

    const written = await deps.repo.commit({
      playerId,
      expectedVersion: loaded.version,
      state: serializeState(step.state),
      order: null,
    });
    if (written) {
      return {
        status: "done",
        state: step.state,
        absence: summarizeAbsence(loaded.state, step.state, step.events),
        created: loaded.version === 0,
      };
    }
  }
  return { status: "busy" };
}
