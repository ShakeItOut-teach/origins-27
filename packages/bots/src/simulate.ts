/** Robots joueurs : ils jouent avec les mêmes ordres qu'un joueur, à travers le moteur. */
import { advance, applyOrder, capacity, createPlayer, placeOffer, visiblePlaces } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, ORGANELLE_IDS } from "@o27/data";
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
  /** Alternance présence / absence, en secondes. `null` : toujours présent. */
  readonly sessions: { readonly activeSeconds: number; readonly awaySeconds: number } | null;
}

export const PROFILES = {
  applique: {
    name: "appliqué",
    tapsPerSecond: 3,
    decisionEverySeconds: 1,
    careful: true,
    sessions: null,
  },
  debutant: {
    name: "débutant",
    tapsPerSecond: 1,
    decisionEverySeconds: 8,
    careful: false,
    sessions: null,
  },
  absent: {
    name: "absent",
    tapsPerSecond: 2,
    decisionEverySeconds: 3,
    careful: true,
    sessions: { activeSeconds: 120, awaySeconds: 8 * 3600 },
  },
} as const satisfies Record<string, Profile>;

/** Jusqu'où le robot joue : sa première mutation, ou un nombre d'expéditions revenues. */
export type Goal = "mutation" | { readonly expeditions: number };

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
  const tierSeconds: (number | null)[] = [0, null, null, null];
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
  const done = (): boolean =>
    goal === "mutation" ? mutationSeconds !== null : expeditionsGoalSeconds !== null;

  for (let second = 0; second <= maxSeconds && !done(); second++) {
    if (!isPresent(profile, second)) {
      stuck = 0;
      continue;
    }
    const now = SEASON_START + second * 1000;
    const step = advance(state, now);
    state = step.state;
    absorb(step.events);
    let acted = false;

    if (second % profile.decisionEverySeconds === 0) {
      const [choice] = state.mutationOffer ?? [];
      if (choice !== undefined && send({ type: "chooseMutation", mutation: choice }, now)) {
        mutationSeconds ??= second;
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
      if (state.tier >= 3 && state.construction === null) {
        for (const organelle of ["vacuole", "mitochondrion", "ribosome", "cilia"] as const) {
          if (state.organelles[organelle] === 0) continue;
          if (send({ type: "upgrade", organelle }, now)) {
            acted = true;
            break;
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
    if (state.expedition !== null) acted = true;

    stuck = acted ? 0 : stuck + 1;
    longestStuck = Math.max(longestStuck, stuck);
    for (let tier = 1; tier <= state.tier; tier++) tierSeconds[tier] ??= second;
    if (goal !== "mutation" && state.counters.mapHarvests >= goal.expeditions) {
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
    energyLeft: state.energy,
    lootGained: Math.floor(lootGained / 1_000_000),
    lootLost: Math.floor(lootLost / 1_000_000),
    longestStuckSeconds: longestStuck,
  };
}
