/** Robots joueurs : ils jouent avec les mêmes ordres qu'un joueur, à travers le moteur. */
import {
  advance,
  applyOrder,
  capacity,
  createPlayer,
  nextMutationPrice,
  partySize,
  placeOffer,
  preyOffer,
  troopCapacity,
  troopsOwned,
  visiblePlaces,
  visiblePrey,
  winChance,
} from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, ORGANELLE_IDS, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { Order } from "@o27/data";

export interface Profile {
  readonly name: string;
  /** Touchers par seconde quand le robot est devant le jeu. */
  readonly tapsPerSecond: number;
  /** Le robot ne prend une décision (construire, choisir) que toutes les N secondes. */
  readonly decisionEverySeconds: number;
  /**
   * Un robot soigneux garde de la place pour le butin attendu : il vise les lieux dont le
   * butin tient dans sa réserve et cesse de toucher la cellule quand un filament rapporte du sucre.
   */
  readonly careful: boolean;
  /** Le robot est là pour toucher la proie quand son groupe l'atteint. */
  readonly strikes: boolean;
  /** Alternance présence / absence, en secondes. `null` : toujours présent. */
  readonly sessions: { readonly activeSeconds: number; readonly awaySeconds: number } | null;
}

export const PROFILES = {
  applique: {
    name: "appliqué",
    tapsPerSecond: 3,
    decisionEverySeconds: 1,
    careful: true,
    strikes: true,
    sessions: null,
  },
  debutant: {
    name: "débutant",
    tapsPerSecond: 1,
    decisionEverySeconds: 8,
    careful: false,
    strikes: false,
    sessions: null,
  },
  absent: {
    name: "absent",
    tapsPerSecond: 2,
    decisionEverySeconds: 3,
    careful: true,
    strikes: true,
    sessions: { activeSeconds: 120, awaySeconds: 8 * 3600 },
  },
} as const satisfies Record<string, Profile>;

/** Jusqu'où le robot joue : sa première mutation, ou un nombre d'expéditions revenues. */
export type Goal =
  "mutation" | { readonly expeditions: number } | { readonly huntsWon: number } | "secondMutation";

export interface Report {
  readonly profile: string;
  readonly seed: number;
  /** Secondes de jeu avant d'atteindre chaque palier (index = palier). `null` : jamais atteint. */
  readonly tierSeconds: readonly (number | null)[];
  /** Secondes avant le choix de la première mutation. */
  readonly mutationSeconds: number | null;
  /** Secondes avant l'envoi de la première expédition. */
  readonly firstExpeditionSeconds: number | null;
  /** Secondes avant que le but en expéditions soit atteint. */
  readonly expeditionsGoalSeconds: number | null;
  /** Secondes avant l'envoi de la première chasse, et avant la première chasse gagnée. */
  readonly firstHuntSeconds: number | null;
  readonly firstHuntWonSeconds: number | null;
  /** Secondes avant le choix de la deuxième mutation (payée en protéines). */
  readonly secondMutationSeconds: number | null;
  readonly huntsWon: number;
  readonly huntsLost: number;
  /** Le plus petit nombre de cellules filles qu'il lui soit resté après une chasse. */
  readonly fewestTroopsAfterHunt: number | null;
  /** Énergie restante à la fin. */
  readonly energyLeft: number;
  /** Butin rapporté et butin perdu faute de place, en unités entières. */
  readonly lootGained: number;
  readonly lootLost: number;
  /** Plus longue période, robot présent, sans rien pouvoir faire d'autre qu'attendre. */
  readonly longestStuckSeconds: number;
}

const SEASON_START = 1_800_000_000_000;

function isPresent(profile: Profile, second: number): boolean {
  if (profile.sessions === null) return true;
  const cycle = profile.sessions.activeSeconds + profile.sessions.awaySeconds;
  return second % cycle < profile.sessions.activeSeconds;
}

