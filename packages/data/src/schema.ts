/** Schémas de validation : une donnée invalide fait échouer le chargement et les tests. */
import { z } from "zod";
import {
  COUNTER_IDS,
  MUTATION_IDS,
  ORDER_TYPES,
  ORGANELLE_IDS,
  QUEST_IDS,
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
  /** Points de défense ajoutés par niveau, contre les attaques des rivaux. */
  z.strictObject({ kind: z.literal("defense"), perLevel: positiveInt }),
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
    wall: OrganelleSchema,
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
  quests: z.strictObject({
    /** Palier à partir duquel le joueur reçoit des quêtes. */
    tier: positiveInt,
    /** Nombre de quêtes ordinaires par jour ; un défi s'y ajoute. */
    perDay: positiveInt,
    pool: z.record(
      z.enum(QUEST_IDS),
      z.strictObject({
        /** Palier à partir duquel cette quête peut être tirée. */
        tier: positiveInt,
        /** Un défi : facultatif, plus dur, avec un plus gros coffre. */
        challenge: z.boolean(),
        /** L'objectif est tiré au hasard entre ces deux bornes, en unités entières. */
        min: positiveInt,
        max: positiveInt,
      }),
    ),
  }),
  /** Contenu possible d'un coffre : une des lignes est tirée au sort (deux pour un défi). */
  chests: z.strictObject({
    normal: z.strictObject({
      sugar: positiveInt,
      bricks: positiveInt,
      proteins: positiveInt,
      energy: positiveInt,
    }),
    challenge: z.strictObject({
      sugar: positiveInt,
      bricks: positiveInt,
      proteins: positiveInt,
      energy: positiveInt,
    }),
    challengeDraws: positiveInt,
  }),
  /** Les voisins du joueur. Leur force et leur butin grandissent avec les jours de la saison. */
  rivals: z.strictObject({
    /** Nombre de voisins visibles. */
    count: positiveInt,
    /** Tempérament : chaque rival vaut entre ces deux pourcentages de la valeur de base. */
    temperMinPercent: positiveInt,
    temperMaxPercent: positiveInt,
    /** Valeur au premier jour, puis ajout par jour de saison. */
    guard: z.strictObject({ base: positiveInt, perDay: positiveInt }),
    attack: z.strictObject({ base: positiveInt, perDay: positiveInt }),
    sugar: z.strictObject({ base: positiveInt, perDay: positiveInt }),
    bricks: z.strictObject({ base: positiveInt, perDay: positiveInt }),
    proteins: z.strictObject({ base: positiveInt, perDay: positiveInt }),
    raid: z.strictObject({
      energy: positiveInt,
      /** Durée de l'aller-retour par pas de distance (un voisin direct est à un pas). */
      stepSeconds: positiveInt,
      /** Points de chance ajoutés si le joueur touche pendant le combat. Pas de victoire certaine. */
      strikeBonusPercent: z.number().int().min(0).max(50),
      /** Charge que chaque survivante rapporte, en unités de sucre (une brique en vaut deux). */
      carryPerCell: positiveInt,
      /** Après un pillage, le rival se referme ce nombre d'heures. */
      restHours: positiveInt,
      /** Poids d'une protéine, en unités de sucre. Les protéines se chargent en dernier. */
      proteinWeight: positiveInt,
      /** Part des protéines d'un organisme qu'un pillage peut prendre, au plus. */
      proteinSharePercent: z.number().int().min(0).max(100),
    }),
    spy: z.strictObject({ energy: positiveInt, hours: positiveInt }),
    /** Les attaques que le joueur subit. */
    incoming: z.strictObject({
      /** Un nouveau joueur n'est pas attaqué avant ce palier, sauf s'il attaque lui-même. */
      newcomerUntilTier: positiveInt,
      /** Délai, après la fin d'une protection, avant la prochaine attaque. */
      minHours: positiveInt,
      maxHours: positiveInt,
      /** Protection accordée après une attaque subie. */
      shieldHours: positiveInt,
      troopLossPercent: z.number().int().min(0).max(90),
    }),
    /** Mode absent : une longue protection, puis un délai avant de pouvoir la reprendre. */
    away: z.strictObject({ hours: positiveInt, restHours: positiveInt }),
    /** Bouclier de nuit : sa durée chaque jour, et le délai avant de pouvoir changer d'heure. */
    night: z.strictObject({ hours: z.number().int().min(1).max(23), changeHours: positiveInt }),
  }),
  /**
   * L'océan : un disque. On naît au bord, dans les abysses ; la terre ferme est au centre.
   * Les zones sont rangées de la plus profonde à la plus proche de la surface.
   */
  ocean: z.strictObject({
    /** Palier où le joueur découvre l'océan. */
    tier: positiveInt,
    /** Rayon de la terre ferme, au centre, en cases. */
    landRadius: positiveInt,
    /** Profondeur au rivage de la terre ferme, en mètres. */
    shoreDepth: nonNegativeInt,
    zones: z
      .array(
        z.strictObject({
          /** Rayon extérieur de la zone, en cases. */
          outer: positiveInt,
          /** Profondeur au bord extérieur, en mètres. */
          depth: positiveInt,
          /** Écart entre deux organismes voisins, en cases. */
          pitch: z.number().int().min(3),
          /** Jour de saison où la zone s'ouvre. */
          openDay: positiveInt,
          /** Richesse des gisements et du butin, en pourcentage de celle des abysses. */
          richPercent: positiveInt,
          /** Force des gardes, en pourcentage de celle des abysses. */
          guardPercent: positiveInt,
          /** Nombre d'organismes qui y trouvent une place. */
          entrants: positiveInt,
        }),
      )
      .min(2),
    /** Les organismes simulés montent dans une zone étalés sur ce nombre de jours. */
    riseSpreadDays: positiveInt,
    /** Un « pas » de trajet d'attaque vaut ce nombre de cases. */
    cellsPerStep: positiveInt,
    /** Les gisements : communs à tous, ils se vident puis d'autres apparaissent ailleurs. */
    deposit: z.strictObject({
      /** Côté des secteurs qui portent chacun au plus un gisement, en cases. */
      sector: positiveInt,
      chancePercent: z.number().int().min(1).max(100),
      /** Durée d'un cycle : un gisement neuf peut apparaître dans le secteur à chaque cycle. */
      epochHours: positiveInt,
      /** Un gisement est vidé par les autres en une part du cycle, au moins celle-ci. */
      minLifePercent: z.number().int().min(10).max(100),
      /** Un gisement neuf contient ce nombre de chargements. */
      loads: positiveInt,
      /** Un chargement dans les abysses, par sorte de gisement. */
      load: z.strictObject({
        sugarCluster: positiveInt,
        debris: positiveInt,
        carcass: positiveInt,
      }),
      /** Part des gisements de sucre, puis de briques ; le reste donne des protéines. */
      sugarPercent: z.number().int().min(1).max(98),
      bricksPercent: z.number().int().min(1).max(98),
      energy: positiveInt,
      /** Durée de trajet par case, aller simple. */
      secondsPerCell: positiveInt,
      minSeconds: positiveInt,
    }),
    /** Prix pour remonter dans la zone suivante : une ligne par frontière. */
    migrate: z.array(
      z.strictObject({ sugar: positiveInt, bricks: positiveInt, proteins: positiveInt }),
    ),
  }),
  /** Prix en protéines de chaque nouvelle mutation ; le dernier prix vaut pour toutes les suivantes. */
  mutationPrices: z.array(positiveInt).min(1),
  /** Géométrie de la goutte, en unités de carte. Entiers uniquement. */
  world: z.strictObject({
    /** Nombre d'organismes dans une goutte. */
    organisms: positiveInt,
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
  /** Ouvrir le coffre d'une quête terminée, désignée par sa position dans la liste du jour. */
  z.strictObject({ type: z.literal("claimQuest"), index: z.number().int().min(0).max(9) }),
  /** Un rival est désigné par sa place dans la goutte, précédée de « r: ». */
  z.strictObject({
    type: z.literal("spyRival"),
    rival: z.string().regex(/^r:-?\d{1,6}:-?\d{1,6}$/),
  }),
  z.strictObject({
    type: z.literal("sendRaid"),
    rival: z.string().regex(/^r:-?\d{1,6}:-?\d{1,6}$/),
    party: z.strictObject({
      hunter: z.number().int().min(0).max(500),
      armored: z.number().int().min(0).max(500),
      swift: z.number().int().min(0).max(500),
    }),
  }),
  z.strictObject({ type: z.literal("strikeRaid") }),
  z.strictObject({ type: z.literal("cancelRaid") }),
  /** Passer en mode absent : une longue protection, que la première attaque envoyée fait tomber. */
  z.strictObject({ type: z.literal("goAway") }),
  /** Choisir l'heure de son bouclier de nuit : la minute du jour (temps universel) où il commence. */
  z.strictObject({ type: z.literal("setNight"), minute: z.number().int().min(0).max(1439) }),
  /** Récolter un gisement commun, désigné par son secteur et son cycle : « d:colonne:ligne:cycle ». */
  z.strictObject({
    type: z.literal("gather"),
    deposit: z.string().regex(/^d:-?d{1,4}:-?d{1,4}:d{1,9}$/),
  }),
  /** Remonter d'une zone vers la surface. */
  z.strictObject({ type: z.literal("migrate") }),
]);
export type Order = z.infer<typeof OrderSchema>;

/** Ce que le client envoie pour passer un ordre. L'identifiant sert à ne jamais le compter deux fois. */
export const OrderRequestSchema = z.strictObject({ orderId: z.uuid(), order: OrderSchema });
export type OrderRequest = z.infer<typeof OrderRequestSchema>;
