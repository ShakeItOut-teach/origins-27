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
    ui: ["troops", "hunt", "chests", "dailyQuests"],
    orders: ["trainTroop", "sendHunt", "strikeHunt", "cancelHunt", "buyMutation", "claimQuest"],
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
    ui: ["power", "ranking", "leagues", "predators", "evolutions"],
    orders: ["huntPredator", "research"],
  },
  {
    tier: 8,
    condition: null,
    minDay: 5,
    ui: ["genome", "rank2Troops", "companion"],
    orders: ["tamePredator", "shareGene", "releaseCompanion"],
  },
  {
    tier: 9,
    condition: null,
    minDay: 9,
    ui: ["alliances", "gazette", "speciesSheet", "higherRanks", "crisis", "apexRace"],
    orders: [],
  },
]);

/**
 * Dernier palier livré aux joueurs. Le moteur ne fait jamais dépasser ce palier,
 * même si la condition du suivant est remplie : on livre un palier fini à la fois.
 */
export const MAX_RELEASED_TIER = 8;

/** Premier palier où un joueur peut être attaqué. */
export const FIRST_ATTACKABLE_TIER = 5;
