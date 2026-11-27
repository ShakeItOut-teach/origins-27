/**
 * La table de déblocage : la source unique de la complexité progressive.
 * Le moteur, le serveur et l'interface la lisent tous les trois.
 * Une mécanique dont le palier n'est pas atteint n'existe pas pour le joueur.
 */
import { z } from "zod";
import { UnlockSchema } from "./schema";
import type { Unlock } from "./schema";

export const UNLOCKS: readonly Unlock[] = z.array(UnlockSchema).parse([
  { tier: 0, condition: null, minDay: null, ui: ["cell", "sugarCounter"], orders: ["harvest"] },
  {
    tier: 1,
    condition: { counter: "harvests", atLeast: 10 },
    minDay: null,
    ui: ["buildSlots", "productionRate", "constructionTimer"],
    orders: ["build"],
  },
  {
    tier: 2,
    condition: { counter: "organellesBuilt", atLeast: 3 },
    minDay: null,
    ui: ["bricksCounter", "upgradeButton", "mutationChoice", "creatureTraits"],
    orders: ["upgrade", "chooseMutation"],
  },
  {
    tier: 3,
    condition: { counter: "mutationsChosen", atLeast: 1 },
    minDay: null,
    ui: ["map", "energy"],
    orders: ["sendExpedition", "cancelExpedition"],
  },
  {
    tier: 4,
    condition: { counter: "mapHarvests", atLeast: 5 },
    minDay: null,
    ui: ["troops", "hunt", "chests", "dailyQuests", "autoHarvest", "buildQueue"],
    orders: [
      "trainTroop",
      "sendHunt",
      "strikeHunt",
      "cancelHunt",
      "buyMutation",
      "claimQuest",
      "openReward",
      "setAutoHarvest",
      "unqueue",
    ],
  },
  {
    tier: 5,
    condition: { counter: "huntsWon", atLeast: 1 },
    minDay: 2,
    ui: ["rivals", "spy", "raid", "defense", "protections"],
    orders: ["spyRival", "sendRaid", "strikeRaid", "cancelRaid", "goAway", "setNight"],
  },
  {
    tier: 6,
    // À partir d'ici, tout s'ouvre à date fixe : le joueur voit le compte à rebours.
    condition: null,
    minDay: 3,
    ui: ["worldMap", "deposits", "migration", "calendar"],
    orders: ["gather", "migrate"],
  },
  {
    tier: 7,
    condition: null,
    minDay: 4,
    ui: ["power", "ranking", "leagues", "contest", "predators", "evolutions"],
    // Le concours donne ses premiers accélérateurs : on peut s'en servir aussitôt.
    orders: ["huntPredator", "research", "useBoost"],
  },
  {
    tier: 8,
    condition: null,
    minDay: 5,
    ui: ["genome", "rank2Troops", "companion", "militaryResearch"],
    orders: ["tamePredator", "shareGene", "releaseCompanion", "drill"],
  },
  {
    tier: 9,
    condition: null,
    minDay: 9,
    ui: ["zoneEvents", "alliances", "gazette"],
    orders: [
      "huntLeviathan",
      "joinAlliance",
      "donate",
      "recommend",
      "helpAllies",
      "askHelp",
      "claimGift",
      "buyAlliance",
      "reinforceAlly",
    ],
  },
  {
    tier: 10,
    condition: null,
    minDay: 13,
    ui: ["higherRanks"],
    orders: [],
  },
  {
    tier: 11,
    condition: null,
    minDay: 17,
    ui: ["speciesSheet", "crisis"],
    orders: [],
  },
  {
    tier: 12,
    condition: null,
    minDay: 21,
    ui: ["apexRace", "museum"],
    orders: ["leaveWater"],
  },
]);

/**
 * Dernier palier livré aux joueurs. Le moteur ne fait jamais dépasser ce palier,
 * même si la condition du suivant est remplie : on livre un palier fini à la fois.
 */
export const MAX_RELEASED_TIER = 12;

/** Premier palier où un joueur peut être attaqué. */
export const FIRST_ATTACKABLE_TIER = 5;
