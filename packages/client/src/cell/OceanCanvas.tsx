import type { PlaceKind } from "@o27/data";
import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import type { WorldCamera } from "../game/worldView";
import { project } from "../game/worldView";
import { hsl } from "./draw";

export interface OceanScene {
  readonly camera: WorldCamera;
  /** Les zones d'eau, de la plus profonde à la plus proche de la surface. */
  readonly zones: readonly {
    readonly outer: number;
    /** La zone est-elle ouverte aujourd'hui ? */
    readonly open: boolean;
    /** Est-ce la zone où vit le joueur ? */
    readonly mine: boolean;
  }[];
  readonly landRadius: number;
  readonly organisms: readonly {
    readonly x: number;
    readonly y: number;
    readonly hue: number;
    /** À portée, à portée mais refermé pour l'instant, ou plus haut que le joueur. */
    readonly tone: "reach" | "closed" | "above";
  }[];
  readonly deposits: readonly {
    readonly x: number;
    readonly y: number;
    readonly kind: PlaceKind;
    /** Ce qu'il reste, de 0 à 1. */
    readonly fill: number;
    readonly reachable: boolean;
  }[];
  readonly home: { readonly x: number; readonly y: number; readonly hue: number };
  /** Les cellules en route : vers un gisement ou vers un rival. */
  readonly trails: readonly {
    readonly x: number;
    readonly y: number;
    /** 0 = dans la cellule, 1 = sur la cible. */
    readonly reach: number;
  }[];
}

/** Lit une couleur des jetons de design et la donne à PixiJS. */
function token(name: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  return match?.[1] === undefined ? fallback : Number.parseInt(match[1], 16);
}

/**
 * La carte de l'océan, dessinée comme une carte de profondeurs : des cercles de niveau,
 * l'eau qui s'éclaircit vers le centre, la terre ferme au milieu.
 */
