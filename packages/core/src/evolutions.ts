/**
 * Les évolutions : des caractères que le Noyau exprime, niveau après niveau, contre des
 * ressources et du temps. Trois branches : combat, défense, récolte.
 * Chaque saison a son propre tirage, fixé par la graine du monde : dans chaque branche, une
 * évolution est dormante (on ne peut pas l'exprimer) et une autre est favorisée (elle agit
 * plus fort). Deux saisons ne se jouent donc jamais de la même façon.
 */
import { BALANCE, EVOLUTION_BRANCHES, EVOLUTION_IDS, ORGANELLE_IDS } from "@o27/data";
import type { EvolutionId, ResourceId, StatId } from "@o27/data";
import { createRng } from "./rng";
import { MICRO } from "./types";
import type { PlayerState } from "./types";

export interface SeasonDraw {
  readonly dormant: readonly EvolutionId[];
  readonly favoured: readonly EvolutionId[];
}

let drawSeed = -1;
let draw: SeasonDraw = { dormant: [], favoured: [] };

/** Le tirage de la saison : le même pour tous les joueurs d'un même monde. */
export function seasonDraw(worldSeed: number): SeasonDraw {
  if (worldSeed === drawSeed) return draw;
  const rng = createRng((worldSeed ^ 0x27d4eb2f) >>> 0);
  rng.next();
  rng.next();
  const dormant: EvolutionId[] = [];
  const favoured: EvolutionId[] = [];
  for (const branch of EVOLUTION_BRANCHES) {
    const pool = EVOLUTION_IDS.filter((id) => BALANCE.evolutions[id].branch === branch);
    for (let count = 0; count < BALANCE.research.dormantPerBranch && pool.length > 1; count++) {
      const [asleep] = pool.splice(rng.int(pool.length), 1);
      if (asleep !== undefined) dormant.push(asleep);
    }
    const lucky = pool[rng.int(pool.length)];
    if (lucky !== undefined) favoured.push(lucky);
  }
  draw = { dormant, favoured };
  drawSeed = worldSeed;
  return draw;
}

/**
 * Les totaux par statistique, gardés tant que les évolutions du joueur ne changent pas : ce
 * calcul est demandé à chaque seconde de jeu.
 */
const totalsCache = new WeakMap<
  object,
  { readonly seed: number; readonly totals: Partial<Record<StatId, number>> }
>();

/** Ce que les évolutions exprimées ajoutent à une statistique, en pourcentage. */
export function evolutionPercent(state: PlayerState, stat: StatId): number {
  let entry = totalsCache.get(state.evolutions);
  if (entry?.seed !== state.worldSeed) {
    const totals: Partial<Record<StatId, number>> = {};
    const { favoured } = seasonDraw(state.worldSeed);
    for (const id of EVOLUTION_IDS) {
      const level = state.evolutions[id];
      if (level === 0) continue;
      const data = BALANCE.evolutions[id];
      const scale = favoured.includes(id) ? BALANCE.research.favouredPercent : 100;
      // Arrondi vers zéro : un bonus favorisé ne gagne jamais un point par l'arrondi.
      totals[data.stat] =
        (totals[data.stat] ?? 0) + Math.trunc((data.percentPerLevel * level * scale) / 100);
    }
    entry = { seed: state.worldSeed, totals };
    totalsCache.set(state.evolutions, entry);
  }
  return entry.totals[stat] ?? 0;
}

/** Niveau de l'organite qui exprime les évolutions (0 : pas construit), et son accélération. */
function researchLab(state: PlayerState): { readonly level: number; readonly bonus: number } {
  let level = 0;
  let bonus = 0;
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "research" && state.organelles[id] > 0) {
      level = Math.max(level, state.organelles[id]);
      bonus += effect.percentPerLevel * (state.organelles[id] - 1);
    }
  }
  return { level, bonus };
}

export interface ResearchOffer {
  readonly toLevel: number;
  readonly cost: Readonly<Record<ResourceId, number>>;
  readonly durationMs: number;
  /** Ce qui empêche de lancer la recherche, s'il y a quelque chose. */
  readonly blocked: "dormant" | "maxLevel" | "notBuilt" | "needsNucleus" | null;
}

function grow(base: number, percent: number, times: number): number {
  let value = base;
  for (let i = 0; i < times; i++) value = Math.floor((value * percent) / 100);
  return value;
}

/** Ce que coûte le niveau suivant d'une évolution, et ce qui pourrait l'empêcher. */
export function researchOffer(state: PlayerState, evolution: EvolutionId): ResearchOffer {
  const rules = BALANCE.research;
  const data = BALANCE.evolutions[evolution];
  const level = state.evolutions[evolution];
  const toLevel = level + 1;
  const lab = researchLab(state);
  const price = (amount: number): number =>
    grow(amount * MICRO, rules.costGrowthPercent, toLevel - 1);
  const raw = grow(data.seconds * 1000, rules.timeGrowthPercent, toLevel - 1);
  let blocked: ResearchOffer["blocked"] = null;
  if (seasonDraw(state.worldSeed).dormant.includes(evolution)) blocked = "dormant";
  else if (level >= rules.maxLevel) blocked = "maxLevel";
  else if (lab.level === 0) blocked = "notBuilt";
  // Le Noyau doit avoir au moins le niveau que l'on veut exprimer.
  else if (lab.level < toLevel) blocked = "needsNucleus";
  return {
    toLevel,
    cost: {
      sugar: price(data.cost.sugar),
      bricks: price(data.cost.bricks),
      proteins: price(data.cost.proteins),
    },
    durationMs: Math.max(1000, Math.floor((raw * 100) / (100 + lab.bonus))),
    blocked,
  };
}

/** Somme des niveaux d'évolution exprimés : elle compte dans la puissance de la cellule. */
export function evolutionLevels(state: PlayerState): number {
  let total = 0;
  for (const id of EVOLUTION_IDS) total += state.evolutions[id];
  return total;
}
