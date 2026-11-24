/** Point d'entrée du moteur : appliquer un ordre du joueur à un instant donné. */
import { BALANCE, MUTATION_IDS, RESOURCE_IDS, TROOP_IDS } from "@o27/data";
import type { MutationId, Order, OrganelleId, TroopId } from "@o27/data";
import { advance } from "./advance";
import { capacity, levelCost, levelDuration, tapYield } from "./stats";
import type { GameEvent, OrderErrorCode, OrderResult, PlayerState } from "./types";
import { canTrain, partySize, resolveHunt, trainMs } from "./hunt";
import { openChest, trackQuests } from "./quests";
import { dropShield, goAway, raidOffer, reachableRivals, resolveRaid, setNight } from "./rivals";
import { MICRO } from "./types";
import { drawMutationOffer, orderTier } from "./unlock";
import { ZONE_COUNT, cellIn, findDeposit, gatherOffer, migrateOffer } from "./ocean";
import { findPredator, predatorOffer } from "./predators";
import { cancelReturnMs, placeOffer, preyOffer, visiblePlaces, visiblePrey } from "./world";

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
  const amount = Math.min(room, allowed * tapYield(state));
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
  if (state.construction !== null) return { error: "busy" };
  const cost = levelCost(state, organelle, toLevel);
  if (RESOURCE_IDS.some((id) => state.resources[id] < cost[id])) return { error: "insufficient" };
  const endsAt = state.now + levelDuration(state, organelle, toLevel);
  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        sugar: state.resources.sugar - cost.sugar,
        bricks: state.resources.bricks - cost.bricks,
      },
      construction: { organelle, toLevel, endsAt },
    },
    events: [{ type: "constructionStarted", at: state.now, organelle, toLevel, endsAt }],
  };
}

function build(state: PlayerState, organelle: OrganelleId): Outcome {
  if (BALANCE.organelles[organelle].tier > state.tier) return { error: "locked" };
  if (state.organelles[organelle] > 0) return { error: "alreadyBuilt" };
  return startConstruction(state, organelle, 1);
}

function upgrade(state: PlayerState, organelle: OrganelleId): Outcome {
  const level = state.organelles[organelle];
  if (level === 0) return { error: "notBuilt" };
  if (level >= BALANCE.organelles[organelle].maxLevel) return { error: "maxLevel" };
  return startConstruction(state, organelle, level + 1);
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

function sendExpedition(state: PlayerState, placeId: string): Outcome {
  if (state.expedition !== null) return { error: "busy" };
  const place = visiblePlaces(state.worldSeed, state.slot).find((entry) => entry.id === placeId);
  if (place === undefined) return { error: "unknownPlace" };
  if ((state.placeReadyAt[placeId] ?? 0) > state.now) return { error: "placeResting" };
  const offer = placeOffer(place);
  if (state.energy < offer.energy) return { error: "noEnergy" };
  const returnsAt = state.now + offer.durationMs;
  return {
    state: {
      ...state,
      energy: state.energy - offer.energy,
      expedition: {
        place: placeId,
        kind: place.kind,
        loot: offer.loot,
        energy: offer.energy,
        restMs: offer.restMs,
        startedAt: state.now,
        returnsAt,
        cancelled: false,
      },
    },
    events: [{ type: "expeditionSent", at: state.now, place: placeId, returnsAt }],
  };
}

/** Récolter un gisement commun : ce que l'on charge n'est plus là pour les autres. */
function gather(state: PlayerState, depositId: string): Outcome {
  if (state.expedition !== null) return { error: "busy" };
  const deposit = findDeposit(state.worldSeed, depositId, state.now);
  if (deposit === null) return { error: "unknownPlace" };
  if (deposit.zone > state.zone) return { error: "zoneClosed" };
  const offer = gatherOffer(state, deposit, state.now);
  if (offer.loot <= 0) return { error: "depleted" };
  if (state.energy < offer.energy) return { error: "noEnergy" };
  const returnsAt = state.now + offer.durationMs;
  // On oublie au passage les gisements disparus : la liste ne grossit pas sans fin.
  const taken: Record<string, number> = {};
  for (const [id, amount] of Object.entries(state.taken)) {
    if (findDeposit(state.worldSeed, id, state.now) !== null) taken[id] = amount;
  }
  taken[depositId] = (taken[depositId] ?? 0) + offer.loot;
  return {
    state: {
      ...state,
      energy: state.energy - offer.energy,
      taken,
      expedition: {
        place: depositId,
        kind: deposit.kind,
        loot: offer.loot,
        energy: offer.energy,
        restMs: 0,
        startedAt: state.now,
        returnsAt,
        cancelled: false,
      },
    },
    events: [{ type: "expeditionSent", at: state.now, place: depositId, returnsAt }],
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
  if (state.training !== null) return { error: "busy" };
  const data = BALANCE.troops[troop];
  const sugar = data.cost.sugar * MICRO * count;
  const bricks = data.cost.bricks * MICRO * count;
  if (state.resources.sugar < sugar || state.resources.bricks < bricks) {
    return { error: "insufficient" };
  }
  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        sugar: state.resources.sugar - sugar,
        bricks: state.resources.bricks - bricks,
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
        power: offer.power,
        proteins: offer.proteins,
        energy: offer.energy,
        restMs: offer.restMs,
        party: { hunter: party.hunter, armored: party.armored, swift: party.swift },
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
  const offer = predatorOffer(state, predator, state.now);
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
        prey: predatorId,
        kind: predator.kind,
        power: offer.power,
        proteins: offer.proteins,
        energy: offer.energy,
        restMs: offer.restMs,
        party: { hunter: party.hunter, armored: party.armored, swift: party.swift },
        startedAt: state.now,
        arrivesAt,
        resolveAt: arrivesAt + windowMs,
        returnsAt,
        outcome: null,
        cancelled: false,
      },
    },
    events: [{ type: "huntSent", at: state.now, prey: predatorId, arrivesAt, returnsAt }],
  };
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
  if (state.mutations.length >= MUTATION_IDS.length) return { error: "noMoreMutations" };
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
        power: offer.guard,
        sugar: offer.sugar * MICRO,
        bricks: offer.bricks * MICRO,
        proteins: offer.proteins * MICRO,
        energy: offer.energy,
        restMs: offer.restMs,
        party: { hunter: party.hunter, armored: party.armored, swift: party.swift },
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
    case "gather":
      return gather(state, order.deposit);
    case "migrate":
      return migrate(state);
    case "huntPredator":
      return huntPredator(state, order.predator, order.party);
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
  const after = advance(trackQuests(outcome.state, outcome.events), now);
  return {
    ok: true,
    state: after.state,
    events: [...before.events, ...outcome.events, ...after.events],
  };
}
