import type {
  ApexLineage,
  AllianceShopId,
  AllianceTechId,
  BannerId,
  BoostTarget,
  DrillId,
  ReportKind,
  RewardChestKind,
  GeneFamily,
  EvolutionId,
  CounterId,
  MutationId,
  OrganelleId,
  PlaceKind,
  ChestReward,
  PreyKind,
  QuestId,
  RankingId,
  ResourceId,
  TroopId,
} from "@o27/data";

/**
 * Unités internes.
 * - Temps : millisecondes entières.
 * - Ressources : millionièmes d'unité, entiers (1 sucre = 1 000 000). Tout le calcul
 *   reste en entiers, ce qui rend le moteur exact et identique partout.
 */
export const MICRO = 1_000_000;
export const DAY_MS = 86_400_000;

/** Un chantier en file, payé d'avance : il démarre quand le précédent s'achève. */
export interface QueuedBuild {
  readonly organelle: OrganelleId;
  readonly toLevel: number;
  /** Ce qui a été payé, rendu si on le retire de la file. En millionièmes. */
  readonly paid: { readonly sugar: number; readonly bricks: number };
}

export interface Construction {
  readonly organelle: OrganelleId;
  readonly toLevel: number;
  readonly endsAt: number;
  /** Les alliés sont déjà venus aider : on ne les rappelle pas pour le même chantier. */
  readonly helped: boolean;
}

/** L'alliance du joueur : sa bannière, ce qu'il y a apporté, et l'état de ses technologies. */
export interface Alliance {
  readonly banner: BannerId;
  /** Jusqu'à cet instant, on change de bannière sans rien perdre. */
  readonly freeUntil: number;
  /** Contribution du joueur ; elle fait de lui un Officier. */
  readonly points: number;
  /** Crédits à dépenser dans la boutique. */
  readonly credits: number;
  /** Jour de saison auquel se rapportent les trois compteurs du jour qui suivent. */
  readonly day: number;
  readonly donations: number;
  readonly helped: number;
  readonly gift: boolean;
  /** Points versés dans chaque technologie, par tous les membres, à l'instant `syncedAt`. */
  readonly tech: Readonly<Record<AllianceTechId, number>>;
  /** La technologie où les membres versent leurs points ; `null` quand tout est au maximum. */
  readonly recommended: AllianceTechId | null;
  readonly syncedAt: number;
}

/** Un coffre de récompense qui attend d'être ouvert. */
export interface RewardChest {
  readonly kind: RewardChestKind;
  /** Instant où il a été gagné. */
  readonly at: number;
  /** Pour un coffre de ligue : la ligue (0 = la plus haute). Sinon 0. */
  readonly level: number;
  /** Son contenu : ressources en millionièmes d'unité, énergie et accélérateurs en unités. */
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
  readonly energy: number;
  readonly boosts: number;
}

/** Une ligne du journal : ce qui est arrivé, à qui, et ce que cela a rapporté ou coûté. */
export interface Report {
  readonly at: number;
  readonly kind: ReportKind;
  /** Victoire, attaque repoussée, récolte rentrée : vrai. Défaite, pillage subi, famine : faux. */
  readonly won: boolean;
  /** L'identifiant du rival, de la proie, du lieu ou de l'événement ; vide pour une famine. */
  readonly who: string;
  /** Ce qui a été gagné (attaque, chasse, récolte) ou pris (défense perdue), en millionièmes d'unité. */
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
  /** Butin perdu parce que la réserve était pleine. */
  readonly lost: number;
  /** Cellules filles perdues. */
  readonly troops: number;
  /** Le détail du combat (attaques et défenses) ; absent des rapports plus anciens. */
  readonly battle?: Battle;
}

/** Une sorte de cellule fille engagée dans un combat. */
export interface BattleTroop {
  readonly troop: TroopId;
  readonly count: number;
  /** Ce que vaut une cellule : son attaque (ou sa défense), double si elle est du bon type. */
  readonly each: number;
  /** Du bon type contre la cible : sa force est multipliée. */
  readonly strong: boolean;
  readonly lost: number;
}

/**
 * Ce qui s'ajoute (ou se retranche) à la force d'un camp, en plus de ses cellules :
 * garde d'un organisme, anoxie, bonus d'attaque ou de défense, bulle touchée, Paroi, renforts.
 */
export type BattleLineKey =
  | "guard"
  | "weakened"
  | "attackBonus"
  | "strike"
  | "rivalAttack"
  | "wall"
  | "defenseBonus"
  | "reinforcements";

