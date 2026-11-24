/**
 * Récolter dans l'océan : les gisements ordinaires et ceux que les événements font naître.
 * Les seconds n'existent pour un joueur qu'à partir du palier des événements.
 */
import { BALANCE, PLACE_RESOURCE } from "@o27/data";
import type { ResourceId } from "@o27/data";
import { bloomPercent, eventDeposits, findEventDeposit, oceanEvents } from "./events";
import { cellDistance, depositLeft, findDeposit, oceanDeposits, playerCell } from "./ocean";
import type { Deposit } from "./ocean";
import { modifierPercent, travelMs } from "./stats";
import type { PlayerState } from "./types";

/** Tous les gisements que ce joueur peut voir à cet instant. */
export function playerDeposits(state: PlayerState, at: number): readonly Deposit[] {
  const ordinary = oceanDeposits(state.worldSeed, at);
  if (state.tier < BALANCE.events.tier) return ordinary;
  const born = oceanEvents(state.worldSeed, at).flatMap((event) => eventDeposits(event));
  return born.length === 0 ? ordinary : [...ordinary, ...born];
}

/** Retrouve un gisement par son identifiant, pour ce joueur ; `null` s'il n'existe pas ou plus. */
export function playerDeposit(state: PlayerState, id: string, at: number): Deposit | null {
  if (!id.startsWith("v:")) return findDeposit(state.worldSeed, id, at);
  if (state.tier < BALANCE.events.tier) return null;
  return findEventDeposit(state.worldSeed, id, at);
}

export interface GatherOffer {
  readonly resource: ResourceId;
  /** Butin, en millionièmes d'unité. */
  readonly loot: number;
  readonly energy: number;
  /** Durée de l'aller-retour. */
  readonly durationMs: number;
  /** Supplément dû à une efflorescence, en pourcentage ; 0 hors de toute efflorescence. */
  readonly bloomPercent: number;
}

/** Ce qu'une récolte dans ce gisement rapporte et coûte, pour ce joueur, à cet instant. */
export function gatherOffer(state: PlayerState, deposit: Deposit, at: number): GatherOffer {
  const data = BALANCE.ocean.deposit;
  const distance = cellDistance(playerCell(state), deposit);
  const bloom = state.tier < BALANCE.events.tier ? 0 : bloomPercent(state.worldSeed, deposit, at);
  return {
    resource: PLACE_RESOURCE[deposit.kind],
    // Appareil de Golgi, évolutions de récolte et efflorescence grossissent le chargement.
    loot: Math.min(
      Math.floor((deposit.load * (100 + modifierPercent(state, "gather") + bloom)) / 100),
      depositLeft(deposit, state.taken, at),
    ),
    energy: data.energy,
    durationMs: travelMs(
      state,
      Math.max(data.minSeconds, 2 * distance * data.secondsPerCell) * 1000,
    ),
    bloomPercent: bloom,
  };
}
