/** Naissance d'un joueur, apparence de sa créature, résumé d'absence, sauvegarde. */
import {
  BALANCE,
  COUNTER_IDS,
  MUTATION_IDS,
  ORGANELLE_IDS,
  PLACE_KINDS,
  PREY_KINDS,
  QUEST_IDS,
  RESOURCE_IDS,
  TROOP_IDS,
} from "@o27/data";
import type { CounterId, MutationId, OrganelleId, ResourceId, TraitId } from "@o27/data";
import { createRng } from "./rng";
import type {
  Construction,
  DailyQuests,
  Expedition,
  GameEvent,
  Hunt,
  PlayerState,
  Raid,
  Training,
} from "./types";

function fill<K extends string>(keys: readonly K[], value: number): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, value])) as Record<K, number>;
}

/** Où un joueur vit dans la goutte. Sans serveur, chacun est seul au centre de son monde. */
export interface WorldPlace {
  readonly worldSeed: number;
  readonly slot: number;
}

/** Crée un joueur au palier 0 : une cellule, rien d'autre. */
export function createPlayer(
  seed: number,
  seasonStart: number,
  now: number,
  world?: WorldPlace,
): PlayerState {
  if (now < seasonStart) throw new RangeError("createPlayer : la saison n'a pas commencé");
  return {
    version: 5,
    quests: null,
    raid: null,
    spiedUntil: {},
    shieldUntil: 0,
    nextRaidAt: null,
    awayReadyAt: 0,
    worldSeed: (world?.worldSeed ?? seed) >>> 0,
    slot: world?.slot ?? 0,
    energy: BALANCE.energy.max,
    energyAt: now,
    expedition: null,
    placeReadyAt: {},
    troops: fill(TROOP_IDS, 0),
    training: null,
    hunt: null,
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
  /** Nombre d'expéditions revenues avec leur butin. */
  readonly expeditionsBack: number;
  /** Attaques de rivaux pendant l'absence : repoussées, et subies. */
  readonly attacksRepelled: number;
  readonly attacksSuffered: number;
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
      proteins: Math.max(0, after.resources.proteins - before.resources.proteins),
    },
    constructionsDone: events.flatMap((event) =>
      event.type === "constructionDone" ? [{ organelle: event.organelle, level: event.level }] : [],
    ),
    tiersReached: events.flatMap((event) => (event.type === "tierReached" ? [event.tier] : [])),
    attacksRepelled: events.filter((event) => event.type === "attackRepelled").length,
    attacksSuffered: events.filter((event) => event.type === "attackSuffered").length,
    expeditionsBack: events.filter(
      (event) => event.type === "expeditionReturned" && !event.cancelled,
    ).length,
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
    worldSeed: state.worldSeed,
    slot: state.slot,
    energy: state.energy,
    energyAt: state.energyAt,
    expedition:
      state.expedition === null
        ? null
        : {
            place: state.expedition.place,
            kind: state.expedition.kind,
            loot: state.expedition.loot,
            energy: state.expedition.energy,
            restMs: state.expedition.restMs,
            startedAt: state.expedition.startedAt,
            returnsAt: state.expedition.returnsAt,
            cancelled: state.expedition.cancelled,
          },
    placeReadyAt: Object.fromEntries(
      Object.keys(state.placeReadyAt)
        .sort()
        .map((id) => [id, state.placeReadyAt[id]]),
    ),
    quests:
      state.quests === null
        ? null
        : {
            day: state.quests.day,
            items: state.quests.items.map((quest) => ({
              id: quest.id,
              target: quest.target,
              progress: quest.progress,
              challenge: quest.challenge,
              claimed: quest.claimed,
            })),
          },
    raid:
      state.raid === null
        ? null
        : {
            rival: state.raid.rival,
            kind: state.raid.kind,
            power: state.raid.power,
            sugar: state.raid.sugar,
            bricks: state.raid.bricks,
            proteins: state.raid.proteins,
            energy: state.raid.energy,
            restMs: state.raid.restMs,
            party: pick(TROOP_IDS, state.raid.party),
            startedAt: state.raid.startedAt,
            arrivesAt: state.raid.arrivesAt,
            resolveAt: state.raid.resolveAt,
            returnsAt: state.raid.returnsAt,
            outcome:
              state.raid.outcome === null
                ? null
                : {
                    won: state.raid.outcome.won,
                    struck: state.raid.outcome.struck,
                    losses: pick(TROOP_IDS, state.raid.outcome.losses),
                  },
            cancelled: state.raid.cancelled,
          },
    spiedUntil: Object.fromEntries(
      Object.keys(state.spiedUntil)
        .sort()
        .map((id) => [id, state.spiedUntil[id]]),
    ),
    shieldUntil: state.shieldUntil,
    nextRaidAt: state.nextRaidAt,
    awayReadyAt: state.awayReadyAt,
    troops: pick(TROOP_IDS, state.troops),
    training:
      state.training === null
        ? null
        : {
            troop: state.training.troop,
            remaining: state.training.remaining,
            nextAt: state.training.nextAt,
          },
    hunt:
      state.hunt === null
        ? null
        : {
            prey: state.hunt.prey,
            kind: state.hunt.kind,
            power: state.hunt.power,
            proteins: state.hunt.proteins,
            energy: state.hunt.energy,
            restMs: state.hunt.restMs,
            party: pick(TROOP_IDS, state.hunt.party),
            startedAt: state.hunt.startedAt,
            arrivesAt: state.hunt.arrivesAt,
            resolveAt: state.hunt.resolveAt,
            returnsAt: state.hunt.returnsAt,
            outcome:
              state.hunt.outcome === null
                ? null
                : {
                    won: state.hunt.outcome.won,
                    struck: state.hunt.outcome.struck,
                    losses: pick(TROOP_IDS, state.hunt.outcome.losses),
                  },
            cancelled: state.hunt.cancelled,
          },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** `added` : clés apparues depuis, absentes des anciennes sauvegardes, qui valent alors 0. */
function readCounts<K extends string>(
  keys: readonly K[],
  value: unknown,
  added: readonly K[] = [],
): Record<K, number> {
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide");
  const result = fill(keys, 0);
  for (const key of keys) {
    const entry = value[key];
    if (entry === undefined && added.includes(key)) continue;
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

const PLACE_ID = /^(h:|r:)?-?\d{1,6}:-?\d{1,6}$/;

function readExpedition(value: unknown): Expedition | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : expédition");
  const kind = PLACE_KINDS.find((id) => id === value.kind);
  const { place, loot, energy, restMs, startedAt, returnsAt, cancelled } = value;
  if (
    kind === undefined ||
    typeof place !== "string" ||
    !PLACE_ID.test(place) ||
    !isCount(loot) ||
    !isCount(energy) ||
    !isCount(restMs) ||
    !isCount(startedAt) ||
    !isCount(returnsAt) ||
    typeof cancelled !== "boolean"
  ) {
    throw new TypeError("sauvegarde invalide : expédition");
  }
  return { place, kind, loot, energy, restMs, startedAt, returnsAt, cancelled };
}

function readPlaceTimes(value: unknown): Record<string, number> {
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : lieux");
  const result: Record<string, number> = {};
  for (const [id, readyAt] of Object.entries(value)) {
    if (!PLACE_ID.test(id) || !isCount(readyAt)) throw new TypeError("sauvegarde invalide : lieux");
    result[id] = readyAt;
  }
  return result;
}

function readTraining(value: unknown): Training | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : naissances");
  const troop = TROOP_IDS.find((id) => id === value.troop);
  const { remaining, nextAt } = value;
  if (troop === undefined || !isCount(remaining) || remaining < 1 || !isCount(nextAt)) {
    throw new TypeError("sauvegarde invalide : naissances");
  }
  return { troop, remaining, nextAt };
}

function readHunt(value: unknown): Hunt | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : chasse");
  const kind = PREY_KINDS.find((id) => id === value.kind);
  const { prey, power, proteins, energy, restMs, startedAt, arrivesAt, resolveAt, returnsAt } =
    value;
  const { cancelled, outcome } = value;
  if (
    kind === undefined ||
    typeof prey !== "string" ||
    !PLACE_ID.test(prey) ||
    !isCount(power) ||
    !isCount(proteins) ||
    !isCount(energy) ||
    !isCount(restMs) ||
    !isCount(startedAt) ||
    !isCount(arrivesAt) ||
    !isCount(resolveAt) ||
    !isCount(returnsAt) ||
    typeof cancelled !== "boolean"
  ) {
    throw new TypeError("sauvegarde invalide : chasse");
  }
  let result: Hunt["outcome"] = null;
  if (outcome !== null) {
    if (
      !isRecord(outcome) ||
      typeof outcome.won !== "boolean" ||
      typeof outcome.struck !== "boolean"
    ) {
      throw new TypeError("sauvegarde invalide : issue de la chasse");
    }
    result = {
      won: outcome.won,
      struck: outcome.struck,
      losses: readCounts(TROOP_IDS, outcome.losses),
    };
  }
  return {
    prey,
    kind,
    power,
    proteins,
    energy,
    restMs,
    party: readCounts(TROOP_IDS, value.party),
    startedAt,
    arrivesAt,
    resolveAt,
    returnsAt,
    outcome: result,
    cancelled,
  };
}

