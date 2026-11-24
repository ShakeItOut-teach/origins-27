/** Valeurs dérivées de l'état : production, stockage, coûts, durées. Entiers uniquement. */
import { BALANCE, ORGANELLE_IDS } from "@o27/data";
import type { OrganelleId, ResourceId, StatId } from "@o27/data";
import { alliancePercent } from "./banners";
import { companionPercent } from "./companion";
import { playerAnoxia } from "./events";
import { evolutionPercent } from "./evolutions";
import { lineagePercent } from "./genes";
import { MICRO } from "./types";
import type { PlayerState } from "./types";

/** Les organites qui donnent un bonus par niveau : la liste ne change jamais. */
const BONUS_ORGANELLES = ORGANELLE_IDS.filter(
  (id) => BALANCE.organelles[id].effect.kind === "bonus",
);

/**
 * Somme des pourcentages apportés à une statistique : mutations, lignées, évolutions
 * exprimées, et organites qui donnent un bonus par niveau.
 */
export function modifierPercent(state: PlayerState, stat: StatId): number {
  let total =
    lineagePercent(state, stat) +
    evolutionPercent(state, stat) +
    companionPercent(state, stat) +
    alliancePercent(state, stat);
  for (const id of BONUS_ORGANELLES) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "bonus" && effect.stat === stat) {
      total += effect.percentPerLevel * state.organelles[id];
    }
  }
  for (const id of state.mutations) {
    const mutation = BALANCE.mutations[id];
    if (mutation.stat === stat) total += mutation.percent;
  }
  return total;
}

function applyPercent(value: number, percent: number): number {
  return Math.floor((value * (100 + percent)) / 100);
}

/**
 * La force d'un adversaire telle que le joueur la rencontre : ses bonus d'attaque reviennent
 * à affaiblir ce qu'il affronte. Jamais moins de 1.
 */
export function foePower(state: PlayerState, power: number): number {
  return Math.max(1, Math.floor((power * 100) / (100 + modifierPercent(state, "attack"))));
}

/** Durée d'un trajet dans l'océan, une fois comptés les gènes de mobilité. */
export function travelMs(state: PlayerState, ms: number): number {
  return Math.max(1000, applyPercent(ms, modifierPercent(state, "travelTime")));
}

/** Multiplie `times` fois par `growthPercent` %, en arrondissant vers le bas à chaque pas. */
function grow(base: number, growthPercent: number, times: number): number {
  let value = base;
  for (let i = 0; i < times; i++) value = Math.floor((value * growthPercent) / 100);
  return value;
}

/** Les protéines ne se fabriquent pas : on ne les obtient qu'en chassant. */
const PRODUCTION_STAT: Partial<Record<ResourceId, StatId>> = {
  sugar: "sugarProduction",
  bricks: "bricksProduction",
};

/** Production passive, en millionièmes d'unité par milliseconde. */
export function productionRate(state: PlayerState, resource: ResourceId): number {
  let milliPerSecond = 0;
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "production" && effect.resource === resource) {
      milliPerSecond += effect.milliPerSecondPerLevel * state.organelles[id];
    }
  }
  // 1 millième par seconde = 1 millionième par milliseconde.
  const stat = PRODUCTION_STAT[resource];
  const rate = applyPercent(milliPerSecond, stat === undefined ? 0 : modifierPercent(state, stat));
  // Sans oxygène, la cellule tourne au ralenti.
  return playerAnoxia(state) === null
    ? rate
    : applyPercent(rate, BALANCE.events.anoxia.productionPercent);
}

/** Quantité maximale stockable, en millionièmes d'unité. */
export function capacity(state: PlayerState, resource: ResourceId): number {
  let units = BALANCE.baseStorage[resource];
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "storage") units += effect.addPerLevel * state.organelles[id];
  }
  return applyPercent(units * MICRO, modifierPercent(state, "storage"));
}

/** Gain d'un toucher, en millionièmes d'unité. */
export function tapYield(state: PlayerState): number {
  let percent = modifierPercent(state, "tapYield");
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "tapYield") percent += effect.addPercentPerLevel * state.organelles[id];
  }
  return applyPercent(BALANCE.tap.yield * MICRO, percent);
}

/** Coût pour amener un organite au niveau `toLevel` (1 = construction), en millionièmes. */
export function levelCost(
  state: PlayerState,
  organelle: OrganelleId,
  toLevel: number,
): Readonly<Record<ResourceId, number>> {
  const data = BALANCE.organelles[organelle];
  const growth = BALANCE.upgrade.costGrowthPercent;
  const sugar = grow(data.buildCost.sugar * MICRO, growth, toLevel - 1);
  const bricks =
    toLevel <= 1
      ? data.buildCost.bricks * MICRO
      : grow(data.upgradeBricks * MICRO, growth, toLevel - 2);
  const percent = modifierPercent(state, "buildCost");
  return {
    sugar: applyPercent(sugar, percent),
    bricks: applyPercent(bricks, percent),
    proteins: 0,
  };
}

/** Durée du chantier pour amener un organite au niveau `toLevel`, en millisecondes. */
export function levelDuration(state: PlayerState, organelle: OrganelleId, toLevel: number): number {
  const base = BALANCE.organelles[organelle].buildSeconds * 1000;
  const grown = grow(base, BALANCE.upgrade.timeGrowthPercent, toLevel - 1);
  return Math.max(1000, applyPercent(grown, modifierPercent(state, "buildTime")));
}
