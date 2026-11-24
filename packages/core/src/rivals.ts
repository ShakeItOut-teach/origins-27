/**
 * Les rivaux : les voisins du joueur dans la goutte.
 * Ce sont des organismes simulés. Rien n'est stocké : leur nom, leur tempérament, leur force
 * et leur butin se calculent à partir de la graine du monde, de leur place et du jour de saison.
 */
import { BALANCE, ORGANELLE_IDS, PREY_KINDS, TROOP_IDS } from "@o27/data";
import type { BannerId, PreyKind, TroopId } from "@o27/data";
import { allianceTechLevel, bannerOf } from "./banners";
import { anoxiaAt } from "./events";
import { lossesFor, partyOf, partySize, winChance } from "./hunt";
import { modifierPercent, travelMs } from "./stats";
import { createRng } from "./rng";
import type { Rng } from "./rng";
import { MICRO } from "./types";
import type { GameEvent, PlayerState, Raid, Step } from "./types";
import { seasonDay } from "./unlock";
import { cellDistance, oceanOrganisms, organismHue, playerCell } from "./ocean";
import type { OceanOrganism } from "./ocean";
import { slotCell } from "./world";
import type { Point } from "./world";

const HOUR_MS = 3_600_000;

export interface Rival {
  /** Sa place dans la goutte, précédée de « r: ». La même pour tous les joueurs. */
  readonly id: string;
  readonly name: string;
  /** Teinte de sa créature, de 0 à 359. */
  readonly hue: number;
  /** Son tempérament : il fixe quel type de cellule fille compte double contre lui. */
  readonly kind: PreyKind;
  /** Sa distance, en pas : 1 pour un voisin direct, 2 pour un voisin en diagonale. */
  readonly steps: number;
  /** Voisin en diagonale ou plus lointain. */
  readonly far: boolean;
  /** Sa valeur par rapport à un rival moyen, en pourcentage. */
  readonly temper: number;
  /** Sa zone dans l'océan (0 = les abysses) : plus haut, il est plus riche et mieux gardé. */
  readonly zone: number;
  /** Sa case. */
  readonly x: number;
  readonly y: number;
  /** Sa bannière ; `null` pour un voisin de la goutte, avant l'océan. */
  readonly banner: BannerId | null;
}

export interface RivalStats {
  readonly guard: number;
  readonly attack: number;
  /** Ce qu'il y a à prendre, en unités entières. */
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
}

const NAME_START = ["Vo", "Li", "Ka", "Mu", "Ze", "Ty", "Or", "Ba", "Ni", "Sy", "Ra", "Pe"];
const NAME_MIDDLE = ["ra", "mu", "lo", "xi", "ne", "ta", "vi", "go", "", ""];
const NAME_END = ["x", "le", "s", "ris", "dia", "tor", "lla", "ne", "phe", "nor"];

function cellRng(worldSeed: number, column: number, row: number): Rng {
  const rng = createRng(
    (worldSeed ^ 0x3c6ef372 ^ Math.imul(column, 0x9e3779b1) ^ Math.imul(row, 0x85ebca6b)) >>> 0,
  );
  rng.next();
  rng.next();
  return rng;
}

function rivalAt(worldSeed: number, column: number, row: number, steps: number): Rival {
  const rng = cellRng(worldSeed, column, row);
  const pickFrom = (list: readonly string[]): string => list[rng.int(list.length)] ?? "";
  const { temperMinPercent, temperMaxPercent } = BALANCE.rivals;
  return {
    id: `r:${String(column)}:${String(row)}`,
    name: `${pickFrom(NAME_START)}${pickFrom(NAME_MIDDLE)}${pickFrom(NAME_END)}`,
    hue: rng.int(360),
    kind: PREY_KINDS[rng.int(PREY_KINDS.length)] ?? "soft",
    steps,
    far: steps >= 2,
    temper: temperMinPercent + rng.int(temperMaxPercent - temperMinPercent + 1),
    zone: 0,
    x: column,
    y: row,
    banner: null,
  };
}

const NEIGHBOURS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

