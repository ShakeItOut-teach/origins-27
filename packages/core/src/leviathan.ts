/**
 * Le Léviathan : un prédateur géant qui accompagne certains événements. Tant qu'il est là, il
 * frappe à heure fixe les cellules à sa portée. On peut l'affronter comme une proie : vaincu,
 * il ne menace plus le joueur et rapporte beaucoup.
 */
import { BALANCE, PREY_KINDS, TROOP_IDS } from "@o27/data";
import type { PreyKind, TroopId } from "@o27/data";
import { playerTroubles } from "./events";
import type { ZoneEvent } from "./events";
import { partySize } from "./hunt";
import { cellDistance, playerCell } from "./ocean";
import { defensePower, protectedUntil, reinforcements } from "./rivals";
import { travelMs } from "./stats";
import { MICRO } from "./types";
import type { PlayerState, Step } from "./types";
import { seasonDay } from "./unlock";
import type { PreyOffer } from "./world";

const DATA = BALANCE.events.leviathan;
const STRIKE_MS = DATA.strikeHours * 3_600_000;

/** Son tempérament : il fixe quel type de cellule fille compte double contre lui. */
export function leviathanKind(event: ZoneEvent): PreyKind {
  return PREY_KINDS[event.roll % PREY_KINDS.length] ?? "soft";
}

/** Sa force au combat un jour donné : il grandit avec la saison, et près de la surface. */
export function leviathanPower(state: PlayerState, event: ZoneEvent, at: number): number {
  const zone = BALANCE.ocean.zones[event.zone];
  const raw = DATA.power.base + DATA.power.perDay * (seasonDay(state, at) - 1);
  return Math.round((raw * (zone?.guardPercent ?? 100)) / 100);
}

/** Ce qu'affronter ce Léviathan demande et rapporte, pour ce joueur, à cet instant. */
export function leviathanOffer(state: PlayerState, event: ZoneEvent, at: number): PreyOffer {
  const zone = BALANCE.ocean.zones[event.zone];
  const steps = Math.max(
    1,
    Math.ceil(cellDistance(playerCell(state), event) / BALANCE.ocean.cellsPerStep),
  );
  return {
    power: leviathanPower(state, event, at),
    proteins: Math.floor((DATA.proteins * (zone?.richPercent ?? 100) * MICRO) / 100),
    energy: DATA.energy,
    durationMs:
      travelMs(state, BALANCE.rivals.raid.stepSeconds * steps * 1000) +
      BALANCE.hunt.strikeWindowSeconds * 1000,
    // Vaincu, il ne revient pas : le joueur est tranquille jusqu'à la fin de l'événement.
    restMs: Math.max(0, event.endsAt - at),
  };
}

/** Le joueur a-t-il déjà vaincu ce Léviathan ? */
export function leviathanBeaten(state: PlayerState, event: ZoneEvent): boolean {
  return state.placeReadyAt[event.id] !== undefined;
}

/** Prochaine frappe d'un Léviathan donné après l'instant `after` ; l'infini s'il n'y en a plus. */
function strikeAfter(event: ZoneEvent, after: number): number {
  const index = Math.max(1, Math.floor((after - event.startsAt) / STRIKE_MS) + 1);
  const at = event.startsAt + index * STRIKE_MS;
  return at < event.endsAt ? at : Number.POSITIVE_INFINITY;
}

/** Les Léviathans qui tiennent la cellule du joueur à leur portée et qu'il n'a pas vaincus. */
function threats(state: PlayerState): readonly ZoneEvent[] {
  return playerTroubles(state).filter(
    (event) => event.kind === "leviathan" && !leviathanBeaten(state, event),
  );
}

/** Instant de la prochaine frappe d'un Léviathan sur la cellule du joueur ; l'infini sans menace. */
export function leviathanDue(state: PlayerState): number {
  let next = Number.POSITIVE_INFINITY;
  for (const event of threats(state)) next = Math.min(next, strikeAfter(event, state.now));
  return next;
}

/** Le Léviathan qui menace la cellule du joueur en ce moment, et l'heure de sa prochaine frappe. */
export function leviathanThreat(
  state: PlayerState,
): { readonly event: ZoneEvent; readonly strikesAt: number } | null {
  for (const event of threats(state)) {
    if (event.startsAt > state.now || event.endsAt <= state.now) continue;
    const strikesAt = strikeAfter(event, state.now);
    if (Number.isFinite(strikesAt)) return { event, strikesAt };
  }
  return null;
}

/**
 * Le Léviathan frappe. Si la défense du joueur (ses cellules à la maison, sa Paroi, les
 * renforts de ses alliés) ne vaut pas sa force, il dévore une part des cellules filles et des
 * réserves. Un joueur à l'abri (bouclier, mode absent, nuit) n'est pas trouvé.
 */
export function leviathanStrike(state: PlayerState, at: number): Step {
  const event = threats(state).find(
    (entry) => at > entry.startsAt && at < entry.endsAt && (at - entry.startsAt) % STRIKE_MS === 0,
  );
  if (event === undefined || protectedUntil(state, at) > at) return { state, events: [] };
  const attack = Math.round((leviathanPower(state, event, at) * DATA.strikePercent) / 100);
  const defense = defensePower(state) + reinforcements(state, at);
  if (attack <= defense) {
    return { state, events: [{ type: "leviathanRepelled", at, event: event.id }] };
  }
  const troops: Record<TroopId, number> = { ...state.troops };
  const troopsLost = Math.ceil((partySize(troops) * DATA.lossPercent) / 100);
  for (let left = troopsLost; left > 0; left--) {
    let biggest: TroopId = "hunter";
    for (const id of TROOP_IDS) if (troops[id] > troops[biggest]) biggest = id;
    troops[biggest] -= 1;
  }
  const part = (amount: number): number => Math.floor((amount * DATA.lossPercent) / 100);
  const sugar = part(state.resources.sugar);
  const bricks = part(state.resources.bricks);
  const proteins = part(state.resources.proteins);
  return {
    state: {
      ...state,
      troops,
      resources: {
        sugar: state.resources.sugar - sugar,
        bricks: state.resources.bricks - bricks,
        proteins: state.resources.proteins - proteins,
      },
    },
    events: [{ type: "leviathanStruck", at, event: event.id, sugar, bricks, proteins, troopsLost }],
  };
}
