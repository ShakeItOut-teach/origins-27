/** Point d'entrée du moteur : appliquer un ordre du joueur à un instant donné. */
import { BALANCE, RESOURCE_IDS, TROOP_IDS } from "@o27/data";
import type {
  BoostTarget,
  DrillId,
  EvolutionId,
  GeneFamily,
  MutationId,
  Order,
  OrganelleId,
  PreyKind,
  TroopId,
} from "@o27/data";
import { advance } from "./advance";
import { allianceOrder } from "./alliance";
import { leaveWater } from "./apex";
import { openReward } from "./chests";
import { drillOffer } from "./drills";
import { trackDaily } from "./daily";
import { eventCovers, findEvent } from "./events";
import { gather, sendExpedition } from "./expeditions";
import { leviathanBeaten, leviathanKind, leviathanOffer } from "./leviathan";
import { shareOffer } from "./companion";
import { researchOffer } from "./evolutions";
import { troopUnlocked } from "./genes";
import {
  capacity,
  foePower,
  levelCost,
  levelDuration,
  maxLevelOf,
  plannedLevel,
  queueHasRoom,
  tapYield,
} from "./stats";
import type { GameEvent, OrderErrorCode, OrderResult, PlayerState } from "./types";
import { canTrain, partyOf, partySize, resolveHunt, trainMs } from "./hunt";
import { openChest, trackQuests } from "./quests";
import { trackReports } from "./reports";
import {
  dropShield,
  goAway,
  isAlly,
  raidOffer,
  reachableRivals,
  resolveRaid,
  setNight,
} from "./rivals";
import { MICRO } from "./types";
import { drawMutationOffer, mutationPool, orderTier } from "./unlock";
import { ZONE_COUNT, cellIn, migrateOffer, playerCell } from "./ocean";
import type { PreyOffer } from "./world";
import { findPredator, predatorOffer } from "./predators";
import { cancelReturnMs, preyOffer, visiblePrey } from "./world";

type Outcome =
  | { readonly state: PlayerState; readonly events: readonly GameEvent[] }
  | { readonly error: OrderErrorCode };

function harvest(state: PlayerState, taps: number): Outcome {
  const interval = BALANCE.tap.minIntervalMs;
  const burst = BALANCE.tap.burst;
  // Le budget de touchers se remplit avec le temps, jusqu'à `burst`.
  const budgetStart = Math.max(state.tapBudgetAt, state.now - burst * interval);
  const allowed = Math.min(taps, Math.floor((state.now - budgetStart) / interval));
  if (allowed <= 0) return { error: "tooFast" };
  const room = capacity(state, "sugar") - state.resources.sugar;
  if (room <= 0) return { error: "storageFull" };
  const amount = Math.min(room, allowed * tapYield());
  return {
    state: {
      ...state,
      tapBudgetAt: budgetStart + allowed * interval,
      resources: { ...state.resources, sugar: state.resources.sugar + amount },
      counters: { ...state.counters, harvests: state.counters.harvests + allowed },
    },
    events: [{ type: "harvested", at: state.now, amount }],
  };
}

function startConstruction(state: PlayerState, organelle: OrganelleId, toLevel: number): Outcome {
  if (state.construction !== null && !queueHasRoom(state)) return { error: "busy" };
  const cost = levelCost(state, organelle, toLevel);
  if (RESOURCE_IDS.some((id) => state.resources[id] < cost[id])) return { error: "insufficient" };
  if (state.construction !== null) {
    // Un chantier est en cours : celui-ci attend son tour dans la file, payé d'avance.
    return {
      state: {
        ...state,
        resources: {
          ...state.resources,
          sugar: state.resources.sugar - cost.sugar,
          bricks: state.resources.bricks - cost.bricks,
        },
        buildQueue: [
          ...state.buildQueue,
          { organelle, toLevel, paid: { sugar: cost.sugar, bricks: cost.bricks } },
        ],
      },
      events: [{ type: "constructionQueued", at: state.now, organelle, toLevel }],
    };
  }
  const endsAt = state.now + levelDuration(state, organelle, toLevel);
  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        sugar: state.resources.sugar - cost.sugar,
        bricks: state.resources.bricks - cost.bricks,
      },
      construction: { organelle, toLevel, endsAt, helped: false },
    },
    events: [{ type: "constructionStarted", at: state.now, organelle, toLevel, endsAt }],
  };
}

