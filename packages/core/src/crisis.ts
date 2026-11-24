/**
 * La crise de saison : une grande extinction, la même pour tout l'océan. Elle est annoncée deux
 * jours avant, puis dure un jour. Les mieux classés y perdent le plus (ce sont eux qui dépendent
 * le plus de leur milieu), les derniers en profitent : après chaque extinction, les petits
 * repeuplent les niches libérées. Deux gènes de la bonne famille divisent le malus par deux :
 * une crise se prépare.
 */
import { BALANCE, CRISIS_KINDS } from "@o27/data";
import type { CrisisKind, GeneFamily } from "@o27/data";
import { familyGenes } from "./genes";
import { ranking } from "./power";
import { createRng } from "./rng";
import { DAY_MS } from "./types";
import type { PlayerState } from "./types";

const RULES = BALANCE.crisis;

/** La crise de cette saison : toujours la même pour un monde donné. */
export function crisisKind(worldSeed: number): CrisisKind {
  const rng = createRng((worldSeed ^ 0x2545f491) >>> 0);
  rng.next();
  rng.next();
  return CRISIS_KINDS[rng.int(CRISIS_KINDS.length)] ?? "glaciation";
}

/** La famille de gènes qui prépare à cette crise. */
export function crisisFamily(kind: CrisisKind): GeneFamily {
  return RULES.kinds[kind].family;
}

export type CrisisPhase = "warning" | "on" | "done";

export interface Crisis {
  readonly kind: CrisisKind;
  readonly phase: CrisisPhase;
  readonly startsAt: number;
  readonly endsAt: number;
  /** Le joueur a-t-il assez de gènes de la bonne famille ? */
  readonly adapted: boolean;
  /** Ce que la crise fait à sa production, en pourcentage (négatif : il produit moins). */
  readonly percent: number;
}

/** Effet de la crise selon la place au classement : 0 pour le premier, 1000 pour le dernier. */
function effectFor(place: number, adapted: boolean): number {
  if (place >= RULES.spareFromPermille) return RULES.bonusPercent;
  // Plus on est haut, plus on perd : la courbe de l'ancien jeu, (1 - place) puissance 1,5.
  const share = (1000 - place) / 1000;
  const malus = -Math.round(RULES.maxMalusPercent * share * Math.sqrt(share));
  return adapted ? Math.trunc(malus / 2) : malus;
}

/** La crise telle que ce joueur la vit à l'instant de son état ; `null` avant son annonce. */
export function crisisOf(state: PlayerState): Crisis | null {
  if (state.tier < RULES.tier) return null;
  const startsAt = state.seasonStart + (RULES.day - 1) * DAY_MS;
  const endsAt = startsAt + RULES.days * DAY_MS;
  if (state.now < startsAt - RULES.warningDays * DAY_MS) return null;
  const kind = crisisKind(state.worldSeed);
  const adapted = familyGenes(state, crisisFamily(kind)) >= RULES.adaptedGenes;
  const phase: CrisisPhase = state.now < startsAt ? "warning" : state.now < endsAt ? "on" : "done";
  const { mine, rows } = ranking(state, "power");
  const place = rows.length > 1 ? Math.floor(((mine.rank - 1) * 1000) / (rows.length - 1)) : 0;
  return { kind, phase, startsAt, endsAt, adapted, percent: effectFor(place, adapted) };
}

/** Ce que la crise ajoute (ou retire) à la production du joueur en ce moment, en pourcentage. */
export function crisisPercent(state: PlayerState): number {
  if (state.tier < RULES.tier) return 0;
  const startsAt = state.seasonStart + (RULES.day - 1) * DAY_MS;
  if (state.now < startsAt || state.now >= startsAt + RULES.days * DAY_MS) return 0;
  return crisisOf(state)?.percent ?? 0;
}

/** Production d'une ressource une fois la crise comptée, en millionièmes d'unité par milliseconde. */
export function crisisRate(state: PlayerState, rate: number): number {
  const percent = crisisPercent(state);
  return percent === 0 ? rate : Math.floor((rate * (100 + percent)) / 100);
}
