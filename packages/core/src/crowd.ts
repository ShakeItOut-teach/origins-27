/**
 * La foule : les autres humains de la saison. Un humain prend, aux yeux des autres, la place de
 * l'organisme simulé qui occupait la sienne (monde partagé, étape 1).
 * La foule est une entrée du calcul, donnée par le serveur : le moteur reste pur.
 */
import { BANNER_IDS, GENE_FAMILIES, RANKING_IDS } from "@o27/data";
import type { BannerId, RankingId } from "@o27/data";
import type { Crowd, HumanCard, PlayerState } from "./types";

/** Au-delà, la foule reçue est tronquée : l'océan n'a que 500 places. */
const MAX_CARDS = 1000;
const NAME_MAX = 60;
const MAX_TAKEN = 5000;
const DEPOSIT_ID = /^d:-?\d{1,4}:-?\d{1,4}:\d{1,9}$/;

const NONE: ReadonlyMap<number, HumanCard> = new Map();

let lastCrowd: Crowd | undefined;
let lastSlot = -1;
let lastMap: ReadonlyMap<number, HumanCard> = NONE;
let lastStamp = "";

function refresh(state: PlayerState): void {
  const crowd = state.crowd;
  if (crowd === lastCrowd && state.slot === lastSlot) return;
  lastCrowd = crowd;
  lastSlot = state.slot;
  if (crowd === undefined || crowd.cards.length === 0) {
    lastMap = NONE;
    lastStamp = "";
    return;
  }
  const map = new Map<number, HumanCard>();
  for (const card of crowd.cards) if (card.slot !== state.slot) map.set(card.slot, card);
  lastMap = map;
  lastStamp = [...map.values()]
    .map((card) => `${String(card.slot)}@${String(card.seenAt)}${card.banner ?? ""}`)
    .join();
}

/** Les autres humains, par place. Le joueur lui-même n'y est jamais. */
export function humansBySlot(state: PlayerState): ReadonlyMap<number, HumanCard> {
  refresh(state);
  return lastMap;
}

/** Une empreinte de la foule : elle change dès qu'une vitrine change. Sert aux mémoires de calcul. */
export function crowdStamp(state: PlayerState): string {
  refresh(state);
  return lastStamp;
}

/** Le nombre d'humains dans l'océan cette saison, le joueur compris. */
export function humanCount(state: PlayerState): number {
  return humansBySlot(state).size + 1;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function readCard(raw: unknown): HumanCard | null {
  if (!isRecord(raw)) return null;
  const { slot, name, hue, tier, zone, scores, week, contest, seenAt } = raw;
  // Une vitrine d'avant les familles n'en a pas : elle compte comme sans gène.
  const family = GENE_FAMILIES.find((entry) => entry === raw.family) ?? null;
  // Une vitrine d'avant les bancs n'a ni bannière ni contribution.
  const banner = BANNER_IDS.find((entry) => entry === raw.banner) ?? null;
  const given = isCount(raw.given) ? raw.given : 0;
  // Une vitrine d'avant les combats entre humains ne dit pas jusqu'à quand il est à l'abri.
  const shield = isCount(raw.shield) ? raw.shield : 0;
  if (
    !isCount(slot) ||
    typeof name !== "string" ||
    name.length === 0 ||
    name.length > NAME_MAX ||
    !isCount(hue) ||
    hue >= 360 ||
    !isCount(tier) ||
    !isCount(zone) ||
    !isCount(week) ||
    !isCount(contest) ||
    !isCount(seenAt) ||
    !isRecord(scores)
  ) {
    return null;
  }
  const read: Partial<Record<RankingId, number>> = {};
  for (const id of RANKING_IDS) {
    // Le classement des combats entre humains est venu après : une vieille vitrine y a 0.
    const value = id === "duel" && scores[id] === undefined ? 0 : scores[id];
    if (!isCount(value)) return null;
    read[id] = value;
  }
  return {
    slot,
    name,
    hue,
    tier,
    zone,
    scores: read as Record<RankingId, number>,
    week,
    contest,
    seenAt,
    family,
    banner,
    given,
    shield,
  };
}

function readTaken(raw: unknown): Readonly<Record<string, number>> | null {
  if (!isRecord(raw)) return null;
  const taken: Record<string, number> = {};
  let count = 0;
  for (const [id, amount] of Object.entries(raw)) {
    if (count >= MAX_TAKEN) break;
    // Un nombre venu de la base peut arriver en texte (bigint).
    const value = typeof amount === "string" ? Number(amount) : amount;
    if (!DEPOSIT_ID.test(id) || !isCount(value)) continue;
    taken[id] = value;
    count += 1;
  }
  return count === 0 ? null : taken;
}

/**
 * Relit une foule venue du réseau ou de la base. Une vitrine mal formée est ignorée, sans faire
 * échouer les autres ; une place en double garde la vitrine la plus récente.
 */
export function readCrowd(raw: unknown): Crowd {
  const list =
    isRecord(raw) && Array.isArray(raw.cards) ? raw.cards : Array.isArray(raw) ? raw : [];
  const bySlot = new Map<number, HumanCard>();
  for (const entry of list.slice(0, MAX_CARDS)) {
    const card = readCard(entry);
    if (card === null) continue;
    const known = bySlot.get(card.slot);
    if (known === undefined || known.seenAt < card.seenAt) bySlot.set(card.slot, card);
  }
  const cards = [...bySlot.values()].sort((one, other) => one.slot - other.slot);
  const taken = isRecord(raw) ? readTaken(raw.taken) : null;
  return taken === null ? { cards } : { cards, taken };
}

/**
 * Ce que les autres humains ont pris dans un gisement : le total connu du serveur, moins la
 * part du joueur lui-même.
 */
export function othersTaken(state: PlayerState, depositId: string): number {
  const all = state.crowd?.taken?.[depositId] ?? 0;
  return Math.max(0, all - (state.taken[depositId] ?? 0));
}

/** Le même état, avec cette foule. */
export function withCrowd(state: PlayerState, crowd: Crowd): PlayerState {
  return { ...state, crowd };
}

/** Les autres espèces humaines d'une bannière : son banc, le joueur mis à part. */
export function benchOf(state: PlayerState, banner: BannerId): readonly HumanCard[] {
  return [...humansBySlot(state).values()]
    .filter((card) => card.banner === banner)
    .sort((one, other) => other.given - one.given || one.slot - other.slot);
}

/** Les points versés par les autres humains d'une bannière. */
export function benchPoints(state: PlayerState, banner: BannerId): number {
  let total = 0;
  for (const card of humansBySlot(state).values()) if (card.banner === banner) total += card.given;
  return total;
}

/** Combien d'autres humains sous chaque bannière. */
export function humansPerBanner(state: PlayerState): Readonly<Record<BannerId, number>> {
  const counts: Record<BannerId, number> = { aby: 0, krk: 0, mer: 0, tox: 0, lum: 0, nox: 0 };
  for (const card of humansBySlot(state).values())
    if (card.banner !== null) counts[card.banner] += 1;
  return counts;
}
