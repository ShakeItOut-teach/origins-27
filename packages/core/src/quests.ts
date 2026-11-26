/**
 * Quêtes du jour et coffres.
 * Chaque jour de saison, le joueur reçoit quelques quêtes tirées au hasard, plus un défi
 * facultatif. Le tirage dépend de la graine du joueur et du jour : il est différent pour
 * chacun, ne suit aucune rotation, et le serveur comme l'appareil trouvent le même.
 */
import { BALANCE, CHEST_REWARDS, MUTATION_IDS, QUEST_IDS } from "@o27/data";
import type { ChestReward, QuestId } from "@o27/data";
import { earnChest } from "./chests";
import { maxLevelOf } from "./stats";
import { createRng } from "./rng";
import type { Rng } from "./rng";
import { DAY_MS, MICRO } from "./types";
import type { DailyQuests, GameEvent, PlayerState, Quest, Step } from "./types";
import { seasonDay } from "./unlock";
import { visiblePlaces, visiblePrey } from "./world";

/** Quêtes dont l'objectif est une quantité de ressource (comptée en millionièmes d'unité). */
const AMOUNT_QUESTS: readonly QuestId[] = ["tapSugar", "bricksFromMap", "sugarFromMap"];

export function questIsAmount(id: QuestId): boolean {
  return AMOUNT_QUESTS.includes(id);
}

