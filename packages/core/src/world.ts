/**
 * La goutte : où vit chaque joueur, quels lieux l'entourent, ce qu'une expédition coûte.
 * Rien n'est stocké : tout se calcule à partir de la graine du monde et de la place du joueur.
 * Entiers uniquement (ni cosinus ni racine), pour un résultat identique sur tous les appareils.
 */
import { BALANCE, PLACE_RESOURCE, PREY_KINDS } from "@o27/data";
import type { PlaceKind, PreyKind, ResourceId } from "@o27/data";
import { createRng } from "./rng";
import { MICRO } from "./types";
import type { PlayerState } from "./types";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Place {
  /** Sa case dans le monde : « colonne:ligne ». La même pour tous les joueurs. */
  readonly id: string;
  readonly kind: PlaceKind;
  /** Position par rapport à la cellule du joueur. */
  readonly x: number;
  readonly y: number;
  /** 0 = proche, 1 = moyen, 2 = loin. */
  readonly band: number;
}

export interface Offer {
  readonly resource: ResourceId;
  /** Butin, en millionièmes d'unité. */
  readonly loot: number;
  readonly energy: number;
  /** Durée de l'aller-retour. */
  readonly durationMs: number;
  /** Temps que met ensuite le lieu à se regarnir pour ce joueur. */
  readonly restMs: number;
}

/** La n-ième place d'une spirale carrée : 0 au centre, puis en tournant vers l'extérieur. */
function spiral(slot: number): Point {
  if (slot <= 0) return { x: 0, y: 0 };
  let ring = 1;
  while ((2 * ring + 1) * (2 * ring + 1) <= slot) ring += 1;
  const side = 2 * ring;
  const along = slot - (2 * ring - 1) * (2 * ring - 1);
  const step = along % side;
  switch (Math.floor(along / side)) {
    case 0:
      return { x: ring, y: -ring + 1 + step };
    case 1:
      return { x: ring - 1 - step, y: ring };
    case 2:
      return { x: -ring, y: ring - 1 - step };
    default:
      return { x: -ring + 1 + step, y: -ring };
  }
}

/** La case d'un joueur dans la spirale : colonne et ligne, 0:0 au centre. */
export function slotCell(slot: number): Point {
  return spiral(slot);
}

/** L'inverse : le numéro de place de la case donnée. */
export function cellSlot(column: number, row: number): number {
  const ring = Math.max(Math.abs(column), Math.abs(row));
  if (ring === 0) return 0;
  const first = (2 * ring - 1) * (2 * ring - 1);
  const side = 2 * ring;
  if (column === ring && row > -ring) return first + row + ring - 1;
  if (row === ring) return first + side + ring - 1 - column;
  if (column === -ring) return first + 2 * side + ring - 1 - row;
  return first + 3 * side + column + ring - 1;
}

/** Position d'un joueur dans la goutte, d'après son numéro de place. */
export function slotPosition(slot: number): Point {
  const cell = spiral(slot);
  const spacing = BALANCE.world.playerSpacing;
  return { x: cell.x * spacing, y: cell.y * spacing };
}

interface RawPlace {
  readonly id: string;
  readonly kind: PlaceKind;
  readonly x: number;
  readonly y: number;
  readonly distance2: number;
}

/** Le lieu d'une case du monde, s'il y en a un. Ne dépend que de la graine et de la case. */
function placeInCell(worldSeed: number, column: number, row: number): RawPlace | null {
  const world = BALANCE.world;
  const rng = createRng(
    (worldSeed ^ Math.imul(column, 0x9e3779b1) ^ Math.imul(row, 0x85ebca6b)) >>> 0,
  );
  // Quelques tirages à vide : deux cases voisines donnent ainsi des suites bien différentes.
  rng.next();
  rng.next();
  if (rng.int(100) >= world.placeChancePercent) return null;
  const margin = Math.floor(world.placeCell / 8);
  const x = column * world.placeCell + margin + rng.int(world.placeCell - 2 * margin);
  const y = row * world.placeCell + margin + rng.int(world.placeCell - 2 * margin);
  const kind: PlaceKind = rng.int(100) < world.sugarChancePercent ? "sugarCluster" : "debris";
  return { id: `${String(column)}:${String(row)}`, kind, x, y, distance2: 0 };
}

