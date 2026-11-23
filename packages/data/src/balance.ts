/**
 * Équilibrage des paliers 0 à 2.
 * Tout changement se note dans docs/equilibrage/journal.md, avec la mesure avant et après.
 */
import { BalanceSchema } from "./schema";
import type { Balance } from "./schema";

export const BALANCE: Balance = BalanceSchema.parse({
  tap: { yield: 1, minIntervalMs: 100, burst: 30 },
  baseStorage: { sugar: 80, bricks: 100 },
  upgrade: { costGrowthPercent: 160, timeGrowthPercent: 150 },
  organelles: {
    mitochondrion: {
      tier: 1,
      buildCost: { sugar: 10, bricks: 0 },
      buildSeconds: 5,
      upgradeBricks: 20,
      maxLevel: 5,
      effect: { kind: "production", resource: "sugar", milliPerSecondPerLevel: 500 },
    },
    vacuole: {
      tier: 1,
      buildCost: { sugar: 60, bricks: 0 },
      buildSeconds: 45,
      upgradeBricks: 30,
      maxLevel: 5,
      effect: { kind: "storage", addPerLevel: 120 },
    },
    cilia: {
      tier: 1,
      buildCost: { sugar: 150, bricks: 0 },
      buildSeconds: 90,
      upgradeBricks: 40,
      maxLevel: 5,
      effect: { kind: "tapYield", addPercentPerLevel: 100 },
    },
    ribosome: {
      tier: 2,
      buildCost: { sugar: 120, bricks: 0 },
      buildSeconds: 60,
      upgradeBricks: 40,
      maxLevel: 5,
      effect: { kind: "production", resource: "bricks", milliPerSecondPerLevel: 200 },
    },
  },
  mutations: {
    swiftCilia: { stat: "tapYield", percent: 50, trait: "longCilia" },
    thickWall: { stat: "storage", percent: 25, trait: "thickWall" },
    fastMetabolism: { stat: "sugarProduction", percent: 20, trait: "glow" },
    digestivePouch: { stat: "bricksProduction", percent: 25, trait: "pouch" },
    quickDivision: { stat: "buildTime", percent: -20, trait: "buds" },
    thrift: { stat: "buildCost", percent: -10, trait: "spots" },
  },
  mutationOffer: { tier: 2, choices: 3 },
});
