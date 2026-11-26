/** Schémas de validation : une donnée invalide fait échouer le chargement et les tests. */
import { z } from "zod";
import {
  ALLIANCE_BRANCHES,
  ALLIANCE_SHOP_IDS,
  ALLIANCE_TECH_IDS,
  BANNER_IDS,
  BOOST_TARGETS,
  CRISIS_KINDS,
  DRILL_IDS,
  EVOLUTION_BRANCHES,
  EVOLUTION_IDS,
  GENE_FAMILIES,
  COUNTER_IDS,
  MUTATION_IDS,
  ORDER_TYPES,
  ORGANELLE_IDS,
  QUEST_IDS,
  RANKING_IDS,
  RESOURCE_IDS,
  TROOP_IDS,
  STAT_IDS,
  TRAIT_IDS,
  UI_ELEMENT_IDS,
} from "./ids";

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

/** Une courbe : des points [abscisse, valeur] dont les abscisses montent strictement. */
const curve = z
  .array(z.tuple([nonNegativeInt, nonNegativeInt]))
  .min(2)
  .refine(
    (points) =>
      points.every((point, index) => index === 0 || point[0] > (points[index - 1]?.[0] ?? -1)),
    {
      message: "les abscisses d'une courbe doivent monter",
    },
  );

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
  /**
   * Fait naître les cellules filles, sans limite de nombre. Chaque niveau au-delà du premier
   * accélère les naissances de ce pourcentage.
   */
  z.strictObject({ kind: z.literal("trainingSpeed"), percentPerLevel: positiveInt }),
  /** Points de défense ajoutés par niveau, contre les attaques des rivaux. */
  z.strictObject({ kind: z.literal("defense"), perLevel: positiveInt }),
  /** Un pourcentage ajouté à une statistique, par niveau (récolte, chasse…). */
  z.strictObject({
    kind: z.literal("bonus"),
    stat: z.enum(STAT_IDS),
    percentPerLevel: z.number().int(),
  }),
  /** Exprime les évolutions ; chaque niveau au-delà du premier accélère la recherche. */
  z.strictObject({ kind: z.literal("research"), percentPerLevel: positiveInt }),
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
  /** Sa famille : trois gènes d'une même famille ouvrent une lignée. */
  family: z.enum(GENE_FAMILIES),
  /** Palier à partir duquel la mutation peut être proposée. */
  tier: nonNegativeInt,
});

/** Ce qu'une famille de gènes fait d'un compagnon : une force, et sa contrepartie. */
const CompanionFamilySchema = z.strictObject({
  stat: z.enum(STAT_IDS),
  /** Force : première forme, forme adulte mêlée, forme adulte pure. */
  bonus: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  /** Faiblesse : légère (première forme, forme mêlée), puis aggravée (forme pure). */
  weakness: z.strictObject({
    stat: z.enum(STAT_IDS),
    percent: z.tuple([z.number().int(), z.number().int()]),
  }),
});

export const TroopSchema = z.strictObject({
  /** Palier à partir duquel on peut la faire naître. */
  tier: nonNegativeInt,
  /** Famille de gènes demandée, et combien de ses gènes il faut. `null` : aucune. */
  family: z.enum(GENE_FAMILIES).nullable(),
  genes: nonNegativeInt,
  cost: CostSchema,
  /** Protéines demandées en plus, à la naissance. */
  proteins: nonNegativeInt,
  seconds: positiveInt,
  /** Ce qu'elle vaut à l'attaque, à la défense de la cellule, et ce qu'elle porte. */
  power: positiveInt,
  defense: positiveInt,
  carry: positiveInt,
  /** Ce qu'elle mange, en parts de l'entretien d'une cellule fille de rang 1. */
  upkeep: positiveInt,
});