let lastKey = "";
let lastPlaces: readonly Place[] = [];

/**
 * Les lieux qu'un joueur voit autour de lui, du plus proche au plus loin.
 * Deux garanties pour une première session sans impasse : le plus proche donne des briques
 * (ce qui manque le plus à ce stade), et il y a toujours au moins un amas de sucre.
 */
export function visiblePlaces(worldSeed: number, slot: number): readonly Place[] {
  const key = `${String(worldSeed)}/${String(slot)}`;
  if (key === lastKey) return lastPlaces;

  const world = BALANCE.world;
  const home = slotPosition(slot);
  const homeColumn = Math.floor(home.x / world.placeCell);
  const homeRow = Math.floor(home.y / world.placeCell);
  const found: RawPlace[] = [];
  for (
    let column = homeColumn - world.searchCells;
    column <= homeColumn + world.searchCells;
    column++
  ) {
    for (let row = homeRow - world.searchCells; row <= homeRow + world.searchCells; row++) {
      const place = placeInCell(worldSeed, column, row);
      if (place === null) continue;
      const dx = place.x - home.x;
      const dy = place.y - home.y;
      const distance2 = dx * dx + dy * dy;
      if (distance2 < world.minDistance * world.minDistance) continue;
      found.push({ ...place, x: dx, y: dy, distance2 });
    }
  }
  found.sort((a, b) => a.distance2 - b.distance2 || (a.id < b.id ? -1 : 1));

  const perBand = BALANCE.expedition.placesPerBand;
  const kept = found.slice(0, perBand * BALANCE.expedition.bands.length);
  const hasSugar = kept.some((place, index) => index > 0 && place.kind === "sugarCluster");
  const places = kept.map((place, index): Place => {
    let kind = place.kind;
    if (index === 0) kind = "debris";
    else if (!hasSugar && index === Math.min(perBand, kept.length - 1)) kind = "sugarCluster";
    return { id: place.id, kind, x: place.x, y: place.y, band: Math.floor(index / perBand) };
  });

  lastKey = key;
  lastPlaces = places;
  return places;
}

/** Ce qu'une expédition vers ce lieu rapporte et coûte. */
export function placeOffer(place: Place): Offer {
  const band = BALANCE.expedition.bands[place.band];
  if (band === undefined) throw new RangeError("placeOffer : bande inconnue");
  const resource = PLACE_RESOURCE[place.kind];
  return {
    resource,
    loot: (resource === "bricks" ? band.bricks : band.sugar) * MICRO,
    energy: band.energy,
    durationMs: band.seconds * 1000,
    restMs: band.restSeconds * 1000,
  };
}

export interface Energy {
  readonly energy: number;
  /** Instant à partir duquel le prochain point se regagne. */
  readonly energyAt: number;
}

/** L'énergie à l'instant `now` : un point regagné à intervalle fixe, jusqu'au maximum. */
export function energyAt(state: PlayerState, now: number): Energy {
  const { max, regenSeconds } = BALANCE.energy;
  const regenMs = regenSeconds * 1000;
  if (state.energy >= max) return { energy: state.energy, energyAt: now };
  const gained = Math.floor(Math.max(0, now - state.energyAt) / regenMs);
  if (state.energy + gained >= max) return { energy: max, energyAt: now };
  return { energy: state.energy + gained, energyAt: state.energyAt + gained * regenMs };
}

/** Durée du retour si on annule maintenant : le chemin déjà parcouru, en accéléré. */
export function cancelReturnMs(startedAt: number, returnsAt: number, now: number): number {
  const fromHome = Math.max(0, Math.min(now - startedAt, returnsAt - now));
  return Math.ceil(fromHome / BALANCE.expedition.cancelSpeedup);
}

