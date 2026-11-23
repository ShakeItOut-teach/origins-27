/**
 * Les identifiants du jeu. Tout le reste (équilibrage, déblocages, textes, moteur)
 * s'appuie sur ces listes : ajouter un élément ici oblige à le décrire partout.
 */

export const RESOURCE_IDS = ["sugar", "bricks"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export const ORGANELLE_IDS = ["mitochondrion", "vacuole", "cilia", "ribosome"] as const;
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
export const ORDER_TYPES = ["harvest", "build", "upgrade", "chooseMutation"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

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