/** Les voisins d'un joueur : d'abord les quatre directs, puis ceux en diagonale. */
export function visibleRivals(worldSeed: number, slot: number): readonly Rival[] {
  const home = slotCell(slot);
  return NEIGHBOURS.slice(0, BALANCE.rivals.count).map(([dx, dy]) =>
    rivalAt(worldSeed, home.x + dx, home.y + dy, Math.abs(dx) + Math.abs(dy)),
  );
}

/** Un organisme de l'océan : son nom et son tempérament ne dépendent que de sa place. */
function organismAt(
  worldSeed: number,
  organism: OceanOrganism,
  home: Point,
): Rival & { readonly distance: number } {
  const rng = cellRng(worldSeed, organism.slot, 0x4f1b);
  const pickFrom = (list: readonly string[]): string => list[rng.int(list.length)] ?? "";
  const { temperMinPercent, temperMaxPercent } = BALANCE.rivals;
  const name = `${pickFrom(NAME_START)}${pickFrom(NAME_MIDDLE)}${pickFrom(NAME_END)}`;
  const kind = PREY_KINDS[rng.int(PREY_KINDS.length)] ?? "soft";
  const temper = temperMinPercent + rng.int(temperMaxPercent - temperMinPercent + 1);
  const distance = cellDistance(home, organism);
  const steps = Math.max(1, Math.ceil(distance / BALANCE.ocean.cellsPerStep));
  return {
    id: `o:${String(organism.slot)}`,
    name,
    hue: organism.hue,
    kind,
    steps,
    far: steps >= 2,
    temper,
    zone: organism.zone,
    x: organism.x,
    y: organism.y,
    banner: bannerOf(worldSeed, organism.slot),
    distance,
  };
}

let lastOceanKey = "";
let lastOcean: readonly Rival[] = [];

/**
 * L'océan : tous les organismes que le joueur peut atteindre, du plus proche au plus lointain.
 * Ce sont ceux de sa zone et des zones plus profondes ; plus haut, il faut d'abord remonter.
 */
export function oceanRivals(state: PlayerState): readonly Rival[] {
  const day = seasonDay(state, state.now);
  const key = [state.worldSeed, state.slot, state.zone, day].join("/");
  if (key === lastOceanKey) return lastOcean;
  const home = playerCell(state);
  const found: (Rival & { readonly distance: number })[] = [];
  for (const organism of oceanOrganisms(state.worldSeed, day)) {
    if (organism.slot === state.slot || organism.zone > state.zone) continue;
    // Un organisme simulé cède sa case au joueur qui s'y installe.
    if (organism.x === home.x && organism.y === home.y) continue;
    found.push(organismAt(state.worldSeed, organism, home));
  }
  found.sort((one, other) => one.distance - other.distance || (one.id < other.id ? -1 : 1));
  lastOceanKey = key;
  lastOcean = found;
  return found;
}

/** Ce qui ne change jamais chez un organisme de l'océan : son nom, sa teinte, son tempérament. */
export function organismProfile(
  worldSeed: number,
  slot: number,
): { readonly name: string; readonly hue: number; readonly temper: number } {
  const { name, hue, temper } = organismAt(
    worldSeed,
    { slot, x: 0, y: 0, zone: 0, hue: organismHue(worldSeed, slot) },
    { x: 0, y: 0 },
  );
  return { name, hue, temper };
}

/** Les organismes que le joueur peut espionner et attaquer, selon son palier. */
export function reachableRivals(state: PlayerState): readonly Rival[] {
  return state.tier >= BALANCE.ocean.tier
    ? oceanRivals(state)
    : visibleRivals(state.worldSeed, state.slot);
}

/** Les plus proches voisins : ceux de la liste « Les rivaux », et ceux qui viennent attaquer. */
export function nearRivals(state: PlayerState): readonly Rival[] {
  return reachableRivals(state).slice(0, BALANCE.rivals.count);
}

/** Le nom d'un organisme, d'après son identifiant ; vide s'il est inconnu. */
export function rivalName(state: PlayerState, id: string): string {
  const ocean = /^o:(\d{1,4})$/.exec(id);
  if (ocean !== null) {
    const slot = Number(ocean[1]);
    return organismAt(
      state.worldSeed,
      { slot, x: 0, y: 0, zone: 0, hue: organismHue(state.worldSeed, slot) },
      { x: 0, y: 0 },
    ).name;
  }
  return visibleRivals(state.worldSeed, state.slot).find((rival) => rival.id === id)?.name ?? "";
}

