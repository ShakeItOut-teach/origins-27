/** Dessin de la lame de microscope : le plancton, la cellule, ses organites, ses mutations. */
import { createRng } from "@o27/core";
import type { Creature } from "@o27/core";
import type { OrganelleId } from "@o27/data";
import type { Graphics } from "pixi.js";

export interface Scene {
  readonly seed: number;
  readonly creature: Creature;
  readonly organelles: Readonly<Record<OrganelleId, number>>;
  readonly building: OrganelleId | null;
}

export interface Ripple {
  readonly x: number;
  readonly y: number;
  readonly born: number;
}

interface Mote {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly speed: number;
  readonly phase: number;
}

interface Spot {
  readonly angle: number;
  readonly distance: number;
  readonly r: number;
}

export interface Decor {
  readonly motes: readonly Mote[];
  readonly spots: readonly Spot[];
}

/** Décor propre à chaque joueur : mêmes taches et même plancton à chaque visite. */
export function makeDecor(seed: number): Decor {
  const rng = createRng(seed ^ 0x9e3779b9);
  const motes = Array.from({ length: 46 }, () => ({
    x: rng.next(),
    y: rng.next(),
    r: 0.6 + rng.next() * 2.2,
    speed: 0.004 + rng.next() * 0.012,
    phase: rng.next() * Math.PI * 2,
  }));
  const spots = Array.from({ length: 14 }, () => ({
    angle: rng.next() * Math.PI * 2,
    distance: 0.25 + rng.next() * 0.5,
    r: 0.035 + rng.next() * 0.045,
  }));
  return { motes, spots };
}

/** Couleur HSL (teinte en degrés, saturation et lumière de 0 à 1) vers un entier RGB. */
export function hsl(h: number, s: number, l: number): number {
  const hue = (((h % 360) + 360) % 360) / 60;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const m = l - chroma / 2;
  const [r, g, b] =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const channel = (value: number): number => Math.round((value + m) * 255);
  return (channel(r) << 16) | (channel(g) << 8) | channel(b);
}

/** Où chaque organite se loge dans la cellule (angle en radians). */
export const ORGANELLE_ANGLE: Readonly<Record<OrganelleId, number>> = {
  mitochondrion: (-145 * Math.PI) / 180,
  vacuole: (-35 * Math.PI) / 180,
  cilia: (145 * Math.PI) / 180,
  ribosome: (35 * Math.PI) / 180,
  nursery: (90 * Math.PI) / 180,
  wall: (-90 * Math.PI) / 180,
};

const MEMBRANE_POINTS = 72;

function membraneRadius(base: number, angle: number, t: number, pulse: number): number {
  return (
    base *
    (1 +
      0.04 * Math.sin(3 * angle + t * 0.9) +
      0.025 * Math.sin(5 * angle - t * 1.3) +
      0.012 * Math.sin(9 * angle + t * 2.1) +
      pulse * 0.07 * Math.sin(2 * angle + t * 9))
  );
}

