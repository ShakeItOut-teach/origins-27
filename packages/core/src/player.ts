/** Naissance d'un joueur, apparence de sa créature, résumé d'absence, sauvegarde. */
import { BALANCE, COUNTER_IDS, MUTATION_IDS, ORGANELLE_IDS, RESOURCE_IDS } from "@o27/data";
import type { CounterId, MutationId, OrganelleId, ResourceId, TraitId } from "@o27/data";
import { createRng } from "./rng";
import type { Construction, GameEvent, PlayerState } from "./types";

function fill<K extends string>(keys: readonly K[], value: number): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, value])) as Record<K, number>;
}

/** Crée un joueur au palier 0 : une cellule, rien d'autre. */
export function createPlayer(seed: number, seasonStart: number, now: number): PlayerState {
  if (now < seasonStart) throw new RangeError("createPlayer : la saison n'a pas commencé");
  return {
    version: 1,
    seed: seed >>> 0,
    rngState: seed >>> 0,
    seasonStart,
    now,
    resources: fill(RESOURCE_IDS, 0),
    organelles: fill(ORGANELLE_IDS, 0),
    construction: null,
    mutations: [],
    mutationOffer: null,
    counters: fill(COUNTER_IDS, 0),
    tier: 0,
    tapBudgetAt: now - BALANCE.tap.burst * BALANCE.tap.minIntervalMs,
  };
}

export interface Creature {
  /** Teinte propre à ce joueur, de 0 à 359. */
  readonly hue: number;
  /** Nombre de taches de pigment, propre à ce joueur. */
  readonly pigmentSpots: number;
  /** Traits visibles, dans l'ordre où les mutations ont été choisies. */
  readonly traits: readonly TraitId[];
  /** Taille : somme des niveaux d'organites. */
  readonly size: number;
}

/** Ce que l'interface doit dessiner. Deux joueurs n'ont jamais tout à fait la même créature. */
export function describeCreature(state: PlayerState): Creature {
  const rng = createRng(state.seed);
  return {
    hue: rng.int(360),
    pigmentSpots: 2 + rng.int(5),
    traits: state.mutations.map((id) => BALANCE.mutations[id].trait),
    size: ORGANELLE_IDS.reduce((sum, id) => sum + state.organelles[id], 0),
  };
}

export interface AbsenceSummary {
  readonly elapsedMs: number;
  readonly gained: Readonly<Record<ResourceId, number>>;
  readonly constructionsDone: readonly {
    readonly organelle: OrganelleId;
    readonly level: number;
  }[];
  readonly tiersReached: readonly number[];
}

/** Ce qui s'est passé entre deux états, pour l'écran « pendant votre absence ». */
export function summarizeAbsence(
  before: PlayerState,
  after: PlayerState,
  events: readonly GameEvent[],
): AbsenceSummary {
  return {
    elapsedMs: after.now - before.now,
    gained: {
      sugar: Math.max(0, after.resources.sugar - before.resources.sugar),
      bricks: Math.max(0, after.resources.bricks - before.resources.bricks),
    },
    constructionsDone: events.flatMap((event) =>
      event.type === "constructionDone" ? [{ organelle: event.organelle, level: event.level }] : [],
    ),
    tiersReached: events.flatMap((event) => (event.type === "tierReached" ? [event.tier] : [])),
  };
}

/** Texte de sauvegarde, toujours dans le même ordre : deux états égaux donnent le même texte. */
export function serializeState(state: PlayerState): string {
  const pick = <K extends string>(keys: readonly K[], from: Readonly<Record<K, number>>) =>
    Object.fromEntries(keys.map((key) => [key, from[key]]));
  return JSON.stringify({
    version: state.version,
    seed: state.seed,
    rngState: state.rngState,
    seasonStart: state.seasonStart,
    now: state.now,
    resources: pick(RESOURCE_IDS, state.resources),
    organelles: pick(ORGANELLE_IDS, state.organelles),
    construction:
      state.construction === null
        ? null
        : {
            organelle: state.construction.organelle,
            toLevel: state.construction.toLevel,
            endsAt: state.construction.endsAt,
          },
    mutations: state.mutations,
    mutationOffer: state.mutationOffer,
    counters: pick(COUNTER_IDS, state.counters),
    tier: state.tier,
    tapBudgetAt: state.tapBudgetAt,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function readCounts<K extends string>(keys: readonly K[], value: unknown): Record<K, number> {
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide");
  const result = fill(keys, 0);
  for (const key of keys) {
    const entry = value[key];
    if (!isCount(entry)) throw new TypeError(`sauvegarde invalide : ${key}`);
    result[key] = entry;
  }
  return result;
}

function readMutations(value: unknown): MutationId[] {
  if (!Array.isArray(value)) throw new TypeError("sauvegarde invalide : mutations");
  return value.map((entry: unknown) => {
    const found = MUTATION_IDS.find((id) => id === entry);
    if (found === undefined) throw new TypeError("sauvegarde invalide : mutation inconnue");
    return found;
  });
}

function readConstruction(value: unknown): Construction | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : chantier");
  const organelle = ORGANELLE_IDS.find((id) => id === value.organelle);
  const { toLevel, endsAt } = value;
  if (organelle === undefined || !isCount(toLevel) || !isCount(endsAt)) {
    throw new TypeError("sauvegarde invalide : chantier");
  }
  return { organelle, toLevel, endsAt };
}

/** Relit une sauvegarde. Refuse tout ce qui n'a pas exactement la forme attendue. */
export function deserializeState(text: string): PlayerState {
  const raw: unknown = JSON.parse(text);
  if (!isRecord(raw) || raw.version !== 1) throw new TypeError("sauvegarde invalide : version");
  const { seed, rngState, seasonStart, now, tier, tapBudgetAt } = raw;
  if (
    !isCount(seed) ||
    !isCount(rngState) ||
    !isCount(seasonStart) ||
    !isCount(now) ||
    !isCount(tier) ||
    typeof tapBudgetAt !== "number" ||
    !Number.isSafeInteger(tapBudgetAt)
  ) {
    throw new TypeError("sauvegarde invalide : nombres");
  }
  return {
    version: 1,
    seed,
    rngState,
    seasonStart,
    now,
    resources: readCounts<ResourceId>(RESOURCE_IDS, raw.resources),
    organelles: readCounts<OrganelleId>(ORGANELLE_IDS, raw.organelles),
    construction: readConstruction(raw.construction),
    mutations: readMutations(raw.mutations),
    mutationOffer: raw.mutationOffer === null ? null : readMutations(raw.mutationOffer),
    counters: readCounts<CounterId>(COUNTER_IDS, raw.counters),
    tier,
    tapBudgetAt,
  };
}
