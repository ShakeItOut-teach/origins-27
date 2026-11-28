/**
 * La politique des bannières (demande du propriétaire du 28/11/2026) : alliés en bleu, neutres
 * en blanc, ennemis en rouge ; un chef élu par les espèces humaines du banc, deux jours après
 * l'ouverture des alliances ; le chef déclare la guerre et fait la paix.
 *
 * Les guerres, les votes et les chefs sont partagés entre joueurs : le serveur les garde et les
 * donne avec la foule (`Crowd.politics`). Le moteur juge les ordres d'après eux, sans réseau.
 */
import { BALANCE, BANNER_IDS, UNLOCKS } from "@o27/data";
import type { BannerId } from "@o27/data";
import { bannerOf } from "./banners";
import { humansBySlot } from "./crowd";
import { DAY_MS } from "./types";
import type { GameEvent, OrderErrorCode, Politics, PlayerState, Step } from "./types";

type Outcome = Step | { readonly error: OrderErrorCode };

/** Ce qu'est une autre bannière pour le joueur. */
export type Relation = "ally" | "neutral" | "enemy";

const NONE: Politics = { leaders: {}, wars: [], votes: {} };

export function politicsOf(state: PlayerState): Politics {
  return state.crowd?.politics ?? NONE;
}

/** Deux bannières sont-elles en guerre ? Une guerre déclarée vaut pour les deux camps. */
export function atWar(state: PlayerState, one: BannerId, other: BannerId): boolean {
  return politicsOf(state).wars.some(
    ([from, to]) => (from === one && to === other) || (from === other && to === one),
  );
}

/** Les bannières en guerre avec celle-ci, dans l'ordre des bannières. */
export function enemiesOf(state: PlayerState, banner: BannerId): readonly BannerId[] {
  return BANNER_IDS.filter((other) => other !== banner && atWar(state, banner, other));
}

/** La guerre que cette bannière a elle-même déclarée à l'autre (c'est elle qui peut y mettre fin). */
export function declaredWar(state: PlayerState, from: BannerId, to: BannerId): boolean {
  return politicsOf(state).wars.some(([one, other]) => one === from && other === to);
}

/**
 * Ce qu'est une bannière pour le joueur : alliée (la sienne), ennemie (en guerre avec la
 * sienne) ou neutre. `null` tant que le joueur n'a pas d'alliance : pas de couleurs.
 */
export function bannerRelation(state: PlayerState, banner: BannerId | null): Relation | null {
  const mine = state.alliance?.banner;
  if (mine === undefined) return null;
  if (banner === null) return "neutral";
  if (banner === mine) return "ally";
  return atWar(state, mine, banner) ? "enemy" : "neutral";
}

/** La bannière d'un organisme de l'océan : celle de l'humain qui tient sa place, sinon la sienne. */
export function slotBanner(state: PlayerState, slot: number): BannerId | null {
  const human = humansBySlot(state).get(slot);
  if (human !== undefined) return human.banner;
  return bannerOf(state.worldSeed, slot);
}

export function slotRelation(state: PlayerState, slot: number): Relation | null {
  return bannerRelation(state, slotBanner(state, slot));
}

/** Le chef d'une bannière (sa place), ou `null` s'il n'y en a pas encore. */
export function leaderOf(state: PlayerState, banner: BannerId): number | null {
  return politicsOf(state).leaders[banner] ?? null;
}

/** Le joueur est-il le chef de sa bannière ? */
export function isLeader(state: PlayerState): boolean {
  const banner = state.alliance?.banner;
  return banner !== undefined && leaderOf(state, banner) === state.slot;
}

/** Les voix reçues par un candidat de la bannière du joueur. */
export function votesFor(state: PlayerState, slot: number): number {
  const banner = state.alliance?.banner;
  if (banner === undefined) return 0;
  return politicsOf(state).votes[banner]?.[String(slot)] ?? 0;
}

/** Le jour où les alliances s'ouvrent : celui de leur palier dans la table de déblocage. */
function alliancesDay(): number {
  const step = UNLOCKS.find((entry) => entry.ui.includes("alliances"));
  return step?.minDay ?? 1;
}

/** L'instant où le vote du chef s'ouvre : deux jours après l'ouverture des alliances. */
export function voteOpensAt(state: PlayerState): number {
  return state.seasonStart + (alliancesDay() - 1 + BALANCE.alliance.leader.voteAfterDays) * DAY_MS;
}

/** Les candidats : le joueur et les autres espèces humaines de sa bannière. */
export function candidates(state: PlayerState): readonly number[] {
  const banner = state.alliance?.banner;
  if (banner === undefined) return [];
  const others = [...humansBySlot(state).values()]
    .filter((card) => card.banner === banner)
    .map((card) => card.slot);
  return [state.slot, ...others].sort((one, other) => one - other);
}

/** Voter pour le chef de sa bannière. On peut changer de vote quand on veut. */
export function voteLeader(state: PlayerState, slot: number): Outcome {
  const alliance = state.alliance;
  if (alliance === null) return { error: "noAlliance" };
  if (state.now < voteOpensAt(state)) return { error: "voteClosed" };
  if (!candidates(state).includes(slot)) return { error: "notAlly" };
  const event: GameEvent = { type: "leaderVoted", at: state.now, slot };
  return { state: { ...state, alliance: { ...alliance, vote: slot } }, events: [event] };
}

/** La politique vue par le joueur, avec ce changement appliqué tout de suite. */
function withPolitics(state: PlayerState, politics: Politics): PlayerState {
  const crowd = state.crowd ?? { cards: [] };
  return { ...state, crowd: { ...crowd, politics } };
}

/** Le chef déclare la guerre à une autre bannière : ses membres passent en rouge. */
export function declareWar(state: PlayerState, banner: BannerId): Outcome {
  const mine = state.alliance?.banner;
  if (mine === undefined) return { error: "noAlliance" };
  if (!isLeader(state)) return { error: "notLeader" };
  if (banner === mine) return { error: "sameAlliance" };
  if (declaredWar(state, mine, banner)) return { error: "alreadyAtWar" };
  const politics = politicsOf(state);
  return {
    state: withPolitics(state, { ...politics, wars: [...politics.wars, [mine, banner]] }),
    events: [{ type: "warDeclared", at: state.now, banner }],
  };
}

/** Le chef met fin à la guerre que sa bannière a déclarée. */
export function makePeace(state: PlayerState, banner: BannerId): Outcome {
  const mine = state.alliance?.banner;
  if (mine === undefined) return { error: "noAlliance" };
  if (!isLeader(state)) return { error: "notLeader" };
  if (!declaredWar(state, mine, banner)) return { error: "notAtWar" };
  const politics = politicsOf(state);
  return {
    state: withPolitics(state, {
      ...politics,
      wars: politics.wars.filter(([from, to]) => !(from === mine && to === banner)),
    }),
    events: [{ type: "peaceMade", at: state.now, banner }],
  };
}
