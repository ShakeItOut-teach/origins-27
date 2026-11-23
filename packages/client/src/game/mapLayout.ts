/**
 * Où dessiner chaque lieu et chaque proie sur la lame.
 * On garde la vraie direction de chacun, mais la distance à l'écran dépend seulement de sa
 * bande (proche, moyen, loin) : la carte reste lisible et les boutons ne se chevauchent pas.
 * Ceci n'est que de l'affichage : aucune règle du jeu ne dépend de ces positions.
 */

/** Tout ce qui se pose sur la goutte : une position dans le monde et une bande de distance. */
export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly band: number;
}

export interface Placed<T extends Spot> {
  readonly item: T;
  /** Position sur la lame, de 0 à 1 (0,5 ; 0,5 = la cellule au centre). */
  readonly x: number;
  readonly y: number;
}

/** Rayon de chaque bande, en part de la largeur de la lame. */
const BAND_RADIUS = [0.19, 0.3, 0.41] as const;
/** Écart minimal entre deux boutons, en part de la largeur de la lame. */
export const MIN_GAP = 0.15;

export function layoutSpots<T extends Spot>(spots: readonly T[]): readonly Placed<T>[] {
  const items = spots.map((item) => ({
    item,
    angle: Math.atan2(item.y, item.x),
    radius: BAND_RADIUS[Math.min(item.band, BAND_RADIUS.length - 1)] ?? 0.41,
  }));
  const point = (entry: { angle: number; radius: number }) => ({
    x: 0.5 + Math.cos(entry.angle) * entry.radius,
    y: 0.5 + Math.sin(entry.angle) * entry.radius,
  });

  // On écarte petit à petit, en tournant, ceux qui se touchent.
  for (let pass = 0; pass < 400; pass++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a === undefined || b === undefined) continue;
        const pa = point(a);
        const pb = point(b);
        if (Math.hypot(pa.x - pb.x, pa.y - pb.y) >= MIN_GAP) continue;
        let delta = b.angle - a.angle;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        const push = delta >= 0 ? 0.04 : -0.04;
        a.angle -= push;
        b.angle += push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return items.map((entry) => ({ item: entry.item, ...point(entry) }));
}

/**
 * Où en est un filament, de 0 (dans la cellule) à 1 (sur sa cible).
 * `arrivesAt` et `leavesAt` encadrent le temps passé sur place (nul pour une expédition).
 * Rappelé, il revient en accéléré depuis l'endroit où il se trouvait.
 */
export function filamentReach(
  trip: {
    readonly startedAt: number;
    readonly arrivesAt: number;
    readonly leavesAt: number;
    readonly returnsAt: number;
    readonly cancelled: boolean;
  },
  cancelSpeedup: number,
  now: number,
): number {
  const out = trip.arrivesAt - trip.startedAt;
  if (out <= 0) return 0;
  const remaining = Math.max(0, trip.returnsAt - now);
  if (trip.cancelled) return Math.max(0, Math.min(1, (remaining * cancelSpeedup) / out));
  if (now <= trip.startedAt) return 0;
  if (now < trip.arrivesAt) return (now - trip.startedAt) / out;
  if (now <= trip.leavesAt) return 1;
  const back = trip.returnsAt - trip.leavesAt;
  return back <= 0 ? 0 : Math.max(0, Math.min(1, remaining / back));
}