function build(state: PlayerState, organelle: OrganelleId): Outcome {
  if (BALANCE.organelles[organelle].tier > state.tier) return { error: "locked" };
  // Déjà bâti, en chantier ou en file : il ne reste qu'à l'améliorer.
  if (plannedLevel(state, organelle) > 0) return { error: "alreadyBuilt" };
  return startConstruction(state, organelle, 1);
}

function upgrade(state: PlayerState, organelle: OrganelleId): Outcome {
  // On améliore à partir du niveau prévu : chantier en cours et file compris.
  const level = plannedLevel(state, organelle);
  if (level === 0) return { error: "notBuilt" };
  if (level >= maxLevelOf(state, organelle)) return { error: "maxLevel" };
  return startConstruction(state, organelle, level + 1);
}

/** Retirer le dernier chantier de la file : ce qu'il avait coûté est rendu. */
function unqueue(state: PlayerState): Outcome {
  const last = state.buildQueue.at(-1);
  if (last === undefined) return { error: "queueEmpty" };
  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        sugar: state.resources.sugar + last.paid.sugar,
        bricks: state.resources.bricks + last.paid.bricks,
      },
      buildQueue: state.buildQueue.slice(0, -1),
    },
    events: [
      {
        type: "constructionUnqueued",
        at: state.now,
        organelle: last.organelle,
        toLevel: last.toLevel,
      },
    ],
  };
}

function chooseMutation(state: PlayerState, mutation: MutationId): Outcome {
  if (state.mutationOffer === null) return { error: "noOffer" };
  if (!state.mutationOffer.includes(mutation)) return { error: "notInOffer" };
  return {
    state: {
      ...state,
      mutationOffer: null,
      mutations: [...state.mutations, mutation],
      counters: { ...state.counters, mutationsChosen: state.counters.mutationsChosen + 1 },
    },
    events: [{ type: "mutationChosen", at: state.now, mutation }],
  };
}

/** Exprimer le niveau suivant d'une évolution : le Noyau n'en mène qu'une à la fois. */
function research(state: PlayerState, evolution: EvolutionId): Outcome {
  if (state.research !== null) return { error: "researching" };
  const offer = researchOffer(state, evolution);
  if (offer.blocked !== null) return { error: offer.blocked };
  if (RESOURCE_IDS.some((id) => state.resources[id] < offer.cost[id])) {
    return { error: "insufficient" };
  }
  return {
    state: {
      ...state,
      resources: {
        sugar: state.resources.sugar - offer.cost.sugar,
        bricks: state.resources.bricks - offer.cost.bricks,
        proteins: state.resources.proteins - offer.cost.proteins,
      },
      research: { evolution, toLevel: offer.toLevel, endsAt: state.now + offer.durationMs },
    },
    events: [],
  };
}

/** Remonter d'une zone : la cellule s'installe plus près de la surface, pour de bon. */
function migrate(state: PlayerState): Outcome {
  const offer = migrateOffer(state, state.now);
  if (offer === null || offer.zone >= ZONE_COUNT) return { error: "surface" };
  if (!offer.open) return { error: "zoneClosed" };
  // On ne déménage pas en laissant des cellules dehors.
  if (state.expedition !== null || state.hunt !== null || state.raid !== null) {
    return { error: "busy" };
  }
  if (RESOURCE_IDS.some((id) => state.resources[id] < offer.cost[id])) {
    return { error: "insufficient" };
  }
  // La case d'arrivée existe : on le vérifie avant de payer.
  cellIn(state.worldSeed, state.slot, offer.zone);
  return {
    state: {
      ...state,
      zone: offer.zone,
      resources: {
        sugar: state.resources.sugar - offer.cost.sugar,
        bricks: state.resources.bricks - offer.cost.bricks,
        proteins: state.resources.proteins - offer.cost.proteins,
      },
    },
    events: [{ type: "migrated", at: state.now, zone: offer.zone }],
  };
}

