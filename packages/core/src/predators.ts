/**
 * Les prédateurs de l'océan : des animaux à chasser, visibles par tous sur la carte.
 * Comme les gisements, rien n'est stocké : chaque secteur porte au plus un prédateur par
 * cycle, tiré de la graine du monde. Plus on est près de la surface, plus ils sont forts.
 */
import { BALANCE, PREY_KINDS } from "@o27/data";
import type { PreyKind } from "@o27/data";
import { ZONE_COUNT, cellDistance, oceanRadius, playerCell, zoneAt } from "./ocean";
import { createRng } from "./rng";
import { travelMs } from "./stats";
import { MICRO } from "./types";
import type { PlayerState } from "./types";
import type { PreyOffer } from "./world";

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

export interface Predator {
  /** Son secteur et son cycle : « p:colonne:ligne:cycle ». Le même pour tous les joueurs. */
  readonly id: string;
  /** 0 = le plus faible. */
  readonly level: number;
  /** Son tempérament : il fixe quel type de cellule fille compte double contre lui. */
  readonly kind: PreyKind;
  readonly x: number;
  readonly y: number;
  readonly zone: number;
  readonly power: number;
  /** Protéines en cas de victoire, en millionièmes d'unité. */
  readonly proteins: number;
  /** Instant où il s'en va. */
  readonly endsAt: number;
}

const PREDATOR_ID = /^p:(-?\d{1,4}):(-?\d{1,4}):(\d{1,9})$/;

function sectorPredator(
  worldSeed: number,
  column: number,
  row: number,
  at: number,
): Predator | null {
  const data = BALANCE.predators;
  const epochMs = data.epochHours * HOUR_MS;
  const base = createRng(
    (worldSeed ^ 0x6b43a9b5 ^ Math.imul(column, 0x9e3779b1) ^ Math.imul(row, 0x85ebca6b)) >>> 0,
  );
  base.next();
  base.next();
  const phase = base.int(epochMs / MINUTE_MS) * MINUTE_MS;
  const epoch = Math.floor((at + phase) / epochMs);
  const rng = createRng((base.int(0x7fffffff) ^ Math.imul(epoch + 1, 0xc2b2ae35)) >>> 0);
  rng.next();
  rng.next();
  if (rng.int(100) >= data.chancePercent) return null;
  const x = column * data.sector + rng.int(data.sector);
  const y = row * data.sector + rng.int(data.sector);
  const zone = zoneAt(x, y);
  if (zone < 0 || zone >= ZONE_COUNT) return null;
  // Les plus forts sont les plus rares : deux tirages, on garde le plus petit.
  const level = Math.min(rng.int(data.levels.length), rng.int(data.levels.length));
  const stats = data.levels[level];
  const zoneData = BALANCE.ocean.zones[zone];
  if (stats === undefined || zoneData === undefined) return null;
  return {
    id: `p:${String(column)}:${String(row)}:${String(epoch)}`,
    level,
    kind: PREY_KINDS[rng.int(PREY_KINDS.length)] ?? "soft",
    x,
    y,
    zone,
    power: Math.round((stats.power * zoneData.guardPercent) / 100),
    proteins: Math.floor((stats.proteins * zoneData.richPercent * MICRO) / 100),
    endsAt: (epoch + 1) * epochMs - phase,
  };
}

let listKey = "";
let list: readonly Predator[] = [];

/** Tous les prédateurs de l'océan à cet instant (la liste est refaite chaque minute). */
export function oceanPredators(worldSeed: number, at: number): readonly Predator[] {
  const minute = Math.floor(at / MINUTE_MS);
  const key = `${String(worldSeed)}/${String(minute)}`;
  if (key === listKey) return list;
  const span = Math.ceil(oceanRadius() / BALANCE.predators.sector);
  const found: Predator[] = [];
  for (let column = -span; column < span; column++) {
    for (let row = -span; row < span; row++) {
      const predator = sectorPredator(worldSeed, column, row, minute * MINUTE_MS);
      if (predator !== null) found.push(predator);
    }
  }
  listKey = key;
  list = found;
  return found;
}

/** Retrouve un prédateur par son identifiant ; `null` s'il n'existe pas ou plus. */
export function findPredator(worldSeed: number, id: string, at: number): Predator | null {
  const match = PREDATOR_ID.exec(id);
  if (match === null) return null;
  const predator = sectorPredator(worldSeed, Number(match[1]), Number(match[2]), at);
  return predator !== null && predator.id === id ? predator : null;
}

/** Ce qu'une chasse contre ce prédateur demande et rapporte, pour ce joueur, à cet instant. */
export function predatorOffer(state: PlayerState, predator: Predator, at: number): PreyOffer {
  const steps = Math.max(
    1,
    Math.ceil(cellDistance(playerCell(state), predator) / BALANCE.ocean.cellsPerStep),
  );
  return {
    power: predator.power,
    proteins: predator.proteins,
    energy: BALANCE.predators.energy,
    durationMs:
      travelMs(state, BALANCE.rivals.raid.stepSeconds * steps * 1000) +
      BALANCE.hunt.strikeWindowSeconds * 1000,
    // Vaincu, il ne revient pas : un autre apparaîtra ailleurs au cycle suivant.
    restMs: Math.max(0, predator.endsAt - at),
  };
}
