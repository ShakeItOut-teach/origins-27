/**
 * Les bannières et leurs technologies.
 * Chaque organisme de l'océan se range sous l'une des six bannières ; elles se partagent
 * l'océan par grands secteurs. Les membres versent des points dans les technologies de leur
 * alliance : toujours dans celle qui est « recommandée », et, dès qu'elle gagne un niveau,
 * dans la moins avancée.
 *
 * Les membres simulés versent à rythme constant. Pour une bannière que le joueur ne connaît
 * que de loin, tout se calcule à partir de l'heure. Pour la sienne, l'état garde les points
 * versés à un instant donné (`syncedAt`) ; ce qui a été versé depuis s'y ajoute à la lecture.
 */
import { ALLIANCE_TECH_IDS, BALANCE, BANNER_IDS, UNLOCKS } from "@o27/data";
import type { AllianceTechId, BannerId, StatId } from "@o27/data";
import { cellIn } from "./ocean";
import { createRng } from "./rng";
import { DAY_MS } from "./types";
import type { Alliance, PlayerState } from "./types";

const RULES = BALANCE.alliance;

export type TechPool = Readonly<Record<AllianceTechId, number>>;

export interface TechView {
  /** Points versés dans chaque technologie. */
  readonly tech: TechPool;
  readonly recommended: AllianceTechId | null;
}

/** Points cumulés qu'il faut pour chaque niveau : `THRESHOLDS[n]` ouvre le niveau n. */
const THRESHOLDS: readonly number[] = (() => {
  const steps = [0];
  let need = RULES.tech.needBase;
  for (let level = 0; level < RULES.tech.maxLevel; level++) {
    steps.push((steps[level] ?? 0) + need);
    need = Math.floor((need * RULES.tech.needGrowthPercent) / 100);
  }
  return steps;
})();
const MAX_POINTS = THRESHOLDS[RULES.tech.maxLevel] ?? 0;

/** Niveau d'une technologie qui a reçu ce nombre de points. */
export function techLevel(points: number): number {
  let level = 0;
  while (level < RULES.tech.maxLevel && points >= (THRESHOLDS[level + 1] ?? Infinity)) level += 1;
  return level;
}

/** Points qu'une technologie doit avoir reçus en tout pour atteindre ce niveau. */
export function techThreshold(level: number): number {
  return THRESHOLDS[Math.min(level, RULES.tech.maxLevel)] ?? MAX_POINTS;
}

function emptyPool(): Record<AllianceTechId, number> {
  return Object.fromEntries(ALLIANCE_TECH_IDS.map((id) => [id, 0])) as Record<
    AllianceTechId,
    number
  >;
}

let bannersSeed = -1;
let banners: readonly BannerId[] = [];
let memberCounts: Readonly<Record<BannerId, number>> = {
  aby: 0,
  krk: 0,
  mer: 0,
  tox: 0,
  lum: 0,
  nox: 0,
};

/** Sixième de l'océan où se trouve une case, de 0 à 5, sans trigonométrie (entiers seulement). */
function sextant(x: number, y: number): number {
  const steep = y * y >= 3 * x * x;
  if (y >= 0) return steep ? 1 : x > 0 ? 0 : 2;
  return steep ? 4 : x < 0 ? 3 : 5;
}

function assign(worldSeed: number): void {
  if (bannersSeed === worldSeed) return;
  const world = createRng((worldSeed ^ 0x27d4eb2f) >>> 0);
  world.next();
  world.next();
  // Chaque bannière tient un sixième de l'océan.
  const sectors: BannerId[] = [...BANNER_IDS];
  for (let index = sectors.length - 1; index > 0; index--) {
    const other = world.int(index + 1);
    const moved = sectors[index];
    const swapped = sectors[other];
    if (moved === undefined || swapped === undefined) continue;
    sectors[index] = swapped;
    sectors[other] = moved;
  }
  const found: BannerId[] = [];
  const counts: Record<BannerId, number> = { aby: 0, krk: 0, mer: 0, tox: 0, lum: 0, nox: 0 };
  for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
    const rng = createRng((worldSeed ^ 0x165667b1 ^ Math.imul(slot + 1, 0x9e3779b1)) >>> 0);
    rng.next();
    rng.next();
    const home = cellIn(worldSeed, slot, 0);
    // Deux organismes sur trois suivent la bannière de leur secteur ; les autres choisissent.
    const local = sectors[sextant(home.x, home.y)] ?? "aby";
    const banner = rng.int(100) < 65 ? local : (BANNER_IDS[rng.int(BANNER_IDS.length)] ?? "aby");
    found.push(banner);
    counts[banner] += 1;
  }
  banners = found;
  memberCounts = counts;
  bannersSeed = worldSeed;
}

