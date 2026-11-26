/**
 * L'océan : un disque. On naît au bord, dans les abysses ; la terre ferme est au centre.
 * Entre les deux, des zones de profondeur qui s'ouvrent au fil de la saison : on remonte.
 * Rien n'est stocké : places, gisements et profondeurs se calculent à partir de la graine du
 * monde et de l'heure. Les cases sont des entiers ; 0:0 est le centre du monde.
 */
import { BALANCE } from "@o27/data";
import type { PlaceKind, ResourceId } from "@o27/data";
import { createRng } from "./rng";
import { MICRO } from "./types";
import type { PlayerState } from "./types";
import { seasonDay } from "./unlock";
import type { Point } from "./world";

const OCEAN = BALANCE.ocean;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Nombre de zones d'eau, de la plus profonde (0) à la plus proche de la surface. */
export const ZONE_COUNT = OCEAN.zones.length;

function zoneData(zone: number): (typeof OCEAN.zones)[number] {
  const data = OCEAN.zones[zone];
  if (data === undefined) throw new RangeError("océan : zone inconnue");
  return data;
}

/** Rayon du monde, en cases. */
export function oceanRadius(): number {
  return zoneData(0).outer;
}

/** Rayon intérieur d'une zone : là où commence la suivante, ou la terre ferme. */
export function zoneInner(zone: number): number {
  return OCEAN.zones[zone + 1]?.outer ?? OCEAN.landRadius;
}

/** Zone d'une case : -1 hors du monde, `ZONE_COUNT` sur la terre ferme. */
export function zoneAt(x: number, y: number): number {
  const r2 = x * x + y * y;
  if (r2 > oceanRadius() * oceanRadius()) return -1;
  for (let zone = 0; zone < ZONE_COUNT; zone++) {
    const inner = zoneInner(zone);
    if (r2 > inner * inner) return zone;
  }
  return ZONE_COUNT;
}

/** Profondeur d'une case, en mètres : elle diminue quand on s'approche du centre. */
export function depthAt(x: number, y: number): number {
  const zone = zoneAt(x, y);
  if (zone < 0) return zoneData(0).depth;
  if (zone >= ZONE_COUNT) return 0;
  const { outer, depth } = zoneData(zone);
  const inner = zoneInner(zone);
  const shallow = OCEAN.zones[zone + 1]?.depth ?? OCEAN.shoreDepth;
  const r = Math.sqrt(x * x + y * y);
  return Math.round(shallow + ((r - inner) / (outer - inner)) * (depth - shallow));
}

/** Jour de saison où une zone s'ouvre. */
export function zoneOpenDay(zone: number): number {
  return zoneData(zone).openDay;
}

/** Distance entre deux cases, arrondie à la case. */
export function cellDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

const ringCache = new Map<string, readonly Point[]>();

/**
 * Les places d'une zone : des cases espacées, un peu décalées pour ne pas dessiner un damier,
 * dans un ordre mélangé qui ne dépend que de la graine du monde.
 */
export function ringCells(worldSeed: number, zone: number): readonly Point[] {
  const key = `${String(worldSeed)}/${String(zone)}`;
  const known = ringCache.get(key);
  if (known !== undefined) return known;
  const { outer, pitch } = zoneData(zone);
  const inner = zoneInner(zone);
  const low = (inner + 2) * (inner + 2);
  const high = (outer - 2) * (outer - 2);
  const rng = createRng((worldSeed ^ 0x7f4a7c15 ^ Math.imul(zone + 1, 0x9e3779b1)) >>> 0);
  rng.next();
  rng.next();
  const cells: Point[] = [];
  const span = Math.ceil(outer / pitch);
  for (let i = -span; i <= span; i++) {
    for (let j = -span; j <= span; j++) {
      const x = i * pitch;
      const y = j * pitch;
      const r2 = x * x + y * y;
      if (r2 < low || r2 > high) continue;
      cells.push({ x: x + rng.int(3) - 1, y: y + rng.int(3) - 1 });
    }
  }
  for (let index = cells.length - 1; index > 0; index--) {
    const other = rng.int(index + 1);
    const moved = cells[index];
    const swapped = cells[other];
    if (moved === undefined || swapped === undefined) continue;
    cells[index] = swapped;
    cells[other] = moved;
  }
  ringCache.set(key, cells);
  return cells;
}

let ranksSeed = -1;
let ranks: readonly number[] = [];

