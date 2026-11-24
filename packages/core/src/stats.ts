/** Valeurs dérivées de l'état : production, stockage, coûts, durées. Entiers uniquement. */
import { BALANCE, ORGANELLE_IDS } from "@o27/data";
import type { OrganelleId, ResourceId, StatId } from "@o27/data";
import { alliancePercent } from "./banners";
import { companionPercent } from "./companion";
import { playerAnoxia } from "./events";
import { drillPercent } from "./drills";
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
    alliancePercent(state, stat) +
    drillPercent(state, stat);
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

/**
 * Niveau maximum d'un organite pour ce joueur : celui d'origine, puis davantage une fois les
 * rangs supérieurs ouverts.
 */
export function maxLevelOf(state: PlayerState, organelle: OrganelleId): number {
  let max = BALANCE.organelles[organelle].maxLevel;
  for (const step of BALANCE.higherRanks.steps) {
    if (state.tier >= step.tier) max = Math.max(max, step.maxLevel);
  }
  return max;
}

/**
 * Grandit de niveau en niveau jusqu'à `toLevel` : d'abord au rythme d'origine, puis, au-delà
 * du niveau maximum d'origine, au rythme des rangs supérieurs.
 */
function growLevels(
  base: number,
  earlyPercent: number,
  latePercent: number,
  steps: number,
  earlySteps: number,
): number {
  const early = Math.max(0, Math.min(steps, earlySteps));
  return grow(grow(base, earlyPercent, early), latePercent, Math.max(0, steps - early));
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
  let higher = 0;
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "storage") {
      const level = state.organelles[id];
      units += effect.addPerLevel * level;
      // Au-delà du niveau maximum d'origine, chaque niveau agrandit toute la réserve.
      higher += Math.max(0, level - BALANCE.organelles[id].maxLevel);
    }
  }
  const grown = Math.floor(
    (units * (100 + higher * BALANCE.higherRanks.storagePercentPerLevel)) / 100,
  );
  return applyPercent(grown * MICRO, modifierPercent(state, "storage"));
}

/** Gain d'un toucher, en millionièmes d'unité. */
export function tapYield(): number {
  // Toujours le même : aucun organite, aucune mutation ne le change.
  return BALANCE.tap.yieldMilli * 1000;
}

/** Coût pour amener un organite au niveau `toLevel` (1 = construction), en millionièmes. */
export function levelCost(
  state: PlayerState,
  organelle: OrganelleId,
  toLevel: number,
): Readonly<Record<ResourceId, number>> {
  const data = BALANCE.organelles[organelle];
  const growth = BALANCE.upgrade.costGrowthPercent;
  const late = BALANCE.higherRanks.costGrowthPercent;
  const sugar = growLevels(
    data.buildCost.sugar * MICRO,
    growth,
    late,
    toLevel - 1,
    data.maxLevel - 1,
  );
  const bricks =
    toLevel <= 1
      ? data.buildCost.bricks * MICRO
      : growLevels(data.upgradeBricks * MICRO, growth, late, toLevel - 2, data.maxLevel - 2);
  const percent = modifierPercent(state, "buildCost");
  return {
    sugar: applyPercent(sugar, percent),
    bricks: applyPercent(bricks, percent),
    proteins: 0,
  };
}

/** Durée du chantier pour amener un organite au niveau `toLevel`, en millisecondes. */
export function levelDuration(state: PlayerState, organelle: OrganelleId, toLevel: number): number {
  const data = BALANCE.organelles[organelle];
  const grown = growLevels(
    data.buildSeconds * 1000,
    BALANCE.upgrade.timeGrowthPercent,
    BALANCE.higherRanks.timeGrowthPercent,
    toLevel - 1,
    data.maxLevel - 1,
  );
  // Un niveau supérieur est un vrai chantier : il dure au moins une demi-heure par rang.
  const floor =
    Math.max(0, toLevel - data.maxLevel) * BALANCE.higherRanks.minMinutesPerLevel * 60_000;
  return Math.max(1000, applyPercent(Math.max(grown, floor), modifierPercent(state, "buildTime")));
}
