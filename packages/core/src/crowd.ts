/**
 * La foule : les autres humains de la saison. Un humain prend, aux yeux des autres, la place de
 * l'organisme simulé qui occupait la sienne (monde partagé, étape 1).
 * La foule est une entrée du calcul, donnée par le serveur : le moteur reste pur.
 */
import { RANKING_IDS } from "@o27/data";
import type { RankingId } from "@o27/data";
import type { Crowd, HumanCard, PlayerState } from "./types";

/** Au-delà, la foule reçue est tronquée : l'océan n'a que 500 places. */
const MAX_CARDS = 1000;
const NAME_MAX = 60;

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
  lastStamp = [...map.values()].map((card) => `${String(card.slot)}@${String(card.seenAt)}`).join();
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
    const value = scores[id];
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
  };
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
  return { cards: [...bySlot.values()].sort((one, other) => one.slot - other.slot) };
}

/** Le même état, avec cette foule. */
export function withCrowd(state: PlayerState, crowd: Crowd): PlayerState {
  return { ...state, crowd };
}
