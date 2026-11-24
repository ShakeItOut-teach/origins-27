/**
 * Les coffres de récompense : ce que le joueur gagne (quête finie mais pas ouverte avant minuit,
 * ligue, Léviathan vaincu) l'attend dans un coffre, qu'il ouvre lui-même. Un coffre est un
 * cadeau : son contenu entre en entier, même si la réserve ou la jauge est pleine.
 */
import { BALANCE } from "@o27/data";
import type { GameEvent, PlayerState, RewardChest, Step } from "./types";

/** Ouvre le coffre à cette place dans la liste ; sans effet s'il n'existe pas. */
export function openReward(state: PlayerState, index: number, at: number, auto = false): Step {
  const chest = state.chests[index];
  if (chest === undefined) return { state, events: [] };
  const events: GameEvent[] = [
    {
      type: "rewardOpened",
      at,
      kind: chest.kind,
      level: chest.level,
      loot: {
        sugar: chest.sugar,
        bricks: chest.bricks,
        proteins: chest.proteins,
        energy: chest.energy,
        boosts: chest.boosts,
      },
      auto,
    },
  ];
  if (chest.boosts > 0) events.push({ type: "boostGained", at, count: chest.boosts });
  return {
    state: {
      ...state,
      chests: state.chests.filter((_, position) => position !== index),
      energy: state.energy + chest.energy,
      boosts: state.boosts + chest.boosts,
      resources: {
        sugar: state.resources.sugar + chest.sugar,
        bricks: state.resources.bricks + chest.bricks,
        proteins: state.resources.proteins + chest.proteins,
      },
    },
    events,
  };
}

/**
 * Range un coffre gagné, à la suite des autres. Si le joueur en a déjà trop, le plus ancien
 * s'ouvre tout seul : rien n'est jamais perdu.
 */
export function earnChest(state: PlayerState, chest: RewardChest): Step {
  let current: PlayerState = { ...state, chests: [...state.chests, chest] };
  const events: GameEvent[] = [{ type: "chestEarned", at: chest.at, kind: chest.kind }];
  while (current.chests.length > BALANCE.rewardChests.kept) {
    const opened = openReward(current, 0, chest.at, true);
    current = opened.state;
    events.push(...opened.events);
  }
  return { state: current, events };
}
