/**
 * Les événements de zone : éruption, efflorescence, Léviathan, zone anoxique.
 * L'océan est découpé en grands quartiers. À chaque cycle, chaque quartier a une chance de
 * voir naître un événement, qui dure un jour ou deux. Comme pour les gisements, rien n'est
 * stocké : tout se calcule à partir de la graine du monde et de l'heure, et tous les joueurs
 * voient les mêmes événements.
 */
import { BALANCE, ZONE_EVENT_KINDS } from "@o27/data";
import type { PlaceKind, ZoneEventKind } from "@o27/data";
import { ZONE_COUNT, depositLoad, oceanRadius, playerCell, zoneAt } from "./ocean";
import type { Deposit } from "./ocean";
import { createRng } from "./rng";
import { DAY_MS } from "./types";
import type { PlayerState } from "./types";
import type { Point } from "./world";

const DATA = BALANCE.events;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const EPOCH_MS = DATA.epochHours * HOUR_MS;
const TOTAL_WEIGHT = ZONE_EVENT_KINDS.reduce((sum, kind) => sum + DATA[kind].weight, 0);
const LONGEST_HOURS = Math.max(...ZONE_EVENT_KINDS.map((kind) => DATA[kind].hours));
/** Nombre de cycles passés dont un événement peut encore durer. */
const SPAN = Math.ceil(LONGEST_HOURS / DATA.epochHours);
const WIDEST = Math.max(...ZONE_EVENT_KINDS.map((kind) => DATA[kind].radius));

export interface ZoneEvent {
  /** Son quartier et son cycle : « e:colonne:ligne:cycle ». Le même pour tous les joueurs. */
  readonly id: string;
  readonly kind: ZoneEventKind;
  /** Son centre. */
  readonly x: number;
  readonly y: number;
  readonly zone: number;
  /** Jusqu'où il se fait sentir, en cases. */
  readonly radius: number;
  readonly startsAt: number;
  readonly endsAt: number;
  /** Un tirage propre à l'événement (0 à 999), pour ce qui doit varier de l'un à l'autre. */
  readonly roll: number;
}

const EVENT_ID = /^e:(-?\d{1,4}):(-?\d{1,4}):(\d{1,9})$/;
const EVENT_DEPOSIT_ID = /^v:(-?\d{1,4}):(-?\d{1,4}):(\d{1,9}):(\d)$/;

interface District {
  /** Décalage du cycle : les événements ne naissent pas tous à la même heure. */
  readonly phase: number;
  readonly salt: number;
}

const districts = new Map<string, District>();

function districtOf(worldSeed: number, column: number, row: number): District {
  const key = `${String(worldSeed)}/${String(column)}/${String(row)}`;
  const known = districts.get(key);
  if (known !== undefined) return known;
  const base = createRng(
    (worldSeed ^ 0x5bd1e995 ^ Math.imul(column, 0x9e3779b1) ^ Math.imul(row, 0x85ebca6b)) >>> 0,
  );
  base.next();
  base.next();
  const made = {
    phase: base.int(EPOCH_MS / MINUTE_MS) * MINUTE_MS,
    salt: base.int(0x7fffffff),
  };
  if (districts.size > 4000) districts.clear();
  districts.set(key, made);
  return made;
}

const drawn = new Map<string, ZoneEvent | null>();

/** L'événement d'un quartier pour un cycle donné, qu'il soit passé, en cours ou à venir. */
function epochEvent(
  worldSeed: number,
  column: number,
  row: number,
  epoch: number,
): ZoneEvent | null {
  const key = `${String(worldSeed)}/${String(column)}/${String(row)}/${String(epoch)}`;
  const known = drawn.get(key);
  if (known !== undefined) return known;
  if (drawn.size > 20_000) drawn.clear();
  const { phase, salt } = districtOf(worldSeed, column, row);
  const rng = createRng((salt ^ Math.imul(epoch + 1, 0xc2b2ae35)) >>> 0);
  rng.next();
  rng.next();
  let found: ZoneEvent | null = null;
  if (rng.int(100) < DATA.chancePercent) {
    const x = column * DATA.district + rng.int(DATA.district);
    const y = row * DATA.district + rng.int(DATA.district);
    const zone = zoneAt(x, y);
    let pick = rng.int(TOTAL_WEIGHT);
    let kind: ZoneEventKind = "eruption";
    for (const candidate of ZONE_EVENT_KINDS) {
      kind = candidate;
      if (pick < DATA[candidate].weight) break;
      pick -= DATA[candidate].weight;
    }
    const roll = rng.int(1000);
    if (zone >= 0 && zone < ZONE_COUNT) {
      const startsAt = epoch * EPOCH_MS - phase;
      found = {
        id: `e:${String(column)}:${String(row)}:${String(epoch)}`,
        kind,
        x,
        y,
        zone,
        radius: DATA[kind].radius,
        startsAt,
        endsAt: startsAt + DATA[kind].hours * HOUR_MS,
        roll,
      };
    }
  }
  drawn.set(key, found);
  return found;
}

