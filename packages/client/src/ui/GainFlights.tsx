import { MICRO } from "@o27/core";
import { RESOURCE_IDS } from "@o27/data";
import type { ResourceId } from "@o27/data";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { grainCount, suddenGain } from "../game/gains";

interface Props {
  readonly resources: Readonly<Record<ResourceId, number>>;
  /** L'heure du jeu : elle dit combien la production a pu donner depuis la dernière image. */
  readonly now: number;
  /** Ce que la cellule gagne par milliseconde, pour chaque ressource. */
  readonly rateOf: (id: ResourceId) => number;
}

interface Grain {
  readonly key: string;
  readonly id: ResourceId;
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly delay: number;
}

/** Le plus petit gain qu'on fête : un vingtième d'unité, pour que le tout premier toucher compte. */
const SMALLEST = MICRO / 20;
/** Un toucher compte comme l'origine d'un gain s'il date de moins que cela. */
const TOUCH_MS = 1500;
const FLIGHT_MS = 1100;

/**
 * La vie de l'écran : quand une ressource monte d'un coup, des grains partent de l'endroit que
 * le joueur vient de toucher (ou du milieu de la cellule) et volent jusqu'au compteur, qui
 * sursaute. Le signe de chaque grain est celui du compteur : hexagone, brique, grain rond.
 * Avec « réduire les animations », rien ne vole : le compteur change, c'est tout.
 */
export function GainFlights({ resources, now, rateOf }: Props) {
  const [grains, setGrains] = useState<readonly Grain[]>([]);
  const before = useRef({ resources, now });
  const touch = useRef({ x: 0, y: 0, at: -TOUCH_MS });
  const serial = useRef(0);
  const rates = useRef(rateOf);
  rates.current = rateOf;

  useEffect(() => {
    const remember = (event: PointerEvent): void => {
      touch.current = { x: event.clientX, y: event.clientY, at: performance.now() };
    };
    window.addEventListener("pointerdown", remember, true);
    return () => {
      window.removeEventListener("pointerdown", remember, true);
    };
  }, []);

  useEffect(() => {
    const previous = before.current;
    before.current = { resources, now };
    const elapsed = now - previous.now;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const made: Grain[] = [];
    for (const id of RESOURCE_IDS) {
      const gain = suddenGain(
        previous.resources[id],
        resources[id],
        elapsed,
        rates.current(id),
        SMALLEST,
      );
      if (gain <= 0) continue;
      const counter = document.querySelector<HTMLElement>(`[data-testid="counter-${id}"]`);
      if (counter === null || counter.offsetParent === null) continue;
      // Le compteur sursaute : on relance son animation, même s'il sursautait déjà.
      counter.classList.remove("is-gaining");
      counter.getBoundingClientRect();
      counter.classList.add("is-gaining");
      if (still) continue;
      const target = counter.getBoundingClientRect();
      const lens = document.querySelector<HTMLElement>(".lens:not([hidden])");
      const box = lens?.getBoundingClientRect();
      const touched = performance.now() - touch.current.at < TOUCH_MS;
      const from = touched
        ? touch.current
        : box !== undefined
          ? { x: box.x + box.width / 2, y: box.y + box.height / 2 }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const count = grainCount(gain, MICRO);
      for (let index = 0; index < count; index++) {
        const x = from.x + (Math.random() - 0.5) * 36;
        const y = from.y + (Math.random() - 0.5) * 36;
        serial.current += 1;
        made.push({
          key: `${id}-${String(serial.current)}`,
          id,
          x,
          y,
          dx: target.x + 12 - x,
          dy: target.y + target.height * 0.3 - y,
          delay: index * 45,
        });
      }
    }
    if (made.length === 0) return;
    setGrains((list) => [...list, ...made]);
    window.setTimeout(() => {
      setGrains((list) => list.filter((grain) => !made.includes(grain)));
    }, FLIGHT_MS);
  }, [resources, now]);

  return (
    <div className="flights" aria-hidden="true">
      {grains.map((grain) => (
        <span
          key={grain.key}
          className={`flight flight-${grain.id}`}
          style={
            {
              left: grain.x,
              top: grain.y,
              animationDelay: `${String(grain.delay)}ms`,
              "--dx": `${String(grain.dx)}px`,
              "--dy": `${String(grain.dy)}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