/** Force et butin d'un rival un jour donné : il grandit avec la saison. */
export function rivalStats(rival: Rival, day: number): RivalStats {
  const data = BALANCE.rivals;
  const zone = BALANCE.ocean.zones[rival.zone];
  const grown = (line: { base: number; perDay: number }, percent: number): number =>
    Math.max(
      1,
      Math.round(((line.base + line.perDay * (day - 1)) * rival.temper * percent) / 10_000),
    );
  // Près de la surface, les organismes sont plus riches et mieux gardés.
  const guard = zone?.guardPercent ?? 100;
  const rich = zone?.richPercent ?? 100;
  return {
    guard: grown(data.guard, guard),
    attack: grown(data.attack, guard),
    sugar: grown(data.sugar, rich),
    bricks: grown(data.bricks, rich),
    proteins: grown(data.proteins, rich),
  };
}

/** Un membre de l'alliance du joueur : on ne l'attaque pas, et il n'attaque pas. */
export function isAlly(state: PlayerState, rival: Rival): boolean {
  return state.alliance !== null && rival.banner === state.alliance.banner;
}

/** Un organisme pris dans une zone anoxique : sa garde faiblit tant qu'elle dure. */
export function rivalWeakened(state: PlayerState, rival: Rival, at: number): boolean {
  return (
    state.tier >= BALANCE.events.tier &&
    rival.id.startsWith("o:") &&
    anoxiaAt(state.worldSeed, rival, at)
  );
}

let helpKey = "";
let helpBase = 0;

/**
 * Les renforts : chaque allié assez proche envoie une part de sa garde défendre la cellule du
 * joueur. La technologie « Renforts » de l'alliance les grossit.
 */
export function reinforcements(state: PlayerState, at: number): number {
  const alliance = state.alliance;
  if (alliance === null) return 0;
  const day = seasonDay(state, at);
  const key = [state.worldSeed, state.slot, state.zone, day, alliance.banner].join("/");
  if (key !== helpKey) {
    const rules = BALANCE.alliance.reinforcements;
    const home = playerCell(state);
    let total = 0;
    for (const organism of oceanOrganisms(state.worldSeed, day)) {
      if (organism.slot === state.slot) continue;
      if (bannerOf(state.worldSeed, organism.slot) !== alliance.banner) continue;
      if (cellDistance(home, organism) > rules.cells) continue;
      total += rivalStats(organismAt(state.worldSeed, organism, home), day).guard * rules.percent;
    }
    helpBase = Math.floor(total / 100);
    helpKey = key;
  }
  const boost =
    BALANCE.alliance.techs.reinforcements.percentPerLevel *
    allianceTechLevel(state, "reinforcements");
  return Math.floor((helpBase * (100 + boost)) / 100);
}

export interface RaidOffer extends RivalStats {
  /** Sa garde est affaiblie par une zone anoxique. */
  readonly weakened: boolean;
  readonly energy: number;
  /** Aller, combat et retour. */
  readonly durationMs: number;
  readonly restMs: number;
}

/** Ce qu'une attaque contre ce rival demande et peut rapporter, à cet instant. */
export function raidOffer(state: PlayerState, rival: Rival, at: number): RaidOffer {
  const raid = BALANCE.rivals.raid;
  const full = rivalStats(rival, seasonDay(state, at));
  const weakened = rivalWeakened(state, rival, at);
  const guard = weakened
    ? Math.max(1, Math.floor((full.guard * (100 + BALANCE.events.anoxia.guardPercent)) / 100))
    : full.guard;
  const stats = { ...full, guard };
  return {
    ...stats,
    weakened,
    // On ne peut jamais prendre qu'une part des protéines d'un organisme.
    proteins: Math.floor((stats.proteins * raid.proteinSharePercent) / 100),
    energy: raid.energy,
    durationMs:
      travelMs(state, raid.stepSeconds * rival.steps * 1000) +
      BALANCE.hunt.strikeWindowSeconds * 1000,
    restMs: raid.restHours * HOUR_MS,
  };
}