function cancelExpedition(state: PlayerState): Outcome {
  const expedition = state.expedition;
  if (expedition === null || expedition.cancelled) return { error: "noExpedition" };
  const returnsAt =
    state.now + cancelReturnMs(expedition.startedAt, expedition.returnsAt, state.now);
  return {
    state: {
      ...state,
      // L'énergie est rendue tout de suite ; le filament, lui, met un instant à rentrer.
      energy: Math.min(BALANCE.energy.max, state.energy + expedition.energy),
      expedition: { ...expedition, returnsAt, cancelled: true },
    },
    events: [{ type: "expeditionCancelled", at: state.now, returnsAt }],
  };
}

function trainTroop(state: PlayerState, troop: TroopId, count: number): Outcome {
  if (!canTrain(state)) return { error: "notBuilt" };
  if (!troopUnlocked(state, troop)) return { error: "geneMissing" };
  if (state.training !== null) return { error: "busy" };
  const data = BALANCE.troops[troop];
  const sugar = data.cost.sugar * MICRO * count;
  const bricks = data.cost.bricks * MICRO * count;
  const proteins = data.proteins * MICRO * count;
  if (
    state.resources.sugar < sugar ||
    state.resources.bricks < bricks ||
    state.resources.proteins < proteins
  ) {
    return { error: "insufficient" };
  }
  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        sugar: state.resources.sugar - sugar,
        bricks: state.resources.bricks - bricks,
        proteins: state.resources.proteins - proteins,
      },
      training: { troop, remaining: count, nextAt: state.now + trainMs(state, troop) },
    },
    events: [],
  };
}

function sendHunt(
  state: PlayerState,
  preyId: string,
  party: Readonly<Record<TroopId, number>>,
): Outcome {
  // Chasse et attaque partent avec les mêmes cellules : une seule sortie à la fois.
  if (state.hunt !== null || state.raid !== null) return { error: "busy" };
  const prey = visiblePrey(state.worldSeed, state.slot).find((entry) => entry.id === preyId);
  if (prey === undefined) return { error: "unknownPrey" };
  if ((state.placeReadyAt[preyId] ?? 0) > state.now) return { error: "placeResting" };
  if (partySize(party) === 0 || TROOP_IDS.some((id) => party[id] > state.troops[id])) {
    return { error: "noTroops" };
  }
  const offer = preyOffer(prey);
  if (state.energy < offer.energy) return { error: "noEnergy" };
  const windowMs = BALANCE.hunt.strikeWindowSeconds * 1000;
  const arrivesAt = state.now + (offer.durationMs - windowMs) / 2;
  const returnsAt = state.now + offer.durationMs;
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] -= party[id];
  return {
    state: {
      ...state,
      energy: state.energy - offer.energy,
      troops,
      hunt: {
        prey: preyId,
        kind: prey.kind,
        power: foePower(state, offer.power),
        proteins: offer.proteins,
        energy: offer.energy,
        restMs: offer.restMs,
        party: partyOf(party),
        startedAt: state.now,
        arrivesAt,
        resolveAt: arrivesAt + windowMs,
        returnsAt,
        outcome: null,
        cancelled: false,
      },
    },
    events: [{ type: "huntSent", at: state.now, prey: preyId, arrivesAt, returnsAt }],
  };
}

/**
 * Apprivoiser un prédateur : le même combat qu'une chasse, mais on le ramène vivant. On n'a
 * qu'un compagnon à la fois, et il ne rapporte pas de protéines.
 */
function tamePredator(
  state: PlayerState,
  predatorId: string,
  party: Readonly<Record<TroopId, number>>,
): Outcome {
  if (state.companion !== null) return { error: "hasCompanion" };
  const predator = findPredator(state.worldSeed, predatorId, state.now);
  const sent = huntPredator(state, predatorId, party);
  if ("error" in sent || predator === null || sent.state.hunt === null) return sent;
  return {
    state: {
      ...sent.state,
      taming: predator.level,
      hunt: { ...sent.state.hunt, proteins: 0 },
    },
    events: sent.events,
  };
}