/**
 * Le rang d'ambition d'une place : 0 pour l'organisme qui monte le premier. Chaque place a
 * un rang différent ; il sert aussi à lui donner une case dans chaque zone.
 */
export function rankOf(worldSeed: number, slot: number): number {
  const count = BALANCE.world.organisms;
  if (ranksSeed !== worldSeed) {
    const rng = createRng((worldSeed ^ 0x1b873593) >>> 0);
    rng.next();
    rng.next();
    const order = Array.from({ length: count }, (_, index) => index);
    for (let index = count - 1; index > 0; index--) {
      const other = rng.int(index + 1);
      const moved = order[index] ?? 0;
      order[index] = order[other] ?? 0;
      order[other] = moved;
    }
    ranks = order;
    ranksSeed = worldSeed;
  }
  return ranks[((slot % count) + count) % count] ?? 0;
}

/** La case d'une place dans une zone donnée. */
export function cellIn(worldSeed: number, slot: number, zone: number): Point {
  const cells = ringCells(worldSeed, zone);
  const cell = cells[rankOf(worldSeed, slot) % cells.length];
  if (cell === undefined) throw new RangeError("océan : zone sans place");
  return cell;
}

/** Où vit le joueur en ce moment. */
export function playerCell(state: PlayerState): Point {
  return cellIn(state.worldSeed, state.slot, state.zone);
}

/**
 * La zone qu'un organisme simulé a atteinte un jour donné. Les plus ambitieux montent dès le
 * lendemain de l'ouverture, les autres dans les jours qui suivent ; il n'y a pas de place pour
 * tout le monde près de la surface.
 */
export function organismZone(rank: number, day: number): number {
  let zone = 0;
  for (let next = 1; next < ZONE_COUNT; next++) {
    const data = zoneData(next);
    if (rank >= data.entrants) break;
    const arrives =
      data.openDay + 1 + Math.floor((rank * OCEAN.riseSpreadDays) / BALANCE.world.organisms);
    if (day < arrives) break;
    zone = next;
  }
  return zone;
}

export interface OceanOrganism {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly zone: number;
  /** Teinte de sa créature, de 0 à 359. */
  readonly hue: number;
}

/** Teinte d'un organisme : toujours la même pour une place donnée. */
export function organismHue(worldSeed: number, slot: number): number {
  const rng = createRng((worldSeed ^ 0x3c6ef372 ^ Math.imul(slot + 1, 0x85ebca6b)) >>> 0);
  rng.next();
  rng.next();
  return rng.int(360);
}

let organismsKey = "";
let organisms: readonly OceanOrganism[] = [];

/** Tous les organismes de l'océan un jour donné, chacun dans la zone qu'il a atteinte. */
export function oceanOrganisms(worldSeed: number, day: number): readonly OceanOrganism[] {
  const key = `${String(worldSeed)}/${String(day)}`;
  if (key === organismsKey) return organisms;
  const found: OceanOrganism[] = [];
  for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
    const zone = organismZone(rankOf(worldSeed, slot), day);
    const cell = cellIn(worldSeed, slot, zone);
    found.push({ slot, x: cell.x, y: cell.y, zone, hue: organismHue(worldSeed, slot) });
  }
  organismsKey = key;
  organisms = found;
  return found;
}

export interface Deposit {
  /** Son secteur et son cycle : « d:colonne:ligne:cycle ». Le même pour tous les joueurs. */
  readonly id: string;
  readonly kind: PlaceKind;
  readonly x: number;
  readonly y: number;
  readonly zone: number;
  /** Ce qu'une expédition y charge au plus, en millionièmes d'unité. */
  readonly load: number;
  /** Ce qu'il contenait à son apparition, en millionièmes d'unité. */
  readonly total: number;
  readonly startsAt: number;
  /** Instant où les autres organismes auront fini de le vider. */
  readonly endsAt: number;
  /** Né d'une efflorescence : les autres ne le vident pas, il se regarnit sans cesse. */
  readonly steady: boolean;
}

const DEPOSIT_ID = /^d:(-?\d{1,4}):(-?\d{1,4}):(\d{1,9})$/;

