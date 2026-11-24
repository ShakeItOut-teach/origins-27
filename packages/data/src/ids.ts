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
  "golgi",
  "nucleus",
  "lysosome",
] as const;
export type OrganelleId = (typeof ORGANELLE_IDS)[number];

export const MUTATION_IDS = [
  "swiftCilia",
  "thickWall",
  "fastMetabolism",
  "digestivePouch",
  "quickDivision",
  "thrift",
  "armorPlates",
  "dormancy",
  "flagellum",
  "voracity",
  "harpoon",
  "swarming",
] as const;
export type MutationId = (typeof MUTATION_IDS)[number];

/** Ce qu'une mutation change sur le dessin de la créature. */
export const TRAIT_IDS = [
  "longCilia",
  "thickWall",
  "glow",
  "pouch",
  "buds",
  "spots",
  "plates",
  "cyst",
  "whip",
  "mouth",
  "darts",
  "swarm",
] as const;
export type TraitId = (typeof TRAIT_IDS)[number];

/** Ce qu'une mutation peut modifier, en pourcentage. */
export const STAT_IDS = [
  "tapYield",
  "storage",
  "sugarProduction",
  "bricksProduction",
  "buildTime",
  "buildCost",
  "defense",
  "upkeep",
  "travelTime",
  "huntProteins",
  "carry",
  "trainTime",
  "attack",
  "gather",
  "losses",
] as const;
export type StatId = (typeof STAT_IDS)[number];

/** Durée d'une saison, en jours : l'âge du serveur va de 1 à ce nombre. */
export const SEASON_DAYS = 27;

/**
 * Les évolutions : des caractères que le Noyau exprime, niveau après niveau. Trois branches.
 * Chaque saison, quelques-unes sont dormantes et d'autres favorisées : on ne joue jamais deux
 * fois la même cellule.
 */
export const EVOLUTION_BRANCHES = ["combat", "defense", "harvest"] as const;
export type EvolutionBranch = (typeof EVOLUTION_BRANCHES)[number];
export const EVOLUTION_IDS = [
  "venom",
  "frenzy",
  "plunder",
  "pursuit",
  "shell",
  "frugal",
  "reserve",
  "repair",
  "enzymes",
  "synthesis",
  "foraging",
  "digestion",
] as const;
export type EvolutionId = (typeof EVOLUTION_IDS)[number];

/**
 * Les événements de zone : ils apparaissent dans l'océan, durent un jour ou deux, et donnent
 * une raison de bouger ou de se battre.
 */
export const ZONE_EVENT_KINDS = ["eruption", "bloom", "leviathan", "anoxia"] as const;
export type ZoneEventKind = (typeof ZONE_EVENT_KINDS)[number];

/** Les six bannières : chaque organisme de l'océan se range sous l'une d'elles. */
export const BANNER_IDS = ["aby", "krk", "mer", "tox", "lum", "nox"] as const;
export type BannerId = (typeof BANNER_IDS)[number];

/** Les technologies d'alliance : trois directions, trois technologies chacune. */
export const ALLIANCE_BRANCHES = ["growth", "conquest", "bulwark"] as const;
export type AllianceBranch = (typeof ALLIANCE_BRANCHES)[number];
export const ALLIANCE_TECH_IDS = [
  "network",
  "reserves",
  "worksites",
  "pack",
  "looting",
  "currents",
  "membrane",
  "reinforcements",
  "sharedUpkeep",
] as const;
export type AllianceTechId = (typeof ALLIANCE_TECH_IDS)[number];

/** Ce que l'on achète avec ses crédits d'alliance. */
export const ALLIANCE_SHOP_IDS = ["energy", "ration", "shield", "instant"] as const;
export type AllianceShopId = (typeof ALLIANCE_SHOP_IDS)[number];

/**
 * Les fossiles de la Gazette : un par jour de saison. Leur âge, en millions d'années, est
 * celui que retiennent les musées ; il n'entre dans aucune règle du jeu.
 */
export const FOSSIL_AGES = {
  stromatolite: 3500,
  grypania: 1900,
  bangiomorpha: 1050,
  charnia: 570,
  dickinsonia: 558,
  kimberella: 555,
  cloudina: 550,
  trilobite: 521,
  haikouichthys: 518,
  anomalocaris: 508,
  opabinia: 508,
  hallucigenia: 508,
  pikaia: 508,
  wiwaxia: 508,
  ottoia: 508,
  cameroceras: 470,
  ammonite: 400,
  coelacanth: 400,
  jaekelopterus: 390,
  tiktaalik: 375,
  dunkleosteus: 360,
  helicoprion: 290,
  ichthyosaur: 200,
  archaeopteryx: 150,
  mosasaurus: 70,
  basilosaurus: 40,
  megalodon: 20,
} as const;
export type FossilId = keyof typeof FOSSIL_AGES;
export const FOSSIL_IDS = Object.keys(FOSSIL_AGES) as readonly FossilId[];

/** Ce qu'un accélérateur peut hâter : le chantier en cours, ou l'évolution que le Noyau exprime. */
export const BOOST_TARGETS = ["construction", "research"] as const;
export type BoostTarget = (typeof BOOST_TARGETS)[number];

