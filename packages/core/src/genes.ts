/**
 * Les gènes : chaque mutation appartient à une famille. Deux gènes d'une famille ouvrent sa
 * cellule fille de rang 2 ; trois ouvrent sa lignée, qui apporte un avantage durable.
 * Mêler les familles donne une armée variée ; se spécialiser donne une lignée plus tôt.
 */
import { BALANCE } from "@o27/data";
import type { GeneFamily, StatId, TroopId } from "@o27/data";
import type { PlayerState } from "./types";

/** Nombre de gènes que le joueur possède dans une famille. */
export function familyGenes(state: PlayerState, family: GeneFamily): number {
  let count = 0;
  for (const id of state.mutations) if (BALANCE.mutations[id].family === family) count += 1;
  return count;
}

/** La lignée d'une famille est-elle ouverte ? Les lignées n'existent pas avant leur palier. */
export function hasLineage(state: PlayerState, family: GeneFamily): boolean {
  return (
    state.tier >= BALANCE.genes.tier && familyGenes(state, family) >= BALANCE.genes.lineageGenes
  );
}

/** Ce que les lignées ouvertes ajoutent à une statistique, en pourcentage. */
export function lineagePercent(state: PlayerState, stat: StatId): number {
  if (state.tier < BALANCE.genes.tier) return 0;
  let total = 0;
  for (const family of Object.keys(BALANCE.lineages) as GeneFamily[]) {
    const lineage = BALANCE.lineages[family];
    if (lineage.stat === stat && hasLineage(state, family)) total += lineage.percent;
  }
  return total;
}

/** Combien de gènes il manque pour faire naître cette cellule fille ; 0 si rien ne manque. */
export function genesMissing(state: PlayerState, troop: TroopId): number {
  const data = BALANCE.troops[troop];
  if (data.family === null) return 0;
  return Math.max(0, data.genes - familyGenes(state, data.family));
}

/** Le joueur peut-il faire naître cette sorte de cellule fille ? */
export function troopUnlocked(state: PlayerState, troop: TroopId): boolean {
  return state.tier >= BALANCE.troops[troop].tier && genesMissing(state, troop) === 0;
}