/** Fait jouer un robot jusqu'à son but, ou jusqu'à `maxSeconds`. */
export function simulate(
  profile: Profile,
  seed: number,
  maxSeconds: number,
  goal: Goal = "mutation",
): Report {
  let state: PlayerState = createPlayer(seed, SEASON_START, SEASON_START);
  const tierSeconds: (number | null)[] = [0, null, null, null, null];
  let firstHuntSeconds: number | null = null;
  let firstHuntWonSeconds: number | null = null;
  let secondMutationSeconds: number | null = null;
  let huntsLost = 0;
  let fewestTroops: number | null = null;
  let clock = 0;
  let mutationSeconds: number | null = null;
  let firstExpeditionSeconds: number | null = null;
  let expeditionsGoalSeconds: number | null = null;
  let lootLost = 0;
  let lootGained = 0;
  let stuck = 0;
  let longestStuck = 0;

  const absorb = (events: readonly { readonly type: string }[]): void => {
    for (const event of events) {
      if (event.type === "expeditionReturned" && "lost" in event && "gained" in event) {
        lootLost += Number(event.lost);
        lootGained += Number(event.gained);
      }
      if (event.type === "huntReturned" && "won" in event && "cancelled" in event) {
        if (event.cancelled === true) continue;
        if (event.won === true) firstHuntWonSeconds ??= clock;
        else huntsLost += 1;
      }
    }
  };
  const send = (order: Order, now: number): boolean => {
    const result = applyOrder(state, order, now);
    if (result.ok) {
      state = result.state;
      absorb(result.events);
    }
    return result.ok;
  };
  const done = (): boolean => {
    if (goal === "mutation") return mutationSeconds !== null;
    if (goal === "secondMutation") return secondMutationSeconds !== null;
    if (typeof goal === "object" && "huntsWon" in goal)
      return state.counters.huntsWon >= goal.huntsWon;
    return expeditionsGoalSeconds !== null;
  };

  for (let second = 0; second <= maxSeconds && !done(); second++) {
    if (!isPresent(profile, second)) {
      stuck = 0;
      continue;
    }
    const now = SEASON_START + second * 1000;
    clock = second;
    const hadHunt = state.hunt !== null;
    const step = advance(state, now);
    state = step.state;
    absorb(step.events);
    if (hadHunt && state.hunt === null) {
      const left = partySize(state.troops);
      fewestTroops = fewestTroops === null ? left : Math.min(fewestTroops, left);
    }
    let acted = false;

    // Le groupe est face à la proie : le robot présent la touche.
    if (
      profile.strikes &&
      state.hunt !== null &&
      state.hunt.outcome === null &&
      !state.hunt.cancelled &&
      now >= state.hunt.arrivesAt &&
      send({ type: "strikeHunt" }, now)
    ) {
      acted = true;
    }

    if (second % profile.decisionEverySeconds === 0) {
      const [choice] = state.mutationOffer ?? [];
      if (choice !== undefined && send({ type: "chooseMutation", mutation: choice }, now)) {
        if (mutationSeconds !== null) secondMutationSeconds ??= second;
        mutationSeconds ??= second;
        acted = true;
      }
      if (
        state.tier >= 4 &&
        state.mutationOffer === null &&
        state.resources.proteins >= nextMutationPrice(state) &&
        send({ type: "buyMutation" }, now)
      ) {
        acted = true;
      }
      for (const organelle of ORGANELLE_IDS) {
        if (state.organelles[organelle] > 0 || BALANCE.organelles[organelle].tier > state.tier) {
          continue;
        }
        if (send({ type: "build", organelle }, now)) {
          acted = true;
          break;
        }
      }
      // Une fois sur la carte, le robot dépense aussi ses briques : il améliore ce qu'il peut,
      // en commençant par la réserve, pour ne pas perdre de butin.
      // Au palier 4, il garde d'abord de quoi construire la Pouponnière.
      const savingForNursery = state.tier >= 4 && state.organelles.nursery === 0;
      if (state.tier >= 3 && state.construction === null && !savingForNursery) {
        for (const organelle of ["vacuole", "mitochondrion", "ribosome", "cilia"] as const) {
          if (state.organelles[organelle] === 0) continue;
          if (send({ type: "upgrade", organelle }, now)) {
            acted = true;
            break;
          }
        }
      }
      // Chasse : le robot vise la proie disponible la plus proche, fait naître le type de
      // cellule qui compte double contre elle, puis envoie tout son monde.
      if (state.tier >= 4 && troopCapacity(state) > 0) {
        const prey = visiblePrey(state.worldSeed, state.slot).find(
          (entry) => (state.placeReadyAt[entry.id] ?? 0) <= now,
        );
        if (prey !== undefined) {
          const strong = TROOP_IDS.find((id) => STRONG_AGAINST[id] === prey.kind) ?? "hunter";
          const room = troopCapacity(state) - troopsOwned(state);
          if (state.training === null && room > 0) {
            const cost = BALANCE.troops[strong].cost;
            const affordable = Math.min(
              cost.sugar === 0
                ? room
                : Math.floor(state.resources.sugar / (cost.sugar * 1_000_000)),
              cost.bricks === 0
                ? room
                : Math.floor(state.resources.bricks / (cost.bricks * 1_000_000)),
            );
            const count = Math.min(room, affordable, 5);
            if (count > 0 && send({ type: "trainTroop", troop: strong, count }, now)) acted = true;
          }
          const offer = preyOffer(prey);
          const chance = winChance(state.troops, prey.kind, offer.power);
          // Le soigneux attend d'avoir de vraies chances ; le débutant part dès qu'il a trois cellules.
          const ready = profile.careful ? chance >= 50 : partySize(state.troops) >= 3;
          if (
            state.hunt === null &&
            ready &&
            state.energy >= offer.energy &&
            send({ type: "sendHunt", prey: prey.id, party: state.troops }, now)
          ) {
            firstHuntSeconds ??= second;
            acted = true;
          }
        }
      }
      // Sur la carte, le robot prend le lieu disponible le plus proche qu'il peut se payer.
      if (state.tier >= 3 && state.expedition === null) {
        const open = visiblePlaces(state.worldSeed, state.slot).filter(
          (place) =>
            (state.placeReadyAt[place.id] ?? 0) <= now && placeOffer(place).energy <= state.energy,
        );
        const fits = open.find((place) => {
          const offer = placeOffer(place);
          return capacity(state, offer.resource) - state.resources[offer.resource] >= offer.loot;
        });
        const target = profile.careful ? (fits ?? open[0]) : open[0];
        if (target !== undefined && send({ type: "sendExpedition", place: target.id }, now)) {
          firstExpeditionSeconds ??= second;
          acted = true;
        }
      }
    }
    const awaitingSugar =
      profile.careful &&
      state.expedition !== null &&
      !state.expedition.cancelled &&
      state.expedition.kind === "sugarCluster" &&
      capacity(state, "sugar") - state.resources.sugar <= state.expedition.loot;
    if (!awaitingSugar && send({ type: "harvest", taps: profile.tapsPerSecond }, now)) {
      acted = true;
    }
    // Attendre le retour d'un filament, c'est avoir quelque chose en cours.
    if (state.expedition !== null || state.hunt !== null || state.training !== null) acted = true;

    stuck = acted ? 0 : stuck + 1;
    longestStuck = Math.max(longestStuck, stuck);
    for (let tier = 1; tier <= state.tier; tier++) tierSeconds[tier] ??= second;
    if (
      typeof goal === "object" &&
      "expeditions" in goal &&
      state.counters.mapHarvests >= goal.expeditions
    ) {
      expeditionsGoalSeconds ??= second;
    }
  }

  return {
    profile: profile.name,
    seed,
    tierSeconds,
    mutationSeconds,
    firstExpeditionSeconds,
    expeditionsGoalSeconds,
    firstHuntSeconds,
    firstHuntWonSeconds,
    secondMutationSeconds,
    huntsWon: state.counters.huntsWon,
    huntsLost,
    fewestTroopsAfterHunt: fewestTroops,
    energyLeft: state.energy,
    lootGained: Math.floor(lootGained / 1_000_000),
    lootLost: Math.floor(lootLost / 1_000_000),
    longestStuckSeconds: longestStuck,
  };
}
