/** Faire passer le temps : production passive, fin des chantiers, retour des expéditions, paliers. */
import { ensureAlliance } from "./alliance";
import { allianceDue } from "./banners";
import { trackDaily } from "./daily";
import { earnChest } from "./chests";
import { contestStep } from "./contest";
import { crisisRate } from "./crisis";
import { autoHarvest } from "./expeditions";
import { anoxiaEdge } from "./events";
import { leviathanDue, leviathanStrike } from "./leviathan";
import { leagueStep } from "./power";
import { trackReports } from "./reports";
import { BALANCE, PLACE_RESOURCE, RESOURCE_IDS, TROOP_IDS } from "@o27/data";
import type { GeneFamily } from "@o27/data";
import { capacity, modifierPercent, productionRate } from "./stats";
import { partyOf, partySize, resolveHunt, trainMs, upkeepRate } from "./hunt";
import { ensureQuests, renewQuests, trackQuests } from "./quests";
import { ensureIncoming, raidBack, resolveIncoming, resolveRaid } from "./rivals";
import type { Construction, Expedition, GameEvent, Hunt, PlayerState, Step } from "./types";
import { DAY_MS } from "./types";
import { evaluateTier, seasonDay } from "./unlock";
import { energyAt } from "./world";

/** Ce que la cellule produit vraiment : la production, une fois la crise de saison comptée. */
function made(state: PlayerState, id: "sugar" | "bricks" | "proteins"): number {
  return crisisRate(state, productionRate(state, id));
}

/** Produit jusqu'à l'instant `to`, sans dépasser le stockage. */
function produce(state: PlayerState, to: number): PlayerState {
  const elapsed = to - state.now;
  if (elapsed === 0) return state;
  const resources = { ...state.resources };
  for (const id of RESOURCE_IDS) {
    const current = state.resources[id];
    // Les cellules filles se nourrissent de sucre : la production peut devenir une dépense.
    const rate = made(state, id) - (id === "sugar" ? upkeepRate(state) : 0);
    resources[id] =
      rate >= 0
        ? // Un stock déjà au-dessus du plafond n'est jamais réduit.
          Math.max(current, Math.min(capacity(state, id), current + rate * elapsed))
        : Math.max(0, current + rate * elapsed);
  }
  return { ...state, now: to, resources };
}

/**
 * Instant de la prochaine vague de famine : le premier multiple de l'intervalle après que la
 * réserve de sucre s'est vidée. Jamais, si la production suffit ou s'il n'y a personne à la
 * maison. Entre la réserve vide et la vague, le joueur a le temps de réagir.
 */
function hungerAt(state: PlayerState): number {
  // Personne à la maison : personne ne peut mourir de faim. On le vérifie d'abord, c'est le cas le plus courant.
  if (partySize(state.troops) === 0) return Number.POSITIVE_INFINITY;
  const rate = made(state, "sugar") - upkeepRate(state);
  if (rate >= 0) return Number.POSITIVE_INFINITY;
  const emptyAt = state.now + Math.ceil(state.resources.sugar / -rate);
  const wave = BALANCE.troopUpkeep.famineSeconds * 1000;
  return (Math.floor(emptyAt / wave) + 1) * wave;
}

/**
 * Une vague de famine : la réserve est vide et la cellule ne peut plus nourrir tout le monde.
 * Une part des cellules filles à la maison meurt, jamais plus qu'il n'en faut pour que la
 * production suffise de nouveau. Les plus nombreuses partent d'abord.
 */
function starve(state: PlayerState, at: number): Step {
  const data = BALANCE.troopUpkeep;
  const deficit = upkeepRate(state) - made(state, "sugar");
  const troops: Record<(typeof TROOP_IDS)[number], number> = { ...state.troops };
  const home = partySize(troops);
  const count = Math.min(
    home,
    Math.ceil(deficit / data.milliPerSecond),
    Math.max(1, Math.ceil((home * data.faminePercent) / 100)),
  );
  for (let left = count; left > 0; left--) {
    let biggest: (typeof TROOP_IDS)[number] = "hunter";
    for (const id of TROOP_IDS) if (troops[id] > troops[biggest]) biggest = id;
    troops[biggest] -= 1;
  }
  return {
    state: { ...state, troops },
    events: count > 0 ? [{ type: "troopsStarved", at, count }] : [],
  };
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
    placeReadyAt:
      expedition.cancelled || /^[dv]:/.test(expedition.place)
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
              nextAt: training.nextAt + trainMs(state, training.troop),
            },
    },
    events: [{ type: "troopBorn", at: training.nextAt, troop: training.troop }],
  };
}