/** La recherche militaire : de petits pouvoirs pour les cellules filles, de plus en plus chers. */
export const DRILL_IDS = ["fury", "guard", "survival", "haste"] as const;
export type DrillId = (typeof DRILL_IDS)[number];

/** Les crises de saison : une seule par saison, tirée de la graine du monde. */
export const CRISIS_KINDS = ["glaciation", "anoxia", "meteor"] as const;
export type CrisisKind = (typeof CRISIS_KINDS)[number];

/** Les lignées de la terre ferme : ce que devient une espèce qui sort des eaux. */
export const APEX_LINEAGES = [
  "tyrannosaur",
  "dromaeosaur",
  "brachiosaur",
  "triceratops",
  "ankylosaur",
  "stegosaur",
  "parasaurolophus",
  "pterosaur",
  "earlyBird",
] as const;
export type ApexLineage = (typeof APEX_LINEAGES)[number];

/** Les coffres de récompense : d'où ils viennent. */
export const REWARD_CHEST_KINDS = [
  "quest",
  "challenge",
  "league",
  "leviathan",
  "contest",
  "apex",
] as const;
export type RewardChestKind = (typeof REWARD_CHEST_KINDS)[number];

/** Les sortes de rapports du journal. */
export const REPORT_KINDS = ["raid", "defense", "hunt", "harvest", "leviathan", "famine"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** Les quatre familles de gènes. Trois gènes d'une même famille ouvrent une lignée. */
export const GENE_FAMILIES = ["metabolism", "predation", "mobility", "resilience"] as const;
export type GeneFamily = (typeof GENE_FAMILIES)[number];

/** Ce que le joueur a accompli. Les conditions de déblocage portent sur ces compteurs. */
export const COUNTER_IDS = [
  "harvests",
  "organellesBuilt",
  "mutationsChosen",
  "mapHarvests",
  "huntsWon",
  "rivalFights",
  "leagueEntered",
  "lootTaken",
  "attacksRepelled",
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
  "research",
  "tamePredator",
  "shareGene",
  "releaseCompanion",
  "gather",
  "migrate",
  "huntPredator",
  "huntLeviathan",
  "joinAlliance",
  "donate",
  "recommend",
  "helpAllies",
  "askHelp",
  "claimGift",
  "buyAlliance",
  "useBoost",
  "openReward",
  "drill",
  "setAutoHarvest",
  "leaveWater",
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/** Les sortes de lieux de la carte, et ce que chacune rapporte. */
export const PLACE_KINDS = ["sugarCluster", "debris", "carcass"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];
export const PLACE_RESOURCE: Readonly<Record<PlaceKind, ResourceId>> = {
  sugarCluster: "sugar",
  debris: "bricks",
  carcass: "proteins",
};

/**
 * Les cellules filles, et la sorte de proie contre laquelle chacune compte double.
 * Les trois premières sont de rang 1 ; les quatre suivantes, de rang 2, demandent des gènes.
 */
export const TROOP_IDS = [
  "hunter",
  "armored",
  "swift",
  "toxic",
  "guardian",
  "scout",
  "carrier",
  "rotifer",
  "tardigrade",
  "copepod",
  "salp",
  "chaetognath",
  "ostracod",
  "krill",
  "larvacean",
  "eurypterid",
  "trilobite",
  "conodont",
  "nautiloid",
] as const;
export type TroopId = (typeof TROOP_IDS)[number];
export const PREY_KINDS = ["soft", "aggressive", "fleeing"] as const;
export type PreyKind = (typeof PREY_KINDS)[number];
export const STRONG_AGAINST: Readonly<Record<TroopId, PreyKind | null>> = {
  hunter: "soft",
  armored: "aggressive",
  swift: "fleeing",
  toxic: "soft",
  guardian: "aggressive",
  scout: "fleeing",
  // La porteuse n'est forte contre personne : elle porte.
  carrier: null,
  // Rang 3 : de vrais animaux, minuscules mais redoutables.
  rotifer: "soft",
  tardigrade: "aggressive",
  copepod: "fleeing",
  salp: null,
  // Rang 4.
  chaetognath: "soft",
  ostracod: "aggressive",
  krill: "fleeing",
  larvacean: null,
  // Rang 5 : les premiers grands animaux.
  eurypterid: "soft",
  trilobite: "aggressive",
  conodont: "fleeing",
  nautiloid: null,
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

/** Les classements : puissance totale, cellule seule, troupes seules, butin pillé, attaques repoussées. */
export const RANKING_IDS = ["power", "cell", "troops", "loot", "defense"] as const;
export type RankingId = (typeof RANKING_IDS)[number];

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
  "autoHarvest",
  "rivals",
  "spy",
  "raid",
  "defense",
  "protections",
  "worldMap",
  "deposits",
  "migration",
  "power",
  "predators",
  "evolutions",
  "calendar",
  "genome",
  "companion",
  "rank2Troops",
  "militaryResearch",
  "ranking",
  "leagues",
  "contest",
  "zoneEvents",
  "gazette",
  "speciesSheet",
  "alliances",
  "higherRanks",
  "crisis",
  "apexRace",
  "museum",
] as const;
export type UiElementId = (typeof UI_ELEMENT_IDS)[number];