/** Partager un gène avec son compagnon : il grandit, et sa forme peut changer. */
function shareGene(state: PlayerState, family: GeneFamily): Outcome {
  const companion = state.companion;
  const offer = shareOffer(state, family);
  if (companion === null || offer.blocked === "noCompanion") return { error: "noCompanion" };
  if (offer.blocked !== null) return { error: offer.blocked };
  if (state.resources.proteins < offer.price) return { error: "insufficient" };
  return {
    state: {
      ...state,
      resources: { ...state.resources, proteins: state.resources.proteins - offer.price },
      companion: {
        ...companion,
        genes: { ...companion.genes, [family]: companion.genes[family] + 1 },
      },
    },
    events: [{ type: "geneShared", at: state.now, family }],
  };
}

/** Relâcher son compagnon : il repart, avec tout ce qu'on lui avait donné. */
function releaseCompanion(state: PlayerState): Outcome {
  if (state.companion === null) return { error: "noCompanion" };
  // Un groupe parti en apprivoiser un autre ne revient pas les mains vides pour autant.
  return { state: { ...state, companion: null }, events: [] };
}

/** Un groupe part affronter un animal de l'océan : prédateur ou Léviathan. */
function launch(
  state: PlayerState,
  preyId: string,
  kind: PreyKind,
  offer: PreyOffer,
  party: Readonly<Record<TroopId, number>>,
): Outcome {
  if (state.energy < offer.energy) return { error: "noEnergy" };
  const windowMs = BALANCE.hunt.strikeWindowSeconds * 1000;
  const arrivesAt = state.now + (offer.durationMs - windowMs) / 2;
  const returnsAt = state.now + offer.durationMs;
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] -= party[id];
  // On oublie au passage les prédateurs disparus : la liste ne grossit pas sans fin.
  const placeReadyAt: Record<string, number> = {};
  for (const [id, readyAt] of Object.entries(state.placeReadyAt)) {
    if (!id.startsWith("p:") || readyAt > state.now) placeReadyAt[id] = readyAt;
  }
  return {
    state: {
      ...state,
      energy: state.energy - offer.energy,
      troops,
      placeReadyAt,
      hunt: {
        prey: preyId,
        kind: kind,
        power: foePower(state, offer.power),
        proteins: offer.proteins,
        energy: offer.energy,
        restMs: offer.restMs,
        party: partyOf(party),
        startedAt: state.now,
        arrivesAt,
        resolveAt: arrivesAt + windowMs,
        returnsAt,
        outcome: null,
        cancelled: false,
      },
    },
    events: [{ type: "huntSent", at: state.now, prey: preyId, arrivesAt, returnsAt }],
  };
}

/**
 * Affronter le Léviathan d'un événement. Vaincu, il ne menace plus le joueur ; perdu, on peut
 * revenir tant qu'il est là.
 */
function huntLeviathan(
  state: PlayerState,
  eventId: string,
  party: Readonly<Record<TroopId, number>>,
): Outcome {
  if (state.hunt !== null || state.raid !== null) return { error: "busy" };
  const event = findEvent(state.worldSeed, eventId, state.now);
  if (event === null || event.kind !== "leviathan") return { error: "unknownEvent" };
  // Plus haut que soi, on ne l'atteint pas, sauf s'il tient déjà la cellule à sa portée.
  if (event.zone > state.zone && !eventCovers(event, playerCell(state))) {
    return { error: "zoneClosed" };
  }
  if (leviathanBeaten(state, event)) return { error: "placeResting" };
  if (partySize(party) === 0 || TROOP_IDS.some((id) => party[id] > state.troops[id])) {
    return { error: "noTroops" };
  }
  return launch(
    state,
    eventId,
    leviathanKind(event),
    leviathanOffer(state, event, state.now),
    party,
  );
}