export function OceanCanvas({ scene }: { readonly scene: OceanScene }) {
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
    const red = token("--eosin", 0xa8402c);
    const dark = token("--lens-edge", 0x060a12);
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
          // Cachée, une lame ne dessine rien : PixiJS ne doit pas rejouer un ancien dessin.
          graphics.visible = element.offsetParent !== null;
          if (!graphics.visible) return;
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
          const at = (x: number, y: number) => {
            const point = project(current.camera, x, y);
            return { x: point.x * size, y: point.y * size };
          };
          const inView = (point: { x: number; y: number }, margin: number): boolean =>
            point.x > -margin &&
            point.y > -margin &&
            point.x < size + margin &&
            point.y < size + margin;
          graphics.clear();

          // L'eau : de plus en plus claire à mesure que l'on remonte vers le centre.
          const centre = at(0, 0);
          const count = current.zones.length;
          current.zones.forEach((zone, index) => {
            const rise = count <= 1 ? 0 : index / (count - 1);
            graphics
              .circle(centre.x, centre.y, zone.outer * cell)
              .fill({ color: hsl(228 - 42 * rise, 0.55, 0.1 + 0.2 * rise * rise) });
            // Une zone encore fermée reste dans l'ombre.
            if (!zone.open) {
              graphics
                .circle(centre.x, centre.y, zone.outer * cell)
                .fill({ color: dark, alpha: 0.45 });
            }
          });
          graphics
            .circle(centre.x, centre.y, current.landRadius * cell)
            .fill({ color: hsl(38, 0.3, 0.42) });

          // Les rayons de la carte, comme sur une carte marine.
          const edge = (current.zones[0]?.outer ?? 0) * cell;
          for (let index = 0; index < 12; index++) {
            const angle = (index * Math.PI) / 6;
            graphics
              .moveTo(
                centre.x + Math.cos(angle) * current.landRadius * cell,
                centre.y + Math.sin(angle) * current.landRadius * cell,
              )
              .lineTo(centre.x + Math.cos(angle) * edge, centre.y + Math.sin(angle) * edge)
              .stroke({ color: light, alpha: 0.05, width: 1 });
          }
          // Les lignes de niveau : fines entre deux frontières, nettes aux frontières.
          if (cell * 6 > 12) {
            for (let radius = current.landRadius + 6; radius * cell < edge; radius += 6) {
              graphics
                .circle(centre.x, centre.y, radius * cell)
                .stroke({ color: light, alpha: 0.05, width: 1 });
            }
          }
          current.zones.forEach((zone, index) => {
            graphics
              .circle(centre.x, centre.y, zone.outer * cell)
              .stroke({ color: light, alpha: index === 0 ? 0.5 : 0.28, width: 1.5 });
            // La frontière que le joueur devra franchir pour remonter.
            const inner = current.zones[index + 1]?.outer ?? current.landRadius;
            if (zone.mine) {
              graphics
                .circle(centre.x, centre.y, inner * cell)
                .stroke({ color: warm, alpha: 0.75, width: 2 });
            }
          });
          graphics
            .circle(centre.x, centre.y, current.landRadius * cell)
            .stroke({ color: light, alpha: 0.5, width: 1.5 });

          // Les gisements : un triangle pour une source, un semis pour la neige, un losange
          // pour une carcasse. Ils pâlissent en se vidant.
          const mark = Math.max(1.8, Math.min(13, cell * 0.75));
          for (const deposit of current.deposits) {
            const point = at(deposit.x, deposit.y);
            if (!inView(point, mark)) continue;
            const alpha = (0.35 + 0.65 * deposit.fill) * (deposit.reachable ? 1 : 0.4);
            if (mark < 4) {
              graphics
                .rect(point.x - mark / 2, point.y - mark / 2, mark, mark)
                .fill({ color: deposit.kind === "carcass" ? red : warm, alpha });
              continue;
            }
            if (deposit.kind === "sugarCluster") {
              graphics
                .poly([
                  point.x,
                  point.y - mark,
                  point.x + mark * 0.9,
                  point.y + mark * 0.7,
                  point.x - mark * 0.9,
                  point.y + mark * 0.7,
                ])
                .fill({ color: warm, alpha });
            } else if (deposit.kind === "debris") {
              for (let index = 0; index < 5; index++) {
                const angle = index * 2.4 + deposit.x;
                const spread = mark * (0.25 + 0.15 * index);
                graphics
                  .circle(
                    point.x + Math.cos(angle) * spread,
                    point.y + Math.sin(angle) * spread + Math.sin(t + index) * 1.2,
                    Math.max(1.2, mark * 0.2),
                  )
                  .fill({ color: light, alpha });
              }
            } else {
              graphics
                .poly([
                  point.x,
                  point.y - mark,
                  point.x + mark * 0.75,
                  point.y,
                  point.x,
                  point.y + mark,
                  point.x - mark * 0.75,
                  point.y,
                ])
                .fill({ color: red, alpha })
                .stroke({ color: light, alpha: alpha * 0.8, width: 1 });
            }
          }

          // Les organismes : une membrane, un noyau. De loin, un simple point.
          const radius = Math.max(1.4, Math.min(15, cell * 0.85));
          for (const organism of current.organisms) {
            const point = at(organism.x, organism.y);
            if (!inView(point, radius)) continue;
            const alpha = organism.tone === "reach" ? 0.95 : organism.tone === "closed" ? 0.5 : 0.3;
            if (radius < 4.5) {
              graphics
                .circle(point.x, point.y, radius)
                .fill({ color: hsl(organism.hue, 0.5, 0.5), alpha });
              continue;
            }
            const breath = 1 + Math.sin(t * 1.2 + organism.x * 3 + organism.y * 5) * 0.05;
            graphics
              .circle(point.x, point.y, radius * breath)
              .fill({ color: hsl(organism.hue, 0.45, 0.36), alpha })
              .stroke({ color: hsl(organism.hue, 0.55, 0.68), alpha, width: 1.5 });
            graphics
              .circle(point.x - radius * 0.15, point.y - radius * 0.1, radius * 0.34)
              .fill({ color: hsl(organism.hue, 0.4, 0.2), alpha });
          }

          const home = at(current.home.x, current.home.y);
          for (const trail of current.trails) {
            const target = at(trail.x, trail.y);
            const tipX = home.x + (target.x - home.x) * trail.reach;
            const tipY = home.y + (target.y - home.y) * trail.reach;
            graphics
              .moveTo(home.x, home.y)
              .lineTo(tipX, tipY)
              .stroke({ color: light, alpha: 0.5, width: 2, cap: "round" });
            for (let index = 0; index < 3; index++) {
              const angle = t * 2.4 + (index * Math.PI * 2) / 3;
              graphics
                .circle(
                  tipX + Math.cos(angle) * Math.max(3, radius * 0.5),
                  tipY + Math.sin(angle) * Math.max(3, radius * 0.5),
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
            .stroke({ color: light, alpha: 0.4, width: 1 });
        });
      });

    return () => {
      disposed = true;
      if (ready) app.destroy(true);
    };
  }, []);

  return <div ref={host} className="lens-canvas" aria-hidden="true" />;
}