function readRaid(value: unknown): Raid | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : attaque");
  const kind = PREY_KINDS.find((id) => id === value.kind);
  const { rival, power, sugar, bricks, proteins, energy, restMs } = value;
  const { startedAt, arrivesAt, resolveAt, returnsAt, cancelled, outcome } = value;
  if (
    kind === undefined ||
    typeof rival !== "string" ||
    !PLACE_ID.test(rival) ||
    !isCount(power) ||
    !isCount(sugar) ||
    !isCount(bricks) ||
    !isCount(proteins) ||
    !isCount(energy) ||
    !isCount(restMs) ||
    !isCount(startedAt) ||
    !isCount(arrivesAt) ||
    !isCount(resolveAt) ||
    !isCount(returnsAt) ||
    typeof cancelled !== "boolean"
  ) {
    throw new TypeError("sauvegarde invalide : attaque");
  }
  let result: Raid["outcome"] = null;
  if (outcome !== null) {
    if (
      !isRecord(outcome) ||
      typeof outcome.won !== "boolean" ||
      typeof outcome.struck !== "boolean"
    ) {
      throw new TypeError("sauvegarde invalide : issue de l'attaque");
    }
    result = {
      won: outcome.won,
      struck: outcome.struck,
      losses: readCounts(TROOP_IDS, outcome.losses),
    };
  }
  return {
    rival,
    kind,
    power,
    sugar,
    bricks,
    proteins,
    energy,
    restMs,
    party: readCounts(TROOP_IDS, value.party),
    startedAt,
    arrivesAt,
    resolveAt,
    returnsAt,
    outcome: result,
    cancelled,
  };
}