export interface BattleLine {
  readonly key: BattleLineKey;
  /** Ce que la ligne ajoute à la force du camp (négatif quand elle l'affaiblit). */
  readonly value: number;
  /** Le pourcentage qui l'explique, quand il y en a un (bonus, bulle, anoxie) ; sinon 0. */
  readonly percent: number;
}

export interface BattleSide {
  readonly troops: readonly BattleTroop[];
  readonly lines: readonly BattleLine[];
  /** La force du camp : somme de ses cellules et de ses lignes. */
  readonly total: number;
  /** Part de ses cellules perdues, en % ; `null` pour un organisme simulé (rien n'est compté). */
  readonly lossPercent: number | null;
}

/** Le détail d'un combat, pour la page du rapport : qui avait quoi, et pourquoi l'un l'a emporté. */
export interface Battle {
  /** Le joueur était l'attaquant, ou le défenseur. */
  readonly mine: "attacker" | "defender";
  readonly attacker: BattleSide;
  readonly defender: BattleSide;
  readonly attackerWon: boolean;
  /** Le tempérament de la cible (les cellules du bon type comptent double) ; `null` en défense. */
  readonly kind: PreyKind | null;
}

/** Les combats du jour, pour la Gazette. */
export interface DailyRecord {
  readonly day: number;
  readonly wins: number;
  readonly losses: number;
}

export interface Expedition {
  /** Le lieu visé (sa case dans le monde). */
  readonly place: string;
  readonly kind: PlaceKind;
  /** Butin fixé au départ, en millionièmes d'unité. */
  readonly loot: number;
  /** Énergie dépensée au départ (rendue en cas d'annulation). */
  readonly energy: number;
  /** Temps de repos du lieu après le retour. */
  readonly restMs: number;
  readonly startedAt: number;
  readonly returnsAt: number;
  /** Rappelée par le joueur : elle revient à vide. */
  readonly cancelled: boolean;
}

/** Des cellules filles en train de naître, l'une après l'autre. */
/** L'évolution que le Noyau est en train d'exprimer. */
export interface Research {
  readonly evolution: EvolutionId;
  readonly toLevel: number;
  readonly endsAt: number;
}

/** Le prédateur apprivoisé par le joueur, et les gènes qu'il a reçus. */
export interface Companion {
  /** Son espèce : le niveau du prédateur d'origine (0 = le plus faible). */
  readonly species: number;
  readonly genes: Readonly<Record<GeneFamily, number>>;
}

export interface Training {
  readonly troop: TroopId;
  readonly remaining: number;
  /** Instant de la prochaine naissance. */
  readonly nextAt: number;
}

export interface Hunt {
  /** La proie visée (sa case dans le monde, précédée de « h: »). */
  readonly prey: string;
  readonly kind: PreyKind;
  readonly power: number;
  /** Protéines promises en cas de victoire, en millionièmes d'unité. */
  readonly proteins: number;
  readonly energy: number;
  readonly restMs: number;
  readonly party: Readonly<Record<TroopId, number>>;
  readonly startedAt: number;
  /** Le groupe atteint la proie : le joueur peut la toucher jusqu'à `resolveAt`. */
  readonly arrivesAt: number;
  /** Sans toucher du joueur, le sort décide à cet instant. */
  readonly resolveAt: number;
  readonly returnsAt: number;
  /** `null` tant que le combat n'a pas eu lieu. */
  readonly outcome: {
    readonly won: boolean;
    readonly struck: boolean;
    readonly losses: Readonly<Record<TroopId, number>>;
  } | null;
  /** Rappelée avant d'atteindre la proie. */
  readonly cancelled: boolean;
}

/** Une attaque contre un rival : comme une chasse, mais le butin se prend chez lui. */
export interface Raid {
  /** Le rival visé (sa place dans la goutte, précédée de « r: »). */
  readonly rival: string;
  readonly kind: PreyKind;
  /** Sa garde au moment du départ. */
  readonly power: number;
  /** Ce qu'il y avait à prendre au départ, en millionièmes d'unité. */
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
  readonly energy: number;
  readonly restMs: number;
  readonly party: Readonly<Record<TroopId, number>>;
  readonly startedAt: number;
  readonly arrivesAt: number;
  readonly resolveAt: number;
  readonly returnsAt: number;
  readonly outcome: {
    readonly won: boolean;
    readonly struck: boolean;
    readonly losses: Readonly<Record<TroopId, number>>;
    /** Le détail du combat, pour le rapport ; absent d'une attaque partie avant les rapports détaillés. */
    readonly battle?: Battle;
  } | null;
  readonly cancelled: boolean;
}

