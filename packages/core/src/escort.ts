/**
 * Les sorties qui attendent le serveur : une attaque contre un autre humain, et des renforts
 * partis défendre un allié. Le combat a lieu chez le serveur, qui lit les deux parties ; ici,
 * le moteur ne fait que les ramener à la maison, et ne les laisse jamais attendre sans fin.
 */
import { BALANCE, TROOP_IDS } from "@o27/data";
import { partySize } from "./hunt";
import type { Escort, PlayerState, Raid, Step } from "./types";

const HOUR_MS = 3_600_000;

/** Combien de temps une sortie attend le serveur avant de rentrer sans combat. */
export function holdMs(): number {
  return BALANCE.rivals.versus.holdHours * HOUR_MS;
}

/** Une attaque contre un humain dont le serveur n'a pas encore rendu le combat. */
export function awaitsDuel(raid: Raid): boolean {
  return raid.versus !== undefined && raid.outcome === null && !raid.cancelled;
}

/**
 * La cible était à l'abri à l'arrivée, ou le serveur n'a jamais rendu le combat : le groupe
 * rentre tout de suite, sans perte ni butin. L'énergie reste dépensée.
 */
export function bounceRaid(state: PlayerState, raid: Raid, at: number): Step {
  return {
    state: { ...state, raid: { ...raid, cancelled: true, returnsAt: Math.max(at, state.now) } },
    events: [{ type: "raidBounced", at, rival: raid.rival }],
  };
}

/** L'instant où les renforts rentrent, ou celui où ils cessent d'attendre le combat. */
export function escortDue(escort: Escort | null): number {
  if (escort === null) return Number.POSITIVE_INFINITY;
  return escort.returnsAt ?? escort.arrivesAt + holdMs();
}

/** Les renforts sont rentrés : les survivantes reprennent leur place à la maison. */
export function escortBack(state: PlayerState, escort: Escort, at: number): Step {
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] += escort.party[id] - escort.losses[id];
  const fought = escort.battle !== undefined;
  return {
    state: { ...state, troops, escort: null },
    events: [
      {
        type: "escortReturned",
        at,
        slot: escort.slot,
        held: fought && escort.held,
        fought,
        losses: partySize(escort.losses),
        ...(escort.battle === undefined ? {} : { battle: escort.battle }),
      },
    ],
  };
}
