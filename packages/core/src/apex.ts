/**
 * La course à l'APEX : la fin de la saison se joue sur la terre ferme. Depuis la zone éclairée,
 * avec un Noyau assez évolué, la lignée du joueur peut sortir des eaux. C'est long et très
 * cher ; les premiers arrivés sont les mieux récompensés. La lignée qui prend pied sur la
 * terre dépend des gènes que le joueur a travaillés : aucune forme aquatique ne gagne.
 */
import { BALANCE, GENE_FAMILIES, RESOURCE_IDS } from "@o27/data";
import type { ApexLineage, GeneFamily, ResourceId } from "@o27/data";
import { earnChest } from "./chests";
import { familyGenes } from "./genes";
import { ZONE_COUNT, rankOf } from "./ocean";
import { DAY_MS, MICRO } from "./types";
import type { GameEvent, OrderErrorCode, PlayerState, Step } from "./types";

const RULES = BALANCE.apex;
const HOUR_MS = 3_600_000;

/** Les lignées de la terre ferme, par famille dominante puis par seconde famille. */
const LINEAGES: Readonly<Record<GeneFamily, Readonly<Record<GeneFamily | "none", ApexLineage>>>> = {
  predation: {
    none: "tyrannosaur",
    predation: "tyrannosaur",
    mobility: "dromaeosaur",
    resilience: "tyrannosaur",
    metabolism: "tyrannosaur",
  },
  resilience: {
    none: "ankylosaur",
    resilience: "ankylosaur",
    predation: "triceratops",
    mobility: "stegosaur",
    metabolism: "ankylosaur",
  },
  mobility: {
    none: "pterosaur",
    mobility: "pterosaur",
    predation: "earlyBird",
    resilience: "pterosaur",
    metabolism: "earlyBird",
  },
  metabolism: {
    none: "brachiosaur",
    metabolism: "brachiosaur",
    predation: "brachiosaur",
    mobility: "parasaurolophus",
    resilience: "brachiosaur",
  },
};

/** La lignée que les gènes du joueur dessinent : sa famille la plus forte, nuancée par la seconde. */
export function apexLineage(state: PlayerState): ApexLineage {
  // À égalité, l'ordre des familles départage : le résultat ne dépend jamais du hasard.
  const ranked = [...GENE_FAMILIES].sort(
    (one, other) => familyGenes(state, other) - familyGenes(state, one),
  );
  const first = ranked[0] ?? "metabolism";
  const next = ranked[1];
  const second = next !== undefined && familyGenes(state, next) > 0 ? next : "none";
  return LINEAGES[first][second];
}

export interface ApexOffer {
  readonly cost: Readonly<Record<ResourceId, number>>;
  readonly durationMs: number;
  readonly blocked: "locked" | "needsNucleus" | "zoneClosed" | "busy" | null;
}

/** Ce qu'il faut pour sortir des eaux. */
export function apexOffer(state: PlayerState): ApexOffer {
  let blocked: ApexOffer["blocked"] = null;
  if (state.tier < RULES.tier) blocked = "locked";
  else if (state.apex !== null) blocked = "busy";
  else if (state.zone < ZONE_COUNT - 1) blocked = "zoneClosed";
  else if (state.organelles.nucleus < RULES.nucleusLevel) blocked = "needsNucleus";
  return {
    cost: {
      sugar: RULES.cost.sugar * MICRO,
      bricks: RULES.cost.bricks * MICRO,
      proteins: RULES.cost.proteins * MICRO,
    },
    durationMs: RULES.hours * HOUR_MS,
    blocked,
  };
}

/** Lancer la sortie des eaux. */
export function leaveWater(state: PlayerState): Step | { readonly error: OrderErrorCode } {
  const offer = apexOffer(state);
  if (offer.blocked !== null) return { error: offer.blocked };
  if (RESOURCE_IDS.some((id) => state.resources[id] < offer.cost[id])) {
    return { error: "insufficient" };
  }
  return {
    state: {
      ...state,
      resources: {
        sugar: state.resources.sugar - offer.cost.sugar,
        bricks: state.resources.bricks - offer.cost.bricks,
        proteins: state.resources.proteins - offer.cost.proteins,
      },
      apex: { endsAt: state.now + offer.durationMs, place: 0 },
    },
    events: [],
  };
}

/**
 * Instant où un organisme simulé prend pied sur la terre ferme ; l'infini s'il n'y arrive pas
 * cette saison. Les plus ambitieux sortent les premiers, quelques dizaines par jour.
 */
function arrivalOf(state: PlayerState, slot: number): number {
  const rank = rankOf(state.worldSeed, slot);
  const last = BALANCE.ocean.zones[ZONE_COUNT - 1];
  if (last === undefined || rank >= last.entrants) return Number.POSITIVE_INFINITY;
  return (
    state.seasonStart + (RULES.firstDay - 1) * DAY_MS + Math.floor((rank * DAY_MS) / RULES.perDay)
  );
}

/** Nombre d'organismes simulés déjà sortis des eaux à cet instant. */
export function apexArrivals(state: PlayerState, at: number): number {
  let count = 0;
  for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
    if (slot !== state.slot && arrivalOf(state, slot) <= at) count += 1;
  }
  return count;
}

/** Ce que rapporte une place à l'arrivée ; `null` au-delà des places récompensées. */
export function apexRewardFor(place: number): {
  readonly boosts: number;
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
} | null {
  const band = RULES.rewards.find((entry) => place <= entry.toPlace);
  if (place < 1 || band === undefined) return null;
  return {
    boosts: band.boosts,
    sugar: band.sugar * MICRO,
    bricks: band.bricks * MICRO,
    proteins: band.proteins * MICRO,
  };
}

/** Instant où la sortie des eaux en cours s'achève ; l'infini s'il n'y en a pas. */
export function apexDue(state: PlayerState): number {
  return state.apex !== null && state.apex.place === 0
    ? state.apex.endsAt
    : Number.POSITIVE_INFINITY;
}

/** La lignée prend pied sur la terre ferme : sa place est fixée, et son coffre l'attend. */
export function apexLand(state: PlayerState, at: number): Step {
  if (state.apex === null || state.apex.place !== 0) return { state, events: [] };
  const place = apexArrivals(state, at) + 1;
  const lineage = apexLineage(state);
  const events: GameEvent[] = [{ type: "apexReached", at, place, lineage }];
  let current: PlayerState = { ...state, apex: { ...state.apex, place } };
  const reward = apexRewardFor(place);
  if (reward !== null) {
    const chest = earnChest(current, { kind: "apex", at, level: place, energy: 0, ...reward });
    current = chest.state;
    events.push(...chest.events);
  }
  return { state: current, events };
}
