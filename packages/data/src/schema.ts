/** Schémas de validation : une donnée invalide fait échouer le chargement et les tests. */
import { z } from "zod";
import {
  COUNTER_IDS,
  MUTATION_IDS,
  ORDER_TYPES,
  ORGANELLE_IDS,
  RESOURCE_IDS,
  TROOP_IDS,
  STAT_IDS,
  TRAIT_IDS,
  UI_ELEMENT_IDS,
} from "./ids";

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

/** Un coût, en unités entières de chaque ressource. */
export const CostSchema = z.strictObject({ sugar: nonNegativeInt, bricks: nonNegativeInt });

export const OrganelleEffectSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("production"),
    resource: z.enum(RESOURCE_IDS),
    /** Millièmes d'unité produits par seconde, par niveau (500 = 0,5 par seconde). */
    milliPerSecondPerLevel: positiveInt,
  }),
  z.strictObject({ kind: z.literal("storage"), addPerLevel: positiveInt }),
  z.strictObject({ kind: z.literal("tapYield"), addPercentPerLevel: positiveInt }),
  /** Nombre maximal de cellules filles : `base` au niveau 1, puis `addPerLevel` par niveau. */
  z.strictObject({ kind: z.literal("troopCapacity"), base: positiveInt, addPerLevel: positiveInt }),
]);

export const OrganelleSchema = z.strictObject({
  /** Palier à partir duquel l'organite peut être construit. */
  tier: nonNegativeInt,
  buildCost: CostSchema,
  buildSeconds: positiveInt,
  /** Briques demandées pour passer au niveau 2 ; grandit ensuite comme le reste. */
  upgradeBricks: nonNegativeInt,
  maxLevel: positiveInt,
  effect: OrganelleEffectSchema,
});

export const MutationSchema = z.strictObject({
  stat: z.enum(STAT_IDS),
  /** Pourcentage ajouté (négatif pour une réduction de coût ou de durée). */
  percent: z.number().int().min(-90).max(500),
  trait: z.enum(TRAIT_IDS),
});

export const BalanceSchema = z.strictObject({
  tap: z.strictObject({
    /** Unités gagnées par toucher. */
    yield: positiveInt,
    /** Délai minimal entre deux touchers comptés, en millisecondes. */
    minIntervalMs: positiveInt,
    /** Nombre de touchers qu'on peut envoyer d'un coup après une pause. */
    burst: positiveInt,
  }),
  baseStorage: z.strictObject({ sugar: positiveInt, bricks: positiveInt, proteins: positiveInt }),
  upgrade: z.strictObject({
    /** Le coût est multiplié par ce pourcentage à chaque niveau (160 = ×1,6). */
    costGrowthPercent: z.number().int().min(101),
    timeGrowthPercent: z.number().int().min(100),
  }),
  organelles: z.strictObject({
    mitochondrion: OrganelleSchema,
    vacuole: OrganelleSchema,
    cilia: OrganelleSchema,
    ribosome: OrganelleSchema,
    nursery: OrganelleSchema,
  } satisfies Record<(typeof ORGANELLE_IDS)[number], unknown>),
  mutations: z.strictObject({
    swiftCilia: MutationSchema,
    thickWall: MutationSchema,
    fastMetabolism: MutationSchema,
    digestivePouch: MutationSchema,
    quickDivision: MutationSchema,
    thrift: MutationSchema,
  } satisfies Record<(typeof MUTATION_IDS)[number], unknown>),
  /** Palier dont l'arrivée propose une mutation, et nombre de mutations proposées. */
  mutationOffer: z.strictObject({ tier: positiveInt, choices: positiveInt }),
  /** L'énergie limite les expéditions. Elle se regagne toute seule, un point à la fois. */
  energy: z.strictObject({ max: positiveInt, regenSeconds: positiveInt }),
  expedition: z.strictObject({
    /** Une expédition annulée revient ce nombre de fois plus vite qu'à l'aller. */
    cancelSpeedup: positiveInt,
    /** Nombre de lieux visibles dans chaque bande de distance. */
    placesPerBand: positiveInt,
    /** Du plus proche au plus loin. Butin en unités entières. */
    bands: z
      .array(
        z.strictObject({
          energy: positiveInt,
          seconds: positiveInt,
          sugar: positiveInt,
          bricks: positiveInt,
          /** Temps que met le lieu à se regarnir pour le joueur. */
          restSeconds: positiveInt,
        }),
      )
      .length(3),
  }),
  /** Les cellules filles : ce que chacune coûte et le temps qu'elle met à naître. */
  troops: z.strictObject({
    hunter: z.strictObject({ cost: CostSchema, seconds: positiveInt }),
    armored: z.strictObject({ cost: CostSchema, seconds: positiveInt }),
    swift: z.strictObject({ cost: CostSchema, seconds: positiveInt }),
  } satisfies Record<(typeof TROOP_IDS)[number], unknown>),
  hunt: z.strictObject({
    /** Une cellule du bon type contre la bonne proie compte ce nombre de fois. */
    strongMultiplier: positiveInt,
    /** Durée pendant laquelle le joueur peut toucher la proie, à l'arrivée du groupe. */
    strikeWindowSeconds: positiveInt,
    /** À partir de ces chances, toucher rend la victoire certaine ; en dessous, il les double. */
    certainFromPercent: z.number().int().min(1).max(100),
    /** Points de chance en moins quand le joueur laisse le sort décider sans toucher la proie. */
    unattendedPenaltyPercent: z.number().int().min(0).max(50),
    /** Du plus proche au plus loin. */
    bands: z
      .array(
        z.strictObject({
          energy: positiveInt,
          /** Durée de l'aller-retour, sans compter le combat. */
          seconds: positiveInt,
          power: positiveInt,
          proteins: positiveInt,
          restSeconds: positiveInt,
        }),
      )
      .length(3),
  }),
  /** Prix en protéines de chaque nouvelle mutation ; le dernier prix vaut pour toutes les suivantes. */
  mutationPrices: z.array(positiveInt).min(1),
  /** Géométrie de la goutte, en unités de carte. Entiers uniquement. */
  world: z.strictObject({
    /** Écart entre deux joueurs voisins. */
    playerSpacing: positiveInt,
    /** Côté des cases invisibles qui contiennent chacune au plus un lieu. */
    placeCell: positiveInt,
    placeChancePercent: z.number().int().min(1).max(100),
    sugarChancePercent: z.number().int().min(1).max(99),
    /** Un lieu plus proche que cela de la cellule est ignoré (il serait dessous). */
    minDistance: positiveInt,
    /** Nombre de cases regardées de chaque côté du joueur. */
    searchCells: positiveInt,
  }),
});
export type Balance = z.infer<typeof BalanceSchema>;
export type OrganelleData = z.infer<typeof OrganelleSchema>;
export type MutationData = z.infer<typeof MutationSchema>;
export type Cost = z.infer<typeof CostSchema>;

