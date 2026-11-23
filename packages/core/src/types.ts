import type { CounterId, MutationId, OrganelleId, PlaceKind, ResourceId } from "@o27/data";

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

export interface PlayerState {
  readonly version: 2;
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
  | "noExpedition";

export type OrderResult =
  | { readonly ok: true; readonly state: PlayerState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: OrderErrorCode };

export interface Step {
  readonly state: PlayerState;
  readonly events: readonly GameEvent[];
}