/** Chances d'une attaque selon que le joueur touche ou non pendant le combat. */
export function raidChance(base: number, struck: boolean): number {
  return struck ? Math.min(99, base + BALANCE.rivals.raid.strikeBonusPercent) : base;
}

/** Défense du joueur : ses cellules à la maison, plus sa Paroi. Jamais nulle. */
export function defensePower(state: PlayerState): number {
  let total = 1;
  // Chaque sorte de cellule fille défend plus ou moins bien.
  for (const id of TROOP_IDS) total += state.troops[id] * BALANCE.troops[id].defense;
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "defense") total += effect.perLevel * state.organelles[id];
  }
  return Math.floor((total * (100 + modifierPercent(state, "defense"))) / 100);
}

/** Le combat de l'attaque en cours a lieu : le joueur vient de toucher, ou la fenêtre est passée. */
export function resolveRaid(state: PlayerState, raid: Raid, at: number, struck: boolean): Step {
  const base = winChance(raid.party, raid.kind, raid.power);
  const rng = createRng(state.rngState);
  const won = rng.int(100) < raidChance(base, struck);
  const losses = lossesFor(raid.party, base, won);
  return {
    state: { ...state, rngState: rng.state, raid: { ...raid, outcome: { won, struck, losses } } },
    events: [{ type: "raidResolved", at, won, struck, losses }],
  };
}

export interface Loot {
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
}

/**
 * Ce qu'un groupe emporte : tout ce qu'il peut porter. Une brique pèse deux sucres. Le sucre
 * et les briques se partagent la charge ; les protéines ne se chargent qu'en dernier, s'il
 * reste de la place.
 */
export function loadLoot(carry: number, available: Loot): Loot {
  const raid = BALANCE.rivals.raid;
  const weight = available.sugar + 2 * available.bricks;
  const share = (amount: number): number =>
    weight <= carry ? amount : Math.floor((amount * carry) / weight);
  const sugar = share(available.sugar);
  const bricks = share(available.bricks);
  const left = Math.max(0, carry - sugar - 2 * bricks);
  return {
    sugar,
    bricks,
    proteins: Math.min(available.proteins, Math.floor(left / raid.proteinWeight)),
  };
}

/** Le groupe d'attaque est rentré : survivantes à la maison, butin dans la réserve. */
export function raidBack(
  state: PlayerState,
  raid: Raid,
  room: Readonly<Record<"sugar" | "bricks" | "proteins", number>>,
): Step {
  const won = raid.outcome?.won === true;
  const losses = raid.outcome?.losses ?? partyOf();
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] += raid.party[id] - losses[id];

  // Chaque survivante porte une charge limitée ; une brique pèse deux sucres.
  let load = 0;
  for (const id of TROOP_IDS) load += (raid.party[id] - losses[id]) * BALANCE.troops[id].carry;
  const carry = Math.floor(
    (load * BALANCE.rivals.raid.carryPerCell * MICRO * (100 + modifierPercent(state, "carry"))) /
      100,
  );
  const taken = won
    ? loadLoot(carry, { sugar: raid.sugar, bricks: raid.bricks, proteins: raid.proteins })
    : { sugar: 0, bricks: 0, proteins: 0 };
  const gained = {
    sugar: Math.min(Math.max(0, room.sugar), taken.sugar),
    bricks: Math.min(Math.max(0, room.bricks), taken.bricks),
    proteins: Math.min(Math.max(0, room.proteins), taken.proteins),
  };
  const lost =
    taken.sugar -
    gained.sugar +
    (taken.bricks - gained.bricks) +
    (taken.proteins - gained.proteins);

  return {
    state: {
      ...state,
      raid: null,
      troops,
      resources: {
        sugar: state.resources.sugar + gained.sugar,
        bricks: state.resources.bricks + gained.bricks,
        proteins: state.resources.proteins + gained.proteins,
      },
      // Un combat mené jusqu'au bout compte, gagné ou perdu.
      counters: raid.cancelled
        ? state.counters
        : {
            ...state.counters,
            rivalFights: state.counters.rivalFights + 1,
            lootTaken:
              state.counters.lootTaken +
              Math.floor((gained.sugar + gained.bricks + gained.proteins) / MICRO),
          },
      placeReadyAt: won
        ? { ...state.placeReadyAt, [raid.rival]: raid.returnsAt + raid.restMs }
        : state.placeReadyAt,
    },
    events: [
      {
        type: "raidReturned",
        at: raid.returnsAt,
        rival: raid.rival,
        won,
        gained,
        lost,
        losses: partySize(losses),
        cancelled: raid.cancelled,
      },
    ],
  };
}