export const UnlockSchema = z.strictObject({
  tier: nonNegativeInt,
  /** Ce que le joueur doit avoir accompli. `null` : rien à accomplir. */
  condition: z.strictObject({ counter: z.enum(COUNTER_IDS), atLeast: positiveInt }).nullable(),
  /** Jour de saison minimal (1 = premier jour). `null` : pas de date. */
  minDay: positiveInt.nullable(),
  /** Éléments d'interface qui apparaissent à ce palier. */
  ui: z.array(z.enum(UI_ELEMENT_IDS)),
  /** Ordres qui deviennent autorisés à ce palier. */
  orders: z.array(z.enum(ORDER_TYPES)),
});
export type Unlock = z.infer<typeof UnlockSchema>;

/** Un ordre envoyé par le joueur. Le serveur valide toute entrée avec ce schéma. */
export const OrderSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("harvest"), taps: z.number().int().min(1).max(100) }),
  z.strictObject({ type: z.literal("build"), organelle: z.enum(ORGANELLE_IDS) }),
  z.strictObject({ type: z.literal("upgrade"), organelle: z.enum(ORGANELLE_IDS) }),
  z.strictObject({ type: z.literal("chooseMutation"), mutation: z.enum(MUTATION_IDS) }),
  /** Un lieu est désigné par sa case : « colonne:ligne ». */
  z.strictObject({
    type: z.literal("sendExpedition"),
    place: z.string().regex(/^-?\d{1,6}:-?\d{1,6}$/),
  }),
  z.strictObject({ type: z.literal("cancelExpedition") }),
  z.strictObject({
    type: z.literal("trainTroop"),
    troop: z.enum(TROOP_IDS),
    count: z.number().int().min(1).max(20),
  }),
  /** Une proie est désignée par sa case, précédée de « h: ». */
  z.strictObject({
    type: z.literal("sendHunt"),
    prey: z.string().regex(/^h:-?\d{1,6}:-?\d{1,6}$/),
    party: z.strictObject({
      hunter: z.number().int().min(0).max(500),
      armored: z.number().int().min(0).max(500),
      swift: z.number().int().min(0).max(500),
    }),
  }),
  z.strictObject({ type: z.literal("strikeHunt") }),
  z.strictObject({ type: z.literal("cancelHunt") }),
  z.strictObject({ type: z.literal("buyMutation") }),
]);
export type Order = z.infer<typeof OrderSchema>;

/** Ce que le client envoie pour passer un ordre. L'identifiant sert à ne jamais le compter deux fois. */
export const OrderRequestSchema = z.strictObject({ orderId: z.uuid(), order: OrderSchema });
export type OrderRequest = z.infer<typeof OrderRequestSchema>;