export interface Quest {
  readonly id: QuestId;
  /** Objectif et avancement : un nombre de fois, ou une quantité en millionièmes d'unité. */
  readonly target: number;
  readonly progress: number;
  /** Un défi : facultatif, plus dur, avec un plus gros coffre. */
  readonly challenge: boolean;
  /** Son coffre a été ouvert. */
  readonly claimed: boolean;
}

export interface DailyQuests {
  /** Jour de saison auquel ces quêtes appartiennent (1 = premier jour). */
  readonly day: number;
  readonly items: readonly Quest[];
}

/**
 * La vitrine d'un humain : ce que les autres joueurs de la saison voient de lui. Rien de plus :
 * ni compte, ni ressources, ni troupes.
 */
export interface HumanCard {
  /** Sa place dans l'océan. */
  readonly slot: number;
  /** Le nom de son espèce. */
  readonly name: string;
  readonly hue: number;
  readonly tier: number;
  readonly zone: number;
  /** Ses scores dans les cinq classements, à sa dernière visite. */
  readonly scores: Readonly<Record<RankingId, number>>;
  /** Sa progression au concours de la semaine `week` (0 : il n'y participe pas). */
  readonly week: number;
  readonly contest: number;
  /** L'instant de sa dernière visite. */
  readonly seenAt: number;
  /** Sa famille de gènes la plus travaillée ; `null` tant qu'il n'a aucun gène. */
  readonly family: GeneFamily | null;
  /** Sa bannière ; `null` avant l'ouverture des alliances. */
  readonly banner: BannerId | null;
  /** Ce qu'il a versé à son alliance (ses points d'alliance). */
  readonly given: number;
}

/** Les autres humains de la saison, tels que le serveur les connaît. */
export interface Crowd {
  readonly cards: readonly HumanCard[];
  /**
   * Ce que les humains ont pris dans chaque gisement (le joueur compris), en millionièmes
   * d'unité. Absent : personne n'a rien pris.
   */
  readonly taken?: Readonly<Record<string, number>>;
}