function emptyGenes(): Record<GeneFamily, number> {
  return { metabolism: 0, predation: 0, mobility: 0, resilience: 0 };
}

/** Le groupe de chasse est rentré : survivantes à la maison, protéines dans la réserve. */
function huntBack(state: PlayerState, hunt: Hunt): Step {
  const won = hunt.outcome?.won === true;
  const losses = hunt.outcome?.losses ?? partyOf();
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] += hunt.party[id] - losses[id];
  const promised = won
    ? Math.floor((hunt.proteins * (100 + modifierPercent(state, "huntProteins"))) / 100)
    : 0;
  // Un Léviathan vaincu ne rentre pas dans la réserve : sa récompense attend dans un coffre.
  const beast = won && hunt.prey.startsWith("e:");
  const room = Math.max(0, capacity(state, "proteins") - state.resources.proteins);
  const gained = beast ? 0 : Math.min(room, promised);
  const home: PlayerState = {
    ...state,
    hunt: null,
    taming: null,
    // Le prédateur visé a été battu sans être tué : il suit le groupe jusqu'à la cellule.
    companion:
      won && state.taming !== null && state.companion === null
        ? { species: state.taming, genes: emptyGenes() }
        : state.companion,
    troops,
    resources: { ...state.resources, proteins: state.resources.proteins + gained },
    counters: won ? { ...state.counters, huntsWon: state.counters.huntsWon + 1 } : state.counters,
    placeReadyAt: won
      ? { ...state.placeReadyAt, [hunt.prey]: hunt.returnsAt + hunt.restMs }
      : state.placeReadyAt,
  };
  const returned: GameEvent = {
    type: "huntReturned",
    at: hunt.returnsAt,
    prey: hunt.prey,
    won,
    gained,
    lost: beast ? 0 : promised - gained,
    losses: partySize(losses),
    cancelled: hunt.cancelled,
  };
  if (!beast) return { state: home, events: [returned] };
  const data = BALANCE.events.leviathan;
  const chest = earnChest(home, {
    kind: "leviathan",
    at: hunt.returnsAt,
    level: 0,
    sugar: 0,
    bricks: 0,
    proteins: promised,
    energy: data.energyGain,
    boosts: data.boosts,
  });
  return { state: chest.state, events: [returned, ...chest.events] };
}

/** Prochain instant où un groupe sorti (chasse ou attaque) demande quelque chose : le combat, puis le retour. */
function sortieDue(
  sortie: {
    readonly cancelled: boolean;
    readonly outcome: unknown;
    readonly returnsAt: number;
    readonly resolveAt: number;
  } | null,
): number {
  if (sortie === null) return Number.POSITIVE_INFINITY;
  return sortie.cancelled || sortie.outcome !== null ? sortie.returnsAt : sortie.resolveAt;
}

/** Énergie remise à jour, lieux regarnis oubliés. */
function settle(state: PlayerState, now: number): PlayerState {
  const energy = energyAt(state, now);
  const resting = Object.entries(state.placeReadyAt).filter(([, readyAt]) => readyAt > now);
  const spied = Object.entries(state.spiedUntil).filter(([, until]) => until > now);
  const pruned =
    resting.length !== Object.keys(state.placeReadyAt).length ||
    spied.length !== Object.keys(state.spiedUntil).length;
  if (energy.energy === state.energy && energy.energyAt === state.energyAt && !pruned) return state;
  return {
    ...state,
    ...energy,
    placeReadyAt: Object.fromEntries(resting),
    spiedUntil: Object.fromEntries(spied),
  };
}

/**
 * Amène l'état à l'instant `now`. Chaque événement daté (fin de chantier, naissance, retour,
 * combat, attaque subie, minuit) est résolu à son heure exacte : avancer en une fois ou en
 * plusieurs donne le même résultat.
 */
