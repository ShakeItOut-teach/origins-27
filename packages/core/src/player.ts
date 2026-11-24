/** Naissance d'un joueur, apparence de sa créature, résumé d'absence, sauvegarde. */
import {
  ALLIANCE_TECH_IDS,
  BANNER_IDS,
  BALANCE,
  COUNTER_IDS,
  MUTATION_IDS,
  ORGANELLE_IDS,
  PLACE_KINDS,
  PREY_KINDS,
  QUEST_IDS,
  REPORT_KINDS,
  REWARD_CHEST_KINDS,
  EVOLUTION_IDS,
  GENE_FAMILIES,
  RESOURCE_IDS,
  TROOP_IDS,
} from "@o27/data";
import type { CounterId, MutationId, OrganelleId, ResourceId, TraitId, TroopId } from "@o27/data";
import { createRng } from "./rng";
import type {
  Alliance,
  DailyRecord,
  Report,
  RewardChest,
  Companion,
  Research,
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
    version: 11,
    alliance: null,
    daily: { day: 0, wins: 0, losses: 0 },
    boosts: 0,
    reports: [],
    chests: [],
    companion: null,
    taming: null,
    evolutions: fill(EVOLUTION_IDS, 0),
    research: null,
    zone: 0,
    taken: {},
    quests: null,
    raid: null,
    spiedUntil: {},
    shieldUntil: 0,
    nextRaidAt: null,
    awayReadyAt: 0,
    nightStart: null,
    nightOffUntil: 0,
    nightReadyAt: 0,
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
  /** Cellules filles mortes de faim pendant l'absence. */
  readonly troopsStarved: number;
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
    troopsStarved: events.reduce(
      (sum, event) => sum + (event.type === "troopsStarved" ? event.count : 0),
      0,
    ),
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
    alliance:
      state.alliance === null
        ? null
        : {
            banner: state.alliance.banner,
            freeUntil: state.alliance.freeUntil,
            points: state.alliance.points,
            credits: state.alliance.credits,
            day: state.alliance.day,
            donations: state.alliance.donations,
            helped: state.alliance.helped,
            gift: state.alliance.gift,
            tech: pick(ALLIANCE_TECH_IDS, state.alliance.tech),
            recommended: state.alliance.recommended,
            syncedAt: state.alliance.syncedAt,
          },
    daily: { day: state.daily.day, wins: state.daily.wins, losses: state.daily.losses },
    boosts: state.boosts,
    chests: state.chests.map((chest) => ({
      kind: chest.kind,
      at: chest.at,
      level: chest.level,
      sugar: chest.sugar,
      bricks: chest.bricks,
      proteins: chest.proteins,
      energy: chest.energy,
      boosts: chest.boosts,
    })),
    reports: state.reports.map((report) => ({
      at: report.at,
      kind: report.kind,
      won: report.won,
      who: report.who,
      sugar: report.sugar,
      bricks: report.bricks,
      proteins: report.proteins,
      lost: report.lost,
      troops: report.troops,
    })),
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
            helped: state.construction.helped,
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
    companion:
      state.companion === null
        ? null
        : {
            species: state.companion.species,
            genes: pick(GENE_FAMILIES, state.companion.genes),
          },
    taming: state.taming,
    evolutions: pick(EVOLUTION_IDS, state.evolutions),
    research:
      state.research === null
        ? null
        : {
            evolution: state.research.evolution,
            toLevel: state.research.toLevel,
            endsAt: state.research.endsAt,
          },
    zone: state.zone,
    taken: Object.fromEntries(
      Object.keys(state.taken)
        .sort()
        .map((id) => [id, state.taken[id]]),
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
    nightStart: state.nightStart,
    nightOffUntil: state.nightOffUntil,
    nightReadyAt: state.nightReadyAt,
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
/** Les cellules filles de rang 2 : une sauvegarde plus ancienne n'en a simplement aucune. */
const RANK_2: readonly TroopId[] = TROOP_IDS.filter((id) => BALANCE.troops[id].family !== null);

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

function readCompanion(value: unknown): Companion | null {
  if (value === null) return null;
  if (!isRecord(value) || !isCount(value.species)) {
    throw new TypeError("sauvegarde invalide : compagnon");
  }
  return { species: value.species, genes: readCounts(GENE_FAMILIES, value.genes) };
}

function readResearch(value: unknown): Research | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : recherche");
  const evolution = EVOLUTION_IDS.find((id) => id === value.evolution);
  const { toLevel, endsAt } = value;
  if (evolution === undefined || !isCount(toLevel) || toLevel < 1 || !isCount(endsAt)) {
    throw new TypeError("sauvegarde invalide : recherche");
  }
  return { evolution, toLevel, endsAt };
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
  // Une sauvegarde d'avant les alliances : personne n'était encore venu aider.
  return { organelle, toLevel, endsAt, helped: value.helped === true };
}

function readAlliance(value: unknown): Alliance | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("sauvegarde invalide : alliance");
  const banner = BANNER_IDS.find((id) => id === value.banner);
  const recommended = ALLIANCE_TECH_IDS.find((id) => id === value.recommended) ?? null;
  const { freeUntil, points, credits, day, donations, helped, gift, syncedAt } = value;
  if (
    banner === undefined ||
    (value.recommended !== null && recommended === null) ||
    !isCount(freeUntil) ||
    !isCount(points) ||
    !isCount(credits) ||
    !isCount(day) ||
    !isCount(donations) ||
    !isCount(helped) ||
    typeof gift !== "boolean" ||
    !isCount(syncedAt)
  ) {
    throw new TypeError("sauvegarde invalide : alliance");
  }
  return {
    banner,
    freeUntil,
    points,
    credits,
    day,
    donations,
    helped,
    gift,
    tech: readCounts(ALLIANCE_TECH_IDS, value.tech),
    recommended,
    syncedAt,
  };
}

