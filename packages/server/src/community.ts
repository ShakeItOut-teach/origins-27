/**
 * Autour du jeu : la mesure d'audience, les avis et le Muséum. Rien ici ne change une partie.
 * Le serveur note qui vient et ce qui est joué, pour savoir si le jeu plaît ; il garde les
 * avis des joueurs ; il garde la planche de fin de saison. La base est derrière
 * `CommunityRepository`, ce qui permet de tester sans Supabase.
 */
import {
  DAY_MS,
  deserializeState,
  museumPlate,
  seasonDay,
  seasonOver,
  totalPower,
} from "@o27/core";
import type { MuseumPlate, PlayerState } from "@o27/core";
import {
  FEEDBACK_PER_DAY,
  FeedbackSchema,
  OrderRequestSchema,
  UNLOCKS,
  VisitInfoSchema,
} from "@o27/data";
import type { DeviceKind, OrderType } from "@o27/data";
import type { OrderReply, Repository } from "./service";

/** Le jour d'un instant, en heure universelle : « 2027-01-31 ». Le même pour tous les joueurs. */
export function dayOf(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** Le palier où le Muséum s'ouvre, d'après la table de déblocage. */
const MUSEUM_TIER =
  UNLOCKS.find((unlock) => unlock.ui.includes("museum"))?.tier ?? Number.POSITIVE_INFINITY;

/** Une visite : le joueur a ouvert le jeu. */
export interface VisitRecord {
  readonly playerId: string;
  readonly day: string;
  readonly seasonDay: number;
  readonly tier: number;
  readonly power: number;
  /** Ce que l'appareil dit de lui ; `null` s'il n'a rien dit de lisible. */
  readonly lang: "fr" | "en" | null;
  readonly device: DeviceKind | null;
  readonly installed: boolean | null;
  /** Le mot court du lien par lequel le joueur est arrivé. Seule la première visite compte. */
  readonly source: string | null;
  /** La planche du Muséum à garder, dès que le Muséum est ouvert ou la saison finie. */
  readonly plate: MuseumPlate | null;
}

function readInfo(body: unknown) {
  if (typeof body !== "object" || body === null || !("info" in body)) return null;
  const parsed = VisitInfoSchema.safeParse(body.info);
  return parsed.success ? parsed.data : null;
}

/** Ce que le serveur note d'une visite. `body` vient du client : rien n'y est sûr. */
export function describeVisit(
  playerId: string,
  state: PlayerState,
  now: number,
  body: unknown,
): VisitRecord {
  const info = readInfo(body);
  return {
    playerId,
    day: dayOf(now),
    seasonDay: seasonDay(state, now),
    tier: state.tier,
    power: totalPower(state),
    lang: info?.lang ?? null,
    device: info?.device ?? null,
    installed: info?.installed ?? null,
    source: info?.source ?? null,
    plate: state.tier >= MUSEUM_TIER || seasonOver(state, now) ? museumPlate(state) : null,
  };
}

/** Un ordre reçu : son type, et si les règles l'ont accepté. */
export interface OrderRecord {
  readonly playerId: string;
  readonly day: string;
  readonly seasonDay: number;
  readonly tier: number;
  readonly type: OrderType;
  readonly ok: boolean;
  /** Le motif du refus ; `null` pour un ordre accepté. */
  readonly error: string | null;
}

/** Ce que le serveur note d'un ordre traité. Rien, si la demande n'a pas abouti. */
export function describeOrder(
  playerId: string,
  now: number,
  body: unknown,
  reply: OrderReply,
): OrderRecord | null {
  if (reply.status !== "done") return null;
  const parsed = OrderRequestSchema.safeParse(body);
  if (!parsed.success) return null;
  return {
    playerId,
    day: dayOf(now),
    seasonDay: seasonDay(reply.state, now),
    tier: reply.state.tier,
    type: parsed.data.order.type,
    ok: reply.outcome.ok,
    error: reply.outcome.ok ? null : reply.outcome.error,
  };
}

/** Ce qu'un humain vient de charger dans un gisement partagé. */
export interface TakeRecord {
  readonly deposit: string;
  /** En millionièmes d'unité. */
  readonly amount: number;
}

/**
 * Une récolte acceptée vide un peu le gisement pour tous les humains : le serveur note ce qui
 * est parti. Rien pour tout autre ordre, ni pour un ordre rejoué (déjà noté la première fois).
 */
export function describeTake(body: unknown, reply: OrderReply): TakeRecord | null {
  if (reply.status !== "done" || !reply.outcome.ok || reply.replayed === true) return null;
  const parsed = OrderRequestSchema.safeParse(body);
  if (!parsed.success || parsed.data.order.type !== "gather") return null;
  const expedition = reply.state.expedition;
  if (expedition === null || expedition.place !== parsed.data.order.deposit) return null;
  return { deposit: expedition.place, amount: expedition.loot };
}

/** Un avis de joueur, tel qu'il est gardé. */
export interface FeedbackRecord {
  readonly playerId: string;
  readonly day: string;
  readonly seasonDay: number;
  readonly tier: number;
  readonly rating: number | null;
  readonly text: string;
  readonly lang: "fr" | "en";
}

export interface CommunityRepository {
  /**
   * Garde un avis, sauf si le joueur en a déjà donné `limit` ce jour-là : alors rien n'est
   * écrit et la réponse est `false`.
   */
  readonly addFeedback: (record: FeedbackRecord, limit: number) => Promise<boolean>;
}

export interface FeedbackDeps {
  readonly repo: Pick<Repository, "load">;
  readonly community: CommunityRepository;
  readonly clock: () => number;
  readonly seasonStart: number;
}

export type FeedbackReply =
  | { readonly status: "done" }
  /** L'avis est vide, trop long ou mal formé. */
  | { readonly status: "invalid" }
  /** Trop d'avis aujourd'hui pour ce joueur. */
  | { readonly status: "tooMany" };

/** Reçoit l'avis d'un joueur déjà identifié. `body` vient du client : rien n'y est sûr. */
export async function handleFeedback(
  deps: FeedbackDeps,
  playerId: string,
  body: unknown,
): Promise<FeedbackReply> {
  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) return { status: "invalid" };
  const now = deps.clock();
  const stored = await deps.repo.load(playerId);
  // Un joueur sans partie peut donner son avis : il est au tout début.
  const state = stored === null ? null : deserializeState(stored.state);
  const kept = await deps.community.addFeedback(
    {
      playerId,
      day: dayOf(now),
      seasonDay:
        state === null
          ? Math.floor(Math.max(0, now - deps.seasonStart) / DAY_MS) + 1
          : seasonDay(state, now),
      tier: state?.tier ?? 0,
      rating: parsed.data.rating,
      text: parsed.data.text,
      lang: parsed.data.lang,
    },
    FEEDBACK_PER_DAY,
  );
  return { status: kept ? "done" : "tooMany" };
}

export interface MemoryCommunity extends CommunityRepository {
  /** Les avis gardés, pour les tests. */
  readonly feedback: () => readonly FeedbackRecord[];
}

/** Une base en mémoire, avec les mêmes garanties que la vraie. Sert aux tests. */
export function createMemoryCommunity(): MemoryCommunity {
  const kept: FeedbackRecord[] = [];
  return {
    feedback: () => kept,
    addFeedback(record, limit) {
      const today = kept.filter(
        (other) => other.playerId === record.playerId && other.day === record.day,
      );
      if (today.length >= limit) return Promise.resolve(false);
      kept.push(record);
      return Promise.resolve(true);
    },
  };
}
