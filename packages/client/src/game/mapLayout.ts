/**
 * Où dessiner chaque lieu sur la lame.
 * On garde la vraie direction de chaque lieu, mais la distance à l'écran dépend seulement de
 * sa bande (proche, moyen, loin) : la carte reste lisible et les boutons ne se chevauchent pas.
 * Ceci n'est que de l'affichage : aucune règle du jeu ne dépend de ces positions.
 */
import type { Place } from "@o27/core";

export interface PlacedPlace {
  readonly place: Place;
  /** Position sur la lame, de 0 à 1 (0,5 ; 0,5 = la cellule au centre). */
  readonly x: number;
  readonly y: number;
}

/** Rayon de chaque bande, en part de la largeur de la lame. */
const BAND_RADIUS = [0.19, 0.3, 0.41] as const;
/** Écart minimal entre deux lieux, en part de la largeur de la lame. */
export const MIN_GAP = 0.16;

export function layoutPlaces(places: readonly Place[]): readonly PlacedPlace[] {
  const items = places.map((place) => ({
    place,
    angle: Math.atan2(place.y, place.x),
    radius: BAND_RADIUS[Math.min(place.band, BAND_RADIUS.length - 1)] ?? 0.41,
  }));
  const point = (item: { angle: number; radius: number }) => ({
    x: 0.5 + Math.cos(item.angle) * item.radius,
    y: 0.5 + Math.sin(item.angle) * item.radius,
  });

  // On écarte petit à petit, en tournant, les lieux qui se touchent.
  for (let pass = 0; pass < 80; pass++) {
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
        const push = delta >= 0 ? 0.06 : -0.06;
        a.angle -= push;
        b.angle += push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return items.map((item) => ({ place: item.place, ...point(item) }));
}

/**
 * Où en est le filament, de 0 (dans la cellule) à 1 (sur le lieu).
 * À l'aller il s'éloigne, au retour il revient ; rappelé, il revient en accéléré.
 */
export function filamentReach(
  trip: {
    readonly startedAt: number;
    readonly returnsAt: number;
    readonly cancelled: boolean;
  },
  fullDurationMs: number,
  cancelSpeedup: number,
  now: number,
): number {
  const half = fullDurationMs / 2;
  if (half <= 0) return 0;
  const remaining = Math.max(0, trip.returnsAt - now);
  const fromHome = trip.cancelled
    ? remaining * cancelSpeedup
    : Math.min(Math.max(0, now - trip.startedAt), remaining);
  return Math.max(0, Math.min(1, fromHome / half));
}
