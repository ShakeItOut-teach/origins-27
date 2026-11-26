/**
 * L'espionnage. Les Récepteurs logent des sondes, qui se reforment avec le temps ; chaque
 * espionnage en coûte une. Le niveau des Récepteurs fixe ce que le rapport révèle, et un
 * organisme dont les Récepteurs sont plus hauts déjoue l'espion : la sonde est perdue.
 * Aucun hasard (règle du propriétaire du 26/11/2026).
 */
import { BALANCE, ORGANELLE_IDS, SEASON_DAYS } from "@o27/data";
import type { Rival } from "./rivals";
import type { GameEvent, OrderErrorCode, PlayerState, Step } from "./types";

const RULES = BALANCE.rivals.spy;
const HOUR_MS = 3_600_000;

/** Combien de sondes chaque niveau de Récepteurs loge. */
function spiesPerLevel(): number {
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    if (effect.kind === "spy") return effect.spiesPerLevel;
  }
  return 0;
}

/** Le niveau des Récepteurs du joueur : c'est aussi celui de ses sondes. */
export function receptorLevel(state: PlayerState): number {
  return state.organelles.receptor;
}

/** Combien de sondes les Récepteurs peuvent loger. */
export function spyCapacity(state: PlayerState): number {
  return receptorLevel(state) * spiesPerLevel();
}

export interface Spies {
  readonly spies: number;
  readonly spiesAt: number;
}

/** Les sondes à cet instant : une de plus toutes les deux heures, jusqu'à la capacité. */
export function spiesAt(state: PlayerState, now: number): Spies {
  const max = spyCapacity(state);
  if (state.spies >= max) return { spies: Math.min(state.spies, max), spiesAt: now };
  const regenMs = RULES.regenHours * HOUR_MS;
  const gained = Math.floor(Math.max(0, now - state.spiesAt) / regenMs);
  if (state.spies + gained >= max) return { spies: max, spiesAt: now };
  return { spies: state.spies + gained, spiesAt: state.spiesAt + gained * regenMs };
}

/**
 * Les Récepteurs d'un organisme simulé : ils montent avec la saison et son tempérament, et
 * s'arrêtent au dernier jour.
 */
export function rivalReceptors(rival: Rival, day: number): number {
  const days = Math.min(Math.max(0, day), SEASON_DAYS);
  return Math.floor((days * rival.temper) / (100 * RULES.rivalDaysPerLevel));
}

/** Ce qu'un rapport d'espionnage de ce niveau révèle. */
export interface SpyReveal {
  /** Le total de ses ressources. */
  readonly total: boolean;
  /** Ce qu'une attaque peut emporter, ressource par ressource. */
  readonly available: boolean;
  /** Sa garde exacte : on sait alors si l'attaque gagne. */
  readonly power: boolean;
  /** Ses troupes (sa force d'attaque) : à ± 50 %, puis à ± 15 %, puis exactes ; 100 = rien. */
  readonly troopsMargin: number | null;
  /** Tout : troupes exactes et point faible. */
  readonly everything: boolean;
}

export function spyReveal(level: number): SpyReveal {
  const reveal = RULES.reveal;
  const everything = level >= reveal.everything;
  return {
    total: level >= reveal.total,
    available: level >= reveal.available,
    power: level >= reveal.power,
    troopsMargin: everything
      ? 0
      : level >= reveal.troopsClose
        ? RULES.closePercent
        : level >= reveal.troopsRough
          ? RULES.roughPercent
          : null,
    everything,
  };
}

/** Le niveau du renseignement qu'on a sur un rival ; 0 s'il n'est pas (ou plus) espionné. */
export function spiedLevel(state: PlayerState, rivalId: string): number {
  if ((state.spiedUntil[rivalId] ?? 0) <= state.now) return 0;
  return state.spyLevels[rivalId] ?? 0;
}

/**
 * Espionner un rival : une sonde part. Si ses Récepteurs sont plus hauts que les siens,
 * l'espionnage échoue et la sonde est perdue ; sinon le rapport vaut pour quelques heures.
 */
export function spyOn(
  state: PlayerState,
  rival: Rival,
  day: number,
): Step | { readonly error: OrderErrorCode } {
  if (receptorLevel(state) <= 0) return { error: "notBuilt" };
  if (spiedLevel(state, rival.id) >= receptorLevel(state)) return { error: "alreadySpied" };
  const now = spiesAt(state, state.now);
  if (now.spies <= 0) return { error: "noSpies" };
  const spent: PlayerState = { ...state, spies: now.spies - 1, spiesAt: now.spiesAt };
  const level = receptorLevel(state);
  if (rivalReceptors(rival, day) > level) {
    const failed: GameEvent = { type: "rivalSpyFailed", at: state.now, rival: rival.id };
    return { state: spent, events: [failed] };
  }
  return {
    state: {
      ...spent,
      spiedUntil: { ...state.spiedUntil, [rival.id]: state.now + RULES.hours * HOUR_MS },
      spyLevels: { ...state.spyLevels, [rival.id]: level },
    },
    events: [{ type: "rivalSpied", at: state.now, rival: rival.id, level }],
  };
}
