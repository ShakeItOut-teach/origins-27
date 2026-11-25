import type { PlaceKind, ZoneEventKind } from "@o27/data";
import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import type { WorldCamera } from "../game/worldView";
import { project } from "../game/worldView";
import {
  HOME_FORM,
  drawCarcass,
  drawEventZone,
  drawLeviathan,
  drawMarineSnow,
  drawOrganism,
  drawPredator,
  drawVent,
} from "./oceanLife";
import { PLATE, blend } from "./plate";

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
  readonly predators: readonly {
    readonly x: number;
    readonly y: number;
    /** 0 = le plus faible. */
    readonly level: number;
    readonly reachable: boolean;
    /** Déjà vaincu par le joueur. */
    readonly gone: boolean;
  }[];
  /** Les événements de zone en cours. */
  readonly events: readonly {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly kind: ZoneEventKind;
    readonly reachable: boolean;
    /** Un Léviathan que le joueur a déjà vaincu. */
    readonly beaten: boolean;
  }[];
  readonly home: { readonly x: number; readonly y: number; readonly hue: number };
  /** Les cellules en route : vers un gisement, un prédateur ou un rival. */
  readonly trails: readonly {
    readonly x: number;
    readonly y: number;
    /** 0 = dans la cellule, 1 = sur la cible. */
    readonly reach: number;
  }[];
}

/**
 * La teinte de l'eau : le noir de la planche au large, de plus en plus lavé de bleu de Prusse
 * vers le rivage. La profondeur vaut 0 au bord de la carte et 1 à la côte. Des paliers, comme
 * les teintes de profondeur d'une carte marine : jamais un dégradé lisse.
 */
function water(depth: number): number {
  return blend(PLATE.ground, PLATE.prussian, 0.02 + depth * 0.24);
}

/** Un nombre entre 0 et 1, toujours le même pour une case donnée. */
function grain(x: number, y: number): number {
  const mixed = Math.imul(Math.imul(x | 0, 0x9e3779b1) ^ Math.imul(y | 0, 0x85ebca6b), 0xc2b2ae35);
  return ((mixed >>> 8) & 0xffff) / 0xffff;
}