export interface PlayerState {
  readonly version: 11;
  /**
   * Les autres humains de la saison. Donnée par le serveur avant chaque calcul et renvoyée à
   * l'appareil ; jamais sauvegardée dans la partie. Absente : l'océan n'a que des organismes
   * simulés.
   */
  readonly crowd?: Crowd;
  /** L'alliance du joueur ; `null` avant l'ouverture des alliances. */
  readonly alliance: Alliance | null;
  readonly daily: DailyRecord;
  /**
   * La sortie des eaux : quand elle s'achève, et la place obtenue à l'arrivée (0 tant qu'elle
   * est en cours). `null` tant que le joueur ne l'a pas lancée.
   */
  readonly apex: { readonly endsAt: number; readonly place: number } | null;
  /** Niveau de chaque pouvoir de la recherche militaire. */
  readonly drills: Readonly<Record<DrillId, number>>;
  /** Récolte automatique : au retour d'une récolte, les cellules repartent toutes seules. */
  readonly autoHarvest: boolean;
  /** Les chantiers qui attendent derrière celui en cours, dans l'ordre. */
  readonly buildQueue: readonly QueuedBuild[];
  /** Accélérateurs en réserve : chacun hâte un chantier ou une évolution. */
  readonly boosts: number;
  /** Le journal, du plus récent au plus ancien. */
  readonly reports: readonly Report[];
  /**
   * Le concours de la semaine auquel le joueur participe : sa semaine, et son score au départ
   * (sa progression se mesure à partir de là). `null` hors concours.
   */
  readonly contest: { readonly week: number; readonly base: number } | null;
  /** Les coffres de récompense à ouvrir, du plus ancien au plus récent. */
  readonly chests: readonly RewardChest[];
  /** Graine du joueur : fixe son apparence et tous ses tirages. */
  readonly seed: number;
  readonly rngState: number;
  readonly seasonStart: number;
  /** Instant jusqu'où l'état a été calculé. */
  readonly now: number;
  readonly resources: Readonly<Record<ResourceId, number>>;
  /** Niveau de chaque organite ; 0 = pas encore construit. */
  readonly organelles: Readonly<Record<OrganelleId, number>>;
  readonly construction: Construction | null;
  readonly mutations: readonly MutationId[];
  /** Mutations proposées, en attente du choix du joueur. */
  readonly mutationOffer: readonly MutationId[] | null;
  readonly counters: Readonly<Record<CounterId, number>>;
  readonly tier: number;
  /** Sert à limiter le nombre de touchers par seconde. */
  readonly tapBudgetAt: number;
  /** Graine de la goutte : la même pour tous les joueurs d'une saison. */
  readonly worldSeed: number;
  /** Numéro de place du joueur dans la goutte. */
  readonly slot: number;
  /** Points d'énergie, et instant à partir duquel le prochain se regagne. */
  readonly energy: number;
  readonly energyAt: number;
  readonly expedition: Expedition | null;
  /** Lieux qui se regarnissent : pour chacun, l'instant où il redevient disponible. */
  readonly placeReadyAt: Readonly<Record<string, number>>;
  /** Cellules filles à la maison, par type. */
  readonly troops: Readonly<Record<TroopId, number>>;
  readonly training: Training | null;
  readonly hunt: Hunt | null;
  /** Quêtes du jour ; `null` tant que le joueur n'y a pas droit. */
  readonly quests: DailyQuests | null;
  readonly raid: Raid | null;
  /** Rivaux espionnés : pour chacun, l'instant où le renseignement expire. */
  readonly spiedUntil: Readonly<Record<string, number>>;
  /** Rivaux espionnés : pour chacun, le niveau des Récepteurs qui l'ont espionné. */
  readonly spyLevels: Readonly<Record<string, number>>;
  /** Sondes logées dans les Récepteurs, et instant à partir duquel la suivante se forme. */
  readonly spies: number;
  readonly spiesAt: number;
  /** Le joueur ne peut pas être attaqué avant cet instant. */
  readonly shieldUntil: number;
  /** Instant de la prochaine attaque subie ; `null` avant le palier des rivaux. */
  readonly nextRaidAt: number | null;
  /** Instant à partir duquel le mode absent peut être repris. */
  readonly awayReadyAt: number;
  /** Bouclier de nuit : minute du jour (temps universel) où il commence, ou rien s'il n'est pas réglé. */
  readonly nightStart: number | null;
  /** Le bouclier de nuit est rompu jusqu'à cet instant : le joueur a attaqué pendant sa nuit. */
  readonly nightOffUntil: number;
  /** Instant à partir duquel l'heure de la nuit peut être changée. */
  readonly nightReadyAt: number;
  readonly companion: Companion | null;
  /** Espèce du prédateur que le groupe de chasse en route cherche à apprivoiser, s'il y en a un. */
  readonly taming: number | null;
  /** Niveau exprimé de chaque évolution (0 : jamais exprimée). */
  readonly evolutions: Readonly<Record<EvolutionId, number>>;
  readonly research: Research | null;
  /** Zone de l'océan où vit le joueur : 0 = les abysses, puis de plus en plus près de la surface. */
  readonly zone: number;
  /** Ce que le joueur a déjà pris dans chaque gisement encore présent, en millionièmes d'unité. */
  readonly taken: Readonly<Record<string, number>>;
}

