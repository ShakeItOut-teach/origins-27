/** Schémas de validation : une donnée invalide fait échouer le chargement et les tests. */
import { z } from "zod";
import {
  COUNTER_IDS,
  MUTATION_IDS,
  ORDER_TYPES,
  ORGANELLE_IDS,
  RESOURCE_IDS,
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
  baseStorage: z.strictObject({ sugar: positiveInt, bricks: positiveInt }),
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
]);
export type Order = z.infer<typeof OrderSchema>;

/** Ce que le client envoie pour passer un ordre. L'identifiant sert à ne jamais le compter deux fois. */
export const OrderRequestSchema = z.strictObject({ orderId: z.uuid(), order: OrderSchema });
export type OrderRequest = z.infer<typeof OrderRequestSchema>;
