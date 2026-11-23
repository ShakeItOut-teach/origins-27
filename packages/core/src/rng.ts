/**
 * Hasard semé : la même graine donne toujours la même suite.
 * Tout le hasard du jeu passe par ici ; `Math.random` est interdit dans le moteur.
 */
export interface Rng {
  /** Nombre dans [0, 1). */
  next(): number;
  /** Entier dans [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** État courant, à sauvegarder pour reprendre la suite au même endroit. */
  readonly state: number;
}

/** Algorithme mulberry32 : petit, rapide, suffisant pour un jeu. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError("maxExclusive doit être un entier strictement positif");
      }
      return Math.floor(next() * maxExclusive);
    },
    get state(): number {
      return s;
    },
  };
}
