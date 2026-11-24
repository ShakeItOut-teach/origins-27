import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import { makeDecor } from "./draw";
import { HOME_FORM, drawOrganism } from "./oceanLife";

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

/** Lit une couleur des jetons de design et la donne à PixiJS. */
function token(name: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  return match?.[1] === undefined ? fallback : Number.parseInt(match[1], 16);
}

/** La goutte vue de loin : la cellule au centre, les lieux autour, ce qui est en route. */
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
    const tones = {
      sugar: token("--iodine", 0xd9a441),
      bricks: token("--eosin", 0xa8402c),
      prey: token("--algae", 0x3f7d5c),
    };
    const light = token("--on-dark", 0xe8eef7);
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

          for (const mote of decor.motes) {
            const x = ((mote.x + t * mote.speed) % 1) * size;
            const y = (mote.y + Math.sin(t * 0.3 + mote.phase) * 0.01) * size;
            graphics.circle(x, y, mote.r * 0.8).fill({ color: light, alpha: 0.14 });
          }

          for (const place of current.places) {
            const color = tones[place.tone];
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