function readDaily(value: unknown): DailyRecord {
  if (!isRecord(value) || !isCount(value.day) || !isCount(value.wins) || !isCount(value.losses)) {
    throw new TypeError("sauvegarde invalide : bilan du jour");
  }
  return { day: value.day, wins: value.wins, losses: value.losses };
}

const PLACE_ID =
  /^((h:|r:)?-?\d{1,6}:-?\d{1,6}|o:\d{1,4}|[dpe]:-?\d{1,4}:-?\d{1,4}:\d{1,9}|v:-?\d{1,4}:-?\d{1,4}:\d{1,9}:\d)$/;

function readChests(value: unknown): RewardChest[] {
  if (!Array.isArray(value)) throw new TypeError("sauvegarde invalide : coffres");
  return value.map((entry: unknown) => {
    if (!isRecord(entry)) throw new TypeError("sauvegarde invalide : coffre");
    const kind = REWARD_CHEST_KINDS.find((id) => id === entry.kind);
    const { at, level, sugar, bricks, proteins, energy, boosts } = entry;
    if (
      kind === undefined ||
      !isCount(at) ||
      !isCount(level) ||
      !isCount(sugar) ||
      !isCount(bricks) ||
      !isCount(proteins) ||
      !isCount(energy) ||
      !isCount(boosts)
    ) {
      throw new TypeError("sauvegarde invalide : coffre");
    }
    return { kind, at, level, sugar, bricks, proteins, energy, boosts };
  });
}

