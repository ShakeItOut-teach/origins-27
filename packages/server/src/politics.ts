/**
 * La politique des bannières, côté serveur : après un ordre accepté par le moteur, le vote du
 * chef, la guerre ou la paix sont gardés en base, où tous les joueurs les liront avec la foule.
 * La base revérifie qui a le droit (le chef, un membre du banc) : rien n'est cru sur parole.
 */
import type { GameEvent } from "@o27/core";
import type { BannerId } from "@o27/data";

export interface PoliticsRepository {
  /** Le vote d'un joueur pour le chef de sa bannière (la place du candidat). */
  readonly vote: (playerId: string, slot: number) => Promise<void>;
  readonly declareWar: (playerId: string, banner: BannerId) => Promise<void>;
  readonly makePeace: (playerId: string, banner: BannerId) => Promise<void>;
}

/** Garde en base ce que ces événements disent de la politique des bannières. */
export async function recordPolitics(
  politics: PoliticsRepository | undefined,
  playerId: string,
  events: readonly GameEvent[],
): Promise<void> {
  if (politics === undefined) return;
  for (const event of events) {
    if (event.type === "leaderVoted") await politics.vote(playerId, event.slot);
    if (event.type === "warDeclared") await politics.declareWar(playerId, event.banner);
    if (event.type === "peaceMade") await politics.makePeace(playerId, event.banner);
  }
}