/** La bannière d'un organisme : toujours la même pour une place donnée. */
export function bannerOf(worldSeed: number, slot: number): BannerId {
  assign(worldSeed);
  const count = BALANCE.world.organisms;
  return banners[((slot % count) + count) % count] ?? "aby";
}

/** Nombre d'organismes simulés sous une bannière. */
export function bannerMembers(worldSeed: number, banner: BannerId): number {
  assign(worldSeed);
  return memberCounts[banner];
}

const orders = new Map<string, readonly AllianceTechId[]>();

/** L'ordre de préférence d'une bannière entre ses technologies : il départage les égalités. */
export function techOrder(worldSeed: number, banner: BannerId): readonly AllianceTechId[] {
  const key = `${String(worldSeed)}/${banner}`;
  const known = orders.get(key);
  if (known !== undefined) return known;
  const rng = createRng(
    (worldSeed ^ 0x2c1b3c6d ^ Math.imul(BANNER_IDS.indexOf(banner) + 1, 0x85ebca6b)) >>> 0,
  );
  rng.next();
  rng.next();
  const order: AllianceTechId[] = [...ALLIANCE_TECH_IDS];
  for (let index = order.length - 1; index > 0; index--) {
    const other = rng.int(index + 1);
    const moved = order[index];
    const swapped = order[other];
    if (moved === undefined || swapped === undefined) continue;
    order[index] = swapped;
    order[other] = moved;
  }
  if (orders.size > 600) orders.clear();
  orders.set(key, order);
  return order;
}

/** La technologie la moins avancée qui n'est pas au maximum ; `null` quand tout y est. */
export function nextRecommended(
  tech: TechPool,
  order: readonly AllianceTechId[],
): AllianceTechId | null {
  let best: AllianceTechId | null = null;
  for (const id of order) {
    const level = techLevel(tech[id]);
    if (level >= RULES.tech.maxLevel) continue;
    if (best === null || level < techLevel(tech[best])) best = id;
  }
  return best;
}

/**
 * Verse des points : tout va à la technologie recommandée ; quand elle gagne un niveau, la
 * recommandation passe à la moins avancée, et le reste suit.
 */
export function pour(view: TechView, order: readonly AllianceTechId[], points: number): TechView {
  const tech = { ...view.tech };
  let recommended = view.recommended;
  let left = points;
  if (recommended !== null && techLevel(tech[recommended]) >= RULES.tech.maxLevel) {
    recommended = nextRecommended(tech, order);
  }
  while (left > 0 && recommended !== null) {
    const need = techThreshold(techLevel(tech[recommended]) + 1) - tech[recommended];
    if (left < need) {
      tech[recommended] += left;
      left = 0;
    } else {
      tech[recommended] += need;
      left -= need;
      recommended = nextRecommended(tech, order);
    }
  }
  return { tech, recommended };
}

/** Instant où les alliances s'ouvrent dans une saison : les membres commencent à verser. */
export function allianceOpensAt(seasonStart: number): number {
  const day = UNLOCKS[RULES.tier]?.minDay ?? 1;
  return seasonStart + (day - 1) * DAY_MS;
}

/** Points que les membres simulés d'une bannière versent par jour. */
function bannerRate(worldSeed: number, banner: BannerId): number {
  return bannerMembers(worldSeed, banner) * RULES.tech.memberPointsPerDay;
}