/** Chasser un prédateur de l'océan : le même combat qu'une chasse, mais loin de chez soi. */
function huntPredator(
  state: PlayerState,
  predatorId: string,
  party: Readonly<Record<TroopId, number>>,
): Outcome {
  if (state.hunt !== null || state.raid !== null) return { error: "busy" };
  const predator = findPredator(state.worldSeed, predatorId, state.now);
  if (predator === null) return { error: "unknownPredator" };
  if (predator.zone > state.zone) return { error: "zoneClosed" };
  if ((state.placeReadyAt[predatorId] ?? 0) > state.now) return { error: "placeResting" };
  if (partySize(party) === 0 || TROOP_IDS.some((id) => party[id] > state.troops[id])) {
    return { error: "noTroops" };
  }
  return launch(state, predatorId, predator.kind, predatorOffer(state, predator, state.now), party);
}

/** Le joueur touche la proie pendant que son groupe se bat. */
function strikeHunt(state: PlayerState): Outcome {
  const hunt = state.hunt;
  if (hunt === null || hunt.cancelled) return { error: "noHunt" };
  if (hunt.outcome !== null) return { error: "tooLate" };
  if (state.now < hunt.arrivesAt) return { error: "notFighting" };
  return resolveHunt(state, hunt, state.now, true);
}

/** Rappeler le groupe n'est possible que tant qu'il n'a pas atteint la proie. */
function cancelHunt(state: PlayerState): Outcome {
  const hunt = state.hunt;
  if (hunt === null || hunt.cancelled) return { error: "noHunt" };
  if (state.now >= hunt.arrivesAt) return { error: "tooLate" };
  const returnsAt =
    state.now + cancelReturnMs(hunt.startedAt, 2 * hunt.arrivesAt - hunt.startedAt, state.now);
  return {
    state: {
      ...state,
      energy: Math.min(BALANCE.energy.max, state.energy + hunt.energy),
      hunt: { ...hunt, returnsAt, cancelled: true },
    },
    events: [{ type: "huntCancelled", at: state.now, returnsAt }],
  };
}

/** Prix en protéines de la prochaine mutation, en millionièmes d'unité. */
export function nextMutationPrice(state: PlayerState): number {
  const prices = BALANCE.mutationPrices;
  const bought = Math.max(0, state.counters.mutationsChosen - 1);
  return (prices[Math.min(bought, prices.length - 1)] ?? 0) * MICRO;
}

function buyMutation(state: PlayerState): Outcome {
  if (state.mutationOffer !== null) return { error: "offerPending" };
  if (mutationPool(state).length === 0) return { error: "noMoreMutations" };
  const price = nextMutationPrice(state);
  if (state.resources.proteins < price) return { error: "insufficient" };
  const offer = drawMutationOffer(
    { ...state, resources: { ...state.resources, proteins: state.resources.proteins - price } },
    state.now,
  );
  return {
    state: offer.state,
    events: [{ type: "mutationBought", at: state.now, price }, ...offer.events],
  };
}

function spyRival(state: PlayerState, rivalId: string): Outcome {
  const rival = reachableRivals(state).find((entry) => entry.id === rivalId);
  if (rival === undefined) return { error: "unknownRival" };
  if (isAlly(state, rival)) return { error: "ally" };
  if (rival.human) return { error: "human" };
  if ((state.spiedUntil[rivalId] ?? 0) > state.now) return { error: "alreadySpied" };
  const spy = BALANCE.rivals.spy;
  if (state.energy < spy.energy) return { error: "noEnergy" };
  return {
    state: {
      ...state,
      energy: state.energy - spy.energy,
      spiedUntil: { ...state.spiedUntil, [rivalId]: state.now + spy.hours * 3_600_000 },
    },
    events: [{ type: "rivalSpied", at: state.now, rival: rivalId }],
  };
}

