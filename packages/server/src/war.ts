/**
 * Les combats entre humains, côté serveur (monde partagé, étape 3).
 *
 * - Avant un ordre qui touche un autre humain (espionner, attaquer, renforcer), le serveur lit
 *   ce que l'appareil ne sait pas : la vraie partie de la cible, ou l'attaque visée.
 * - Après chaque écriture, la file des attaques et des renforts suit la partie du joueur
 *   (une attaque partie, rappelée ; des renforts en route). Rejouable sans risque.
 * - À chaque visite de n'importe quel joueur, les attaques arrivées à l'heure du combat sont
 *   jouées par `core` (`resolveDuel`) et écrites d'un seul coup dans toutes les parties.
 * Aucune règle ici : tout le combat est dans `core`.
 */
import {
  awaitsDuel,
  deserializeState,
  withCrowd,
  humansBySlot,
  resolveDuel,
  serializeState,
  slotOf,
  speciesOf,
} from "@o27/core";
import type { Battle, Crowd, DuelSummary, GameEvent, PlayerState, VersusContext } from "@o27/core";
import type { BannerId, Order, TroopId } from "@o27/data";

/** Ce que la file lit des parties : la base des joueurs (`Repository` de service.ts). */
interface PlayerStore {
  readonly load: (
    playerId: string,
  ) => Promise<{ readonly state: string; readonly version: number } | null>;
}

/** Une attaque de la file, arrivée (ou non) à l'heure du combat. */
export interface AttackRow {
  readonly id: string;
  readonly attacker: string;
  readonly defender: string;
  readonly resolveAt: number;
}

/** Ce que la file garde d'une attaque, tiré de la partie de l'attaquant. */
export interface RaidRecord {
  readonly attacker: string;
  readonly attackerSlot: number;
  readonly attackerName: string;
  readonly attackerBanner: BannerId | null;
  readonly defenderSlot: number;
  readonly defenderName: string;
  readonly defenderBanner: BannerId | null;
  readonly party: Readonly<Record<TroopId, number>>;
  readonly startedAt: number;
  readonly arrivesAt: number;
  readonly resolveAt: number;
  /** Rappelée avant le combat. */
  readonly cancelled: boolean;
}

export interface EscortRecord {
  readonly helper: string;
  readonly helperName: string;
  readonly attack: string;
  readonly slot: number;
  readonly party: Readonly<Record<TroopId, number>>;
  readonly arrivesAt: number;
}

export interface SpyRecord {
  readonly spy: string;
  readonly spySlot: number;
  readonly spyName: string;
  readonly spyBanner: BannerId | null;
  readonly target: string;
  readonly targetSlot: number;
  readonly targetName: string;
  readonly targetBanner: BannerId | null;
  readonly success: boolean;
  readonly at: number;
}

export interface Settlement {
  readonly attack: string;
  /** Les parties à écrire d'un seul coup ; si une version a bougé, rien n'est écrit. */
  readonly writes: readonly {
    readonly playerId: string;
    readonly expectedVersion: number;
    readonly state: string;
  }[];
  /** `null` : l'attaque n'existe plus chez l'attaquant ; elle est close sans combat. */
  readonly summary: DuelSummary | null;
  /** Le détail du combat, vu de l'attaquant, pour le fil d'alliance. */
  readonly battle: Battle | null;
}

export interface WarRepository {
  /** Le joueur qui tient cette place dans l'océan de la saison ; `null` si personne. */
  readonly ownerOf: (slot: number) => Promise<string | null>;
  /** Inscrit ou met à jour une attaque (même attaquant, même départ : la même ligne). */
  readonly syncRaid: (record: RaidRecord) => Promise<void>;
  readonly syncEscort: (record: EscortRecord) => Promise<void>;
  /** L'attaque visée par des renforts, si elle attend encore son combat. */
  readonly findAttack: (
    id: string,
  ) => Promise<{ readonly slot: number; readonly resolveAt: number } | null>;
  /** Les attaques arrivées à l'heure du combat ; celles du joueur d'abord. */
  readonly dueAttacks: (now: number, playerId: string, limit: number) => Promise<AttackRow[]>;
  /** Les joueurs qui ont envoyé des renforts pour cette attaque. */
  readonly escortsOf: (attack: string) => Promise<string[]>;
  /** Écrit le combat : toutes les parties et l'attaque close, ou rien. */
  readonly settle: (settlement: Settlement) => Promise<boolean>;
  readonly recordSpy: (record: SpyRecord) => Promise<void>;
}

/** Combien d'attaques une visite peut jouer, pour ne pas la ralentir. */
const SETTLE_PER_VISIT = 3;
const SETTLE_ATTEMPTS = 3;

interface Loaded {
  readonly state: PlayerState;
  readonly version: number;
}

async function loadPlayer(
  repo: PlayerStore,
  playerId: string,
  crowd?: Crowd,
): Promise<Loaded | null> {
  const stored = await repo.load(playerId);
  if (stored === null) return null;
  const state = deserializeState(stored.state);
  // Comme pour tout calcul du serveur : avec les autres humains de la saison.
  return { state: crowd === undefined ? state : withCrowd(state, crowd), version: stored.version };
}

