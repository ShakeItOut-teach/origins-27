/**
 * Le Muséum : à la fin d'une saison, il reste une planche de l'espèce du joueur. Elle est
 * calculée ici, par les règles, pour que le serveur garde la même que celle que l'écran montre.
 */
import { SEASON_DAYS } from "@o27/data";
import { apexLineage } from "./apex";
import { crisisKind, crisisOf } from "./crisis";
import { leagueOf, ranking } from "./power";
import { speciesOf } from "./species";
import type { PlayerState } from "./types";
import { seasonDay } from "./unlock";

/** Une planche du Muséum : ce qu'une espèce était à la fin d'une saison. */
export interface MuseumPlate {
  /** Le début de la saison, en millisecondes : il la désigne. */
  readonly season: number;
  readonly name: string;
  readonly cousin: string;
  readonly rank: number;
  readonly of: number;
  readonly league: number;
  /** La lignée sortie des eaux, et sa place ; vide si l'espèce est restée dans l'eau. */
  readonly lineage: string;
  readonly place: number;
  /** La grande extinction traversée, si elle est finie ; vide sinon. */
  readonly crisis: string;
}

/** La planche de l'espèce du joueur, à l'instant de son état. */
export function museumPlate(state: PlayerState): MuseumPlate {
  const species = speciesOf(state);
  const power = ranking(state, "power");
  const crisis = crisisOf(state);
  return {
    season: state.seasonStart,
    name: species.name,
    cousin: species.cousin,
    rank: power.mine.rank,
    of: power.rows.length,
    league: leagueOf(power.mine.rank, power.rows.length),
    lineage: state.apex !== null && state.apex.place > 0 ? apexLineage(state) : "",
    place: state.apex?.place ?? 0,
    crisis: crisis !== null && crisis.phase === "done" ? crisisKind(state.worldSeed) : "",
  };
}

/** Vrai quand le dernier jour de la saison est passé. */
export function seasonOver(state: PlayerState, at: number): boolean {
  return seasonDay(state, at) > SEASON_DAYS;
}