function sendRaid(
  state: PlayerState,
  rivalId: string,
  party: Readonly<Record<TroopId, number>>,
): Outcome {
  if (state.hunt !== null || state.raid !== null) return { error: "busy" };
  const rival = reachableRivals(state).find((entry) => entry.id === rivalId);
  if (rival === undefined) return { error: "unknownRival" };
  if (isAlly(state, rival)) return { error: "ally" };
  if (rival.human) return { error: "human" };
  if ((state.placeReadyAt[rivalId] ?? 0) > state.now) return { error: "rivalClosed" };
  if (partySize(party) === 0 || TROOP_IDS.some((id) => party[id] > state.troops[id])) {
    return { error: "noTroops" };
  }
  const offer = raidOffer(state, rival, state.now);
  if (state.energy < offer.energy) return { error: "noEnergy" };
  const windowMs = BALANCE.hunt.strikeWindowSeconds * 1000;
  const arrivesAt = state.now + (offer.durationMs - windowMs) / 2;
  const returnsAt = state.now + offer.durationMs;
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] -= party[id];
  return {
    state: {
      // Qui attaque n'est plus protégé.
      ...dropShield(state, state.now),
      energy: state.energy - offer.energy,
      troops,
      raid: {
        rival: rivalId,
        kind: rival.kind,
        power: foePower(state, offer.guard),
        sugar: offer.sugar * MICRO,
        bricks: offer.bricks * MICRO,
        proteins: offer.proteins * MICRO,
        energy: offer.energy,
        restMs: offer.restMs,
        party: partyOf(party),
        startedAt: state.now,
        arrivesAt,
        resolveAt: arrivesAt + windowMs,
        returnsAt,
        outcome: null,
        cancelled: false,
      },
    },
    events: [{ type: "raidSent", at: state.now, rival: rivalId, arrivesAt, returnsAt }],
  };
}

/** Le joueur touche pendant que son groupe se bat chez le rival : il aide, sans garantie. */
function strikeRaid(state: PlayerState): Outcome {
  const raid = state.raid;
  if (raid === null || raid.cancelled) return { error: "noRaid" };
  if (raid.outcome !== null) return { error: "tooLate" };
  if (state.now < raid.arrivesAt) return { error: "notFighting" };
  return resolveRaid(state, raid, state.now, true);
}

function cancelRaid(state: PlayerState): Outcome {
  const raid = state.raid;
  if (raid === null || raid.cancelled) return { error: "noRaid" };
  if (state.now >= raid.arrivesAt) return { error: "tooLate" };
  const returnsAt =
    state.now + cancelReturnMs(raid.startedAt, 2 * raid.arrivesAt - raid.startedAt, state.now);
  return {
    state: {
      ...state,
      energy: Math.min(BALANCE.energy.max, state.energy + raid.energy),
      raid: { ...raid, returnsAt, cancelled: true },
    },
    events: [{ type: "raidCancelled", at: state.now, returnsAt }],
  };
}

/** Passer en mode absent. Impossible avec un groupe parti attaquer, ou trop tôt après le précédent. */
function startAway(state: PlayerState): Outcome {
  if (state.raid !== null) return { error: "busy" };
  if (state.awayReadyAt > state.now) return { error: "awayResting" };
  return { state: goAway(state, state.now), events: [] };
}

function chooseNight(state: PlayerState, minute: number): Outcome {
  if (state.nightReadyAt > state.now) return { error: "nightResting" };
  return { state: setNight(state, minute, state.now), events: [] };
}

/** Dépenser un accélérateur : le chantier ou l'évolution en cours finit plus tôt. */
function useBoost(state: PlayerState, target: BoostTarget): Outcome {
  if (state.boosts <= 0) return { error: "noBoost" };
  const running = target === "construction" ? state.construction : state.research;
  if (running === null) return { error: "nothingToBoost" };
  const savedMs = Math.min(Math.max(0, running.endsAt - state.now), BALANCE.boost.minutes * 60_000);
  const endsAt = running.endsAt - savedMs;
  const boosts = state.boosts - 1;
  return {
    state:
      target === "construction" && state.construction !== null
        ? { ...state, boosts, construction: { ...state.construction, endsAt } }
        : state.research !== null
          ? { ...state, boosts, research: { ...state.research, endsAt } }
          : state,
    events: [{ type: "boostUsed", at: state.now, target, savedMs }],
  };
}