/** Délai avant la prochaine attaque subie, tiré d'après la graine du joueur et l'instant. */
function nextDelay(state: PlayerState, at: number): number {
  const { minHours, maxHours } = BALANCE.rivals.incoming;
  const rng = createRng((state.seed ^ Math.imul(Math.floor(at / 1000), 0x9e3779b1)) >>> 0);
  rng.next();
  const minutes = minHours * 60 + rng.int((maxHours - minHours) * 60 + 1);
  return minutes * 60_000;
}

const DAY = 24 * HOUR_MS;

/**
 * Fin de la nuit protégée en cours, ou 0 si le joueur n'est pas dans sa nuit (pas réglée,
 * pas l'heure, ou rompue parce qu'il a attaqué).
 */
export function nightEnd(state: PlayerState, at: number): number {
  if (state.nightStart === null) return 0;
  const length = BALANCE.rivals.night.hours * HOUR_MS;
  const today = at - (at % DAY) + state.nightStart * 60_000;
  for (const start of [today, today - DAY]) {
    const end = start + length;
    if (at >= start && at < end) return end > state.nightOffUntil ? end : 0;
  }
  return 0;
}

/** Instant jusqu'auquel le joueur est à l'abri : bouclier, mode absent ou nuit. */
export function protectedUntil(state: PlayerState, at: number): number {
  return Math.max(state.shieldUntil, nightEnd(state, at));
}

/**
 * Nouveau joueur : il connaît les rivaux mais personne ne l'a encore attaqué, parce qu'il n'a
 * ni atteint le palier où la protection s'arrête, ni attaqué lui-même.
 */
export function isNewcomer(state: PlayerState): boolean {
  return (
    state.nextRaidAt === null &&
    state.tier >= BALANCE.organelles.wall.tier &&
    state.tier < BALANCE.rivals.incoming.newcomerUntilTier
  );
}

/** Attaquer fait tomber toute protection : les rivaux peuvent revenir plus tôt. */
export function dropShield(state: PlayerState, at: number): PlayerState {
  const night = nightEnd(state, at);
  const newcomer = isNewcomer(state);
  if (state.shieldUntil <= at && night === 0 && !newcomer) return state;
  const soon = at + nextDelay(state, at);
  return {
    ...state,
    shieldUntil: Math.min(state.shieldUntil, at),
    // La nuit en cours est perdue ; les suivantes reviennent.
    nightOffUntil: Math.max(state.nightOffUntil, night),
    // Le nouveau joueur qui attaque entre dans la mêlée : les rivaux viendront.
    nextRaidAt:
      state.nextRaidAt === null ? (newcomer ? soon : null) : Math.min(state.nextRaidAt, soon),
  };
}

/** Régler l'heure de sa nuit. On ne peut pas la déplacer tous les jours pour rester à l'abri. */
export function setNight(state: PlayerState, minute: number, at: number): PlayerState {
  return {
    ...state,
    nightStart: minute,
    nightReadyAt: at + BALANCE.rivals.night.changeHours * HOUR_MS,
  };
}

/** Mode absent : une longue protection. On ne peut la reprendre qu'après un délai. */
export function goAway(state: PlayerState, at: number): PlayerState {
  const away = BALANCE.rivals.away;
  const shieldUntil = at + away.hours * HOUR_MS;
  return {
    ...state,
    shieldUntil,
    // Un nouveau joueur reste un nouveau joueur : rien n'est programmé contre lui.
    nextRaidAt: state.nextRaidAt === null ? null : shieldUntil + nextDelay(state, at),
    awayReadyAt: shieldUntil + away.restHours * HOUR_MS,
  };
}

