/**
 * Les identifiants du jeu. Tout le reste (équilibrage, déblocages, textes, moteur)
 * s'appuie sur ces listes : ajouter un élément ici oblige à le décrire partout.
 */

export const RESOURCE_IDS = ["sugar", "bricks", "proteins"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export const ORGANELLE_IDS = [
  "mitochondrion",
  "vacuole",
  "cilia",
  "ribosome",
  "nursery",
  "wall",
] as const;
export type OrganelleId = (typeof ORGANELLE_IDS)[number];

export const MUTATION_IDS = [
  "swiftCilia",
  "thickWall",
  "fastMetabolism",
  "digestivePouch",
  "quickDivision",
  "thrift",
] as const;
export type MutationId = (typeof MUTATION_IDS)[number];

/** Ce qu'une mutation change sur le dessin de la créature. */
export const TRAIT_IDS = ["longCilia", "thickWall", "glow", "pouch", "buds", "spots"] as const;
export type TraitId = (typeof TRAIT_IDS)[number];

/** Ce qu'une mutation peut modifier, en pourcentage. */
export const STAT_IDS = [
  "tapYield",
  "storage",
  "sugarProduction",
  "bricksProduction",
  "buildTime",
  "buildCost",
] as const;
export type StatId = (typeof STAT_IDS)[number];

/** Ce que le joueur a accompli. Les conditions de déblocage portent sur ces compteurs. */
export const COUNTER_IDS = [
  "harvests",
  "organellesBuilt",
  "mutationsChosen",
  "mapHarvests",
  "huntsWon",
  "rivalFights",
  "leagueEntered",
] as const;
export type CounterId = (typeof COUNTER_IDS)[number];

/** Les ordres qu'un joueur peut envoyer. */
export const ORDER_TYPES = [
  "harvest",
  "build",
  "upgrade",
  "chooseMutation",
  "sendExpedition",
  "cancelExpedition",
  "trainTroop",
  "sendHunt",
  "strikeHunt",
  "cancelHunt",
  "buyMutation",
  "claimQuest",
  "spyRival",
  "sendRaid",
  "strikeRaid",
  "cancelRaid",
  "goAway",
  "setNight",
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/** Les sortes de lieux de la carte, et ce que chacune rapporte. */
export const PLACE_KINDS = ["sugarCluster", "debris"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];
export const PLACE_RESOURCE: Readonly<Record<PlaceKind, ResourceId>> = {
  sugarCluster: "sugar",
  debris: "bricks",
};

/** Les cellules filles, et la sorte de proie contre laquelle chacune compte double. */
export const TROOP_IDS = ["hunter", "armored", "swift"] as const;
export type TroopId = (typeof TROOP_IDS)[number];
export const PREY_KINDS = ["soft", "aggressive", "fleeing"] as const;
export type PreyKind = (typeof PREY_KINDS)[number];
export const STRONG_AGAINST: Readonly<Record<TroopId, PreyKind>> = {
  hunter: "soft",
  armored: "aggressive",
  swift: "fleeing",
};

/**
 * Les quêtes du jour. Chacune rappelle un geste du jeu ; les dernières sont des défis,
 * facultatifs et mieux récompensés. Pour en ajouter une : un nom ici, une ligne dans
 * l'équilibrage, un texte, et la règle de progression dans le moteur.
 */
export const QUEST_IDS = [
  "tapSugar",
  "build",
  "upgradeStore",
  "expeditions",
  "bricksFromMap",
  "sugarFromMap",
  "farExpedition",
  "trainCells",
  "winHunts",
  "strikeWin",
  "cleanHunt",
  "mutate",
  "spyRival",
  "challengeFarHunt",
  "challengeHunts",
  "challengeExpeditions",
  "challengeStrikes",
  "challengeCleanHunts",
  "challengeRaid",
  "challengeRaids",
] as const;
export type QuestId = (typeof QUEST_IDS)[number];

/** Ce qu'un coffre peut contenir. */
export const CHEST_REWARDS = ["sugar", "bricks", "proteins", "energy"] as const;
export type ChestReward = (typeof CHEST_REWARDS)[number];

/** Les éléments d'interface soumis au déblocage. */
export const UI_ELEMENT_IDS = [
  "cell",
  "sugarCounter",
  "buildSlots",
  "productionRate",
  "constructionTimer",
  "bricksCounter",
  "upgradeButton",
  "mutationChoice",
  "creatureTraits",
  "map",
  "energy",
  "troops",
  "hunt",
  "chests",
  "dailyQuests",
  "rivals",
  "spy",
  "raid",
  "defense",
  "protections",
  "ranking",
  "leagues",
  "gazette",
  "speciesSheet",
  "alliances",
  "higherRanks",
  "crisis",
  "apexRace",
] as const;
export type UiElementId = (typeof UI_ELEMENT_IDS)[number];