/** Le gisement d'un secteur à cet instant, s'il y en a un et qu'il n'est pas vidé. */
function sectorDeposit(worldSeed: number, column: number, row: number, at: number): Deposit | null {
  const data = OCEAN.deposit;
  const epochMs = data.epochHours * HOUR_MS;
  const base = createRng(
    (worldSeed ^ 0x2545f491 ^ Math.imul(column, 0x9e3779b1) ^ Math.imul(row, 0x85ebca6b)) >>> 0,
  );
  base.next();
  base.next();
  // Chaque secteur a son propre décalage : les gisements n'apparaissent pas tous à la fois.
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
  const roll = rng.int(100);
  const kind: PlaceKind =
    roll < data.sugarPercent
      ? "sugarCluster"
      : roll < data.sugarPercent + data.bricksPercent
        ? "debris"
        : "carcass";
  const life = data.minLifePercent + rng.int(101 - data.minLifePercent);
  const startsAt = epoch * epochMs - phase;
  const endsAt = startsAt + Math.floor((epochMs * life) / 100);
  if (at >= endsAt) return null;
  return {
    id: `d:${String(column)}:${String(row)}:${String(epoch)}`,
    kind,
    x,
    y,
    zone,
    load: depositLoad(kind, zone),
    total: data.loads * depositLoad(kind, zone),
    startsAt,
    endsAt,
    steady: false,
  };
}

/** Ce qu'une expédition rapporte au plus d'un gisement : plus on est près de la surface, plus c'est riche. */
export function depositLoad(kind: PlaceKind, zone: number): number {
  return Math.floor((OCEAN.deposit.load[kind] * zoneData(zone).richPercent * MICRO) / 100);
}

let depositsKey = "";
let depositsList: readonly Deposit[] = [];

/** Tous les gisements de l'océan à cet instant (la liste est refaite chaque minute). */
export function oceanDeposits(worldSeed: number, at: number): readonly Deposit[] {
  const minute = Math.floor(at / MINUTE_MS);
  const key = `${String(worldSeed)}/${String(minute)}`;
  if (key === depositsKey) return depositsList;
  const span = Math.ceil(oceanRadius() / OCEAN.deposit.sector);
  const found: Deposit[] = [];
  for (let column = -span; column < span; column++) {
    for (let row = -span; row < span; row++) {
      const deposit = sectorDeposit(worldSeed, column, row, minute * MINUTE_MS);
      if (deposit !== null) found.push(deposit);
    }
  }
  depositsKey = key;
  depositsList = found;
  return found;
}

/** Retrouve un gisement par son identifiant ; `null` s'il n'existe pas ou plus. */
export function findDeposit(worldSeed: number, id: string, at: number): Deposit | null {
  const match = DEPOSIT_ID.exec(id);
  if (match === null) return null;
  const deposit = sectorDeposit(worldSeed, Number(match[1]), Number(match[2]), at);
  return deposit !== null && deposit.id === id ? deposit : null;
}

/**
 * Ce qu'il reste dans un gisement pour ce joueur : les organismes simulés le vident peu à peu,
 * et ce que le joueur et les autres humains (`others`) ont déjà pris n'y est plus.
 */
export function depositLeft(
  deposit: Deposit,
  taken: Readonly<Record<string, number>>,
  at: number,
  others = 0,
): number {
  const mine = (taken[deposit.id] ?? 0) + others;
  if (deposit.steady) return Math.max(0, deposit.total - mine);
  const life = deposit.endsAt - deposit.startsAt;
  const remaining = Math.max(0, Math.min(life, deposit.endsAt - at));
  // En millièmes d'unité pendant le calcul : le produit reste un entier exact.
  const shared = Math.floor((Math.floor(deposit.total / 1000) * remaining) / life) * 1000;
  return Math.max(0, shared - mine);
}

export interface MigrateOffer {
  /** La zone où l'on arriverait. */
  readonly zone: number;
  readonly cost: Readonly<Record<ResourceId, number>>;
  readonly openDay: number;
  /** La zone est-elle déjà ouverte ? */
  readonly open: boolean;
}

/** Ce qu'il faut pour remonter d'une zone ; `null` si le joueur est déjà sous la surface. */
export function migrateOffer(state: PlayerState, at: number): MigrateOffer | null {
  const zone = state.zone + 1;
  const price = OCEAN.migrate[state.zone];
  if (zone >= ZONE_COUNT || price === undefined) return null;
  const openDay = zoneOpenDay(zone);
  return {
    zone,
    cost: {
      sugar: price.sugar * MICRO,
      bricks: price.bricks * MICRO,
      proteins: price.proteins * MICRO,
    },
    openDay,
    open: seasonDay(state, at) >= openDay,
  };
}
