/**
 * Équilibrage des paliers 0 à 4.
 * Tout changement se note dans docs/equilibrage/journal.md, avec la mesure avant et après.
 */
import { BalanceSchema } from "./schema";
import type { Balance } from "./schema";

export const BALANCE: Balance = BalanceSchema.parse({
  tap: { yield: 1, minIntervalMs: 100, burst: 30 },
  baseStorage: { sugar: 80, bricks: 100, proteins: 100 },
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
    nursery: {
      tier: 4,
      buildCost: { sugar: 150, bricks: 40 },
      buildSeconds: 90,
      upgradeBricks: 80,
      maxLevel: 5,
      effect: { kind: "troopCapacity", base: 10, addPerLevel: 5 },
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
  energy: { max: 10, regenSeconds: 1200 },
  troops: {
    hunter: { cost: { sugar: 30, bricks: 0 }, seconds: 20 },
    armored: { cost: { sugar: 20, bricks: 10 }, seconds: 20 },
    swift: { cost: { sugar: 25, bricks: 5 }, seconds: 20 },
  },
  hunt: {
    strongMultiplier: 2,
    strikeWindowSeconds: 8,
    certainFromPercent: 25,
    unattendedPenaltyPercent: 10,
    bands: [
      { energy: 1, seconds: 60, power: 6, proteins: 5, restSeconds: 180 },
      { energy: 2, seconds: 180, power: 15, proteins: 15, restSeconds: 600 },
      { energy: 3, seconds: 600, power: 35, proteins: 40, restSeconds: 1800 },
    ],
  },
  mutationPrices: [20, 50, 100],
  expedition: {
    cancelSpeedup: 10,
    placesPerBand: 2,
    bands: [
      { energy: 1, seconds: 30, sugar: 60, bricks: 20, restSeconds: 120 },
      { energy: 2, seconds: 180, sugar: 150, bricks: 50, restSeconds: 600 },
      { energy: 3, seconds: 600, sugar: 400, bricks: 120, restSeconds: 1800 },
    ],
  },
  world: {
    playerSpacing: 1000,
    placeCell: 400,
    placeChancePercent: 60,
    sugarChancePercent: 45,
    minDistance: 150,
    searchCells: 3,
  },
});