/** Joue une attaque arrivée à l'heure du combat. */
async function settleOne(
  repo: PlayerStore,
  war: WarRepository,
  row: AttackRow,
  crowd?: Crowd,
): Promise<void> {
  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
    const attacker = await loadPlayer(repo, row.attacker, crowd);
    const defender = await loadPlayer(repo, row.defender, crowd);
    const helperIds = (await war.escortsOf(row.id)).filter(
      (id) => id !== row.attacker && id !== row.defender,
    );
    const helpers: { readonly id: string; readonly loaded: Loaded }[] = [];
    for (const id of helperIds) {
      const loaded = await loadPlayer(repo, id, crowd);
      if (loaded !== null) helpers.push({ id, loaded });
    }
    if (attacker === null || defender === null) {
      // Un compte supprimé entre-temps : l'attaque est close, sans combat.
      await war.settle({ attack: row.id, writes: [], summary: null, battle: null });
      return;
    }
    const result = resolveDuel({
      attack: row.id,
      attacker: attacker.state,
      defender: defender.state,
      helpers: helpers.map((entry) => entry.loaded.state),
    });
    const writes = [
      {
        playerId: row.attacker,
        expectedVersion: attacker.version,
        state: serializeState(result.attacker.state),
      },
      {
        playerId: row.defender,
        expectedVersion: defender.version,
        state: serializeState(result.defender.state),
      },
      ...helpers.map((entry, index) => ({
        playerId: entry.id,
        expectedVersion: entry.loaded.version,
        state: serializeState(result.helpers[index]?.state ?? entry.loaded.state),
      })),
    ];
    const battle = result.attacker.state.raid?.outcome?.battle ?? null;
    if (await war.settle({ attack: row.id, writes, summary: result.summary, battle })) return;
  }
}

/** Joue les attaques arrivées à l'heure du combat. Une panne ici ne bloque jamais le joueur. */
export async function settleDue(
  repo: PlayerStore,
  war: WarRepository | undefined,
  playerId: string,
  now: number,
  crowd?: () => Promise<Crowd>,
): Promise<void> {
  if (war === undefined) return;
  const rows = await war.dueAttacks(now, playerId, SETTLE_PER_VISIT);
  if (rows.length === 0) return;
  const known = crowd === undefined ? undefined : await crowd();
  for (const row of rows) await settleOne(repo, war, row, known);
}

/** L'humain visé par un ordre d'espionnage ou d'attaque, s'il y en a un. */
function humanAimed(state: PlayerState, order: Order): number | null {
  if (order.type !== "spyRival" && order.type !== "sendRaid") return null;
  const slot = slotOf(order.rival);
  if (slot === null || !humansBySlot(state).has(slot)) return null;
  return slot;
}

export interface OrderContext {
  readonly context: VersusContext | undefined;
  /** Le joueur visé, quand l'ordre touche un autre humain. */
  readonly targetId: string | null;
}

/** Ce que le moteur doit savoir en plus pour juger cet ordre. */
export async function contextFor(
  repo: PlayerStore,
  war: WarRepository | undefined,
  state: PlayerState,
  order: Order,
): Promise<OrderContext> {
  if (war === undefined) return { context: undefined, targetId: null };
  if (order.type === "reinforceAlly") {
    const found = await war.findAttack(order.attack);
    return {
      context: { attack: found === null ? null : { id: order.attack, ...found } },
      targetId: null,
    };
  }
  const slot = humanAimed(state, order);
  if (slot === null) return { context: undefined, targetId: null };
  const owner = await war.ownerOf(slot);
  if (owner === null) return { context: undefined, targetId: null };
  const opponent = await loadPlayer(repo, owner, state.crowd);
  if (opponent === null) return { context: undefined, targetId: null };
  return { context: { opponent: opponent.state }, targetId: owner };
}

/** Après une écriture : la file suit l'attaque et les renforts du joueur, et note l'espionnage. */
export async function afterCommit(
  war: WarRepository | undefined,
  playerId: string,
  state: PlayerState,
  events: readonly GameEvent[],
  targetId: string | null,
): Promise<void> {
  if (war === undefined) return;
  const raid = state.raid;
  const me = speciesOf(state).name;
  const banner = state.alliance?.banner ?? null;
  if (
    raid?.versus !== undefined &&
    (awaitsDuel(raid) || (raid.cancelled && raid.outcome === null))
  ) {
    const card = humansBySlot(state).get(raid.versus);
    await war.syncRaid({
      attacker: playerId,
      attackerSlot: state.slot,
      attackerName: me,
      attackerBanner: banner,
      defenderSlot: raid.versus,
      defenderName: card?.name ?? "",
      defenderBanner: card?.banner ?? null,
      party: raid.party,
      startedAt: raid.startedAt,
      arrivesAt: raid.arrivesAt,
      resolveAt: raid.resolveAt,
      cancelled: raid.cancelled,
    });
  }
  const escort = state.escort;
  if (escort !== null && escort.returnsAt === null) {
    await war.syncEscort({
      helper: playerId,
      helperName: me,
      attack: escort.attack,
      slot: escort.slot,
      party: escort.party,
      arrivesAt: escort.arrivesAt,
    });
  }
  if (targetId === null) return;
  for (const event of events) {
    if (event.type !== "rivalSpied" && event.type !== "rivalSpyFailed") continue;
    const slot = slotOf(event.rival);
    const card = slot === null ? undefined : humansBySlot(state).get(slot);
    if (slot === null || card === undefined) continue;
    await war.recordSpy({
      spy: playerId,
      spySlot: state.slot,
      spyName: me,
      spyBanner: banner,
      target: targetId,
      targetSlot: slot,
      targetName: card.name,
      targetBanner: card.banner,
      success: event.type === "rivalSpied",
      at: event.at,
    });
  }
}
