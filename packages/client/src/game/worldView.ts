/**
 * Le cadrage de la carte de l'océan : où regarde le joueur et de combien il a reculé.
 * Ceci n'est que de l'affichage : aucune règle du jeu ne dépend de ces valeurs.
 */

export interface WorldCamera {
  /** Centre de la vue, en cases de l'océan. */
  readonly x: number;
  readonly y: number;
  /** Nombre de cases visibles d'un bord à l'autre de l'écran, dans son petit côté. */
  readonly span: number;
}

/** Limites du recul : au plus près, à l'ouverture, et l'océan entier. */
export const SPAN = { min: 12, start: 30, max: 264 } as const;
/** Au-delà de ce recul, organismes et gisements sont trop serrés pour être touchés du doigt. */
export const TOUCH_SPAN = 50;
/** L'océan tient dans ce rayon, en cases : on ne peut pas se perdre plus loin. */
const EDGE = 126;

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

/** Plus on recule, moins la vue peut s'écarter du centre : de très loin, l'océan est centré. */
function keepInside(camera: WorldCamera): WorldCamera {
  const limit = Math.max(0, EDGE - camera.span / 2);
  return { ...camera, x: clamp(camera.x, -limit, limit), y: clamp(camera.y, -limit, limit) };
}

/** Reculer (facteur > 1) ou s'approcher (facteur < 1). */
export function zoomCamera(camera: WorldCamera, factor: number): WorldCamera {
  return keepInside({ ...camera, span: clamp(camera.span * factor, SPAN.min, SPAN.max) });
}

/** Faire glisser la carte ; le déplacement est donné en part de la largeur de la lame. */
export function panCamera(camera: WorldCamera, dx: number, dy: number): WorldCamera {
  return keepInside({
    ...camera,
    x: camera.x - dx * camera.span,
    y: camera.y - dy * camera.span,
  });
}

/**
 * Position d'une case à l'écran, de 0 à 1 dans chaque sens (0,5 ; 0,5 = le centre de la vue).
 * `aspect` est la hauteur de l'écran divisée par sa largeur : une case reste carrée, et le
 * recul se compte toujours dans le petit côté.
 */
export function project(
  camera: WorldCamera,
  column: number,
  row: number,
  aspect = 1,
): { readonly x: number; readonly y: number } {
  const wide = aspect >= 1 ? camera.span : camera.span / aspect;
  const high = aspect >= 1 ? camera.span * aspect : camera.span;
  return {
    x: 0.5 + (column - camera.x) / wide,
    y: 0.5 + (row - camera.y) / high,
  };
}

/**
 * Le point d'un cercle de profondeur le plus proche du centre de la vue : c'est là que l'on
 * écrit sa profondeur, pour qu'elle reste lisible où que l'on regarde.
 */
export function labelSpot(
  camera: WorldCamera,
  radius: number,
  aspect = 1,
): { readonly x: number; readonly y: number } {
  const length = Math.hypot(camera.x, camera.y);
  const ux = length < 1 ? 0 : camera.x / length;
  const uy = length < 1 ? -1 : camera.y / length;
  return project(camera, ux * radius, uy * radius, aspect);
}