function readQuests(value: unknown): DailyQuests | null {
  if (value === null) return null;
  if (!isRecord(value) || !isCount(value.day) || !Array.isArray(value.items)) {
    throw new TypeError("sauvegarde invalide : quêtes");
  }
  const items = value.items.map((entry: unknown) => {
    if (!isRecord(entry)) throw new TypeError("sauvegarde invalide : quête");
    const id = QUEST_IDS.find((known) => known === entry.id);
    const { target, progress, challenge, claimed } = entry;
    if (
      id === undefined ||
      !isCount(target) ||
      target < 1 ||
      !isCount(progress) ||
      progress > target ||
      typeof challenge !== "boolean" ||
      typeof claimed !== "boolean"
    ) {
      throw new TypeError("sauvegarde invalide : quête");
    }
    return { id, target, progress, challenge, claimed };
  });
  return { day: value.day, items };
}

/** Vrai pour une sauvegarde d'avant la carte : il faudra lui donner une place dans la goutte. */
export function needsWorldPlace(text: string): boolean {
  const raw: unknown = JSON.parse(text);
  return isRecord(raw) && raw.version === 1;
}

/**
 * Relit une sauvegarde. Refuse tout ce qui n'a pas exactement la forme attendue.
 * Une sauvegarde d'avant la carte (version 1) est convertie sans rien perdre : elle reçoit
 * une énergie pleine et la place `world` (ou, sans serveur, le centre de son propre monde).
 */