/** Le cycle en cours d'un quartier à cet instant. */
function epochAt(worldSeed: number, column: number, row: number, at: number): number {
  return Math.floor((at + districtOf(worldSeed, column, row).phase) / EPOCH_MS);
}

let listKey = "";
let list: readonly ZoneEvent[] = [];

/** Tous les événements en cours dans l'océan à cet instant (la liste est refaite chaque minute). */
export function oceanEvents(worldSeed: number, at: number): readonly ZoneEvent[] {
  const minute = Math.floor(at / MINUTE_MS);
  const key = `${String(worldSeed)}/${String(minute)}`;
  if (key === listKey) return list;
  const now = minute * MINUTE_MS;
  const span = Math.ceil(oceanRadius() / DATA.district);
  const found: ZoneEvent[] = [];
  for (let column = -span; column < span; column++) {
    for (let row = -span; row < span; row++) {
      const epoch = epochAt(worldSeed, column, row, now);
      for (let back = 0; back <= SPAN; back++) {
        const event = epochEvent(worldSeed, column, row, epoch - back);
        if (event !== null && event.startsAt <= now && now < event.endsAt) found.push(event);
      }
    }
  }
  listKey = key;
  list = found;
  return found;
}

/** Retrouve un événement par son identifiant ; `null` s'il n'existe pas ou n'est pas en cours. */
export function findEvent(worldSeed: number, id: string, at: number): ZoneEvent | null {
  const match = EVENT_ID.exec(id);
  if (match === null) return null;
  const event = epochEvent(worldSeed, Number(match[1]), Number(match[2]), Number(match[3]));
  return event !== null && event.startsAt <= at && at < event.endsAt ? event : null;
}

/** Vrai si la case est dans le rayon de l'événement. */
export function eventCovers(event: ZoneEvent, point: Point): boolean {
  const dx = point.x - event.x;
  const dy = point.y - event.y;
  return dx * dx + dy * dy <= event.radius * event.radius;
}

/** Autour d'une cheminée : cinq gisements en couronne. */
const VENT_RING: readonly (readonly [number, number])[] = [
  [3, 0],
  [1, 3],
  [-2, 2],
  [-2, -2],
  [1, -3],
  [0, 1],
  [0, -1],
  [2, 2],
  [-3, 0],
];
const VENT_KINDS: readonly PlaceKind[] = ["carcass", "debris", "sugarCluster", "carcass", "debris"];
/** Dans une efflorescence : six gisements éparpillés. */
const BLOOM_RING: readonly (readonly [number, number])[] = [
  [4, 0],
  [2, 4],
  [-2, 4],
  [-4, 0],
  [-2, -4],
  [2, -4],
  [0, 2],
  [0, -2],
  [6, 2],
];
const BLOOM_KINDS: readonly PlaceKind[] = ["sugarCluster", "debris"];

/**
 * Les gisements nés d'un événement. Ceux d'une éruption sont bien plus riches que les autres
 * et se vident comme eux ; ceux d'une efflorescence ne se vident pas tant qu'elle dure.
 */
export function eventDeposits(event: ZoneEvent): readonly Deposit[] {
  if (event.kind !== "eruption" && event.kind !== "bloom") return [];
  const eruption = event.kind === "eruption";
  const ring = eruption ? VENT_RING : BLOOM_RING;
  const kinds = eruption ? VENT_KINDS : BLOOM_KINDS;
  const count = eruption ? DATA.eruption.deposits : DATA.bloom.deposits;
  const percent = eruption ? DATA.eruption.loadPercent : 100;
  const found: Deposit[] = [];
  for (let index = 0; index < count; index++) {
    const offset = ring[index % ring.length];
    const kind = kinds[index % kinds.length];
    if (offset === undefined || kind === undefined) continue;
    const x = event.x + offset[0];
    const y = event.y + offset[1];
    const zone = zoneAt(x, y);
    if (zone < 0 || zone >= ZONE_COUNT) continue;
    const load = Math.floor((depositLoad(kind, zone) * percent) / 100);
    found.push({
      id: `v${event.id.slice(1)}:${String(index)}`,
      kind,
      x,
      y,
      zone,
      load,
      total: BALANCE.ocean.deposit.loads * load,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      steady: !eruption,
    });
  }
  return found;
}

