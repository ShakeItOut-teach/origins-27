/** Robots joueurs : ils jouent avec les mêmes ordres qu'un joueur, à travers le moteur. */
import { advance, applyOrder, createPlayer } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, ORGANELLE_IDS } from "@o27/data";
import type { Order } from "@o27/data";

export interface Profile {
  readonly name: string;
  /** Touchers par seconde quand le robot est devant le jeu. */
  readonly tapsPerSecond: number;
  /** Le robot ne prend une décision (construire, choisir) que toutes les N secondes. */
  readonly decisionEverySeconds: number;
  /** Alternance présence / absence, en secondes. `null` : toujours présent. */
  readonly sessions: { readonly activeSeconds: number; readonly awaySeconds: number } | null;
}

export const PROFILES = {
  applique: { name: "appliqué", tapsPerSecond: 3, decisionEverySeconds: 1, sessions: null },
  debutant: { name: "débutant", tapsPerSecond: 1, decisionEverySeconds: 8, sessions: null },
  absent: {
    name: "absent",
    tapsPerSecond: 2,
    decisionEverySeconds: 3,
    sessions: { activeSeconds: 120, awaySeconds: 8 * 3600 },
  },
} as const satisfies Record<string, Profile>;

export interface Report {
  readonly profile: string;
  readonly seed: number;
  /** Secondes de jeu avant d'atteindre chaque palier (index = palier). `null` : jamais atteint. */
  readonly tierSeconds: readonly (number | null)[];
  /** Secondes avant le choix de la première mutation. */
  readonly mutationSeconds: number | null;
  /** Plus longue période, robot présent, sans rien pouvoir faire d'autre qu'attendre. */
  readonly longestStuckSeconds: number;
}

const SEASON_START = 1_800_000_000_000;

function isPresent(profile: Profile, second: number): boolean {
  if (profile.sessions === null) return true;
  const cycle = profile.sessions.activeSeconds + profile.sessions.awaySeconds;
  return second % cycle < profile.sessions.activeSeconds;
}

/** Fait jouer un robot jusqu'à sa première mutation, ou jusqu'à `maxSeconds`. */
export function simulate(profile: Profile, seed: number, maxSeconds: number): Report {
  let state: PlayerState = createPlayer(seed, SEASON_START, SEASON_START);
  const tierSeconds: (number | null)[] = [0, null, null];
  let mutationSeconds: number | null = null;
  let stuck = 0;
  let longestStuck = 0;

  const send = (order: Order, now: number): boolean => {
    const result = applyOrder(state, order, now);
    if (result.ok) state = result.state;
    return result.ok;
  };

  for (let second = 0; second <= maxSeconds && mutationSeconds === null; second++) {
    if (!isPresent(profile, second)) {
      stuck = 0;
      continue;
    }
    const now = SEASON_START + second * 1000;
    state = advance(state, now).state;
    let acted = false;

    if (second % profile.decisionEverySeconds === 0) {
      const [choice] = state.mutationOffer ?? [];
      if (choice !== undefined && send({ type: "chooseMutation", mutation: choice }, now)) {
        mutationSeconds = second;
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
    }
    if (send({ type: "harvest", taps: profile.tapsPerSecond }, now)) acted = true;

    stuck = acted ? 0 : stuck + 1;
    longestStuck = Math.max(longestStuck, stuck);
    for (let tier = 1; tier <= state.tier; tier++) tierSeconds[tier] ??= second;
  }

  return {
    profile: profile.name,
    seed,
    tierSeconds,
    mutationSeconds,
    longestStuckSeconds: longestStuck,
  };
}
