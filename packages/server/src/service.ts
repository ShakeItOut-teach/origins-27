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
  needsWorldPlace,
  serializeState,
  summarizeAbsence,
  withCrowd,
} from "@o27/core";
import type { AbsenceSummary, Crowd, GameEvent, OrderErrorCode, PlayerState } from "@o27/core";
import { OrderRequestSchema } from "@o27/data";
import { afterCommit, contextFor, settleDue } from "./war";
import type { WarRepository } from "./war";

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
  /** Donne la prochaine place libre dans la goutte de la saison. Jamais deux fois la même. */
  readonly nextSlot: () => Promise<number>;
}

export interface ServerDeps {
  readonly repo: Repository;
  /** L'heure du serveur. Celle du client n'est jamais lue. */
  readonly clock: () => number;
  readonly newSeed: () => number;
  /** Début de la saison en cours, en millisecondes. */
  readonly seasonStart: number;
  /** Graine de la goutte : la même pour tous les joueurs de la saison. */
  readonly worldSeed: number;
  /**
   * Les vitrines des humains de la saison (monde partagé). Sans elle, l'océan n'a que des
   * organismes simulés.
   */
  readonly crowd?: () => Promise<Crowd>;
  /** La file des combats entre humains. Sans elle, on n'attaque ni n'espionne un humain. */
  readonly war?: WarRepository;
  /** Où écrire une panne qui ne doit pas arrêter le jeu (le journal du serveur). */
  readonly log?: (error: unknown) => void;
}

export type OrderReply =
  | {
      readonly status: "done";
      readonly outcome: Outcome;
      readonly state: PlayerState;
      /** Ordre déjà traité : on renvoie le premier résultat, sans rien refaire ni renoter. */
      readonly replayed?: true;
    }
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
  const loaded = await loadOrCreateAlone(deps, playerId, now);
  if (deps.crowd === undefined) return loaded;
  // Le moteur calcule avec les autres humains : classements, concours, océan.
  return { ...loaded, state: withCrowd(loaded.state, await deps.crowd()) };
}

async function loadOrCreateAlone(deps: ServerDeps, playerId: string, now: number): Promise<Loaded> {
  const stored = await deps.repo.load(playerId);
  if (stored !== null) {
    // Une partie d'avant la carte reçoit sa place dans la goutte à sa première relecture.
    const world = needsWorldPlace(stored.state)
      ? { worldSeed: deps.worldSeed, slot: await deps.repo.nextSlot() }
      : undefined;
    return { state: deserializeState(stored.state, world), version: stored.version };
  }
  const world = { worldSeed: deps.worldSeed, slot: await deps.repo.nextSlot() };
  return { state: createPlayer(deps.newSeed(), deps.seasonStart, now, world), version: 0 };
}

/**
 * Les combats entre humains arrivés à leur heure, joués avant de lire la partie. Une panne de
 * la file n'empêche jamais de jouer : on l'écrit dans le journal du serveur, et on continue.
 */
async function settleFirst(deps: ServerDeps, playerId: string): Promise<void> {
  try {
    await settleDue(deps.repo, deps.war, playerId, deps.clock(), deps.crowd);
  } catch (error) {
    deps.log?.(error);
  }
}

async function follow(
  deps: ServerDeps,
  playerId: string,
  state: PlayerState,
  events: readonly GameEvent[],
  targetId: string | null,
): Promise<void> {
  try {
    await afterCommit(deps.war, playerId, state, events, targetId);
  } catch (error) {
    deps.log?.(error);
  }
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
  await settleFirst(deps, playerId);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const clock = deps.clock();
    if (clock < deps.seasonStart) return { status: "closed" };
    const loaded = await loadOrCreate(deps, playerId, clock);

    const already = await deps.repo.findOutcome(playerId, orderId);
    if (already !== null) {
      return { status: "done", outcome: already, state: loaded.state, replayed: true };
    }

    // L'horloge du serveur peut reculer d'un rien ; le jeu, jamais.
    const now = Math.max(clock, loaded.state.now);
    const step = advance(loaded.state, now);
    // Contre un autre humain : sa vraie partie, ou l'attaque visée, lues par le serveur.
    const aimed = await contextFor(deps.repo, deps.war, step.state, order);
    const result = applyOrder(step.state, order, now, aimed.context);
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
    if (written) {
      await follow(deps, playerId, state, result.ok ? result.events : [], aimed.targetId);
      return { status: "done", outcome, state };
    }
  }
  return { status: "busy" };
}

/** Renvoie l'état à jour. Crée le joueur à sa première visite. */
export async function handleState(deps: ServerDeps, playerId: string): Promise<StateReply> {
  await settleFirst(deps, playerId);
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
      await follow(deps, playerId, step.state, [], null);
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