/** Recherche militaire : payer le niveau suivant d'un pouvoir. Il vaut tout de suite. */
function drill(state: PlayerState, power: DrillId): Outcome {
  const offer = drillOffer(state, power);
  if (offer.blocked !== null) return { error: offer.blocked };
  if (RESOURCE_IDS.some((id) => state.resources[id] < offer.cost[id])) {
    return { error: "insufficient" };
  }
  return {
    state: {
      ...state,
      resources: {
        sugar: state.resources.sugar - offer.cost.sugar,
        bricks: state.resources.bricks - offer.cost.bricks,
        proteins: state.resources.proteins - offer.cost.proteins,
      },
      drills: { ...state.drills, [power]: offer.toLevel },
    },
    events: [{ type: "drillLearned", at: state.now, power, level: offer.toLevel }],
  };
}

function claimQuest(state: PlayerState, index: number): Outcome {
  const quest = state.quests?.items[index];
  if (quest === undefined) return { error: "noQuest" };
  if (quest.claimed) return { error: "alreadyClaimed" };
  if (quest.progress < quest.target) return { error: "questNotDone" };
  return openChest(state, index, state.now);
}

function execute(state: PlayerState, order: Order): Outcome {
  switch (order.type) {
    case "harvest":
      return harvest(state, order.taps);
    case "build":
      return build(state, order.organelle);
    case "upgrade":
      return upgrade(state, order.organelle);
    case "unqueue":
      return unqueue(state);
    case "chooseMutation":
      return chooseMutation(state, order.mutation);
    case "sendExpedition":
      return sendExpedition(state, order.place);
    case "cancelExpedition":
      return cancelExpedition(state);
    case "trainTroop":
      return trainTroop(state, order.troop, order.count);
    case "sendHunt":
      return sendHunt(state, order.prey, order.party);
    case "strikeHunt":
      return strikeHunt(state);
    case "cancelHunt":
      return cancelHunt(state);
    case "buyMutation":
      return buyMutation(state);
    case "claimQuest":
      return claimQuest(state, order.index);
    case "spyRival":
      return spyRival(state, order.rival);
    case "sendRaid":
      return sendRaid(state, order.rival, order.party);
    case "strikeRaid":
      return strikeRaid(state);
    case "cancelRaid":
      return cancelRaid(state);
    case "goAway":
      return startAway(state);
    case "setNight":
      return chooseNight(state, order.minute);
    case "research":
      return research(state, order.evolution);
    case "gather":
      return gather(state, order.deposit);
    case "migrate":
      return migrate(state);
    case "huntPredator":
      return huntPredator(state, order.predator, order.party);
    case "tamePredator":
      return tamePredator(state, order.predator, order.party);
    case "shareGene":
      return shareGene(state, order.family);
    case "releaseCompanion":
      return releaseCompanion(state);
    case "huntLeviathan":
      return huntLeviathan(state, order.event, order.party);
    case "useBoost":
      return useBoost(state, order.target);
    case "leaveWater":
      return leaveWater(state);
    case "drill":
      return drill(state, order.power);
    case "setAutoHarvest":
      return { state: { ...state, autoHarvest: order.on }, events: [] };
    case "openReward":
      return state.chests[order.index] === undefined
        ? { error: "noChest" }
        : openReward(state, order.index, state.now);
    case "joinAlliance":
    case "donate":
    case "recommend":
    case "helpAllies":
    case "askHelp":
    case "claimGift":
    case "buyAlliance":
      return allianceOrder(state, order);
  }
}

/**
 * Applique un ordre à l'instant `now`.
 * L'état reçu n'est jamais modifié. En cas de refus, rien ne change.
 */
export function applyOrder(state: PlayerState, order: Order, now: number): OrderResult {
  if (!Number.isSafeInteger(now) || now < state.now) return { ok: false, error: "timeBackwards" };
  const before = advance(state, now);
  if (orderTier(order.type) > before.state.tier) return { ok: false, error: "locked" };
  const outcome = execute(before.state, order);
  if ("error" in outcome) return { ok: false, error: outcome.error };
  // Une expédition rappelée tout près de la cellule peut rentrer dans la même milliseconde.
  const after = advance(
    trackReports(
      trackDaily(trackQuests(outcome.state, outcome.events), outcome.events),
      outcome.events,
    ),
    now,
  );
  return {
    ok: true,
    state: after.state,
    events: [...before.events, ...outcome.events, ...after.events],
  };
}