export const BalanceSchema = z.strictObject({
  tap: z.strictObject({
    /** Millièmes d'unité gagnés par toucher (100 = un dixième). Rien ne l'augmente : toucher occupe, sans remplacer la production. */
    yieldMilli: positiveInt,
    /** Délai minimal entre deux touchers comptés, en millisecondes. */
    minIntervalMs: positiveInt,
    /** Nombre de touchers qu'on peut envoyer d'un coup après une pause. */
    burst: positiveInt,
  }),
  baseStorage: z.strictObject({ sugar: positiveInt, bricks: positiveInt, proteins: positiveInt }),
  /**
   * Les bonus et malus d'une statistique s'additionnent, mais jamais en dessous de ce pourcentage :
   * une durée ne tombe jamais sous le quart de sa valeur.
   */
  modifierFloorPercent: z.number().int().min(-99).max(0),
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
    golgi: OrganelleSchema,
    nucleus: OrganelleSchema,
    lysosome: OrganelleSchema,
  } satisfies Record<(typeof ORGANELLE_IDS)[number], unknown>),
  mutations: z.strictObject({
    swiftCilia: MutationSchema,
    thickWall: MutationSchema,
    fastMetabolism: MutationSchema,
    digestivePouch: MutationSchema,
    quickDivision: MutationSchema,
    thrift: MutationSchema,
    armorPlates: MutationSchema,
    dormancy: MutationSchema,
    flagellum: MutationSchema,
    voracity: MutationSchema,
    harpoon: MutationSchema,
    swarming: MutationSchema,
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
    hunter: TroopSchema,
    armored: TroopSchema,
    swift: TroopSchema,
    toxic: TroopSchema,
    guardian: TroopSchema,
    scout: TroopSchema,
    carrier: TroopSchema,
    rotifer: TroopSchema,
    tardigrade: TroopSchema,
    copepod: TroopSchema,
    salp: TroopSchema,
    chaetognath: TroopSchema,
    ostracod: TroopSchema,
    krill: TroopSchema,
    larvacean: TroopSchema,
    eurypterid: TroopSchema,
    trilobite: TroopSchema,
    conodont: TroopSchema,
    nautiloid: TroopSchema,
  } satisfies Record<(typeof TROOP_IDS)[number], unknown>),
  /** Les évolutions : ce que le Noyau peut exprimer. */
  research: z.strictObject({
    tier: positiveInt,
    maxLevel: positiveInt,
    /** Le coût et la durée sont multipliés par ces pourcentages à chaque niveau. */
    costGrowthPercent: z.number().int().min(100),
    timeGrowthPercent: z.number().int().min(100),
    /** Nombre d'évolutions dormantes par branche, chaque saison. */
    dormantPerBranch: nonNegativeInt,
    /** Effet d'une évolution favorisée par la saison, en pourcentage de l'effet normal. */
    favouredPercent: z.number().int().min(100),
  }),
  evolutions: z.record(
    z.enum(EVOLUTION_IDS),
    z.strictObject({
      branch: z.enum(EVOLUTION_BRANCHES),
      stat: z.enum(STAT_IDS),
      /** Pourcentage ajouté à la statistique par niveau (négatif pour une réduction). */
      percentPerLevel: z.number().int(),
      cost: z.strictObject({ sugar: positiveInt, bricks: positiveInt, proteins: positiveInt }),
      seconds: positiveInt,
    }),
  ),
  /**
   * Le compagnon : un prédateur apprivoisé, qui grandit avec les gènes qu'on lui partage.
   * Sa forme dépend des familles reçues ; chaque forme a une force et une faiblesse.
   */
  companion: z.strictObject({
    tier: positiveInt,
    /** Prix en protéines de chaque gène partagé, dans l'ordre. */
    sharePrices: z.array(positiveInt).min(1),
    /** Nombre de gènes reçus pour la première forme, puis pour la forme adulte. */
    firstFormAt: positiveInt,
    adultAt: positiveInt,
    /** Gènes d'une même famille qui font une forme adulte « pure ». */
    pureAt: positiveInt,
    /** Force d'un compagnon dans la famille de prédilection de son espèce, en pourcentage. */
    affinityPercent: z.number().int().min(100),
    /** Une espèce par niveau de prédateur, avec sa famille de prédilection. */
    species: z.array(z.strictObject({ affinity: z.enum(GENE_FAMILIES) })).min(1),
    families: z.strictObject({
      metabolism: CompanionFamilySchema,
      predation: CompanionFamilySchema,
      mobility: CompanionFamilySchema,
      resilience: CompanionFamilySchema,
    } satisfies Record<(typeof GENE_FAMILIES)[number], unknown>),
  }),
  /** Les familles de gènes : à partir de ce palier, trois gènes d'une famille font une lignée. */
  genes: z.strictObject({ tier: positiveInt, lineageGenes: positiveInt }),
  /** Ce qu'apporte chaque lignée. */
  lineages: z.strictObject({
    metabolism: z.strictObject({ stat: z.enum(STAT_IDS), percent: z.number().int() }),
    predation: z.strictObject({ stat: z.enum(STAT_IDS), percent: z.number().int() }),
    mobility: z.strictObject({ stat: z.enum(STAT_IDS), percent: z.number().int() }),
    resilience: z.strictObject({ stat: z.enum(STAT_IDS), percent: z.number().int() }),
  } satisfies Record<(typeof GENE_FAMILIES)[number], unknown>),
  /**
   * L'entretien : chaque cellule fille vivante consomme du sucre, en millièmes d'unité par
   * seconde. C'est ce qui limite la taille d'une armée, et non plus un plafond.
   */
  troopUpkeep: z.strictObject({
    milliPerSecond: positiveInt,
    /**
     * La famine : réserve vide, les cellules en trop meurent par vagues, à chaque multiple de
     * cet intervalle. Le joueur a donc toujours un moment pour réagir.
     */
    famineSeconds: positiveInt,
    /** Part des cellules à la maison qui meurent à chaque vague (au moins une). */
    faminePercent: z.number().int().min(1).max(100),
  }),
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
      /** Le joueur est prévenu ce temps-là avant qu'une attaque n'arrive. */
      warningMinutes: positiveInt,
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
  /** La puissance : un seul nombre qui dit ce que valent une cellule et ses troupes. */
  power: z.strictObject({
    perOrganelleLevel: positiveInt,
    perMutation: positiveInt,
    perEvolutionLevel: positiveInt,
    /** Par zone remontée. */
    perZone: positiveInt,
    perTroop: positiveInt,
  }),
  /**
   * Les scores des organismes simulés. Comme de vrais joueurs, ils ne jouent pas tous autant :
   * quelques-uns filent devant, beaucoup suivent, les moins ambitieux abandonnent en route.
   */
  ranking: z.strictObject({
    tier: positiveInt,
    /**
     * Le score d'un organisme moyen, jour par jour : des points [jour, score], du premier jour
     * au dernier ; entre deux points, la ligne droite. La cellule ne compte pas ses zones, qui
     * s'ajoutent comme pour le joueur.
     */
    median: z.strictObject({
      cell: curve,
      troops: curve,
      loot: curve,
      defense: curve,
    }),
    /**
     * L'élan d'un organisme d'après son ambition : des points [centile, pourcentage du score
     * moyen], du moins ambitieux (0) au plus ambitieux (100).
     */
    drive: curve,
    /** Ce que l'élan pèse dans chaque classement, en pourcentage : la cellule s'écarte moins. */
    spread: z.strictObject({
      cell: nonNegativeInt,
      troops: nonNegativeInt,
      loot: nonNegativeInt,
      defense: nonNegativeInt,
    }),
    /**
     * Certains partent vite puis ralentissent, d'autres l'inverse : jusqu'à ce pourcentage de
     * plus le premier jour, et de moins le dernier (ou l'inverse).
     */
    pacePercent: z.number().int().min(0).max(90),
    /** Sous ce centile d'ambition, l'organisme abandonne un jour entre ces deux-là : son score se fige. */
    quit: z.strictObject({
      belowPercentile: z.number().int().min(0).max(100),
      fromDay: positiveInt,
      toDay: positiveInt,
    }),
  }),
  /**
   * Les ligues, de la plus haute à la plus basse. Chaque minuit, le joueur reçoit la
   * récompense de base multipliée par le pourcentage de sa ligue.
   */
  leagues: z
    .array(
      z.strictObject({
        /** La ligue accueille les joueurs classés dans ce premier pourcentage. */
        topPercent: z.number().int().min(1).max(100),
        rewardPercent: positiveInt,
      }),
    )
    .min(2),
  leagueReward: z.strictObject({ sugar: positiveInt, bricks: positiveInt, proteins: positiveInt }),
  /** Les prédateurs de l'océan : des animaux à chasser, plus forts près de la surface. */
  predators: z.strictObject({
    sector: positiveInt,
    chancePercent: z.number().int().min(1).max(100),
    /** Un prédateur reste ce temps-là, puis un autre apparaît ailleurs. */
    epochHours: positiveInt,
    energy: positiveInt,
    /** Du plus faible au plus fort, dans les abysses. */
    levels: z.array(z.strictObject({ power: positiveInt, proteins: positiveInt })).min(1),
  }),
  /**
   * Les événements de zone. L'océan est découpé en grands quartiers ; à chaque cycle, chacun
   * a une chance de voir naître un événement, le même pour tous les joueurs.
   */
  events: z.strictObject({
    tier: positiveInt,
    /** Côté d'un quartier, en cases. */
    district: positiveInt,
    epochHours: positiveInt,
    chancePercent: z.number().int().min(1).max(100),
    /** Éruption hydrothermale : des gisements très riches autour d'une cheminée. */
    eruption: z.strictObject({
      weight: positiveInt,
      hours: positiveInt,
      radius: positiveInt,
      deposits: z.number().int().min(1).max(9),
      /** Richesse de ses gisements, en pourcentage d'un gisement ordinaire. */
      loadPercent: positiveInt,
    }),
    /** Efflorescence : des gisements qui ne se vident pas, et une récolte plus généreuse. */
    bloom: z.strictObject({
      weight: positiveInt,
      hours: positiveInt,
      radius: positiveInt,
      deposits: z.number().int().min(1).max(9),
      /** Supplément de récolte dans toute la zone, en pourcentage. */
      gatherPercent: positiveInt,
    }),
    /** Léviathan : il frappe les cellules à sa portée ; le vaincre rapporte beaucoup. */
    leviathan: z.strictObject({
      weight: positiveInt,
      hours: positiveInt,
      radius: positiveInt,
      strikeHours: positiveInt,
      /** Force de ses frappes, en pourcentage de sa force au combat. */
      strikePercent: positiveInt,
      /** Part des cellules filles et des réserves qu'une frappe emporte. */
      lossPercent: z.number().int().min(1).max(50),
      power: z.strictObject({ base: positiveInt, perDay: nonNegativeInt }),
      proteins: positiveInt,
      /** Énergie dépensée pour l'affronter, et énergie rendue par la victoire. */
      energy: positiveInt,
      energyGain: nonNegativeInt,
      /** Accélérateurs gagnés en le vainquant. */
      boosts: nonNegativeInt,
    }),
    /** Zone anoxique : production réduite, gardes affaiblis. Les deux pourcentages sont négatifs. */
    anoxia: z.strictObject({
      weight: positiveInt,
      hours: positiveInt,
      radius: positiveInt,
      productionPercent: z.number().int().min(-90).max(-1),
      guardPercent: z.number().int().min(-90).max(-1),
    }),
  }),
  /**
   * Les rangs supérieurs : passé leur palier, les organites montent au-delà de leur niveau
   * maximum d'origine. Ces niveaux-là coûtent et durent autrement, pour occuper la saison.
   */
  higherRanks: z.strictObject({
    /**
     * Le niveau le plus haut des organites, ouvert dès le premier jour : on ne bloque jamais un
     * joueur qui a de quoi payer ; les prix et les durées suffisent à le ralentir.
     */
    maxLevel: positiveInt,
    /** Croissance du coût et de la durée d'un niveau au suivant, au-delà du maximum d'origine. */
    costGrowthPercent: z.number().int().min(100),
    timeGrowthPercent: z.number().int().min(100),
    /** Un niveau supérieur dure au moins cela, multiplié par son rang au-dessus du maximum d'origine. */
    minMinutesPerLevel: positiveInt,
  }),
  /** La course à l'APEX : sortir des eaux depuis la dernière zone, et arriver avant les autres. */
  apex: z.strictObject({
    tier: positiveInt,
    /** Niveau du Noyau qu'il faut pour sortir des eaux. */
    nucleusLevel: positiveInt,
    cost: z.strictObject({ sugar: positiveInt, bricks: positiveInt, proteins: positiveInt }),
    hours: positiveInt,
    /** Jour où les premiers organismes simulés sortent des eaux, et combien les suivent par jour. */
    firstDay: positiveInt,
    perDay: positiveInt,
    rewards: z
      .array(
        z.strictObject({
          toPlace: positiveInt,
          boosts: nonNegativeInt,
          sugar: nonNegativeInt,
          bricks: nonNegativeInt,
          proteins: nonNegativeInt,
        }),
      )
      .min(1),
  }),
  /**
   * La recherche militaire : chaque pouvoir se prend niveau après niveau, et chaque niveau coûte
   * bien plus que le précédent.
   */
  drills: z.strictObject({
    tier: positiveInt,
    maxLevel: positiveInt,
    cost: z.strictObject({ sugar: positiveInt, bricks: positiveInt, proteins: positiveInt }),
    costGrowthPercent: z.number().int().min(100),
    powers: z.record(
      z.enum(DRILL_IDS),
      z.strictObject({ stat: z.enum(STAT_IDS), percentPerLevel: z.number().int() }),
    ),
  }),
  /** La crise de saison : annoncée, puis subie par tout l'océan pendant quelques jours. */
  crisis: z.strictObject({
    tier: positiveInt,
    /** Jour de saison où elle commence, sa durée, et combien de jours avant elle est annoncée. */
    day: positiveInt,
    days: positiveInt,
    warningDays: positiveInt,
    /** Ce que perd le premier du classement, en pourcentage de production. */
    maxMalusPercent: z.number().int().min(1).max(90),
    /** À partir de cette place (en millièmes du classement), on ne perd plus : on gagne. */
    spareFromPermille: z.number().int().min(1).max(1000),
    bonusPercent: nonNegativeInt,
    /** Nombre de gènes de la bonne famille qui divisent le malus par deux. */
    adaptedGenes: positiveInt,
    kinds: z.record(z.enum(CRISIS_KINDS), z.strictObject({ family: z.enum(GENE_FAMILIES) })),
  }),
  /**
   * Le concours de la semaine : tous les organismes sont classés sur leur progression, et les
   * premiers reçoivent un coffre. Les récompenses vont du premier rang au dernier rang primé.
   */
  contest: z.strictObject({
    tier: positiveInt,
    /** Durée d'un concours, en jours. */
    days: positiveInt,
    /** Nombre de places récompensées. */
    top: positiveInt,
    /** Ce que l'on mesure, semaine après semaine. */
    themes: z.array(z.enum(RANKING_IDS)).min(1),
    rewards: z
      .array(
        z.strictObject({
          /** Cette ligne vaut jusqu'à ce rang compris. */
          toRank: positiveInt,
          boosts: nonNegativeInt,
          sugar: nonNegativeInt,
          bricks: nonNegativeInt,
          proteins: nonNegativeInt,
        }),
      )
      .min(1),
  }),
  /** Coffres de récompense : au-delà de ce nombre en attente, le plus ancien s'ouvre tout seul. */
  rewardChests: z.strictObject({ kept: positiveInt }),
  /** Un accélérateur retire ce temps-là au chantier ou à l'évolution en cours. */
  boost: z.strictObject({ minutes: positiveInt }),
  /**
   * La file de chantiers : derrière le chantier en cours, d'autres attendent, payés d'avance,
   * et démarrent tout seuls l'un après l'autre.
   */
  buildQueue: z.strictObject({ tier: positiveInt, size: positiveInt }),
  /** Les alliances : six bannières, des technologies communes, de l'entraide. */
  alliance: z.strictObject({
    tier: positiveInt,
    /** Production en plus pour tout membre d'une alliance, en pourcentage. */
    memberBonusPercent: nonNegativeInt,
    /** La bannière la plus présente à cette distance recrute le joueur d'office. */
    nearCells: positiveInt,
    /** Durée pendant laquelle on change de bannière sans rien perdre. */
    freeHours: positiveInt,
    tech: z.strictObject({
      maxLevel: positiveInt,
      /** Points pour le premier niveau ; chaque niveau suivant en demande davantage. */
      needBase: positiveInt,
      needGrowthPercent: z.number().int().min(100),
      /** Ce que chaque membre simulé verse par jour. */
      memberPointsPerDay: positiveInt,
    }),
    techs: z.record(
      z.enum(ALLIANCE_TECH_IDS),
      z.strictObject({
        branch: z.enum(ALLIANCE_BRANCHES),
        /** Les statistiques touchées ; aucune pour les renforts, qui ont leur propre règle. */
        stats: z.array(z.enum(STAT_IDS)),
        percentPerLevel: z.number().int(),
      }),
    ),
    donation: z.strictObject({
      cost: CostSchema,
      points: positiveInt,
      /** Ce que rapporte un don à la technologie recommandée, en pourcentage. */
      recommendedPercent: z.number().int().min(100),
      perDay: positiveInt,
    }),
    /** Contribution à partir de laquelle on choisit la technologie recommandée. */
    officerPoints: positiveInt,
    benchHumans: positiveInt,
    help: z.strictObject({
      /** Demandes d'aide des autres membres : combien par jour, combien dès minuit, puis une toutes les N minutes. */
      perDay: positiveInt,
      start: nonNegativeInt,
      minutes: positiveInt,
      credits: positiveInt,
      points: positiveInt,
      /** Ce que l'aide des alliés retire au temps qu'il reste à un chantier, en pourcentage. */
      buildPercent: z.number().int().min(1).max(90),
    }),
    reinforcements: z.strictObject({
      /** Les alliés à cette distance viennent défendre. */
      cells: positiveInt,
      /** Part de sa garde que chaque allié envoie. */
      percent: z.number().int().min(1).max(100),
    }),
    gift: z.strictObject({
      sugar: nonNegativeInt,
      bricks: nonNegativeInt,
      proteins: nonNegativeInt,
      energy: nonNegativeInt,
      /** Le cadeau grossit avec le niveau de l'alliance. */
      levels: z.array(z.strictObject({ from: positiveInt, percent: positiveInt })).min(1),
    }),
    shop: z.strictObject({
      energy: z.strictObject({ price: positiveInt, amount: positiveInt }),
      ration: z.strictObject({ price: positiveInt, proteins: positiveInt }),
      shield: z.strictObject({ price: positiveInt, hours: positiveInt }),
      instant: z.strictObject({ price: positiveInt }),
    } satisfies Record<(typeof ALLIANCE_SHOP_IDS)[number], unknown>),
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

const troopCount = z.number().int().min(0).max(100_000);
/** Un groupe : combien de cellules filles de chaque sorte. Une sorte absente vaut zéro. */
const PartySchema = z.strictObject({
  hunter: troopCount,
  armored: troopCount,
  swift: troopCount,
  toxic: troopCount.default(0),
  guardian: troopCount.default(0),
  scout: troopCount.default(0),
  carrier: troopCount.default(0),
  rotifer: troopCount.default(0),
  tardigrade: troopCount.default(0),
  copepod: troopCount.default(0),
  salp: troopCount.default(0),
  chaetognath: troopCount.default(0),
  ostracod: troopCount.default(0),
  krill: troopCount.default(0),
  larvacean: troopCount.default(0),
  eurypterid: troopCount.default(0),
  trilobite: troopCount.default(0),
  conodont: troopCount.default(0),
  nautiloid: troopCount.default(0),
} satisfies Record<(typeof TROOP_IDS)[number], unknown>);

const RIVAL_ID = /^(r:-?\d{1,6}:-?\d{1,6}|o:\d{1,4})$/;
const DEPOSIT_ID = /^(d:-?\d{1,4}:-?\d{1,4}:\d{1,9}|v:-?\d{1,4}:-?\d{1,4}:\d{1,9}:\d)$/;

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
    party: PartySchema,
  }),
  z.strictObject({ type: z.literal("strikeHunt") }),
  z.strictObject({ type: z.literal("cancelHunt") }),
  z.strictObject({ type: z.literal("buyMutation") }),
  /** Ouvrir le coffre d'une quête terminée, désignée par sa position dans la liste du jour. */
  z.strictObject({ type: z.literal("claimQuest"), index: z.number().int().min(0).max(9) }),
  /**
   * Un rival est désigné par sa place dans la goutte, précédée de « r: », ou, dans l'océan,
   * par son numéro d'organisme, précédé de « o: ».
   */
  z.strictObject({ type: z.literal("spyRival"), rival: z.string().regex(RIVAL_ID) }),
  z.strictObject({
    type: z.literal("sendRaid"),
    rival: z.string().regex(RIVAL_ID),
    party: PartySchema,
  }),
  z.strictObject({ type: z.literal("strikeRaid") }),
  z.strictObject({ type: z.literal("cancelRaid") }),
  /** Exprimer le niveau suivant d'une évolution, dans le Noyau. */
  z.strictObject({ type: z.literal("research"), evolution: z.enum(EVOLUTION_IDS) }),
  /** Passer en mode absent : une longue protection, que la première attaque envoyée fait tomber. */
  z.strictObject({ type: z.literal("goAway") }),
  /** Choisir l'heure de son bouclier de nuit : la minute du jour (temps universel) où il commence. */
  z.strictObject({ type: z.literal("setNight"), minute: z.number().int().min(0).max(1439) }),
  /**
   * Récolter un gisement commun, désigné par son secteur et son cycle : « d:colonne:ligne:cycle »,
   * ou un gisement né d'un événement : « v:colonne:ligne:cycle:numéro ».
   */
  z.strictObject({ type: z.literal("gather"), deposit: z.string().regex(DEPOSIT_ID) }),
  /** Affronter le Léviathan d'un événement : « e:colonne:ligne:cycle ». */
  z.strictObject({
    type: z.literal("huntLeviathan"),
    event: z.string().regex(/^e:-?\d{1,4}:-?\d{1,4}:\d{1,9}$/),
    party: PartySchema,
  }),
  /** Se ranger sous une bannière (ou en changer). */
  z.strictObject({ type: z.literal("joinAlliance"), banner: z.enum(BANNER_IDS) }),
  /** Donner des ressources à une technologie de son alliance. */
  z.strictObject({ type: z.literal("donate"), tech: z.enum(ALLIANCE_TECH_IDS) }),
  /** Officier : choisir la technologie que l'alliance recommande. */
  z.strictObject({ type: z.literal("recommend"), tech: z.enum(ALLIANCE_TECH_IDS) }),
  /** Répondre à toutes les demandes d'aide des autres membres. */
  z.strictObject({ type: z.literal("helpAllies") }),
  /** Demander l'aide des alliés pour le chantier en cours. */
  z.strictObject({ type: z.literal("askHelp") }),
  /** Prendre le cadeau d'alliance du jour. */
  z.strictObject({ type: z.literal("claimGift") }),
  /** Recherche militaire : prendre le niveau suivant d'un pouvoir. */
  z.strictObject({ type: z.literal("drill"), power: z.enum(DRILL_IDS) }),
  /** Lancer la sortie des eaux : la course à l'APEX. */
  z.strictObject({ type: z.literal("leaveWater") }),
  /** Récolte automatique : au retour d'une récolte, les cellules repartent toutes seules. */
  z.strictObject({ type: z.literal("setAutoHarvest"), on: z.boolean() }),
  /** Retirer le dernier chantier de la file : il est remboursé. */
  z.strictObject({ type: z.literal("unqueue") }),
  /** Ouvrir un coffre de récompense en attente, désigné par sa place dans la liste. */
  z.strictObject({ type: z.literal("openReward"), index: z.number().int().min(0).max(99) }),
  /** Dépenser un accélérateur sur le chantier ou sur l'évolution en cours. */
  z.strictObject({ type: z.literal("useBoost"), target: z.enum(BOOST_TARGETS) }),
  /** Acheter dans la boutique d'alliance, avec ses crédits. */
  z.strictObject({ type: z.literal("buyAlliance"), item: z.enum(ALLIANCE_SHOP_IDS) }),
  /** Chasser un prédateur de l'océan, désigné par son secteur et son cycle : « p:colonne:ligne:cycle ». */
  z.strictObject({
    type: z.literal("huntPredator"),
    predator: z.string().regex(/^p:-?\d{1,4}:-?\d{1,4}:\d{1,9}$/),
    party: PartySchema,
  }),
  /** Apprivoiser un prédateur : on le bat sans le tuer, il devient le compagnon du joueur. */
  z.strictObject({
    type: z.literal("tamePredator"),
    predator: z.string().regex(/^p:-?\d{1,4}:-?\d{1,4}:\d{1,9}$/),
    party: PartySchema,
  }),
  /** Partager un gène d'une famille avec son compagnon. */
  z.strictObject({ type: z.literal("shareGene"), family: z.enum(GENE_FAMILIES) }),
  /** Relâcher son compagnon, pour en apprivoiser un autre. */
  z.strictObject({ type: z.literal("releaseCompanion") }),
  /** Remonter d'une zone vers la surface. */
  z.strictObject({ type: z.literal("migrate") }),
]);
export type Order = z.infer<typeof OrderSchema>;