export interface Prey {
  /** Sa case dans le monde, précédée de « h: ». */
  readonly id: string;
  readonly kind: PreyKind;
  readonly x: number;
  readonly y: number;
  /** 0 = proche, 1 = moyenne, 2 = lointaine. */
  readonly band: number;
}

export interface PreyOffer {
  readonly power: number;
  /** Protéines en cas de victoire, en millionièmes d'unité. */
  readonly proteins: number;
  readonly energy: number;
  /** Aller, combat et retour. */
  readonly durationMs: number;
  readonly restMs: number;
}

let lastPreyKey = "";
let lastPrey: readonly Prey[] = [];

/**
 * Les proies qu'un joueur voit : trois, une par distance, et une de chaque sorte, pour que
 * les trois types de cellules filles aient tous leur utilité.
 */
export function visiblePrey(worldSeed: number, slot: number): readonly Prey[] {
  const key = `${String(worldSeed)}/${String(slot)}`;
  if (key === lastPreyKey) return lastPrey;

  const world = BALANCE.world;
  const home = slotPosition(slot);
  const homeColumn = Math.floor(home.x / world.placeCell);
  const homeRow = Math.floor(home.y / world.placeCell);
  const found: { id: string; x: number; y: number; distance2: number }[] = [];
  for (
    let column = homeColumn - world.searchCells;
    column <= homeColumn + world.searchCells;
    column++
  ) {
    for (let row = homeRow - world.searchCells; row <= homeRow + world.searchCells; row++) {
      // Une autre graine que pour les lieux : les proies ne sont pas rangées aux mêmes endroits.
      const rng = createRng(
        (worldSeed ^ 0x5bd1e995 ^ Math.imul(column, 0xc2b2ae35) ^ Math.imul(row, 0x27d4eb2f)) >>> 0,
      );
      rng.next();
      rng.next();
      if (rng.int(100) >= world.placeChancePercent) continue;
      const margin = Math.floor(world.placeCell / 8);
      const dx = column * world.placeCell + margin + rng.int(world.placeCell - 2 * margin) - home.x;
      const dy = row * world.placeCell + margin + rng.int(world.placeCell - 2 * margin) - home.y;
      const distance2 = dx * dx + dy * dy;
      if (distance2 < world.minDistance * world.minDistance) continue;
      found.push({ id: `h:${String(column)}:${String(row)}`, x: dx, y: dy, distance2 });
    }
  }
  found.sort((a, b) => a.distance2 - b.distance2 || (a.id < b.id ? -1 : 1));

  // On espace les trois proies retenues : la plus proche, une du milieu, une du fond.
  const picks = [0, Math.floor(found.length / 3), Math.floor((2 * found.length) / 3)];
  const first = createRng((worldSeed ^ Math.imul(slot + 1, 0x165667b1)) >>> 0).int(
    PREY_KINDS.length,
  );
  const prey: Prey[] = [];
  picks.forEach((index, band) => {
    const spot = found[index];
    const kind = PREY_KINDS[(first + band) % PREY_KINDS.length];
    if (spot === undefined || kind === undefined || prey.some((entry) => entry.id === spot.id))
      return;
    prey.push({ id: spot.id, kind, x: spot.x, y: spot.y, band });
  });

  lastPreyKey = key;
  lastPrey = prey;
  return prey;
}

/** Ce qu'une chasse contre cette proie demande et rapporte. */
export function preyOffer(prey: Prey): PreyOffer {
  const band = BALANCE.hunt.bands[prey.band];
  if (band === undefined) throw new RangeError("preyOffer : bande inconnue");
  return {
    power: band.power,
    proteins: band.proteins * MICRO,
    energy: band.energy,
    durationMs: (band.seconds + BALANCE.hunt.strikeWindowSeconds) * 1000,
    restMs: band.restSeconds * 1000,
  };
}