export function advance(state: PlayerState, now: number): Step {
  if (!Number.isSafeInteger(now) || now < state.now) {
    throw new RangeError("advance : le temps ne peut pas reculer");
  }
  const never = Number.POSITIVE_INFINITY;
  let current = state;
  const events: GameEvent[] = [];
  for (;;) {
    const { construction, expedition, training, hunt, raid, research } = current;
    const researchEnd = research?.endsAt ?? never;
    const buildEnd = construction?.endsAt ?? never;
    const birth = training?.nextAt ?? never;
    const tripEnd = expedition?.returnsAt ?? never;
    const huntAt = sortieDue(hunt);
    const raidAt = sortieDue(raid);
    const attackAt = current.nextRaidAt ?? never;
    // Chaque minuit de saison est un événement : les quêtes changent, et un palier qui
    // attendait son jour s'ouvre à cet instant précis, pas « quand le joueur revient ».
    const midnight = current.seasonStart + seasonDay(current, current.now) * DAY_MS;
    const hunger = hungerAt(current);
    const leviathanAt = leviathanDue(current);
    // Instants où les bonus du joueur changent tout seuls : une technologie d'alliance gagne
    // un niveau, une zone anoxique arrive ou se dissipe. On s'y arrête pour produire juste.
    const edge = Math.min(allianceDue(current), anoxiaEdge(current));
    const at = Math.min(
      leviathanAt,
      edge,
      buildEnd,
      birth,
      tripEnd,
      huntAt,
      raidAt,
      attackAt,
      midnight,
      hunger,
      researchEnd,
    );
    if (at > now) break;
    const seen = events.length;
    const ready = produce(current, at);
    // À la même milliseconde, l'ordre est fixe : chantier, naissance, expédition, chasse,
    // attaque envoyée, attaque subie. Le chantier d'abord : la réserve agrandie accueille le butin.
    // Minuit passe avant tout le reste : ce qui arrive à minuit pile compte pour le nouveau jour.
    let step: Step;
    if (midnight === at) {
      // L'énergie est d'abord mise à jour : le coffre ouvert à minuit s'ajoute à la vraie jauge.
      const daily: Step =
        ready.quests === null ? { state: ready, events: [] } : renewQuests(settle(ready, at), at);
      // Puis la récompense de ligue du jour qui s'achève.
      const league = leagueStep(daily.state, at);
      step = { state: league.state, events: [...daily.events, ...league.events] };
    } else if (construction !== null && buildEnd === at) {
      step = {
        state: complete(ready, construction),
        events: [
          {
            type: "constructionDone",
            at,
            organelle: construction.organelle,
            level: construction.toLevel,
          },
        ],
      };
    } else if (research !== null && researchEnd === at) {
      step = {
        state: {
          ...ready,
          research: null,
          evolutions: { ...ready.evolutions, [research.evolution]: research.toLevel },
        },
        events: [
          { type: "evolutionDone", at, evolution: research.evolution, level: research.toLevel },
        ],
      };
    } else if (training !== null && birth === at) {
      step = born(ready);
    } else if (expedition !== null && tripEnd === at) {
      const back = comeBack(ready, expedition);
      // Récolte automatique : sitôt rentrées, les cellules repartent.
      const again = expedition.cancelled ? null : autoHarvest(back.state, expedition);
      step =
        again === null ? back : { state: again.state, events: [...back.events, ...again.events] };
    } else if (hunt !== null && huntAt === at) {
      step =
        hunt.cancelled || hunt.outcome !== null
          ? huntBack(ready, hunt)
          : resolveHunt(ready, hunt, at, false);
    } else if (raid !== null && raidAt === at) {
      step =
        raid.cancelled || raid.outcome !== null
          ? raidBack(ready, raid, {
              sugar: capacity(ready, "sugar") - ready.resources.sugar,
              bricks: capacity(ready, "bricks") - ready.resources.bricks,
              proteins: capacity(ready, "proteins") - ready.resources.proteins,
            })
          : resolveRaid(ready, raid, at, false);
    } else if (attackAt === at) {
      step = resolveIncoming(ready, at);
    } else if (leviathanAt === at) {
      step = leviathanStrike(ready, at);
    } else if (hunger === at) {
      step = starve(ready, at);
    } else {
      step = { state: ready, events: [] };
    }
    events.push(...step.events);
    const tiers = evaluateTier(step.state, at);
    events.push(...tiers.events);
    const joined = ensureAlliance(tiers.state, at);
    events.push(...joined.events);
    // Le concours de la semaine : on y entre, et chaque semaine qui s'achève est jugée à minuit.
    const allied = contestStep(joined.state, at);
    events.push(...allied.events);
    const fresh = events.slice(seen);
    current = trackReports(
      trackDaily(trackQuests(ensureIncoming(ensureQuests(allied.state, at), at), fresh), fresh),
      fresh,
    );
  }
  const step = evaluateTier(settle(produce(current, now), now), now);
  events.push(...step.events);
  const joined = ensureAlliance(step.state, now);
  events.push(...joined.events);
  const allied = contestStep(joined.state, now);
  events.push(...allied.events);
  return { state: ensureIncoming(ensureQuests(allied.state, now), now), events };
}
