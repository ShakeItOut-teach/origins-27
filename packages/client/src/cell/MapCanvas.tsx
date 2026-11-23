import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import { hsl, makeDecor } from "./draw";

export interface MapScene {
  readonly seed: number;
  /** Teinte de la créature du joueur. */
  readonly hue: number;
  /** Lieux, en parts de la largeur de la lame. */
  readonly places: readonly {
    readonly x: number;
    readonly y: number;
    readonly bricks: boolean;
    readonly resting: boolean;
  }[];
  /** Le filament en cours : sa cible et où il en est (0 = cellule, 1 = lieu). */
  readonly filament: {
    readonly x: number;
    readonly y: number;
    readonly reach: number;
    readonly returning: boolean;
  } | null;
}

/** Lit une couleur des jetons de design et la donne à PixiJS. */
function token(name: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  return match?.[1] === undefined ? fallback : Number.parseInt(match[1], 16);
}

/** La goutte vue de loin : la cellule au centre, les lieux autour, le filament en route. */
export function MapCanvas({ scene }: { readonly scene: MapScene }) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => {
    const element = host.current;
    if (element === null) return;

    const app = new Application();
    const graphics = new Graphics();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sugar = token("--iodine", 0xd9a441);
    const bricks = token("--eosin", 0xa8402c);
    const light = token("--on-dark", 0xe8eef7);
    const decor = makeDecor(sceneRef.current.seed ^ 0x51ed);
    let disposed = false;
    let ready = false;
    // Le filament glisse en douceur entre deux mises à jour de l'état.
    let shownReach = 0;

    void app
      .init({
        resizeTo: element,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio, 2),
      })
      .then(() => {
        if (disposed) {
          app.destroy(true);
          return;
        }
        ready = true;
        element.appendChild(app.canvas);
        app.stage.addChild(graphics);
        app.ticker.add(() => {
          const current = sceneRef.current;
          const size = Math.min(app.screen.width, app.screen.height);
          const t = (reducedMotion ? 0.12 : 1) * (performance.now() / 1000);
          graphics.clear();

          for (const mote of decor.motes) {
            const x = ((mote.x + t * mote.speed) % 1) * size;
            const y = (mote.y + Math.sin(t * 0.3 + mote.phase) * 0.01) * size;
            graphics.circle(x, y, mote.r * 0.8).fill({ color: light, alpha: 0.14 });
          }

          for (const place of current.places) {
            const color = place.bricks ? bricks : sugar;
            const breath = 1 + Math.sin(t * 1.3 + place.x * 9) * 0.06;
            const alpha = place.resting ? 0.07 : 0.22;
            graphics.circle(place.x * size, place.y * size, size * 0.075 * breath).fill({
              color,
              alpha,
            });
            graphics.circle(place.x * size, place.y * size, size * 0.05).fill({
              color,
              alpha: alpha * 1.4,
            });
          }

          const centre = size / 2;
          const filament = current.filament;
          if (filament === null) {
            shownReach = 0;
          } else {
            shownReach += (filament.reach - shownReach) * (reducedMotion ? 1 : 0.2);
            const tipX = centre + (filament.x * size - centre) * shownReach;
            const tipY = centre + (filament.y * size - centre) * shownReach;
            const bend = Math.sin(t * 2) * size * 0.015;
            graphics
              .moveTo(centre, centre)
              .quadraticCurveTo((centre + tipX) / 2 + bend, (centre + tipY) / 2 - bend, tipX, tipY)
              .stroke({ color: light, alpha: 0.75, width: 2.5, cap: "round" });
            graphics.circle(tipX, tipY, size * 0.014).fill({
              color: filament.returning ? sugar : light,
              alpha: 0.95,
            });
          }

          const pulse = 1 + Math.sin(t * 1.6) * 0.05;
          const body = hsl(current.hue, 0.5, 0.42);
          graphics.circle(centre, centre, size * 0.06 * pulse).fill({ color: body, alpha: 0.95 });
          graphics
            .circle(centre, centre, size * 0.06 * pulse)
            .stroke({ color: hsl(current.hue, 0.6, 0.72), width: 2 });
          graphics.circle(centre, centre, size * 0.018).fill({ color: light, alpha: 0.6 });
        });
      });

    return () => {
      disposed = true;
      if (ready) app.destroy(true);
    };
  }, []);

  return <div ref={host} className="lens-canvas" aria-hidden="true" />;
}