export function drawScene(
  g: Graphics,
  width: number,
  height: number,
  seconds: number,
  nowMs: number,
  scene: Scene,
  decor: Decor,
  ripples: readonly Ripple[],
  pulse: number,
): void {
  const { creature } = scene;
  const t = seconds;
  const cx = width / 2;
  const cy = height / 2;
  const unit = Math.min(width, height);
  const hue = creature.hue;
  const traits = new Set(creature.traits);
  g.clear();

  // Plancton en suspension, derrière la cellule.
  for (const mote of decor.motes) {
    const x = ((mote.x + t * mote.speed) % 1) * width;
    const y = (mote.y + 0.015 * Math.sin(t * 0.4 + mote.phase)) * height;
    const alpha = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.7 + mote.phase));
    g.circle(x, y, mote.r).fill({ color: hsl(hue + 150, 0.35, 0.8), alpha });
  }

  const breathing = 1 + 0.03 * Math.sin(t * 1.2) - pulse * 0.05;
  const base = unit * (0.2 + Math.min(creature.size, 12) * 0.004) * breathing;

  if (traits.has("glow")) {
    const glow = 0.5 + 0.5 * Math.sin(t * 1.6);
    g.circle(cx, cy, base * 1.75).fill({ color: hsl(hue, 0.8, 0.6), alpha: 0.05 + 0.03 * glow });
    g.circle(cx, cy, base * 1.35).fill({ color: hsl(hue, 0.8, 0.65), alpha: 0.08 + 0.05 * glow });
  }

  const outline: number[] = [];
  const inner: number[] = [];
  for (let i = 0; i < MEMBRANE_POINTS; i++) {
    const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
    const r = membraneRadius(base, angle, t, pulse);
    outline.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    inner.push(cx + Math.cos(angle) * r * 0.86, cy + Math.sin(angle) * r * 0.86);
  }

  // Cils : courts quand l'organite est construit, longs avec la mutation.
  const ciliaLength =
    (scene.organelles.cilia > 0 ? 0.1 + 0.02 * scene.organelles.cilia : 0) +
    (traits.has("longCilia") ? 0.22 : 0);
  if (ciliaLength > 0) {
    for (let i = 0; i < MEMBRANE_POINTS; i += 2) {
      const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
      const r = membraneRadius(base, angle, t, pulse);
      const sway = 0.35 * Math.sin(t * 3 + i * 0.7);
      const tip = r + base * ciliaLength;
      g.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
        .lineTo(cx + Math.cos(angle + sway * 0.12) * tip, cy + Math.sin(angle + sway * 0.12) * tip)
        .stroke({ width: 1.5, color: hsl(hue, 0.6, 0.78), alpha: 0.7 });
    }
  }

  if (traits.has("buds")) {
    for (let i = 0; i < 3; i++) {
      const angle = 0.6 + i * 2.1 + 0.1 * Math.sin(t * 0.8 + i);
      const r = membraneRadius(base, angle, t, pulse) * 1.04;
      g.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, base * 0.16)
        .fill({ color: hsl(hue, 0.55, 0.45), alpha: 0.5 })
        .stroke({ width: 2, color: hsl(hue, 0.7, 0.72), alpha: 0.9 });
    }
  }

  // Corps de la cellule.
  g.poly(outline, true)
    .fill({ color: hsl(hue, 0.55, 0.42), alpha: 0.4 })
    .stroke({
      width: traits.has("thickWall") ? 7 : 3,
      color: hsl(hue, 0.7, 0.72),
      alpha: 0.95,
    });
  g.poly(inner, true).fill({ color: hsl(hue, 0.6, 0.6), alpha: 0.16 });
  if (traits.has("thickWall")) {
    g.poly(inner, true).stroke({ width: 1.5, color: hsl(hue, 0.6, 0.85), alpha: 0.6 });
  }

  // Taches de pigment : propres à chaque joueur, plus nombreuses avec la mutation.
  const spotCount = creature.pigmentSpots + (traits.has("spots") ? 7 : 0);
  decor.spots.slice(0, spotCount).forEach((spot, index) => {
    const drift = 0.02 * Math.sin(t * 0.6 + index);
    const x = cx + Math.cos(spot.angle + drift) * base * spot.distance;
    const y = cy + Math.sin(spot.angle + drift) * base * spot.distance;
    const mutated = traits.has("spots") && index >= creature.pigmentSpots;
    g.circle(x, y, base * spot.r).fill({
      color: mutated ? hsl(41, 0.7, 0.58) : hsl(hue + 40, 0.6, 0.62),
      alpha: 0.55,
    });
  });

  if (traits.has("pouch")) {
    g.ellipse(cx - base * 0.05, cy + base * 0.42, base * 0.36, base * 0.2)
      .fill({ color: hsl(hue - 40, 0.5, 0.7), alpha: 0.28 })
      .stroke({ width: 1.5, color: hsl(hue - 40, 0.6, 0.82), alpha: 0.7 });
  }

  // Organites.
  const place = (id: OrganelleId): { x: number; y: number } => ({
    x: cx + Math.cos(ORGANELLE_ANGLE[id]) * base * 0.56 + base * 0.02 * Math.sin(t * 0.9),
    y: cy + Math.sin(ORGANELLE_ANGLE[id]) * base * 0.5 + base * 0.02 * Math.cos(t * 1.1),
  });
  const growing = (id: OrganelleId): number =>
    scene.building === id ? 0.75 + 0.25 * Math.sin(t * 5) : 1;

  if (scene.organelles.mitochondrion > 0 || scene.building === "mitochondrion") {
    const { x, y } = place("mitochondrion");
    const k = growing("mitochondrion");
    g.ellipse(x, y, base * 0.2 * k, base * 0.11 * k)
      .fill({ color: hsl(22, 0.75, 0.56), alpha: 0.85 })
      .stroke({ width: 1.5, color: hsl(30, 0.9, 0.78), alpha: 0.9 });
    g.moveTo(x - base * 0.12 * k, y)
      .lineTo(x - base * 0.04 * k, y - base * 0.05 * k)
      .lineTo(x + base * 0.04 * k, y + base * 0.05 * k)
      .lineTo(x + base * 0.12 * k, y)
      .stroke({ width: 1.5, color: hsl(30, 0.9, 0.82), alpha: 0.8 });
  }
  if (scene.organelles.vacuole > 0 || scene.building === "vacuole") {
    const { x, y } = place("vacuole");
    const k = growing("vacuole");
    g.circle(x, y, base * 0.17 * k)
      .fill({ color: hsl(205, 0.7, 0.72), alpha: 0.35 })
      .stroke({ width: 1.5, color: hsl(205, 0.8, 0.85), alpha: 0.85 });
    g.circle(x - base * 0.05, y - base * 0.05, base * 0.035).fill({
      color: hsl(205, 0.5, 0.95),
      alpha: 0.7,
    });
  }
  if (scene.organelles.ribosome > 0 || scene.building === "ribosome") {
    const { x, y } = place("ribosome");
    const k = growing("ribosome");
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + t * 0.3;
      const d = i === 0 ? 0 : base * 0.1 * k;
      g.circle(x + Math.cos(angle) * d, y + Math.sin(angle) * d, base * 0.035 * k).fill({
        color: hsl(140, 0.5, 0.65),
        alpha: 0.9,
      });
    }
  }

  // Noyau.
  const nx = cx + base * 0.04 * Math.sin(t * 0.5);
  const ny = cy + base * 0.04 * Math.cos(t * 0.4);
  g.circle(nx, ny, base * 0.24)
    .fill({ color: hsl(hue - 20, 0.5, 0.24), alpha: 0.8 })
    .stroke({ width: 2, color: hsl(hue - 20, 0.6, 0.6), alpha: 0.8 });
  g.circle(nx + base * 0.06, ny - base * 0.05, base * 0.07).fill({
    color: hsl(hue - 20, 0.6, 0.7),
    alpha: 0.6,
  });

  // Ondes de toucher.
  for (const ripple of ripples) {
    const age = (nowMs - ripple.born) / 600;
    if (age < 0 || age > 1) continue;
    g.circle(ripple.x, ripple.y, 10 + age * unit * 0.16).stroke({
      width: 2,
      color: hsl(41, 0.8, 0.7),
      alpha: 0.7 * (1 - age),
    });
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (i - 1) * 0.5;
      const distance = age * unit * 0.14;
      g.circle(
        ripple.x + Math.cos(angle) * distance,
        ripple.y + Math.sin(angle) * distance,
        3.5 * (1 - age) + 1,
      ).fill({ color: hsl(41, 0.85, 0.72), alpha: 1 - age });
    }
  }
}
