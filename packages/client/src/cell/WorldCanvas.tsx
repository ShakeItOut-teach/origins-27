import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import type { WorldCamera } from "../game/worldView";
import { project } from "../game/worldView";
import { hsl } from "./draw";

export interface WorldScene {
  readonly camera: WorldCamera;
  /** Tous les organismes de la goutte, sauf le joueur. */
  readonly dots: readonly {
    readonly column: number;
    readonly row: number;
    readonly hue: number;
    /** Hors de portée, à portée, ou à portée mais refermé pour l'instant. */
    readonly tone: "far" | "reach" | "closed";
  }[];
  readonly home: { readonly column: number; readonly row: number; readonly hue: number };
  /** Distance atteignable autour du joueur, en cases. */
  readonly reach: number;
  /** Le groupe d'attaque en route, s'il y en a un. */
  readonly trail: {
    readonly column: number;
    readonly row: number;
    /** 0 = dans la cellule, 1 = chez le rival. */
    readonly reach: number;
  } | null;
}

/** Lit une couleur des jetons de design et la donne à PixiJS. */
function token(name: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  return match?.[1] === undefined ? fallback : Number.parseInt(match[1], 16);
}

/** La goutte entière : tous les organismes, la zone à portée, la cellule du joueur. */
export function WorldCanvas({ scene }: { readonly scene: WorldScene }) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => {
    const element = host.current;
    if (element === null) return;

    const app = new Application();
    const graphics = new Graphics();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const light = token("--on-dark", 0xe8eef7);
    const warm = token("--iodine", 0xd9a441);
    let disposed = false;
    let ready = false;

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
          if (element.offsetParent === null) return;
          if (
            app.screen.width !== element.clientWidth ||
            app.screen.height !== element.clientHeight
          ) {
            app.resize();
          }
          const current = sceneRef.current;
          const size = Math.min(app.screen.width, app.screen.height);
          const cell = size / current.camera.span;
          const t = (reducedMotion ? 0.12 : 1) * (performance.now() / 1000);
          const at = (column: number, row: number) => {
            const point = project(current.camera, column, row);
            return { x: point.x * size, y: point.y * size };
          };
          graphics.clear();

          // La zone à portée : un carré doux autour de la cellule du joueur.
          const home = at(current.home.column, current.home.row);
          const side = (2 * current.reach + 1) * cell;
          graphics
            .roundRect(home.x - side / 2, home.y - side / 2, side, side, cell * 0.5)
            .fill({ color: light, alpha: 0.05 })
            .stroke({ color: light, alpha: 0.22, width: 1.5 });

          const radius = Math.max(1.6, Math.min(20, cell * 0.26));
          for (const dot of current.dots) {
            const point = at(dot.column, dot.row);
            if (point.x < -radius || point.y < -radius) continue;
            if (point.x > size + radius || point.y > size + radius) continue;
            const breath = 1 + Math.sin(t * 1.2 + dot.column * 3 + dot.row * 5) * 0.05;
            const alpha = dot.tone === "reach" ? 0.95 : dot.tone === "closed" ? 0.3 : 0.4;
            graphics
              .circle(point.x, point.y, radius * breath)
              .fill({ color: hsl(dot.hue, 0.5, dot.tone === "far" ? 0.35 : 0.48), alpha });
          }

          const trail = current.trail;
          if (trail !== null) {
            const target = at(trail.column, trail.row);
            const tipX = home.x + (target.x - home.x) * trail.reach;
            const tipY = home.y + (target.y - home.y) * trail.reach;
            graphics
              .moveTo(home.x, home.y)
              .lineTo(tipX, tipY)
              .stroke({ color: light, alpha: 0.45, width: 2, cap: "round" });
            for (let index = 0; index < 3; index++) {
              const angle = t * 2.4 + (index * Math.PI * 2) / 3;
              graphics
                .circle(
                  tipX + Math.cos(angle) * radius * 0.5,
                  tipY + Math.sin(angle) * radius * 0.5,
                  Math.max(1.5, radius * 0.28),
                )
                .fill({ color: warm, alpha: 0.95 });
            }
          }

          // La cellule du joueur : toujours visible, même de très loin.
          const mine = Math.max(5, radius * 1.15) * (1 + Math.sin(t * 1.6) * 0.06);
          graphics
            .circle(home.x, home.y, mine)
            .fill({ color: hsl(current.home.hue, 0.5, 0.42), alpha: 0.95 })
            .stroke({ color: light, width: 2 });
          graphics
            .circle(home.x, home.y, mine + 4 + Math.sin(t * 1.6) * 1.5)
            .stroke({ color: light, alpha: 0.35, width: 1 });
        });
      });

    return () => {
      disposed = true;
      if (ready) app.destroy(true);
    };
  }, []);

  return <div ref={host} className="lens-canvas" aria-hidden="true" />;
}