/** Ce que le client envoie pour passer un ordre. L'identifiant sert à ne jamais le compter deux fois. */
export const OrderRequestSchema = z.strictObject({ orderId: z.uuid(), order: OrderSchema });
export type OrderRequest = z.infer<typeof OrderRequestSchema>;

/** Les sortes d'appareil que la mesure d'audience distingue. */
export const DEVICE_KINDS = ["phone", "tablet", "desktop"] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

/**
 * Ce que l'appareil dit de lui à chaque visite. Rien de personnel : la langue, la sorte
 * d'appareil, si le jeu est installé, et le mot court du lien par lequel le joueur est arrivé.
 */
export const VisitInfoSchema = z.strictObject({
  lang: z.enum(["fr", "en"]),
  device: z.enum(DEVICE_KINDS),
  installed: z.boolean(),
  source: z
    .string()
    .regex(/^[a-z0-9-]{1,24}$/)
    .nullable(),
});
export type VisitInfo = z.infer<typeof VisitInfoSchema>;

/** Longueur maximale d'un avis. */
export const FEEDBACK_MAX_LENGTH = 1000;
/** Nombre d'avis qu'un joueur peut envoyer par jour. */
export const FEEDBACK_PER_DAY = 5;

/** Un avis de joueur : une note de 1 à 5, quelques mots, ou les deux. */
export const FeedbackSchema = z
  .strictObject({
    rating: z.number().int().min(1).max(5).nullable(),
    text: z.string().trim().max(FEEDBACK_MAX_LENGTH),
    lang: z.enum(["fr", "en"]),
  })
  .refine((value) => value.rating !== null || value.text.length > 0);
export type Feedback = z.infer<typeof FeedbackSchema>;