export function deserializeState(text: string, world?: WorldPlace): PlayerState {
  const raw: unknown = JSON.parse(text);
  const version = raw !== null && isRecord(raw) ? raw.version : undefined;
  if (!isRecord(raw) || typeof version !== "number" || ![1, 2, 3, 4, 5].includes(version)) {
    throw new TypeError("sauvegarde invalide : version");
  }
  const old = version === 1;
  /** Sauvegarde d'avant la chasse : ni protéines, ni Pouponnière, ni cellules filles. */
  const beforeHunt = version < 3;
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
  const { worldSeed, slot, energy, energyAt } = raw;
  if (!old && (!isCount(worldSeed) || !isCount(slot) || !isCount(energy) || !isCount(energyAt))) {
    throw new TypeError("sauvegarde invalide : carte");
  }
  return {
    version: 5,
    // Avant les rivaux : ni attaque en cours, ni espionnage, ni protection.
    raid: version < 5 ? null : readRaid(raw.raid),
    spiedUntil: version < 5 ? {} : readPlaceTimes(raw.spiedUntil),
    shieldUntil: version < 5 || !isCount(raw.shieldUntil) ? 0 : raw.shieldUntil,
    nextRaidAt: version < 5 || !isCount(raw.nextRaidAt) ? null : raw.nextRaidAt,
    // Une sauvegarde d'avant le mode absent ne l'a jamais utilisé.
    awayReadyAt: isCount(raw.awayReadyAt) ? raw.awayReadyAt : 0,
    // Avant les quêtes : le joueur en recevra dès que le temps avancera.
    quests: version < 4 ? null : readQuests(raw.quests),
    troops: beforeHunt ? fill(TROOP_IDS, 0) : readCounts(TROOP_IDS, raw.troops),
    training: beforeHunt ? null : readTraining(raw.training),
    hunt: beforeHunt ? null : readHunt(raw.hunt),
    worldSeed: old ? (world?.worldSeed ?? seed) >>> 0 : (worldSeed as number),
    slot: old ? (world?.slot ?? 0) : (slot as number),
    energy: old ? BALANCE.energy.max : Math.min(BALANCE.energy.max, energy as number),
    energyAt: old ? now : (energyAt as number),
    expedition: old ? null : readExpedition(raw.expedition),
    placeReadyAt: old ? {} : readPlaceTimes(raw.placeReadyAt),
    seed,
    rngState,
    seasonStart,
    now,
    resources: readCounts<ResourceId>(RESOURCE_IDS, raw.resources, beforeHunt ? ["proteins"] : []),
    organelles: readCounts<OrganelleId>(
      ORGANELLE_IDS,
      raw.organelles,
      beforeHunt ? ["nursery", "wall"] : version < 5 ? ["wall"] : [],
    ),
    construction: readConstruction(raw.construction),
    mutations: readMutations(raw.mutations),
    mutationOffer: raw.mutationOffer === null ? null : readMutations(raw.mutationOffer),
    counters: readCounts<CounterId>(COUNTER_IDS, raw.counters),
    tier,
    tapBudgetAt,
  };
}
