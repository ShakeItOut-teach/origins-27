/**
 * Les gains soudains : ce qui fait monter un compteur d'un coup (un toucher, un coffre, une
 * récolte qui rentre, un butin), par opposition à la production, qui le fait monter doucement.
 * L'écran les fête : des grains volent jusqu'au compteur. Aucune règle de jeu ici.
 */

/** Au-delà de ce temps de jeu entre deux images, c'est un saut d'horloge (un retour d'absence). */
const LONGEST_MS = 30 * 60_000;

/**
 * La part d'une hausse que la production n'explique pas ; 0 s'il n'y en a pas.
 * `rate` est la production par milliseconde ; `unit` est la plus petite quantité qu'on fête.
 */
export function suddenGain(
  before: number,
  after: number,
  elapsedMs: number,
  rate: number,
  unit: number,
): number {
  if (elapsedMs < 0 || elapsedMs > LONGEST_MS) return 0;
  const produced = Math.max(0, rate) * elapsedMs;
  const extra = after - before - produced;
  // Il faut au moins une unité entière, et nettement plus qu'un arrondi de la production.
  return extra >= unit && extra > produced * 0.1 ? extra : 0;
}

/** Combien de grains pour un gain : un seul pour une miette, puis de trois à neuf. */
export function grainCount(gain: number, unit: number): number {
  if (gain < unit) return 1;
  return Math.min(9, 3 + Math.floor(Math.log10(gain / unit) * 2));
}
