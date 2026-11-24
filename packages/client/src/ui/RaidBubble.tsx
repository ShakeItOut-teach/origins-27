import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { ResourceIcon } from "./icons";

/**
 * Pendant un combat chez un rival, une bulle de protéines s'échappe du combat et file vers le
 * bord de l'écran. L'attraper aide les cellules. Ce n'est que de l'affichage : la règle (ce
 * que vaut le toucher) reste dans le moteur.
 */

/** Départ de chaque bulle après le début du combat, et sa durée de vie, en millisecondes. */
export const BUBBLE_SHOWS = [
  { start: 900, life: 1800 },
  { start: 4300, life: 1800 },
] as const;

/** La bulle visible à cet instant du combat, ou rien. */
export function bubbleAt(elapsedMs: number): { index: number; age: number } | null {
  for (const [index, show] of BUBBLE_SHOWS.entries()) {
    const age = elapsedMs - show.start;
    if (age >= 0 && age < show.life) return { index, age };
  }
  return null;
}

/** Direction de fuite d'une bulle, en degrés : toujours la même pour un combat donné. */
export function bubbleAngle(fightStart: number, index: number): number {
  const mixed = Math.imul((fightStart ^ (index * 0x9e3779b1)) >>> 0, 0x85ebca6b) >>> 0;
  return mixed % 360;
}

interface Props {
  /** Instant du début du combat : il fixe la trajectoire. */
  readonly fightStart: number;
  /** Temps écoulé depuis le début du combat quand ce composant s'affiche. */
  readonly elapsedMs: number;
  readonly label: string;
  readonly onCatch: () => void;
}

export function RaidBubble({ fightStart, elapsedMs, label, onCatch }: Props) {
  // Le composant tient sa propre horloge fine : l'état du jeu n'avance pas assez souvent.
  const [origin] = useState(() => performance.now() - elapsedMs);
  const [elapsed, setElapsed] = useState(elapsedMs);
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(performance.now() - origin);
    }, 50);
    return () => {
      clearInterval(timer);
    };
  }, [origin]);

  const shown = bubbleAt(elapsed);
  if (shown === null) return null;
  return (
    <Bubble
      key={shown.index}
      angle={bubbleAngle(fightStart, shown.index)}
      age={shown.age}
      life={BUBBLE_SHOWS[shown.index]?.life ?? 0}
      label={label}
      onCatch={onCatch}
    />
  );
}

interface BubbleProps {
  readonly angle: number;
  readonly age: number;
  readonly life: number;
  readonly label: string;
  readonly onCatch: () => void;
}

function Bubble({ angle, age, life, label, onCatch }: BubbleProps) {
  // L'âge à l'apparition est figé : l'animation reprend là où la bulle en est vraiment.
  const [startAge] = useState(age);
  const radians = (angle * Math.PI) / 180;
  const style = {
    "--bubble-x": `${(Math.cos(radians) * 62).toFixed(1)}vw`,
    "--bubble-y": `${(Math.sin(radians) * 62).toFixed(1)}vh`,
    animationDuration: `${String(life)}ms`,
    animationDelay: `${String(-Math.round(startAge))}ms`,
  } as CSSProperties;
  return (
    <button
      type="button"
      className="bubble"
      style={style}
      aria-label={label}
      data-testid="raid-bubble"
      onPointerDown={onCatch}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onCatch();
      }}
    >
      <ResourceIcon id="proteins" />
    </button>
  );
}
