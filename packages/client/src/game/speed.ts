/**
 * L'essai accéléré : pour tester une saison entière en peu de temps, le temps du jeu passe
 * 60 ou 600 fois plus vite. Cette partie tourne sur l'appareil, sans serveur, dans sa propre
 * sauvegarde : la vraie partie du joueur n'est jamais touchée.
 *
 * On l'ouvre avec l'adresse `?vitesse=60` ou `?vitesse=600` ; `?vitesse=1` revient au temps normal.
 */

export const SPEEDS = [60, 600] as const;
export type Speed = 1 | (typeof SPEEDS)[number];

/** La sauvegarde de la partie d'essai, à part de la vraie. */
export const TRIAL_SAVE_KEY = "o27.partie-essai.v1";
const SPEED_KEY = "o27.essai.vitesse";
const ANCHOR_KEY = "o27.essai.horloge";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function asSpeed(value: string | null): Speed | null {
  if (value === "1") return 1;
  return SPEEDS.find((speed) => String(speed) === value) ?? null;
}

/** La vitesse voulue : celle de l'adresse si elle en donne une, sinon celle retenue par l'appareil. */
export function readSpeed(search: string, storage: Store): Speed {
  const asked = asSpeed(new URLSearchParams(search).get("vitesse"));
  if (asked === 1) {
    storage.removeItem(SPEED_KEY);
    return 1;
  }
  if (asked !== null) {
    storage.setItem(SPEED_KEY, String(asked));
    return asked;
  }
  return asSpeed(storage.getItem(SPEED_KEY)) ?? 1;
}

interface Anchor {
  readonly real: number;
  readonly game: number;
  readonly speed: number;
}

function readAnchor(storage: Store): Anchor | null {
  const raw = storage.getItem(ANCHOR_KEY);
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<Anchor>;
    return typeof value.real === "number" &&
      typeof value.game === "number" &&
      typeof value.speed === "number"
      ? { real: value.real, game: value.game, speed: value.speed }
      : null;
  } catch {
    return null;
  }
}

/**
 * L'horloge accélérée. Elle continue de tourner appareil fermé, et changer de vitesse
 * ne fait ni sauter ni reculer le temps du jeu : on repart de l'instant atteint.
 */
export function trialClock(storage: Store, real: () => number, speed: number): () => number {
  const previous = readAnchor(storage);
  const at = real();
  let anchor: Anchor;
  if (previous === null) {
    anchor = { real: at, game: at, speed };
  } else if (previous.speed === speed) {
    anchor = previous;
  } else {
    anchor = { real: at, game: previous.game + (at - previous.real) * previous.speed, speed };
  }
  storage.setItem(ANCHOR_KEY, JSON.stringify(anchor));
  return () => anchor.game + (real() - anchor.real) * anchor.speed;
}

/** Effacer la partie d'essai pour en recommencer une neuve, au jour 1. */
export function resetTrial(storage: Store): void {
  storage.removeItem(TRIAL_SAVE_KEY);
  storage.removeItem(ANCHOR_KEY);
}
