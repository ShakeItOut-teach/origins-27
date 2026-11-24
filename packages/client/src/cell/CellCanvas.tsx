import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import { drawScene, makeDecor } from "./draw";
import type { Ripple, Scene } from "./draw";

interface Props {
  readonly scene: Scene;
  readonly label: string;
  readonly onTap: () => void;
}

/** La lame de microscope : la cellule vivante, qui réagit au toucher. */
export function CellCanvas({ scene, label, onTap }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(scene);
  const tapRef = useRef(onTap);
  sceneRef.current = scene;
  tapRef.current = onTap;

  useEffect(() => {
    const element = host.current;
    if (element === null) return;

    const app = new Application();
    const graphics = new Graphics();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ripples: Ripple[] = [];
    let pulse = 0;
    let disposed = false;
    let ready = false;
    let decor = makeDecor(sceneRef.current.seed);
    let decorSeed = sceneRef.current.seed;

    const onPointer = (event: PointerEvent): void => {
      const box = element.getBoundingClientRect();
      ripples.push({
        x: event.clientX - box.left,
        y: event.clientY - box.top,
        born: performance.now(),
      });
      pulse = 1;
      tapRef.current();
    };
    element.addEventListener("pointerdown", onPointer);

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
          const now = performance.now();
          const current = sceneRef.current;
          if (current.seed !== decorSeed) {
            decor = makeDecor(current.seed);
            decorSeed = current.seed;
          }
          pulse *= 0.9;
          ripples = ripples.filter((ripple) => now - ripple.born < 600);
          const seconds = reducedMotion ? now / 8000 : now / 1000;
          drawScene(
            graphics,
            app.screen.width,
            app.screen.height,
            seconds,
            now,
            current,
            decor,
            ripples,
            reducedMotion ? 0 : pulse,
          );
        });
      });

    return () => {
      disposed = true;
      element.removeEventListener("pointerdown", onPointer);
      if (ready) app.destroy(true);
    };
  }, []);

  return (
    <div
      ref={host}
      className="lens-canvas"
      role="button"
      tabIndex={0}
      aria-label={label}
      data-testid="cell"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap();
        }
      }}
    />
  );
}