/** Retrouve un gisement d'événement par son identifiant ; `null` si l'événement est fini. */
export function findEventDeposit(worldSeed: number, id: string, at: number): Deposit | null {
  const match = EVENT_DEPOSIT_ID.exec(id);
  if (match === null) return null;
  const event = findEvent(
    worldSeed,
    `e:${String(match[1])}:${String(match[2])}:${String(match[3])}`,
    at,
  );
  if (event === null) return null;
  return eventDeposits(event).find((deposit) => deposit.id === id) ?? null;
}

/** Supplément de récolte à cet endroit, en pourcentage : une efflorescence nourrit toute sa zone. */
export function bloomPercent(worldSeed: number, point: Point, at: number): number {
  for (const event of oceanEvents(worldSeed, at)) {
    if (event.kind === "bloom" && eventCovers(event, point)) return DATA.bloom.gatherPercent;
  }
  return 0;
}

/** Vrai si cette case manque d'oxygène à cet instant. */
export function anoxiaAt(worldSeed: number, point: Point, at: number): boolean {
  for (const event of oceanEvents(worldSeed, at)) {
    if (event.kind === "anoxia" && eventCovers(event, point)) return true;
  }
  return false;
}

const troubles = new Map<string, readonly ZoneEvent[]>();

/**
 * Tous les événements qui touchent une case pendant une saison, passés et à venir : ceux qui
 * changent quelque chose pour qui y vit (zone anoxique, Léviathan). La liste est courte ; on
 * la calcule une fois par case.
 */
export function cellTroubles(
  worldSeed: number,
  cell: Point,
  seasonStart: number,
): readonly ZoneEvent[] {
  const key = [worldSeed, cell.x, cell.y, seasonStart].join("/");
  const known = troubles.get(key);
  if (known !== undefined) return known;
  const from = seasonStart - LONGEST_HOURS * HOUR_MS;
  const to = seasonStart + 29 * DAY_MS;
  const found: ZoneEvent[] = [];
  const low = (value: number): number => Math.floor((value - WIDEST) / DATA.district);
  const high = (value: number): number => Math.floor((value + WIDEST) / DATA.district);
  for (let column = low(cell.x); column <= high(cell.x); column++) {
    for (let row = low(cell.y); row <= high(cell.y); row++) {
      const first = epochAt(worldSeed, column, row, from);
      const last = epochAt(worldSeed, column, row, to);
      for (let epoch = first; epoch <= last; epoch++) {
        const event = epochEvent(worldSeed, column, row, epoch);
        if (event === null || (event.kind !== "anoxia" && event.kind !== "leviathan")) continue;
        if (eventCovers(event, cell)) found.push(event);
      }
    }
  }
  found.sort((one, other) => one.startsAt - other.startsAt || (one.id < other.id ? -1 : 1));
  if (troubles.size > 4000) troubles.clear();
  troubles.set(key, found);
  return found;
}

/** Les événements qui pèsent ou pèseront sur la cellule du joueur ; aucun avant le palier des événements. */
export function playerTroubles(state: PlayerState): readonly ZoneEvent[] {
  if (state.tier < DATA.tier) return [];
  return cellTroubles(state.worldSeed, playerCell(state), state.seasonStart);
}

/** La zone anoxique où se trouve la cellule du joueur à l'instant de son état, s'il y en a une. */
export function playerAnoxia(state: PlayerState): ZoneEvent | null {
  for (const event of playerTroubles(state)) {
    if (event.kind === "anoxia" && event.startsAt <= state.now && state.now < event.endsAt) {
      return event;
    }
  }
  return null;
}

/**
 * Prochain instant où la production du joueur change à cause d'une zone anoxique : elle
 * arrive sur sa cellule, ou elle se dissipe. Jamais, s'il n'y en a plus d'ici la fin.
 */
export function anoxiaEdge(state: PlayerState): number {
  let next = Number.POSITIVE_INFINITY;
  for (const event of playerTroubles(state)) {
    if (event.kind !== "anoxia") continue;
    if (event.startsAt > state.now) next = Math.min(next, event.startsAt);
    else if (event.endsAt > state.now) next = Math.min(next, event.endsAt);
  }
  return next;
}

/** Les événements que le joueur voit : ceux en cours, du plus proche au plus lointain. */
export function visibleEvents(state: PlayerState): readonly ZoneEvent[] {
  if (state.tier < DATA.tier) return [];
  const home = playerCell(state);
  const distance = (event: ZoneEvent): number =>
    (event.x - home.x) * (event.x - home.x) + (event.y - home.y) * (event.y - home.y);
  return [...oceanEvents(state.worldSeed, state.now)].sort(
    (one, other) => distance(one) - distance(other) || (one.id < other.id ? -1 : 1),
  );
}
