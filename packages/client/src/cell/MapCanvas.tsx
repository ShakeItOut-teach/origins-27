import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import { makeDecor } from "./draw";
import { HOME_FORM, drawOrganism } from "./oceanLife";
import { PLATE } from "./plate";

export interface MapScene {
  readonly seed: number;
  /** Teinte de la créature du joueur. */
  readonly hue: number;
  /** Lieux et proies, en parts de la largeur de la lame. */
  readonly places: readonly {
    readonly x: number;
    readonly y: number;
    readonly tone: "sugar" | "bricks" | "prey";
    readonly resting: boolean;
  }[];
  /** Ce qui est en route : une expédition, un groupe de chasse, ou les deux. */
  readonly filaments: readonly {
    readonly x: number;
    readonly y: number;
    /** 0 = dans la cellule, 1 = sur la cible. */
    readonly reach: number;
    /** Il revient chargé. */
    readonly loaded: boolean;
    /** Un groupe de cellules filles plutôt qu'un simple filament. */
    readonly group: boolean;
  }[];
}

/**
 * La goutte vue de loin : la cellule au centre, les lieux autour, ce qui est en route.
 * Une planche noire gravée (docs/identite/charte.md) : chaque lieu est un médaillon au trait,
 * teinté d'un lavis ; rien ne brille.
 */
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
    const tones = { sugar: PLATE.gamboge, bricks: PLATE.madder, prey: PLATE.verdigris };
    const light = PLATE.bone;
    const decor = makeDecor(sceneRef.current.seed ^ 0x51ed);
    let disposed = false;
    let ready = false;
    // Chaque filament glisse en douceur entre deux mises à jour de l'état.
    let shown: number[] = [];

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
          // Une lame cachée ne se redessine pas ; créée cachée, elle n'a pas encore de taille.
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
          const t = (reducedMotion ? 0.12 : 1) * (performance.now() / 1000);
          graphics.clear();

          // Le cercle gradué de l'objectif, comme autour de la cellule.
          for (let index = 0; index < 120; index++) {
            const angle = (index / 120) * Math.PI * 2;
            const from = size * (index % 10 === 0 ? 0.468 : 0.48);
            graphics
              .moveTo(size / 2 + Math.cos(angle) * from, size / 2 + Math.sin(angle) * from)
              .lineTo(
                size / 2 + Math.cos(angle) * size * 0.492,
                size / 2 + Math.sin(angle) * size * 0.492,
              );
          }
          graphics.stroke({ color: light, alpha: 0.32, width: 1 });

          for (const mote of decor.motes) {
            const x = ((mote.x + t * mote.speed) % 1) * size;
            const y = (mote.y + Math.sin(t * 0.3 + mote.phase) * 0.01) * size;
            graphics.circle(x, y, mote.r * 0.8).fill({ color: light, alpha: 0.14 });
          }

          for (const place of current.places) {
            const color = tones[place.tone];
            const breath = 1 + Math.sin(t * 1.3 + place.x * 9) * 0.06;
            // Un médaillon : un lavis, un cercle au trait, des graduations, du pointillé.
            const strength = place.resting ? 0.35 : 1;
            const px = place.x * size;
            const py = place.y * size;
            const r = size * 0.074 * breath;
            // Le relief : le lieu porte son ombre, à l'opposé de la lumière.
            graphics
              .circle(px + r * 0.14, py + r * 0.18, r * 1.03)
              .fill({ color: 0x000000, alpha: 0.5 * strength });
            graphics
              .circle(px, py, r)
              .fill({ color, alpha: 0.2 * strength })
              .stroke({ color: light, alpha: 0.7 * strength, width: 1.2 });
            // Le reflet, du côté de la lumière.
            graphics
              .moveTo(px + Math.cos(-2.9) * r * 0.86, py + Math.sin(-2.9) * r * 0.86)
              .arc(px, py, r * 0.86, -2.9, -1.8)
              .stroke({ color: light, alpha: 0.5 * strength, width: 2.2, cap: "round" });
            for (let index = 0; index < 16; index++) {
              const angle = (index * Math.PI) / 8 + place.x * 7;
              graphics
                .moveTo(px + Math.cos(angle) * r * 1.07, py + Math.sin(angle) * r * 1.07)
                .lineTo(px + Math.cos(angle) * r * 1.2, py + Math.sin(angle) * r * 1.2);
            }
            graphics.stroke({ color: light, alpha: 0.42 * strength, width: 1 });
            for (let index = 0; index < 9; index++) {
              const angle = index * 2.4 + place.y * 11;
              const far = r * (0.72 + (index % 3) * 0.1);
              graphics
                .circle(px + Math.cos(angle) * far, py + Math.sin(angle) * far, 1)
                .fill({ color, alpha: 0.85 * strength });
            }
          }

          const centre = size / 2;
          shown = current.filaments.map((filament, index) => {
            const before = shown[index] ?? 0;
            return before + (filament.reach - before) * (reducedMotion ? 1 : 0.2);
          });
          current.filaments.forEach((filament, index) => {
            const reach = shown[index] ?? 0;
            const tipX = centre + (filament.x * size - centre) * reach;
            const tipY = centre + (filament.y * size - centre) * reach;
            const bend = Math.sin(t * 2 + index) * size * 0.015;
            graphics
              .moveTo(centre, centre)
              .quadraticCurveTo((centre + tipX) / 2 + bend, (centre + tipY) / 2 - bend, tipX, tipY)
              .stroke({
                color: light,
                alpha: filament.group ? 0.35 : 0.75,
                width: filament.group ? 1.2 : 1.6,
                cap: "round",
              });
            const tip = filament.loaded ? tones[filament.group ? "prey" : "sugar"] : light;
            if (filament.group) {
              // Un petit essaim : trois cellules filles qui tournent autour de la tête du groupe.
              for (let cell = 0; cell < 3; cell++) {
                const angle = t * 2.4 + (cell * Math.PI * 2) / 3;
                graphics
                  .circle(
                    tipX + Math.cos(angle) * size * 0.016,
                    tipY + Math.sin(angle) * size * 0.016,
                    size * 0.011,
                  )
                  .fill({ color: tip, alpha: 0.95 });
              }
            } else {
              graphics.circle(tipX, tipY, size * 0.014).fill({ color: tip, alpha: 0.95 });
            }
          });

          const pulse = 1 + Math.sin(t * 1.6) * 0.05;
          // La cellule du joueur, telle qu'on la voit de plus loin : un cilié.
          drawOrganism(
            graphics,
            { x: centre, y: centre },
            size * 0.058 * pulse,
            current.hue,
            1,
            t,
            HOME_FORM,
          );
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
