/**
 * La vitrine d'un joueur : ce que les autres humains de la saison voient de lui. Calculée ici,
 * par les règles, pour que le serveur montre exactement ce que l'écran du joueur affiche.
 */
import { RANKING_IDS } from "@o27/data";
import type { RankingId } from "@o27/data";
import { contestProgress } from "./contest";
import { organismHue } from "./ocean";
import { playerScore } from "./power";
import { speciesOf } from "./species";
import type { HumanCard, PlayerState } from "./types";

export function humanCard(state: PlayerState): HumanCard {
  const scores = {} as Record<RankingId, number>;
  for (const id of RANKING_IDS) scores[id] = playerScore(state, id);
  return {
    slot: state.slot,
    name: speciesOf(state).name,
    hue: organismHue(state.worldSeed, state.slot),
    tier: state.tier,
    zone: state.zone,
    scores,
    week: state.contest?.week ?? 0,
    contest: contestProgress(state),
    seenAt: state.now,
  };
}