export type GameEvent =
  | { readonly type: "harvested"; readonly at: number; readonly amount: number }
  | {
      readonly type: "constructionStarted";
      readonly at: number;
      readonly organelle: OrganelleId;
      readonly toLevel: number;
      readonly endsAt: number;
    }
  | {
      readonly type: "constructionQueued";
      readonly at: number;
      readonly organelle: OrganelleId;
      readonly toLevel: number;
    }
  | {
      readonly type: "constructionUnqueued";
      readonly at: number;
      readonly organelle: OrganelleId;
      readonly toLevel: number;
    }
  | {
      readonly type: "constructionDone";
      readonly at: number;
      readonly organelle: OrganelleId;
      readonly level: number;
    }
  | { readonly type: "tierReached"; readonly at: number; readonly tier: number }
  | {
      readonly type: "mutationOffered";
      readonly at: number;
      readonly options: readonly MutationId[];
    }
  | { readonly type: "mutationChosen"; readonly at: number; readonly mutation: MutationId }
  | {
      readonly type: "expeditionSent";
      readonly at: number;
      readonly place: string;
      readonly returnsAt: number;
    }
  | { readonly type: "expeditionCancelled"; readonly at: number; readonly returnsAt: number }
  | {
      readonly type: "expeditionReturned";
      readonly at: number;
      readonly place: string;
      readonly resource: ResourceId;
      /** Ce qui est entré dans la réserve, et ce qui a débordé. */
      readonly gained: number;
      readonly lost: number;
      readonly cancelled: boolean;
    }
  | { readonly type: "troopBorn"; readonly at: number; readonly troop: TroopId }
  | {
      readonly type: "huntSent";
      readonly at: number;
      readonly prey: string;
      readonly arrivesAt: number;
      readonly returnsAt: number;
    }
  | { readonly type: "huntCancelled"; readonly at: number; readonly returnsAt: number }
  | {
      readonly type: "huntResolved";
      readonly at: number;
      readonly won: boolean;
      readonly struck: boolean;
      readonly losses: Readonly<Record<TroopId, number>>;
    }
  | {
      readonly type: "huntReturned";
      readonly at: number;
      readonly prey: string;
      readonly won: boolean;
      /** Protéines entrées dans la réserve, et protéines qui ont débordé. */
      readonly gained: number;
      readonly lost: number;
      readonly losses: number;
      readonly cancelled: boolean;
    }
  | { readonly type: "mutationBought"; readonly at: number; readonly price: number }
  | {
      readonly type: "chestOpened";
      readonly at: number;
      readonly index: number;
      readonly challenge: boolean;
      /** Contenu, en unités entières. */
      readonly loot: Readonly<Partial<Record<ChestReward, number>>>;
    }
  | {
      readonly type: "rivalSpied";
      readonly at: number;
      readonly rival: string;
      /** Le niveau du rapport : celui des Récepteurs. */
      readonly level: number;
    }
  /** Les Récepteurs du rival étaient plus hauts : la sonde est perdue. */
  | { readonly type: "rivalSpyFailed"; readonly at: number; readonly rival: string }
  | {
      readonly type: "raidSent";
      readonly at: number;
      readonly rival: string;
      readonly arrivesAt: number;
      readonly returnsAt: number;
    }
  | { readonly type: "raidCancelled"; readonly at: number; readonly returnsAt: number }
  | {
      readonly type: "raidResolved";
      readonly at: number;
      readonly won: boolean;
      readonly struck: boolean;
      readonly losses: Readonly<Record<TroopId, number>>;
      readonly battle: Battle;
    }
  | {
      readonly type: "raidReturned";
      readonly at: number;
      readonly rival: string;
      readonly won: boolean;
      /** Butin entré dans la réserve, par ressource, et total qui a débordé. */
      readonly gained: Readonly<Record<ResourceId, number>>;
      readonly lost: number;
      readonly losses: number;
      readonly cancelled: boolean;
      readonly battle?: Battle;
    }
  /** Un rival a attaqué le joueur et a été repoussé. */
  | { readonly type: "migrated"; readonly at: number; readonly zone: number }
  | { readonly type: "companionTamed"; readonly at: number; readonly species: number }
  | { readonly type: "geneShared"; readonly at: number; readonly family: GeneFamily }
  | {
      readonly type: "evolutionDone";
      readonly at: number;
      readonly evolution: EvolutionId;
      readonly level: number;
    }
  /** Des cellules filles sont mortes de faim : la réserve de sucre était vide. */
  | { readonly type: "troopsStarved"; readonly at: number; readonly count: number }
  | {
      readonly type: "leagueReward";
      readonly at: number;
      /** 0 = la plus haute ligue. */
      readonly league: number;
      readonly rank: number;
      readonly loot: Readonly<Record<ResourceId, number>>;
    }
  | {
      readonly type: "allianceJoined";
      readonly at: number;
      readonly banner: BannerId;
      /** Recruté d'office à l'ouverture des alliances. */
      readonly auto: boolean;
    }
  | {
      readonly type: "allianceDonated";
      readonly at: number;
      readonly tech: AllianceTechId;
      readonly points: number;
    }
  | { readonly type: "alliesHelped"; readonly at: number; readonly count: number }
  /** Les alliés ont raccourci le chantier en cours. */
  | { readonly type: "buildHelped"; readonly at: number; readonly savedMs: number }
  | {
      readonly type: "allianceGift";
      readonly at: number;
      readonly loot: Readonly<Record<ResourceId, number>>;
      readonly energy: number;
    }
  | { readonly type: "allianceBought"; readonly at: number; readonly item: AllianceShopId }
  /** Le Léviathan a frappé la cellule : la défense a cédé. */
  | {
      readonly type: "leviathanStruck";
      readonly at: number;
      readonly event: string;
      readonly sugar: number;
      readonly bricks: number;
      readonly proteins: number;
      readonly troopsLost: number;
    }
  | { readonly type: "leviathanRepelled"; readonly at: number; readonly event: string }
  | { readonly type: "boostGained"; readonly at: number; readonly count: number }
  /** La lignée du joueur a pris pied sur la terre ferme. */
  | {
      readonly type: "apexReached";
      readonly at: number;
      readonly place: number;
      readonly lineage: ApexLineage;
    }
  | {
      readonly type: "drillLearned";
      readonly at: number;
      readonly power: DrillId;
      readonly level: number;
    }
  | { readonly type: "chestEarned"; readonly at: number; readonly kind: RewardChestKind }
  /** Un concours de la semaine s'achève : le rang du joueur et sa progression. */
  | {
      readonly type: "contestEnded";
      readonly at: number;
      readonly week: number;
      readonly theme: RankingId;
      readonly rank: number;
      readonly score: number;
    }
  | {
      readonly type: "rewardOpened";
      readonly at: number;
      readonly kind: RewardChestKind;
      readonly level: number;
      readonly loot: {
        readonly sugar: number;
        readonly bricks: number;
        readonly proteins: number;
        readonly energy: number;
        readonly boosts: number;
      };
      /** Ouvert tout seul, parce que le joueur en avait trop en attente. */
      readonly auto: boolean;
    }
  | {
      readonly type: "boostUsed";
      readonly at: number;
      readonly target: BoostTarget;
      readonly savedMs: number;
    }
  | {
      readonly type: "attackRepelled";
      readonly at: number;
      readonly rival: string;
      /** Cellules filles perdues en défendant. */
      readonly troopsLost: number;
      readonly battle: Battle;
    }
  /** Un rival a attaqué le joueur et a pris une part de ses réserves. */
  | {
      readonly type: "attackSuffered";
      readonly at: number;
      readonly rival: string;
      readonly sugar: number;
      readonly bricks: number;
      readonly proteins: number;
      readonly troopsLost: number;
      readonly battle: Battle;
    };