function seeded(seed: number, day: number, salt: number): Rng {
  const rng = createRng(
    (seed ^ Math.imul(day, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0,
  );
  rng.next();
  rng.next();
  return rng;
}

/** Une quête n'est proposée que si le joueur peut vraiment la faire aujourd'hui. */
function feasible(state: PlayerState, id: QuestId): boolean {
  if (BALANCE.quests.pool[id].tier > state.tier) return false;
  if (id === "mutate") return state.mutations.length < MUTATION_IDS.length;
  if (id === "upgradeStore") return state.organelles.vacuole < maxLevelOf(state, "vacuole");
  return true;
}

function pick<T>(pool: T[], rng: Rng): T | undefined {
  if (pool.length === 0) return undefined;
  const [picked] = pool.splice(rng.int(pool.length), 1);
  return picked;
}

function makeQuest(id: QuestId, rng: Rng): Quest {
  const data = BALANCE.quests.pool[id];
  const target = data.min + rng.int(data.max - data.min + 1);
  return {
    id,
    target: questIsAmount(id) ? target * MICRO : target,
    progress: 0,
    challenge: data.challenge,
    claimed: false,
  };
}

/** Tire les quêtes d'un jour : jamais celles de la veille, tant qu'il en reste assez d'autres. */
export function drawQuests(state: PlayerState, day: number): DailyQuests {
  const rng = seeded(state.seed, day, 0);
  const yesterday = new Set((state.quests?.items ?? []).map((quest) => quest.id));
  const choose = (challenge: boolean, count: number): Quest[] => {
    const all = QUEST_IDS.filter(
      (id) => BALANCE.quests.pool[id].challenge === challenge && feasible(state, id),
    );
    const fresh = all.filter((id) => !yesterday.has(id));
    const pool = fresh.length >= count ? fresh : all;
    const quests: Quest[] = [];
    for (let i = 0; i < count; i++) {
      const id = pick(pool, rng);
      if (id !== undefined) quests.push(makeQuest(id, rng));
    }
    return quests;
  };
  return { day, items: [...choose(false, BALANCE.quests.perDay), ...choose(true, 1)] };
}

/** Donne ses premières quêtes à un joueur qui vient d'y avoir droit. */
export function ensureQuests(state: PlayerState, at: number): PlayerState {
  if (state.quests !== null || state.tier < BALANCE.quests.tier) return state;
  return { ...state, quests: drawQuests(state, seasonDay(state, at)) };
}

/** Instant où les quêtes en cours laissent la place à celles du lendemain. */
export function questsRenewAt(state: PlayerState): number {
  if (state.quests === null) return Number.POSITIVE_INFINITY;
  return state.seasonStart + state.quests.day * DAY_MS;
}

/** De combien un événement fait avancer une quête. */
function gain(state: PlayerState, id: QuestId, event: GameEvent): number {
  switch (event.type) {
    case "harvested":
      return id === "tapSugar" ? event.amount : 0;
    case "constructionDone":
      if (id === "build") return 1;
      return id === "upgradeStore" && event.organelle === "vacuole" && event.level > 1 ? 1 : 0;
    case "expeditionReturned": {
      if (event.cancelled) return 0;
      if (id === "expeditions" || id === "challengeExpeditions") return 1;
      if (id === "bricksFromMap") return event.resource === "bricks" ? event.gained : 0;
      if (id === "sugarFromMap") return event.resource === "sugar" ? event.gained : 0;
      if (id === "farExpedition") {
        const place = visiblePlaces(state.worldSeed, state.slot).find(
          (entry) => entry.id === event.place,
        );
        return place?.band === 2 ? 1 : 0;
      }
      return 0;
    }
    case "migrated":
    case "rivalSpyFailed":
    case "constructionQueued":
    case "constructionUnqueued":
    case "companionTamed":
    case "geneShared":
    case "evolutionDone":
    case "leagueReward":
    case "troopsStarved":
    case "allianceJoined":
    case "allianceDonated":
    case "alliesHelped":
    case "buildHelped":
    case "allianceGift":
    case "allianceBought":
    case "leviathanStruck":
    case "leviathanRepelled":
    case "boostGained":
    case "boostUsed":
    case "chestEarned":
    case "rewardOpened":
    case "contestEnded":
    case "drillLearned":
    case "apexReached":
      return 0;
    case "troopBorn":
      return id === "trainCells" ? 1 : 0;
    case "huntResolved":
      return (id === "strikeWin" || id === "challengeStrikes") && event.won && event.struck ? 1 : 0;
    case "huntReturned": {
      if (event.cancelled || !event.won) return 0;
      if (id === "winHunts" || id === "challengeHunts") return 1;
      if (id === "cleanHunt" || id === "challengeCleanHunts") return event.losses === 0 ? 1 : 0;
      if (id === "challengeFarHunt") {
        const prey = visiblePrey(state.worldSeed, state.slot).find(
          (entry) => entry.id === event.prey,
        );
        return prey?.band === 2 ? 1 : 0;
      }
      return 0;
    }
    case "mutationChosen":
      return id === "mutate" ? 1 : 0;
    case "constructionStarted":
    case "tierReached":
    case "mutationOffered":
    case "mutationBought":
    case "expeditionSent":
    case "expeditionCancelled":
    case "huntSent":
    case "huntCancelled":
    case "chestOpened":
    case "raidSent":
    case "raidCancelled":
    case "raidResolved":
    case "attackRepelled":
    case "attackSuffered":
      return 0;
    case "rivalSpied":
      return id === "spyRival" ? 1 : 0;
    case "raidReturned":
      return (id === "challengeRaid" || id === "challengeRaids") && event.won && !event.cancelled
        ? 1
        : 0;
  }
}

/** Fait avancer les quêtes du jour d'après ce qui vient de se passer. */
export function trackQuests(state: PlayerState, events: readonly GameEvent[]): PlayerState {
  const quests = state.quests;
  if (quests === null || events.length === 0) return state;
  const items = quests.items.map((quest) => {
    if (quest.claimed || quest.progress >= quest.target) return quest;
    let progress = quest.progress;
    for (const event of events) {
      // Ce qui s'est passé un autre jour ne compte pas pour les quêtes d'aujourd'hui.
      if (seasonDay(state, event.at) !== quests.day) continue;
      progress += gain(state, quest.id, event);
    }
    if (progress === quest.progress) return quest;
    return { ...quest, progress: Math.min(quest.target, progress) };
  });
  const changed = items.some((quest, index) => quest !== quests.items[index]);
  return changed ? { ...state, quests: { ...quests, items } } : state;
}

/** Contenu d'un coffre, en unités entières : une récompense tirée au sort, deux pour un défi. */
function chestLoot(state: PlayerState, day: number, index: number, challenge: boolean) {
  const rng = seeded(state.seed, day, 100 + index);
  const table = challenge ? BALANCE.chests.challenge : BALANCE.chests.normal;
  const kinds: ChestReward[] = [...CHEST_REWARDS];
  const loot: Partial<Record<ChestReward, number>> = {};
  for (let draw = 0; draw < (challenge ? BALANCE.chests.challengeDraws : 1); draw++) {
    const kind = pick(kinds, rng);
    if (kind !== undefined) loot[kind] = table[kind];
  }
  return loot;
}

/**
 * Ouvre le coffre d'une quête terminée. Un coffre est un cadeau : son contenu entre même si
 * la réserve ou la jauge est pleine.
 */
export function openChest(state: PlayerState, index: number, at: number): Step {
  const quests = state.quests;
  const quest = quests?.items[index];
  if (quests === null || quest === undefined) return { state, events: [] };
  const loot = chestLoot(state, quests.day, index, quest.challenge);
  const items = quests.items.map((entry, i) => (i === index ? { ...entry, claimed: true } : entry));
  return {
    state: {
      ...state,
      quests: { ...quests, items },
      energy: state.energy + (loot.energy ?? 0),
      resources: {
        sugar: state.resources.sugar + (loot.sugar ?? 0) * MICRO,
        bricks: state.resources.bricks + (loot.bricks ?? 0) * MICRO,
        proteins: state.resources.proteins + (loot.proteins ?? 0) * MICRO,
      },
    },
    events: [{ type: "chestOpened", at, index, challenge: quest.challenge, loot }],
  };
}

/**
 * Minuit de saison : les coffres gagnés mais pas encore ouverts sont mis de côté (rien n'est
 * perdu, et le joueur garde le plaisir de les ouvrir), puis de nouvelles quêtes sont tirées.
 */
export function renewQuests(state: PlayerState, at: number): Step {
  let current = state;
  const events: GameEvent[] = [];
  const quests = state.quests;
  (quests?.items ?? []).forEach((quest, index) => {
    if (quests === null || quest.claimed || quest.progress < quest.target) return;
    const loot = chestLoot(state, quests.day, index, quest.challenge);
    const step = earnChest(current, {
      kind: quest.challenge ? "challenge" : "quest",
      at,
      level: 0,
      sugar: (loot.sugar ?? 0) * MICRO,
      bricks: (loot.bricks ?? 0) * MICRO,
      proteins: (loot.proteins ?? 0) * MICRO,
      energy: loot.energy ?? 0,
      boosts: 0,
    });
    current = step.state;
    events.push(...step.events);
  });
  return {
    state: { ...current, quests: drawQuests(current, seasonDay(current, at)) },
    events,
  };
}
