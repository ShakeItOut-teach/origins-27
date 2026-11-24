/**
 * Le compagnon : un prédateur de l'océan que le joueur a apprivoisé. Il grandit quand on lui
 * partage des gènes, et devient autre chose selon ce qu'on lui donne : chaque forme a sa force
 * et sa faiblesse. C'est son arbre d'évolution à lui.
 *
 * - Jeune : il n'apporte rien encore.
 * - Première forme : celle de la famille qu'on lui a le plus donnée.
 * - Forme adulte : « pure » s'il a presque tout reçu de la même famille (plus forte, mais sa
 *   faiblesse s'aggrave), ou « mêlée » s'il a reçu de deux familles (il garde un peu de la
 *   seconde, et sa faiblesse reste légère).
 */
import { BALANCE, GENE_FAMILIES } from "@o27/data";
import type { GeneFamily, StatId } from "@o27/data";
import { familyGenes } from "./genes";
import { MICRO } from "./types";
import type { Companion, PlayerState } from "./types";

const RULES = BALANCE.companion;

/** Nombre de gènes que le compagnon a reçus en tout. */
export function companionPoints(companion: Companion): number {
  let total = 0;
  for (const family of GENE_FAMILIES) total += companion.genes[family];
  return total;
}

export interface CompanionForm {
  /** 0 : jeune ; 1 : première forme ; 2 : forme adulte. */
  readonly stage: number;
  /** La famille qu'il a le plus reçue ; `null` tant qu'il est jeune. */
  readonly family: GeneFamily | null;
  /** La deuxième famille d'une forme adulte mêlée. */
  readonly second: GeneFamily | null;
  /** Forme adulte pure : presque tout vient de la même famille. */
  readonly pure: boolean;
}

/** La forme du compagnon, d'après les gènes qu'il a reçus. */
export function companionForm(companion: Companion): CompanionForm {
  const points = companionPoints(companion);
  const stage = points >= RULES.adultAt ? 2 : points >= RULES.firstFormAt ? 1 : 0;
  if (stage === 0) return { stage, family: null, second: null, pure: false };
  // À égalité, l'ordre des familles départage : le résultat ne dépend jamais du hasard.
  const ranked = [...GENE_FAMILIES].sort(
    (one, other) => companion.genes[other] - companion.genes[one],
  );
  const family = ranked[0] ?? null;
  const next = ranked[1];
  if (family === null) return { stage: 0, family: null, second: null, pure: false };
  const pure = stage === 2 && companion.genes[family] >= RULES.pureAt;
  const second =
    stage === 2 && !pure && next !== undefined && companion.genes[next] > 0 ? next : null;
  return { stage, family, second, pure };
}

export interface CompanionEffect {
  readonly stat: StatId;
  readonly percent: number;
  /** Une faiblesse plutôt qu'une force. */
  readonly weakness: boolean;
}

/** Ce que le compagnon apporte et ce qu'il coûte, dans sa forme actuelle. */
export function companionEffects(companion: Companion): readonly CompanionEffect[] {
  const form = companionForm(companion);
  if (form.family === null) return [];
  const main = RULES.families[form.family];
  const species = RULES.species[companion.species];
  // Chaque espèce a sa famille de prédilection : sa force y est plus grande.
  const scale = species?.affinity === form.family ? RULES.affinityPercent : 100;
  const bonus = form.stage === 1 ? main.bonus[0] : form.pure ? main.bonus[2] : main.bonus[1];
  const effects: CompanionEffect[] = [
    { stat: main.stat, percent: Math.trunc((bonus * scale) / 100), weakness: false },
  ];
  if (form.second !== null) {
    const other = RULES.families[form.second];
    effects.push({ stat: other.stat, percent: other.bonus[0], weakness: false });
  }
  effects.push({
    stat: main.weakness.stat,
    percent: form.pure ? main.weakness.percent[1] : main.weakness.percent[0],
    weakness: true,
  });
  return effects;
}

/** Ce que le compagnon ajoute (ou retire) à une statistique, en pourcentage. */
export function companionPercent(state: PlayerState, stat: StatId): number {
  if (state.companion === null) return 0;
  let total = 0;
  for (const effect of companionEffects(state.companion)) {
    if (effect.stat === stat) total += effect.percent;
  }
  return total;
}

export interface ShareOffer {
  /** Prix en protéines, en millionièmes d'unité. */
  readonly price: number;
  readonly blocked: "noCompanion" | "grown" | "geneMissing" | null;
}

/** Ce que coûte de partager un gène de cette famille avec le compagnon. */
export function shareOffer(state: PlayerState, family: GeneFamily): ShareOffer {
  const companion = state.companion;
  if (companion === null) return { price: 0, blocked: "noCompanion" };
  const points = companionPoints(companion);
  const price = (RULES.sharePrices[points] ?? 0) * MICRO;
  if (points >= RULES.adultAt) return { price: 0, blocked: "grown" };
  // On ne partage que ce que l'on a : il faut posséder un gène de la famille.
  if (familyGenes(state, family) === 0) return { price, blocked: "geneMissing" };
  return { price, blocked: null };
}
