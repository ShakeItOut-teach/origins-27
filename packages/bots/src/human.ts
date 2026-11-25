/**
 * Un joueur au rythme humain : il se connecte quelques fois par jour, quelques minutes à chaque
 * fois, et joue comme quelqu'un qui a bien compris le jeu. Il sert à voir ce que donne une
 * saison entière : à quel jour la cellule est finie, quand il n'y a plus rien à faire, où en
 * est l'armée quand chaque palier s'ouvre.
 */
import {
  advance,
  allianceToday,
  allianceView,
  applyOrder,
  canTrain,
  capacity,
  contestBoard,
  createPlayer,
  donationCost,
  foePower,
  gatherOffer,
  helpRequests,
  isAlly,
  leagueOf,
  levelCost,
  maxLevelOf,
  leviathanKind,
  leviathanOffer,
  leviathanThreat,
  migrateOffer,
  nextMutationPrice,
  oceanPredators,
  partySize,
  placeOffer,
  playerCell,
  playerDeposits,
  predatorOffer,
  preyOffer,
  productionRate,
  raidOffer,
  ranking,
  reachableRivals,
  researchOffer,
  seasonDay,
  seasonDraw,
  shareOffer,
  techLevel,
  totalPower,
  troopUnlocked,
  unattendedChance,
  upkeepRate,
  cellDistance,
  visiblePlaces,
  visiblePrey,
  winChance,
} from "@o27/core";
import type { GameEvent, OrderResult, PlayerState } from "@o27/core";
import {
  ALLIANCE_TECH_IDS,
  BALANCE,
  EVOLUTION_IDS,
  GENE_FAMILIES,
  ORGANELLE_IDS,
  RESOURCE_IDS,
  TROOP_IDS,
} from "@o27/data";
import type { Order, OrganelleId, TroopId } from "@o27/data";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MICRO = 1_000_000;

export interface HumanOptions {
  readonly seed: number;
  readonly worldSeed: number;
  readonly slot: number;
  readonly days: number;
  /** Connexions par jour, réparties sur seize heures de veille. */
  readonly sessionsPerDay: number;
  /** Durée d'une connexion, en minutes. */
  readonly sessionMinutes: number;
  /** Attaques envoyées contre des rivaux, par jour au plus. */
  readonly raidsPerDay: number;
  /** Pour les contrôles : chaque ordre tenté et sa réponse, et l'état à la fin de chaque jour. */
  readonly observe?: {
    readonly order?: (order: Order, result: OrderResult, before: PlayerState) => void;
    readonly dayEnd?: (state: PlayerState, day: number) => void;
  };
}

export interface DayReport {
  readonly day: number;
  readonly tier: number;
  readonly zone: number;
  readonly power: number;
  readonly rank: number;
  readonly league: number;
  /** Somme des niveaux d'organites, et nombre d'organites au niveau maximum. */
  readonly organelleLevels: number;
  readonly organellesMaxed: number;
  readonly evolutionLevels: number;
  readonly mutations: number;
  readonly troops: number;
  readonly sugarPerSecond: number;
  /** Part de la production de sucre que l'armée mange, en pourcentage. */
  readonly upkeepPercent: number;
  readonly storage: number;
  /** Combats du jour. */
  readonly raidsWon: number;
  readonly raidsLost: number;
  readonly attacksRepelled: number;
  readonly attacksSuffered: number;
  readonly huntsWon: number;
  readonly starved: number;
  readonly chestsOpened: number;
  readonly boosts: number;
  readonly allianceLevel: number;
  readonly contestRank: number;
  /** Connexions du jour où le joueur n'avait ni chantier ni évolution à lancer, faute de quoi que ce soit à faire. */
  readonly sessionsWithNothingToBuild: number;
  /** Connexions du jour où il n'a rien pu lancer faute de ressources. */
  readonly sessionsTooPoor: number;
}

export interface HumanReport {
  readonly days: readonly DayReport[];
  /** Jour où chaque étape a été atteinte ; `null` si jamais. */
  readonly milestones: Readonly<Record<string, number | null>>;
}

