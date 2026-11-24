import type {
  CounterId,
  MutationId,
  OrganelleId,
  PlaceKind,
  ChestReward,
  PreyKind,
  QuestId,
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

export interface Construction {
  readonly organelle: OrganelleId;
  readonly toLevel: number;
  readonly endsAt: number;
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

export interface PlayerState {
  readonly version: 7;
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
  | { readonly type: "rivalSpied"; readonly at: number; readonly rival: string }
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
    }
  /** Un rival a attaqué le joueur et a été repoussé. */
  | { readonly type: "migrated"; readonly at: number; readonly zone: number }
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
  | { readonly type: "attackRepelled"; readonly at: number; readonly rival: string }
  /** Un rival a attaqué le joueur et a pris une part de ses réserves. */
  | {
      readonly type: "attackSuffered";
      readonly at: number;
      readonly rival: string;
      readonly sugar: number;
      readonly bricks: number;
      readonly proteins: number;
      readonly troopsLost: number;
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
  | "unknownPredator";

export type OrderResult =
  | { readonly ok: true; readonly state: PlayerState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: OrderErrorCode };

export interface Step {
  readonly state: PlayerState;
  readonly events: readonly GameEvent[];
}