/** Un bouclier de plus : la protection s'allonge, et l'attaque prévue attend qu'elle tombe. */
export function raiseShield(state: PlayerState, hours: number, at: number): PlayerState {
  const shieldUntil = Math.max(state.shieldUntil, at) + hours * HOUR_MS;
  return {
    ...state,
    shieldUntil,
    nextRaidAt:
      state.nextRaidAt === null
        ? null
        : Math.max(state.nextRaidAt, shieldUntil + nextDelay(state, at)),
  };
}

/** Quand la protection du nouveau joueur s'arrête, la première attaque est programmée. */
export function ensureIncoming(state: PlayerState, at: number): PlayerState {
  if (state.nextRaidAt !== null || state.tier < BALANCE.rivals.incoming.newcomerUntilTier) {
    return state;
  }
  return { ...state, nextRaidAt: Math.max(at, state.shieldUntil) + nextDelay(state, at) };
}

/** Un voisin attaque le joueur. Ses cellules à la maison et sa Paroi le défendent. */
export function resolveIncoming(state: PlayerState, at: number): Step {
  // Personne n'attaque un joueur dans sa nuit : le rival revient après.
  const night = nightEnd(state, at);
  if (night > at)
    return { state: { ...state, nextRaidAt: night + nextDelay(state, at) }, events: [] };
  // Les alliés n'attaquent pas : seuls les autres voisins viennent.
  const rivals = nearRivals(state).filter((rival) => !isAlly(state, rival));
  // Personne autour : on regardera de nouveau plus tard.
  if (rivals.length === 0) {
    return { state: { ...state, nextRaidAt: at + nextDelay(state, at) }, events: [] };
  }
  const rng = createRng(
    (state.seed ^ 0x51ed270b ^ Math.imul(Math.floor(at / 1000), 0x85ebca6b)) >>> 0,
  );
  rng.next();
  const attacker = rivals[rng.int(rivals.length)];
  if (attacker === undefined) return { state: { ...state, nextRaidAt: null }, events: [] };
  const attack = rivalStats(attacker, seasonDay(state, at)).attack;
  const defense = defensePower(state) + reinforcements(state, at);
  const chance = Math.max(5, Math.min(95, Math.round((100 * defense) / (defense + attack))));
  const counters = { ...state.counters, rivalFights: state.counters.rivalFights + 1 };

  if (rng.int(100) < chance) {
    return {
      state: {
        ...state,
        counters: { ...counters, attacksRepelled: counters.attacksRepelled + 1 },
        nextRaidAt: at + nextDelay(state, at),
      },
      events: [{ type: "attackRepelled", at, rival: attacker.id }],
    };
  }

  // L'attaquant repart avec tout ce que ses survivantes peuvent porter : la moitié des siennes.
  const incoming = BALANCE.rivals.incoming;
  const raid = BALANCE.rivals.raid;
  const { sugar, bricks, proteins } = loadLoot(Math.ceil(attack / 2) * raid.carryPerCell * MICRO, {
    sugar: state.resources.sugar,
    bricks: state.resources.bricks,
    proteins: Math.floor((state.resources.proteins * raid.proteinSharePercent) / 100),
  });
  const troops: Record<TroopId, number> = { ...state.troops };
  let toLose = Math.floor((partySize(troops) * incoming.troopLossPercent) / 100);
  const troopsLost = toLose;
  while (toLose > 0) {
    let biggest: TroopId = "hunter";
    for (const id of TROOP_IDS) if (troops[id] > troops[biggest]) biggest = id;
    troops[biggest] -= 1;
    toLose -= 1;
  }
  const shieldUntil = at + incoming.shieldHours * HOUR_MS;
  const event: GameEvent = {
    type: "attackSuffered",
    at,
    rival: attacker.id,
    sugar,
    bricks,
    proteins,
    troopsLost,
  };
  return {
    state: {
      ...state,
      counters,
      troops,
      resources: {
        sugar: state.resources.sugar - sugar,
        bricks: state.resources.bricks - bricks,
        proteins: state.resources.proteins - proteins,
      },
      shieldUntil,
      nextRaidAt: shieldUntil + nextDelay(state, at),
    },
    events: [event],
  };
}