/** Ordre de préférence pour bâtir et améliorer : produire d'abord, puis l'armée, puis le reste. */
const BUILD_ORDER: readonly OrganelleId[] = [
  "mitochondrion",
  "ribosome",
  "vacuole",
  "nursery",
  "nucleus",
  "wall",
  "golgi",
  "lysosome",
  "cilia",
];

function affordable(state: PlayerState, cost: Readonly<Record<string, number>>): boolean {
  return RESOURCE_IDS.every((id) => state.resources[id] >= (cost[id] ?? 0));
}

/** Fait jouer une saison à un joueur au rythme humain, et raconte chaque jour. */
export function simulateHuman(options: HumanOptions): HumanReport {
  const seasonStart = 1_800_000_000_000;
  let state = createPlayer(options.seed, seasonStart, seasonStart + 7 * HOUR_MS, {
    worldSeed: options.worldSeed,
    slot: options.slot,
  });
  const counts = {
    raidsWon: 0,
    raidsLost: 0,
    attacksRepelled: 0,
    attacksSuffered: 0,
    huntsWon: 0,
    starved: 0,
    chestsOpened: 0,
  };
  const milestones: Record<string, number | null> = {
    "premier organite au niveau maximum": null,
    "tous les organites au niveau maximum": null,
    "première évolution au niveau maximum": null,
    "toutes les évolutions disponibles au maximum": null,
    "première cellule de rang 2": null,
    "compagnon apprivoisé": null,
    "compagnon adulte": null,
    "zone de minuit atteinte": null,
    "zone crépusculaire atteinte": null,
    "zone éclairée atteinte": null,
    "premier Léviathan vaincu": null,
    "Officier d'alliance": null,
    "sortie des eaux": null,
  };
  let today = 1;
  const reach = (name: string, done: boolean): void => {
    if (done && milestones[name] === null) milestones[name] = today;
  };

  const absorb = (events: readonly GameEvent[]): void => {
    for (const event of events) {
      if (event.type === "raidReturned" && !event.cancelled) {
        if (event.won) counts.raidsWon += 1;
        else counts.raidsLost += 1;
      }
      if (event.type === "attackRepelled") counts.attacksRepelled += 1;
      if (event.type === "attackSuffered") counts.attacksSuffered += 1;
      if (event.type === "huntReturned" && !event.cancelled && event.won) {
        counts.huntsWon += 1;
        if (event.prey.startsWith("e:")) reach("premier Léviathan vaincu", true);
      }
      if (event.type === "troopsStarved") counts.starved += event.count;
      if (event.type === "rewardOpened" || event.type === "chestOpened") counts.chestsOpened += 1;
      if (event.type === "companionTamed") reach("compagnon apprivoisé", true);
    }
  };
  const pass = (now: number): void => {
    const step = advance(state, now);
    state = step.state;
    absorb(step.events);
  };
  const send = (order: Order, now: number): boolean => {
    const result = applyOrder(state, order, now);
    options.observe?.order?.(order, result, state);
    if (!result.ok) return false;
    state = result.state;
    absorb(result.events);
    return true;
  };

  const draw = seasonDraw(options.worldSeed);
  let raidsToday = 0;
  let nightSet = false;

  /** Lance un chantier : ce qui manque d'abord, puis l'amélioration la plus utile. */
  const build = (now: number): "started" | "nothing" | "poor" | "busy" => {
    if (state.construction !== null) return "busy";
    // Pour sortir des eaux, il faut un Noyau évolué : il passe alors devant tout le reste.
    const order: readonly OrganelleId[] =
      state.tier >= BALANCE.apex.tier - 1
        ? [
            "nucleus",
            "vacuole",
            ...BUILD_ORDER.filter((id) => id !== "nucleus" && id !== "vacuole"),
          ]
        : BUILD_ORDER;
    const open = order.filter((id) => BALANCE.organelles[id].tier <= state.tier);
    let wanted = false;
    for (const id of open) {
      const level = state.organelles[id];
      if (level >= maxLevelOf(state, id)) continue;
      wanted = true;
      const cost = levelCost(state, id, level + 1);
      // Trop cher pour la réserve : il faut d'abord agrandir la Vacuole.
      const tooBig =
        cost.sugar > capacity(state, "sugar") || cost.bricks > capacity(state, "bricks");
      if (tooBig && id !== "vacuole" && state.organelles.vacuole > 0) {
        if (send({ type: "upgrade", organelle: "vacuole" }, now)) return "started";
        continue;
      }
      if (!affordable(state, cost)) continue;
      if (
        send(
          level === 0 ? { type: "build", organelle: id } : { type: "upgrade", organelle: id },
          now,
        )
      ) {
        return "started";
      }
    }
    return wanted ? "poor" : "nothing";
  };

  /** Exprime une évolution : la favorisée de la saison d'abord, puis la moins avancée. */
  const research = (now: number): "started" | "nothing" | "poor" | "busy" => {
    if (state.organelles.nucleus === 0) return "nothing";
    if (state.research !== null) return "busy";
    const ordered = [...EVOLUTION_IDS].sort((one, other) => {
      const favoured = Number(draw.favoured.includes(other)) - Number(draw.favoured.includes(one));
      return favoured || state.evolutions[one] - state.evolutions[other];
    });
    let wanted = false;
    for (const id of ordered) {
      const offer = researchOffer(state, id);
      if (offer.blocked !== null) continue;
      wanted = true;
      if (affordable(state, offer.cost) && send({ type: "research", evolution: id }, now)) {
        return "started";
      }
    }
    return wanted ? "poor" : "nothing";
  };

  /** Fait naître des cellules filles tant que la production les nourrit. */
  const train = (now: number): void => {
    if (!canTrain(state) || state.training !== null) return;
    const budget = Math.floor((productionRate(state, "sugar") * 85) / 100);
    // La cellule de plus haut rang que ses gènes lui ouvrent.
    const rank2 = TROOP_IDS.filter(
      (id) => BALANCE.troops[id].family !== null && troopUnlocked(state, id),
    ).sort((one, other) => BALANCE.troops[other].tier - BALANCE.troops[one].tier);
    // Rang 2 dès qu'il est ouvert ; sinon les trois sortes de rang 1, à parts égales.
    const rank1: TroopId = (["hunter", "armored", "swift"] as const).reduce((least, id) =>
      state.troops[id] < state.troops[least] ? id : least,
    );
    const troop: TroopId = rank2[0] ?? rank1;
    const data = BALANCE.troops[troop];
    const each = data.upkeep * BALANCE.troopUpkeep.milliPerSecond;
    const room = Math.floor((budget - upkeepRate(state)) / each);
    const byCost = Math.min(
      data.cost.sugar === 0 ? 99 : Math.floor(state.resources.sugar / (data.cost.sugar * MICRO)),
      data.cost.bricks === 0 ? 99 : Math.floor(state.resources.bricks / (data.cost.bricks * MICRO)),
      data.proteins === 0 ? 99 : Math.floor(state.resources.proteins / (data.proteins * MICRO)),
    );
    const count = Math.min(room, byCost, 10);
    if (count > 0) send({ type: "trainTroop", troop, count }, now);
    if (rank2.length > 0)
      reach(
        "première cellule de rang 2",
        TROOP_IDS.some((id) => state.troops[id] > 0 && BALANCE.troops[id].family !== null),
      );
  };

  /** Envoie le groupe : Léviathan menaçant, rival à piller, prédateur, proie. */
  const sortie = (now: number): void => {
    if (state.hunt !== null || state.raid !== null || partySize(state.troops) === 0) return;
    const party = state.troops;
    const threat = leviathanThreat(state);
    if (threat !== null) {
      const power = foePower(state, leviathanOffer(state, threat.event, now).power);
      if (
        winChance(party, leviathanKind(threat.event), power) >= 40 &&
        send({ type: "huntLeviathan", event: threat.event.id, party }, now)
      ) {
        return;
      }
    }
    if (state.tier >= 5 && raidsToday < options.raidsPerDay) {
      let best: { id: string; chance: number } | null = null;
      for (const rival of reachableRivals(state).slice(0, 20)) {
        if (isAlly(state, rival) || (state.placeReadyAt[rival.id] ?? 0) > now) continue;
        const guard = foePower(state, raidOffer(state, rival, now).guard);
        const chance = winChance(party, rival.kind, guard);
        if (best === null || chance > best.chance) best = { id: rival.id, chance };
      }
      if (
        best !== null &&
        best.chance >= 60 &&
        send({ type: "sendRaid", rival: best.id, party }, now)
      ) {
        raidsToday += 1;
        return;
      }
    }
    if (state.tier >= BALANCE.ranking.tier) {
      const home = playerCell(state);
      const zone = state.zone;
      const predators = oceanPredators(state.worldSeed, now)
        .filter((entry) => entry.zone <= zone && (state.placeReadyAt[entry.id] ?? 0) <= now)
        .sort((one, other) => cellDistance(home, one) - cellDistance(home, other))
        .slice(0, 8);
      for (const predator of predators) {
        const power = foePower(state, predatorOffer(state, predator, now).power);
        if (unattendedChance(winChance(party, predator.kind, power)) < 60) continue;
        const tame = state.tier >= BALANCE.companion.tier && state.companion === null;
        const order: Order = tame
          ? { type: "tamePredator", predator: predator.id, party }
          : { type: "huntPredator", predator: predator.id, party };
        if (send(order, now)) return;
      }
    }
    if (state.tier >= 4) {
      for (const prey of visiblePrey(state.worldSeed, state.slot)) {
        if ((state.placeReadyAt[prey.id] ?? 0) > now) continue;
        const power = foePower(state, preyOffer(prey).power);
        if (unattendedChance(winChance(party, prey.kind, power)) < 60) continue;
        if (send({ type: "sendHunt", prey: prey.id, party }, now)) return;
      }
    }
  };

  /** Envoie récolter : le gisement de l'océan qui rapporte le plus, sinon un lieu de la goutte. */
  const harvest = (now: number): void => {
    if (state.expedition !== null) return;
    if (state.tier >= BALANCE.ocean.tier) {
      const zone = state.zone;
      let best: { id: string; value: number } | null = null;
      for (const deposit of playerDeposits(state, now)) {
        if (deposit.zone > zone) continue;
        const offer = gatherOffer(state, deposit, now);
        if (offer.loot <= 0 || offer.durationMs > 20 * 60_000) continue;
        const room = capacity(state, offer.resource) - state.resources[offer.resource];
        const value = Math.min(offer.loot, Math.max(0, room));
        if (value > 0 && (best === null || value > best.value)) best = { id: deposit.id, value };
      }
      if (best !== null && send({ type: "gather", deposit: best.id }, now)) return;
    }
    if (state.tier >= 3) {
      for (const place of visiblePlaces(state.worldSeed, state.slot)) {
        if ((state.placeReadyAt[place.id] ?? 0) > now) continue;
        const offer = placeOffer(place);
        if (capacity(state, offer.resource) - state.resources[offer.resource] < offer.loot / 2)
          continue;
        if (send({ type: "sendExpedition", place: place.id }, now)) return;
      }
    }
  };

  /** Tout ce que le joueur fait à un instant de sa connexion. */
  const act = (now: number): { build: string; research: string } => {
    if (state.hunt !== null && state.hunt.outcome === null && now >= state.hunt.arrivesAt) {
      send({ type: "strikeHunt" }, now);
    }
    if (state.raid !== null && state.raid.outcome === null && now >= state.raid.arrivesAt) {
      send({ type: "strikeRaid" }, now);
    }
    for (let guard = 0; guard < 6 && state.chests.length > 0; guard++) {
      send({ type: "openReward", index: 0 }, now);
    }
    (state.quests?.items ?? []).forEach((quest, index) => {
      if (!quest.claimed && quest.progress >= quest.target)
        send({ type: "claimQuest", index }, now);
    });
    const [choice] = state.mutationOffer ?? [];
    if (choice !== undefined) send({ type: "chooseMutation", mutation: choice }, now);
    if (
      state.tier >= 4 &&
      state.mutationOffer === null &&
      state.resources.proteins >= nextMutationPrice(state)
    ) {
      send({ type: "buyMutation" }, now);
    }
    if (state.tier >= 5 && !nightSet && send({ type: "setNight", minute: 23 * 60 }, now)) {
      nightSet = true;
    }
    if (state.alliance !== null) {
      if (!allianceToday(state).gift) send({ type: "claimGift" }, now);
      if (helpRequests(state) > 0) send({ type: "helpAllies" }, now);
      if (state.construction !== null && !state.construction.helped) send({ type: "askHelp" }, now);
    }
    const built = build(now);
    const researched = research(now);
    if (state.boosts > 0) {
      if (state.research !== null && state.research.endsAt - now > 20 * 60_000) {
        send({ type: "useBoost", target: "research" }, now);
      } else if (state.construction !== null && state.construction.endsAt - now > 8 * 60_000) {
        send({ type: "useBoost", target: "construction" }, now);
      }
    }
    train(now);
    // Remonter passe avant tout : on ne déménage pas avec des cellules dehors, donc on les attend.
    const move = state.tier >= BALANCE.ocean.tier ? migrateOffer(state, now) : null;
    const moving = move !== null && move.open && affordable(state, move.cost);
    if (state.tier >= BALANCE.apex.tier && state.apex === null) send({ type: "leaveWater" }, now);
    if (state.tier >= 4 && !state.autoHarvest) send({ type: "setAutoHarvest", on: true }, now);
    if (moving) send({ type: "migrate" }, now);
    else {
      sortie(now);
      harvest(now);
    }
    // Les dons : avec ce qui dépasse, quand rien d'autre n'est à payer.
    if (state.alliance !== null && built !== "started" && researched !== "started") {
      const view = allianceView(state);
      const cost = donationCost();
      const rich =
        state.resources.sugar >= (capacity(state, "sugar") * 7) / 10 &&
        state.resources.bricks >= (capacity(state, "bricks") * 7) / 10;
      const tech =
        view?.recommended ??
        ALLIANCE_TECH_IDS.find(
          (id) => view !== null && techLevel(view.tech[id]) < BALANCE.alliance.tech.maxLevel,
        );
      if (
        rich &&
        tech !== undefined &&
        allianceToday(state).donations < BALANCE.alliance.donation.perDay &&
        affordable(state, cost)
      ) {
        send({ type: "donate", tech }, now);
      }
    }
    if (state.companion !== null) {
      const family = [...GENE_FAMILIES].sort(
        (one, other) =>
          Number(shareOffer(state, one).blocked !== null) -
          Number(shareOffer(state, other).blocked !== null),
      )[0];
      if (family !== undefined) {
        const offer = shareOffer(state, family);
        if (offer.blocked === null && state.resources.proteins >= offer.price) {
          send({ type: "shareGene", family }, now);
        }
      }
    }
    // Au début, on touche la cellule ; ensuite seulement quand le sucre manque.
    if (state.tier < 3 || state.resources.sugar < 20 * MICRO)
      send({ type: "harvest", taps: 30 }, now);
    return { build: built, research: researched };
  };

  const days: DayReport[] = [];
  const awake = 16 * HOUR_MS;
  for (let day = 1; day <= options.days; day++) {
    today = day;
    raidsToday = 0;
    const before = { ...counts };
    let nothing = 0;
    let poor = 0;
    for (let session = 0; session < options.sessionsPerDay; session++) {
      const start =
        seasonStart +
        (day - 1) * DAY_MS +
        7 * HOUR_MS +
        Math.floor((session * awake) / options.sessionsPerDay);
      // Le premier jour, on découvre : les connexions sont trois fois plus longues.
      const length = options.sessionMinutes * 60_000 * (day === 1 ? 3 : 1);
      let lastBuild = "";
      let lastResearch = "";
      let started = false;
      for (let now = start; now <= start + length; now += 15_000) {
        pass(now);
        const did = act(now);
        if (did.build === "started" || did.research === "started") started = true;
        lastBuild = did.build;
        lastResearch = did.research;
      }
      const idle = (value: string): boolean => value === "nothing";
      if (!started) {
        if (idle(lastBuild) && idle(lastResearch)) nothing += 1;
        else if (lastBuild === "poor" || lastResearch === "poor") poor += 1;
      }
    }
    pass(seasonStart + day * DAY_MS - 60_000);
    options.observe?.dayEnd?.(state, day);

    const open = ORGANELLE_IDS.filter((id) => BALANCE.organelles[id].tier <= state.tier);
    const maxed = open.filter((id) => state.organelles[id] >= maxLevelOf(state, id));
    const evolutions = EVOLUTION_IDS.filter((id) => !draw.dormant.includes(id));
    reach("premier organite au niveau maximum", maxed.length > 0);
    reach("tous les organites au niveau maximum", state.tier >= 7 && maxed.length === open.length);
    reach(
      "première évolution au niveau maximum",
      evolutions.some((id) => state.evolutions[id] >= BALANCE.research.maxLevel),
    );
    reach(
      "toutes les évolutions disponibles au maximum",
      evolutions.every((id) => state.evolutions[id] >= BALANCE.research.maxLevel),
    );
    reach("zone de minuit atteinte", state.zone >= 1);
    reach("zone crépusculaire atteinte", state.zone >= 2);
    reach("zone éclairée atteinte", state.zone >= 3);
    reach("compagnon apprivoisé", state.companion !== null);
    reach("sortie des eaux", state.apex !== null && state.apex.place > 0);
    const genes =
      state.companion === null
        ? 0
        : GENE_FAMILIES.reduce((sum, id) => sum + (state.companion?.genes[id] ?? 0), 0);
    reach("compagnon adulte", genes >= BALANCE.companion.adultAt);
    reach("Officier d'alliance", (state.alliance?.points ?? 0) >= BALANCE.alliance.officerPoints);

    const power = state.tier >= BALANCE.ranking.tier ? ranking(state, "power") : null;
    const production = productionRate(state, "sugar");
    const view = allianceView(state);
    days.push({
      day: seasonDay(state, state.now),
      tier: state.tier,
      zone: state.zone,
      power: totalPower(state),
      rank: power?.mine.rank ?? 0,
      league: power === null ? -1 : leagueOf(power.mine.rank, power.rows.length),
      organelleLevels: ORGANELLE_IDS.reduce((sum, id) => sum + state.organelles[id], 0),
      organellesMaxed: maxed.length,
      evolutionLevels: EVOLUTION_IDS.reduce((sum, id) => sum + state.evolutions[id], 0),
      mutations: state.mutations.length,
      troops:
        partySize(state.troops) +
        (state.hunt === null ? 0 : partySize(state.hunt.party)) +
        (state.raid === null ? 0 : partySize(state.raid.party)),
      sugarPerSecond: Math.round(production / 100) / 10,
      upkeepPercent: production === 0 ? 0 : Math.round((100 * upkeepRate(state)) / production),
      storage: Math.round(capacity(state, "sugar") / MICRO),
      raidsWon: counts.raidsWon - before.raidsWon,
      raidsLost: counts.raidsLost - before.raidsLost,
      attacksRepelled: counts.attacksRepelled - before.attacksRepelled,
      attacksSuffered: counts.attacksSuffered - before.attacksSuffered,
      huntsWon: counts.huntsWon - before.huntsWon,
      starved: counts.starved - before.starved,
      chestsOpened: counts.chestsOpened - before.chestsOpened,
      boosts: state.boosts,
      allianceLevel:
        view === null
          ? 0
          : 1 + ALLIANCE_TECH_IDS.reduce((sum, id) => sum + techLevel(view.tech[id]), 0),
      contestRank: contestBoard(state)?.mine.rank ?? 0,
      sessionsWithNothingToBuild: nothing,
      sessionsTooPoor: poor,
    });
  }
  return { days, milestones };
}

/** Le profil demandé par le propriétaire : dix connexions par jour, pillage moyen, jeu bien compris. */
export const HUMAN_TEN_A_DAY: Omit<HumanOptions, "seed" | "worldSeed" | "slot"> = {
  days: 27,
  sessionsPerDay: 10,
  sessionMinutes: 5,
  raidsPerDay: 2,
};
