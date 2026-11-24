/**
 * Le cadrage de la grande carte : où regarde le joueur et de combien il a reculé.
 * Ceci n'est que de l'affichage : aucune règle du jeu ne dépend de ces valeurs.
 */

export interface WorldCamera {
  /** Centre de la vue, en cases de la goutte. */
  readonly x: number;
  readonly y: number;
  /** Nombre de cases visibles d'un bord à l'autre de la lame. */
  readonly span: number;
}

/** Limites du recul : au plus près, à l'ouverture, et la goutte entière. */
export const SPAN = { min: 4, start: 7.5, max: 27 } as const;
/** Au-delà de ce recul, les organismes sont trop serrés pour être touchés du doigt. */
export const TOUCH_SPAN = 9;
/** La goutte tient dans ce rayon, en cases : on ne peut pas se perdre plus loin. */
const EDGE = 13;

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

/** Reculer (facteur > 1) ou s'approcher (facteur < 1). */
export function zoomCamera(camera: WorldCamera, factor: number): WorldCamera {
  return { ...camera, span: clamp(camera.span * factor, SPAN.min, SPAN.max) };
}

/** Faire glisser la carte ; le déplacement est donné en part de la largeur de la lame. */
export function panCamera(camera: WorldCamera, dx: number, dy: number): WorldCamera {
  return {
    ...camera,
    x: clamp(camera.x - dx * camera.span, -EDGE, EDGE),
    y: clamp(camera.y - dy * camera.span, -EDGE, EDGE),
  };
}

/** Position d'une case sur la lame, de 0 à 1 (0,5 ; 0,5 = le centre de la vue). */
export function project(
  camera: WorldCamera,
  column: number,
  row: number,
): { readonly x: number; readonly y: number } {
  return {
    x: 0.5 + (column - camera.x) / camera.span,
    y: 0.5 + (row - camera.y) / camera.span,
  };
}

/**
 * Les organismes flottent : chacun est dessiné un peu à côté de sa case, toujours au même
 * endroit. Sans cela, la goutte ressemblerait à un damier.
 */
export function floating(
  column: number,
  row: number,
): { readonly column: number; readonly row: number } {
  const mixed =
    Math.imul((Math.imul(column, 0x9e3779b1) ^ Math.imul(row, 0x85ebca6b)) >>> 0, 0xc2b2ae35) >>> 0;
  return {
    column: column + ((mixed & 0xff) / 255 - 0.5) * 0.44,
    row: row + (((mixed >>> 8) & 0xff) / 255 - 0.5) * 0.44,
  };
}