/** Où en sont les technologies d'une bannière, par le seul travail de ses membres simulés. */
export function bannerProgress(
  worldSeed: number,
  banner: BannerId,
  seasonStart: number,
  at: number,
): TechView {
  const order = techOrder(worldSeed, banner);
  const elapsed = Math.max(0, at - allianceOpensAt(seasonStart));
  const points = Math.floor((elapsed * bannerRate(worldSeed, banner)) / DAY_MS);
  return pour({ tech: emptyPool(), recommended: order[0] ?? null }, order, points);
}

/** Points versés par les membres simulés depuis la dernière mise au net de l'alliance du joueur. */
function pendingPoints(state: PlayerState, alliance: Alliance): number {
  const elapsed = Math.max(0, state.now - alliance.syncedAt);
  return Math.floor((elapsed * bannerRate(state.worldSeed, alliance.banner)) / DAY_MS);
}

const views = new WeakMap<Alliance, { readonly points: number; readonly view: TechView }>();

/** Les technologies de l'alliance du joueur, à l'instant de son état ; `null` sans alliance. */
export function allianceView(state: PlayerState): TechView | null {
  const alliance = state.alliance;
  if (alliance === null) return null;
  const points = pendingPoints(state, alliance);
  const known = views.get(alliance);
  if (known?.points === points) return known.view;
  const view = pour(
    { tech: alliance.tech, recommended: alliance.recommended },
    techOrder(state.worldSeed, alliance.banner),
    points,
  );
  views.set(alliance, { points, view });
  return view;
}

/** Niveau d'une alliance : 1, plus un par niveau de technologie. */
export function allianceLevel(view: TechView): number {
  let level = 1;
  for (const id of ALLIANCE_TECH_IDS) level += techLevel(view.tech[id]);
  return level;
}

/** Niveau d'une technologie dans l'alliance du joueur ; 0 sans alliance. */
export function allianceTechLevel(state: PlayerState, tech: AllianceTechId): number {
  const view = allianceView(state);
  return view === null ? 0 : techLevel(view.tech[tech]);
}

/** Ce que l'alliance ajoute (ou retire) à une statistique du joueur, en pourcentage. */
export function alliancePercent(state: PlayerState, stat: StatId): number {
  const view = allianceView(state);
  if (view === null) return 0;
  // Appartenir à une alliance nourrit déjà un peu mieux.
  let total =
    stat === "sugarProduction" || stat === "bricksProduction" ? RULES.memberBonusPercent : 0;
  for (const id of ALLIANCE_TECH_IDS) {
    const data = RULES.techs[id];
    if (data.stats.includes(stat)) total += data.percentPerLevel * techLevel(view.tech[id]);
  }
  return total;
}

/**
 * Prochain instant où une technologie de l'alliance du joueur gagne un niveau par le travail
 * des membres : ses bonus changent à ce moment précis. Jamais, sans alliance ou quand tout
 * est au maximum.
 */
export function allianceDue(state: PlayerState): number {
  const alliance = state.alliance;
  const view = allianceView(state);
  if (alliance === null || view === null || view.recommended === null) {
    return Number.POSITIVE_INFINITY;
  }
  const rate = bannerRate(state.worldSeed, alliance.banner);
  if (rate <= 0) return Number.POSITIVE_INFINITY;
  const recommended = view.recommended;
  const need = techThreshold(techLevel(view.tech[recommended]) + 1) - view.tech[recommended];
  const target = pendingPoints(state, alliance) + need;
  return alliance.syncedAt + Math.ceil((target * DAY_MS) / rate);
}

/** L'alliance du joueur mise au net à l'instant de son état : les points en attente sont versés. */
export function settledAlliance(state: PlayerState): Alliance | null {
  const alliance = state.alliance;
  const view = allianceView(state);
  if (alliance === null || view === null) return null;
  return { ...alliance, tech: view.tech, recommended: view.recommended, syncedAt: state.now };
}
