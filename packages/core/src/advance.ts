/** Faire passer le temps : production passive, fin des chantiers, retour des expéditions, paliers. */
import { BALANCE, PLACE_RESOURCE, RESOURCE_IDS, TROOP_IDS } from "@o27/data";
import { capacity, productionRate } from "./stats";
import { partySize, resolveHunt } from "./hunt";
import { ensureQuests, questsRenewAt, renewQuests, trackQuests } from "./quests";
import type { Construction, Expedition, GameEvent, Hunt, PlayerState, Step } from "./types";
import { evaluateTier } from "./unlock";
import { energyAt } from "./world";

/** Produit jusqu'à l'instant `to`, sans dépasser le stockage. */
function produce(state: PlayerState, to: number): PlayerState {
  const elapsed = to - state.now;
  if (elapsed === 0) return state;
  const resources = { ...state.resources };
  for (const id of RESOURCE_IDS) {
    const current = state.resources[id];
    const filled = Math.min(capacity(state, id), current + productionRate(state, id) * elapsed);
    // Un stock déjà au-dessus du plafond n'est jamais réduit.
    resources[id] = Math.max(current, filled);
  }
  return { ...state, now: to, resources };
}

function complete(state: PlayerState, construction: Construction): PlayerState {
  const isNew = state.organelles[construction.organelle] === 0;
  return {
    ...state,
    construction: null,
    organelles: { ...state.organelles, [construction.organelle]: construction.toLevel },
    counters: isNew
      ? { ...state.counters, organellesBuilt: state.counters.organellesBuilt + 1 }
      : state.counters,
  };
}

/** Le filament est revenu : le butin entre dans la réserve, ce qui déborde est perdu. */
function comeBack(state: PlayerState, expedition: Expedition): Step {
  const resource = PLACE_RESOURCE[expedition.kind];
  const loot = expedition.cancelled ? 0 : expedition.loot;
  const room = Math.max(0, capacity(state, resource) - state.resources[resource]);
  const gained = Math.min(room, loot);
  const next: PlayerState = {
    ...state,
    expedition: null,
    resources: { ...state.resources, [resource]: state.resources[resource] + gained },
    counters: expedition.cancelled
      ? state.counters
      : { ...state.counters, mapHarvests: state.counters.mapHarvests + 1 },
    placeReadyAt: expedition.cancelled
      ? state.placeReadyAt
      : { ...state.placeReadyAt, [expedition.place]: expedition.returnsAt + expedition.restMs },
  };
  return {
    state: next,
    events: [
      {
        type: "expeditionReturned",
        at: expedition.returnsAt,
        place: expedition.place,
        resource,
        gained,
        lost: loot - gained,
        cancelled: expedition.cancelled,
      },
    ],
  };
}

/** Une cellule fille vient de naître ; la suivante, s'il y en a, commence aussitôt. */
function born(state: PlayerState): Step {
  const training = state.training;
  if (training === null) return { state, events: [] };
  const seconds = BALANCE.troops[training.troop].seconds;
  return {
    state: {
      ...state,
      troops: { ...state.troops, [training.troop]: state.troops[training.troop] + 1 },
      training:
        training.remaining <= 1
          ? null
          : {
              ...training,
              remaining: training.remaining - 1,
              nextAt: training.nextAt + seconds * 1000,
            },
    },
    events: [{ type: "troopBorn", at: training.nextAt, troop: training.troop }],
  };
}

/** Le groupe de chasse est rentré : survivantes à la maison, protéines dans la réserve. */
function huntBack(state: PlayerState, hunt: Hunt): Step {
  const won = hunt.outcome?.won === true;
  const losses = hunt.outcome?.losses ?? { hunter: 0, armored: 0, swift: 0 };
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] += hunt.party[id] - losses[id];
  const room = Math.max(0, capacity(state, "proteins") - state.resources.proteins);
  const promised = won ? hunt.proteins : 0;
  const gained = Math.min(room, promised);
  return {
    state: {
      ...state,
      hunt: null,
      troops,
      resources: { ...state.resources, proteins: state.resources.proteins + gained },
      counters: won ? { ...state.counters, huntsWon: state.counters.huntsWon + 1 } : state.counters,
      placeReadyAt: won
        ? { ...state.placeReadyAt, [hunt.prey]: hunt.returnsAt + hunt.restMs }
        : state.placeReadyAt,
    },
    events: [
      {
        type: "huntReturned",
        at: hunt.returnsAt,
        prey: hunt.prey,
        won,
        gained,
        lost: promised - gained,
        losses: partySize(losses),
        cancelled: hunt.cancelled,
      },
    ],
  };
}