function readReports(value: unknown): Report[] {
  if (!Array.isArray(value)) throw new TypeError("sauvegarde invalide : rapports");
  return value.map((entry: unknown) => {
    if (!isRecord(entry)) throw new TypeError("sauvegarde invalide : rapport");
    const kind = REPORT_KINDS.find((id) => id === entry.kind);
    const { at, won, who, sugar, bricks, proteins, lost, troops } = entry;
    if (
      kind === undefined ||
      !isCount(at) ||
      typeof won !== "boolean" ||
      typeof who !== "string" ||
      (who !== "" && !PLACE_ID.test(who)) ||
      !isCount(sugar) ||
      !isCount(bricks) ||
      !isCount(proteins) ||
      !isCount(lost) ||
      !isCount(troops)
    ) {
      throw new TypeError("sauvegarde invalide : rapport");
    }
    return { at, kind, won, who, sugar, bricks, proteins, lost, troops };
  });
}

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
      losses: readCounts(TROOP_IDS, outcome.losses, RANK_2),
    };
  }
  return {
    prey,
    kind,
    power,
    proteins,
    energy,
    restMs,
    party: readCounts(TROOP_IDS, value.party, RANK_2),
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
      losses: readCounts(TROOP_IDS, outcome.losses, RANK_2),
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
    party: readCounts(TROOP_IDS, value.party, RANK_2),
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
  if (
    !isRecord(raw) ||
    typeof version !== "number" ||
    ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(version)
  ) {
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
    version: 11,
    // Avant les alliances : aucune bannière (le moteur en donnera une le moment venu).
    alliance: version < 11 ? null : readAlliance(raw.alliance),
    daily: version < 11 ? { day: 0, wins: 0, losses: 0 } : readDaily(raw.daily),
    // Avant les accélérateurs et le journal : aucun en réserve, rien de raconté.
    boosts: isCount(raw.boosts) ? raw.boosts : 0,
    reports: raw.reports === undefined ? [] : readReports(raw.reports),
    chests: raw.chests === undefined ? [] : readChests(raw.chests),
    // Avant le compagnon : personne à apprivoiser, personne en route.
    companion: version < 10 ? null : readCompanion(raw.companion),
    taming: version < 10 || !isCount(raw.taming) ? null : raw.taming,
    // Avant les évolutions : rien d'exprimé, et trois organites de moins.
    evolutions: version < 9 ? fill(EVOLUTION_IDS, 0) : readCounts(EVOLUTION_IDS, raw.evolutions),
    research: version < 9 ? null : readResearch(raw.research),
    // Avant l'océan : le joueur est dans les abysses et n'a touché à aucun gisement.
    zone:
      version < 6 || !isCount(raw.zone) ? 0 : Math.min(raw.zone, BALANCE.ocean.zones.length - 1),
    taken: version < 6 ? {} : readPlaceTimes(raw.taken),
    // Avant les rivaux : ni attaque en cours, ni espionnage, ni protection.
    raid: version < 5 ? null : readRaid(raw.raid),
    spiedUntil: version < 5 ? {} : readPlaceTimes(raw.spiedUntil),
    shieldUntil: version < 5 || !isCount(raw.shieldUntil) ? 0 : raw.shieldUntil,
    nextRaidAt: version < 5 || !isCount(raw.nextRaidAt) ? null : raw.nextRaidAt,
    // Une sauvegarde d'avant le mode absent ne l'a jamais utilisé.
    awayReadyAt: isCount(raw.awayReadyAt) ? raw.awayReadyAt : 0,
    nightStart: isCount(raw.nightStart) && raw.nightStart < 1440 ? raw.nightStart : null,
    nightOffUntil: isCount(raw.nightOffUntil) ? raw.nightOffUntil : 0,
    nightReadyAt: isCount(raw.nightReadyAt) ? raw.nightReadyAt : 0,
    // Avant les quêtes : le joueur en recevra dès que le temps avancera.
    quests: version < 4 ? null : readQuests(raw.quests),
    troops: beforeHunt ? fill(TROOP_IDS, 0) : readCounts(TROOP_IDS, raw.troops, RANK_2),
    training: beforeHunt ? null : readTraining(raw.training),
    hunt: beforeHunt ? null : readHunt(raw.hunt),
    worldSeed: old ? (world?.worldSeed ?? seed) >>> 0 : (worldSeed as number),
    slot: old ? (world?.slot ?? 0) : (slot as number),
    // Un cadeau peut faire dépasser la jauge : on relit l'énergie telle qu'elle est.
    energy: old ? BALANCE.energy.max : (energy as number),
    energyAt: old ? now : (energyAt as number),
    expedition: old ? null : readExpedition(raw.expedition),
    placeReadyAt: old ? {} : readPlaceTimes(raw.placeReadyAt),
    seed,
    rngState,
    seasonStart,
    now,
    resources: readCounts<ResourceId>(RESOURCE_IDS, raw.resources, beforeHunt ? ["proteins"] : []),
    organelles: readCounts<OrganelleId>(ORGANELLE_IDS, raw.organelles, [
      ...(beforeHunt ? (["nursery", "wall"] as const) : version < 5 ? (["wall"] as const) : []),
      ...(version < 9 ? (["golgi", "nucleus", "lysosome"] as const) : []),
    ]),
    construction: readConstruction(raw.construction),
    mutations: readMutations(raw.mutations),
    mutationOffer: raw.mutationOffer === null ? null : readMutations(raw.mutationOffer),
    // Avant les classements : rien de pillé ni de repoussé n'avait été compté.
    counters: readCounts<CounterId>(
      COUNTER_IDS,
      raw.counters,
      version < 7 ? ["lootTaken", "attacksRepelled"] : [],
    ),
    tier,
    tapBudgetAt,
  };
}