export type OrderErrorCode =
  /** L'heure fournie est antérieure à l'état. */
  | "timeBackwards"
  /** La mécanique n'est pas encore débloquée pour ce joueur. */
  | "locked"
  | "tooFast"
  | "storageFull"
  | "alreadyBuilt"
  | "notBuilt"
  | "maxLevel"
  | "busy"
  | "insufficient"
  | "noOffer"
  | "notInOffer"
  | "unknownPlace"
  | "placeResting"
  | "noEnergy"
  | "noExpedition"
  | "troopsFull"
  | "noTroops"
  | "unknownPrey"
  | "noHunt"
  /** Le groupe n'est pas (ou plus) face à la proie. */
  | "notFighting"
  | "tooLate"
  | "offerPending"
  | "noMoreMutations"
  | "noQuest"
  | "questNotDone"
  | "alreadyClaimed"
  | "unknownRival"
  | "rivalClosed"
  | "alreadySpied"
  | "noRaid"
  | "awayResting"
  | "nightResting"
  | "zoneClosed"
  | "depleted"
  | "surface"
  | "unknownPredator"
  | "geneMissing"
  | "dormant"
  | "needsNucleus"
  | "researching"
  | "hasCompanion"
  | "noCompanion"
  | "grown"
  | "unknownEvent"
  /** On n'espionne ni n'attaque un membre de sa propre alliance. */
  | "ally"
  /** Plus aucune sonde dans les Récepteurs : il faut attendre qu'une se forme. */
  | "noSpies"
  /** Un vrai joueur tient cette place : pas de combat entre humains pour l'instant. */
  | "human"
  | "noAlliance"
  | "sameAlliance"
  | "donationsDone"
  | "notOfficer"
  | "noHelp"
  | "noConstruction"
  | "alreadyHelped"
  | "noCredits"
  | "energyFull"
  | "noChest"
  | "noBoost"
  /** Ni chantier ni évolution en cours : rien à hâter. */
  | "nothingToBoost"
  /** La file de chantiers est vide : rien à retirer. */
  | "queueEmpty";

export type OrderResult =
  | { readonly ok: true; readonly state: PlayerState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: OrderErrorCode };

export interface Step {
  readonly state: PlayerState;
  readonly events: readonly GameEvent[];
}