/** Prochain instant où la chasse en cours demande quelque chose : le combat, puis le retour. */
function huntDue(hunt: Hunt | null): number {
  if (hunt === null) return Number.POSITIVE_INFINITY;
  return hunt.cancelled || hunt.outcome !== null ? hunt.returnsAt : hunt.resolveAt;
}

/** Énergie remise à jour, lieux regarnis oubliés. */
function settle(state: PlayerState, now: number): PlayerState {
  const energy = energyAt(state, now);
  const resting = Object.entries(state.placeReadyAt).filter(([, readyAt]) => readyAt > now);
  const pruned = resting.length !== Object.keys(state.placeReadyAt).length;
  if (energy.energy === state.energy && energy.energyAt === state.energyAt && !pruned) return state;
  return {
    ...state,
    ...energy,
    placeReadyAt: pruned ? Object.fromEntries(resting) : state.placeReadyAt,
  };
}

/**
 * Amène l'état à l'instant `now`. Chaque événement daté (fin de chantier, retour) est résolu
 * à son heure exacte : avancer en une fois ou en plusieurs donne le même résultat.
 */
export function advance(state: PlayerState, now: number): Step {
  if (!Number.isSafeInteger(now) || now < state.now) {
    throw new RangeError("advance : le temps ne peut pas reculer");
  }
  let current = state;
  const events: GameEvent[] = [];
  for (;;) {
    const { construction, expedition, training, hunt } = current;
    const buildEnd = construction?.endsAt ?? Number.POSITIVE_INFINITY;
    const tripEnd = expedition?.returnsAt ?? Number.POSITIVE_INFINITY;
    const birth = training?.nextAt ?? Number.POSITIVE_INFINITY;
    const huntAt = huntDue(hunt);
    const renewAt = questsRenewAt(current);
    const at = Math.min(buildEnd, tripEnd, birth, huntAt, renewAt);
    if (at > now) break;
    // Minuit passe avant tout le reste : ce qui arrive à minuit pile compte pour le nouveau jour.
    if (renewAt === at) {
      // L'énergie est d'abord mise à jour : le coffre ouvert à minuit s'ajoute à la vraie jauge.
      const renewed = renewQuests(settle(produce(current, at), at), at);
      current = renewed.state;
      events.push(...renewed.events);
      continue;
    }
    const seen = events.length;
    // À la même milliseconde, l'ordre est fixe : chantier, naissance, expédition, chasse.
    // Le chantier passe d'abord : la réserve agrandie accueille le butin.
    if (training !== null && birth === at && buildEnd > at) {
      const step = born(produce(current, at));
      current = step.state;
      events.push(...step.events);
    } else if (hunt !== null && huntAt === at && buildEnd > at && tripEnd > at) {
      const ready = produce(current, at);
      const step =
        hunt.cancelled || hunt.outcome !== null
          ? huntBack(ready, hunt)
          : resolveHunt(ready, hunt, at, false);
      current = step.state;
      events.push(...step.events);
    } else if (construction !== null && buildEnd <= tripEnd) {
      current = complete(produce(current, at), construction);
      events.push({
        type: "constructionDone",
        at,
        organelle: construction.organelle,
        level: construction.toLevel,
      });
    } else if (expedition !== null) {
      const back = comeBack(produce(current, at), expedition);
      current = back.state;
      events.push(...back.events);
    }
    const step = evaluateTier(current, at);
    events.push(...step.events);
    current = trackQuests(ensureQuests(step.state, at), events.slice(seen));
  }
  const step = evaluateTier(settle(produce(current, now), now), now);
  events.push(...step.events);
  return { state: ensureQuests(step.state, now), events };
}