/**
 * La carte de l'océan, dessinée comme une planche d'océanographie gravée (charte « Atlas ») :
 * l'eau noire qui s'éclaircit par paliers vers le rivage, des lignes de niveau au trait, la vie
 * comme on la voit au microscope à fond noir, et la terre ferme en papier, au milieu.
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
    const light = PLATE.bone;
    const warm = PLATE.gamboge;
    const dark = PLATE.ground;
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
          app.destroy({ removeView: true });
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
          const wide = app.screen.width;
          const high = app.screen.height;
          const size = Math.min(wide, high);
          const cell = size / current.camera.span;
          const t = (reducedMotion ? 0.12 : 1) * (performance.now() / 1000);
          const at = (x: number, y: number) => {
            const point = project(current.camera, x, y, high / wide);
            return { x: point.x * wide, y: point.y * high };
          };
          const inView = (point: { x: number; y: number }, margin: number): boolean =>
            point.x > -margin &&
            point.y > -margin &&
            point.x < wide + margin &&
            point.y < high + margin;
          graphics.clear();

          // L'eau : des paliers, du noir des abysses au bleu de Prusse du rivage.
          const centre = at(0, 0);
          const land = current.landRadius;
          const STEPS = 5;
          current.zones.forEach((zone, index) => {
            const inner = current.zones[index + 1]?.outer ?? land;
            for (let step = 0; step < STEPS; step++) {
              const part = step / STEPS;
              graphics
                .circle(centre.x, centre.y, (zone.outer - (zone.outer - inner) * part) * cell)
                .fill({ color: water((index + part) / current.zones.length) });
            }
            // Une zone encore fermée reste dans l'ombre.
            if (!zone.open) {
              graphics
                .circle(centre.x, centre.y, zone.outer * cell)
                .fill({ color: dark, alpha: 0.5 });
            }
          });

          // La terre ferme : une côte irrégulière et ses courbes de niveau.
          const coast = (scale: number): number[] => {
            const points: number[] = [];
            for (let index = 0; index < 72; index++) {
              const angle = (index / 72) * Math.PI * 2;
              const bump = 1 + (grain(index, 7) - 0.5) * 0.14 + Math.sin(angle * 3 + 1) * 0.04;
              points.push(
                centre.x + Math.cos(angle) * land * cell * scale * bump,
                centre.y + Math.sin(angle) * land * cell * scale * bump,
              );
            }
            return points;
          };
          // Les hachures du rivage : de petits traits qui partent de la côte vers le large.
          const shore = coast(0.99);
          const offshore = coast(1.1);
          for (let index = 0; index < shore.length; index += 2) {
            graphics
              .moveTo(shore[index] ?? 0, shore[index + 1] ?? 0)
              .lineTo(offshore[index] ?? 0, offshore[index + 1] ?? 0);
          }
          graphics.stroke({ color: light, alpha: 0.5, width: 1 });
          // La terre : du papier, cerné d'encre, avec ses courbes de niveau.
          graphics
            .poly(coast(0.97))
            .fill({ color: PLATE.paper })
            .stroke({ color: PLATE.ink, width: 1.6 });
          for (const scale of [0.74, 0.5, 0.27]) {
            graphics.poly(coast(scale)).stroke({ color: PLATE.ink, alpha: 0.45, width: 1 });
          }

          // Les lignes de la carte : rayons, courbes de niveau, frontières des zones.
          const edge = (current.zones[0]?.outer ?? 0) * cell;
          for (let index = 0; index < 24; index++) {
            const angle = (index * Math.PI) / 12;
            const from = (index % 2 === 0 ? land : land * 2.4) * cell;
            graphics
              .moveTo(centre.x + Math.cos(angle) * from, centre.y + Math.sin(angle) * from)
              .lineTo(centre.x + Math.cos(angle) * edge, centre.y + Math.sin(angle) * edge)
              .stroke({ color: light, alpha: 0.045, width: 1 });
          }
          if (cell * 4 > 9) {
            for (let radius = land + 4; radius * cell < edge; radius += 4) {
              graphics
                .circle(centre.x, centre.y, radius * cell)
                .stroke({ color: light, alpha: 0.04, width: 1 });
            }
          }
          current.zones.forEach((zone, index) => {
            graphics
              .circle(centre.x, centre.y, zone.outer * cell)
              .stroke({ color: light, alpha: index === 0 ? 0.45 : 0.24, width: 1.2 });
            // La frontière que le joueur devra franchir pour remonter.
            const inner = current.zones[index + 1]?.outer ?? land;
            if (zone.mine) {
              graphics
                .circle(centre.x, centre.y, inner * cell)
                .stroke({ color: warm, alpha: 0.7, width: 1.6 });
            }
          });

          // La neige marine : de fines particules qui descendent sans fin.
          for (let index = 0; index < 70; index++) {
            const fall = (grain(index, 3) * high + t * (4 + (index % 5) * 2.5)) % high;
            const drift = (grain(index, 11) * wide + Math.sin(t * 0.4 + index) * 6 + wide) % wide;
            graphics
              .circle(drift, fall, 0.6 + (index % 3) * 0.35)
              .fill({ color: light, alpha: 0.1 + (index % 4) * 0.03 });
          }

          // Les événements de zone : leur étendue d'abord, sous tout le reste.
          for (const event of current.events) {
            const point = at(event.x, event.y);
            const reach = event.radius * cell;
            if (!inView(point, reach)) continue;
            drawEventZone(
              graphics,
              point,
              reach,
              event.kind,
              event.reachable ? 1 : 0.55,
              t,
              grain(event.x, event.y),
            );
          }

          // Les gisements.
          const mark = Math.max(2, Math.min(15, cell * 0.85));
          for (const deposit of current.deposits) {
            const point = at(deposit.x, deposit.y);
            if (!inView(point, mark * 2)) continue;
            const alpha = (0.4 + 0.6 * deposit.fill) * (deposit.reachable ? 1 : 0.4);
            const seed = grain(deposit.x, deposit.y);
            if (deposit.kind === "sugarCluster") drawVent(graphics, point, mark, alpha, t, seed);
            else if (deposit.kind === "debris") {
              drawMarineSnow(graphics, point, mark, alpha, t, seed);
            } else drawCarcass(graphics, point, mark, alpha, seed);
          }

          // Les prédateurs.
          const beast = Math.max(2.4, Math.min(20, cell * 1.15));
          for (const predator of current.predators) {
            const point = at(predator.x, predator.y);
            if (!inView(point, beast * 2)) continue;
            const alpha = predator.gone ? 0.18 : predator.reachable ? 0.95 : 0.4;
            drawPredator(
              graphics,
              point,
              beast,
              predator.level,
              alpha,
              t,
              grain(predator.x, predator.y),
            );
          }

          // Le cœur des événements : la cheminée d'une éruption, le Léviathan.
          for (const event of current.events) {
            const point = at(event.x, event.y);
            if (!inView(point, beast * 4)) continue;
            const seed = grain(event.x, event.y);
            if (event.kind === "eruption") {
              drawVent(graphics, point, Math.max(3, mark * 1.7), 1, t, seed);
            } else if (event.kind === "leviathan") {
              drawLeviathan(
                graphics,
                point,
                Math.max(3.2, Math.min(34, cell * 2.1)),
                event.beaten ? 0.2 : event.reachable ? 1 : 0.5,
                t,
                seed,
              );
            }
          }

          // Les organismes : chacun sa forme, comme sous l'objectif.
          const radius = Math.max(1.4, Math.min(16, cell * 0.9));
          for (const organism of current.organisms) {
            const point = at(organism.x, organism.y);
            if (!inView(point, radius * 2)) continue;
            const alpha = organism.tone === "reach" ? 1 : organism.tone === "closed" ? 0.5 : 0.32;
            drawOrganism(
              graphics,
              point,
              radius,
              organism.hue,
              alpha,
              t,
              grain(organism.x, organism.y),
            );
          }

          const home = at(current.home.x, current.home.y);
          for (const trail of current.trails) {
            const target = at(trail.x, trail.y);
            const tipX = home.x + (target.x - home.x) * trail.reach;
            const tipY = home.y + (target.y - home.y) * trail.reach;
            graphics
              .moveTo(home.x, home.y)
              .lineTo(tipX, tipY)
              .stroke({ color: light, alpha: 0.4, width: 1.4, cap: "round" });
            for (let index = 0; index < 3; index++) {
              const angle = t * 2.4 + (index * Math.PI * 2) / 3;
              graphics
                .circle(
                  tipX + Math.cos(angle) * Math.max(3, radius * 0.5),
                  tipY + Math.sin(angle) * Math.max(3, radius * 0.5),
                  Math.max(1.4, radius * 0.22),
                )
                .fill({ color: warm, alpha: 0.95 });
            }
          }

          // La cellule du joueur : un repère de planche autour d'elle, toujours visible.
          const mine = Math.max(5, radius * 1.2);
          drawOrganism(graphics, home, mine, current.home.hue, 1, t, HOME_FORM);
          const ring = mine * 1.7 + 3 + Math.sin(t * 1.6) * 1.2;
          graphics.circle(home.x, home.y, ring).stroke({ color: light, alpha: 0.75, width: 1.2 });
          for (let index = 0; index < 4; index++) {
            const angle = (index * Math.PI) / 2;
            graphics
              .moveTo(home.x + Math.cos(angle) * ring, home.y + Math.sin(angle) * ring)
              .lineTo(home.x + Math.cos(angle) * (ring + 6), home.y + Math.sin(angle) * (ring + 6))
              .stroke({ color: light, alpha: 0.75, width: 1.2 });
          }
        });
      });

    return () => {
      disposed = true;
      // On ne détruit que le canevas. `destroy(true)` vidait aussi les réserves que PixiJS
      // partage entre toutes les lames, et la lame voisine plantait en redessinant.
      if (ready) app.destroy({ removeView: true });
    };
  }, []);

  return <div ref={host} className="lens-canvas" aria-hidden="true" />;
}
