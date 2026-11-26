/**
 * Dessin de la lame de microscope : la cellule, ses organites, ses mutations.
 * Le dessin suit ce que montre un vrai microscope à fond noir : une membrane en double
 * feuillet, un cytoplasme granuleux, un noyau avec son enveloppe et ses pores, des
 * mitochondries à crêtes, un réticulum en feuillets.
 *
 * Le style est celui de la charte « Atlas » (docs/identite/charte.md) : une gravure en clair
 * sur une planche noire. Le trait est couleur d'os ; la matière se dit en pointillé ; la
 * couleur n'est qu'un lavis léger, une teinte par organite.
 */
import { createRng } from "@o27/core";
import type { Creature } from "@o27/core";
import type { OrganelleId } from "@o27/data";
import type { Graphics } from "pixi.js";
import { PLATE } from "./plate";

export interface Scene {
  readonly seed: number;
  readonly creature: Creature;
  readonly organelles: Readonly<Record<OrganelleId, number>>;
  readonly building: OrganelleId | null;
  /** Le compagnon du joueur, s'il en a un : son espèce, son âge, sa teinte. */
  readonly companion: {
    readonly species: number;
    readonly stage: number;
    readonly hue: number;
  } | null;
  /** Le Noyau est-il en train d'exprimer une évolution ? */
  readonly researching: boolean;
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
  /** Les grains du cytoplasme. */
  readonly grains: readonly Spot[];
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
  // Le pointillé du cytoplasme : serré vers le bord, c'est l'ombre des gravures.
  const grains = Array.from({ length: 240 }, () => ({
    angle: rng.next() * Math.PI * 2,
    distance: Math.pow(rng.next(), 0.38) * 0.9,
    r: 0.004 + rng.next() * 0.007,
  }));
  return { motes, spots, grains };
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
  golgi: (2 * Math.PI) / 180,
  // Le noyau est au centre : cet angle ne sert pas.
  nucleus: 0,
  lysosome: (168 * Math.PI) / 180,
  receptor: (118 * Math.PI) / 180,
};

const MEMBRANE_POINTS = 96;

/**
 * Le relief (gardé par le propriétaire le 26/11/2026). La lumière vient d'en haut à gauche : chaque corps porte une
 * ombre vers le bas à droite, un reflet du côté de la lumière, et des hachures du côté de
 * l'ombre. On reste dans la gravure : l'ombre se dit par un noir posé dessous et par des traits.
 */
const LIGHT = (-135 * Math.PI) / 180;
const SHADOW = { x: 0.07, y: 0.09 };

/** L'ombre portée d'un corps rond : le même rond, noir, décalé à l'opposé de la lumière. */
function castShadow(g: Graphics, x: number, y: number, r: number, strength = 0.5): void {
  g.circle(x + r * SHADOW.x * 2.2, y + r * SHADOW.y * 2.2, r * 1.03).fill({
    color: 0x000000,
    alpha: strength,
  });
}

/** Le volume d'un corps rond : un reflet du côté de la lumière, des hachures du côté de l'ombre. */
function roundVolume(g: Graphics, x: number, y: number, r: number, alpha = 1): void {
  for (let line = 0; line < 7; line++) {
    const angle = LIGHT + Math.PI - 0.75 + line * 0.25;
    const deep = 0.3 * Math.cos((line - 3) * 0.3);
    g.moveTo(x + Math.cos(angle) * r * 0.94, y + Math.sin(angle) * r * 0.94).lineTo(
      x + Math.cos(angle) * r * (0.94 - deep),
      y + Math.sin(angle) * r * (0.94 - deep),
    );
  }
  g.stroke({ width: 0.9, color: BONE, alpha: alpha * 0.45 });
  g.moveTo(x + Math.cos(LIGHT - 0.55) * r * 0.8, y + Math.sin(LIGHT - 0.55) * r * 0.8)
    .arc(x, y, r * 0.8, LIGHT - 0.55, LIGHT + 0.55)
    .stroke({ width: Math.max(1.4, r * 0.09), color: BONE, alpha: alpha * 0.7, cap: "round" });
}

/** Le trait de la gravure sur la planche noire, et les teintes de lavis. */
const BONE = PLATE.bone;
const WASH = PLATE;

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

/** Le contour d'une ellipse tournée, en points. */
function ellipse(
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  steps = 28,
): number[] {
  const points: number[] = [];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let index = 0; index < steps; index++) {
    const a = (index / steps) * Math.PI * 2;
    const px = Math.cos(a) * rx;
    const py = Math.sin(a) * ry;
    points.push(x + px * cos - py * sin, y + px * sin + py * cos);
  }
  return points;
}

/** Une mitochondrie : une enveloppe en haricot, et les crêtes de sa membrane interne. */
function mitochondrion(
  g: Graphics,
  x: number,
  y: number,
  long: number,
  angle: number,
  alpha: number,
): void {
  const amber = WASH.gamboge;
  const wide = long * 0.46;
  g.poly(ellipse(x + long * SHADOW.x * 2, y + long * SHADOW.y * 2, long, wide, angle)).fill({
    color: 0x000000,
    alpha: alpha * 0.5,
  });
  g.poly(ellipse(x, y, long, wide, angle))
    .fill({ color: PLATE.ground, alpha: alpha * 0.6 })
    .stroke({ width: 1.4, color: BONE, alpha });
  g.poly(ellipse(x, y, long, wide, angle)).fill({ color: amber, alpha: alpha * 0.3 });
  g.poly(ellipse(x - long * 0.1, y - wide * 0.38, long * 0.55, wide * 0.16, angle)).fill({
    color: BONE,
    alpha: alpha * 0.35,
  });
  // Les crêtes : des replis qui partent d'un bord, puis de l'autre.
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const folds = 6;
  for (let index = 0; index < folds; index++) {
    const along = (index / (folds - 1) - 0.5) * long * 1.5;
    const reach = wide * Math.sqrt(Math.max(0, 1 - (along / long) ** 2));
    const side = index % 2 === 0 ? 1 : -1;
    const fromY = side * reach * 0.92;
    const toY = -side * reach * 0.35;
    g.moveTo(x + along * cos - fromY * sin, y + along * sin + fromY * cos).lineTo(
      x + along * cos - toY * sin,
      y + along * sin + toY * cos,
    );
  }
  g.stroke({ width: 1, color: BONE, alpha: alpha * 0.8 });
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
  // Le trait : couleur d'os, à peine teinté par la couleur propre à la créature.
  const glowColor = hsl(hue, 0.22, 0.88);
  const pale = hsl(hue, 0.1, 0.9);
  g.clear();

  // Le cercle gradué de l'objectif : une graduation tous les trois degrés, plus longue tous les trente.
  for (let i = 0; i < 120; i++) {
    const angle = (i / 120) * Math.PI * 2;
    const from = unit * (i % 10 === 0 ? 0.468 : 0.48);
    g.moveTo(cx + Math.cos(angle) * from, cy + Math.sin(angle) * from).lineTo(
      cx + Math.cos(angle) * unit * 0.492,
      cy + Math.sin(angle) * unit * 0.492,
    );
  }
  g.stroke({ width: 1, color: BONE, alpha: 0.32 });

  // Le fond : des taches floues, hors de la mise au point, et le plancton en suspension.
  decor.motes.slice(0, 7).forEach((mote, index) => {
    const x = ((mote.x + t * mote.speed * 0.3) % 1) * width;
    const y = (mote.y + 0.02 * Math.sin(t * 0.2 + mote.phase)) * height;
    g.circle(x, y, unit * (0.05 + (index % 3) * 0.03)).fill({ color: BONE, alpha: 0.018 });
  });
  for (const mote of decor.motes) {
    const x = ((mote.x + t * mote.speed) % 1) * width;
    const y = (mote.y + 0.015 * Math.sin(t * 0.4 + mote.phase)) * height;
    const alpha = 0.08 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.7 + mote.phase));
    g.circle(x, y, mote.r * 0.6).fill({ color: BONE, alpha });
  }

  const breathing = 1 + 0.03 * Math.sin(t * 1.2) - pulse * 0.05;
  const base = unit * (0.235 + Math.min(creature.size, 12) * 0.0035) * breathing;

  // Le halo : la lumière que diffuse un être vivant sur fond noir. Plus fort avec la mutation.
  const shine = traits.has("glow") ? 2.4 + 0.8 * Math.sin(t * 1.6) : 1;
  for (let step = 0; step < 10; step++) {
    g.circle(cx, cy, base * (1.9 - step * 0.08)).fill({ color: glowColor, alpha: 0.004 * shine });
  }

  const ring = (scale: number): number[] => {
    const points: number[] = [];
    for (let i = 0; i < MEMBRANE_POINTS; i++) {
      const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
      const r = membraneRadius(base, angle, t, pulse) * scale;
      points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    return points;
  };

  // Les cils : fins, courbés, parcourus d'une onde. Longs avec la mutation.
  const ciliaLength =
    (scene.organelles.cilia > 0 ? 0.1 + 0.02 * scene.organelles.cilia : 0) +
    (traits.has("longCilia") ? 0.22 : 0);
  if (ciliaLength > 0) {
    for (let i = 0; i < MEMBRANE_POINTS; i += 2) {
      const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
      const r = membraneRadius(base, angle, t, pulse);
      const wave = Math.sin(t * 3.2 - i * 0.35);
      const tip = r + base * ciliaLength;
      const bend = angle + 0.1 + wave * 0.08;
      const lean = angle + 0.16 + wave * 0.2;
      g.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r).quadraticCurveTo(
        cx + Math.cos(bend) * (r + base * ciliaLength * 0.55),
        cy + Math.sin(bend) * (r + base * ciliaLength * 0.55),
        cx + Math.cos(lean) * tip,
        cy + Math.sin(lean) * tip,
      );
    }
    g.stroke({ width: 1, color: glowColor, alpha: 0.65 });
  }

  // La paroi : une enveloppe rigide autour de la membrane, reliée par de fins piliers.
  const walled = scene.organelles.wall > 0 || scene.building === "wall";
  if (walled || traits.has("thickWall")) {
    const outer = traits.has("thickWall") && walled ? 1.1 : 1.065;
    for (let i = 0; i < MEMBRANE_POINTS; i += 3) {
      const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
      const r = membraneRadius(base, angle, t, pulse);
      g.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r).lineTo(
        cx + Math.cos(angle) * r * outer,
        cy + Math.sin(angle) * r * outer,
      );
    }
    g.stroke({ width: 1, color: pale, alpha: 0.4 });
    g.poly(ring(outer), true).stroke({
      width: traits.has("thickWall") ? 2.4 : 1.4,
      color: pale,
      alpha: scene.building === "wall" ? 0.5 + 0.3 * Math.sin(t * 5) : 0.8,
    });
  }

  // Les bourgeons : de petites cellules filles en train de se détacher.
  if (traits.has("buds")) {
    for (let i = 0; i < 3; i++) {
      const angle = 0.6 + i * 2.1 + 0.1 * Math.sin(t * 0.8 + i);
      const r = membraneRadius(base, angle, t, pulse) * 1.06;
      const bx = cx + Math.cos(angle) * r;
      const by = cy + Math.sin(angle) * r;
      g.circle(bx, by, base * 0.16)
        .fill({ color: hsl(hue, 0.5, 0.3), alpha: 0.3 })
        .stroke({ width: 1.3, color: glowColor, alpha: 0.9 });
      g.circle(bx, by, base * 0.05).fill({ color: glowColor, alpha: 0.6 });
    }
  }

  // Le flagelle : un long fouet qui ondule derrière la cellule.
  if (traits.has("whip")) {
    const root = 2.6;
    const r0 = membraneRadius(base, root, t, pulse);
    g.moveTo(cx + Math.cos(root) * r0, cy + Math.sin(root) * r0);
    for (let step = 1; step <= 14; step++) {
      const along = r0 + (step / 14) * base * 0.95;
      const wave = Math.sin(step * 0.9 - t * 4) * 0.09 * (step / 14);
      g.lineTo(cx + Math.cos(root + wave) * along, cy + Math.sin(root + wave) * along);
    }
    g.stroke({ width: 1.4, color: glowColor, alpha: 0.85, cap: "round", join: "round" });
  }

  // La dormance : l'ébauche d'un kyste, une enveloppe en pointillé autour de la cellule.
  if (traits.has("cyst")) {
    for (let i = 0; i < MEMBRANE_POINTS; i += 2) {
      const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
      const r = membraneRadius(base, angle, t, pulse) * 1.17;
      g.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 1).fill({
        color: pale,
        alpha: 0.55,
      });
    }
  }

  // L'essaimage : de petites cellules filles déjà libres, qui tournent autour.
  if (traits.has("swarm")) {
    for (let i = 0; i < 5; i++) {
      const angle = t * 0.25 + i * 1.26;
      const r = base * (1.42 + 0.08 * Math.sin(t * 0.9 + i * 2));
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r * 0.92;
      g.circle(sx, sy, base * 0.055)
        .fill({ color: hsl(hue, 0.5, 0.3), alpha: 0.35 })
        .stroke({ width: 1, color: glowColor, alpha: 0.85 });
      g.circle(sx, sy, base * 0.018).fill({ color: glowColor, alpha: 0.7 });
    }
  }

  // L'ombre de la cellule sur la planche : elle la décolle du fond.
  const lifted = ring(1.02).map(
    (value, index) => value + base * (index % 2 === 0 ? SHADOW.x : SHADOW.y) * 1.6,
  );
  g.poly(lifted, true).fill({ color: 0x000000, alpha: 0.55 });

  // Le corps : un lavis de la couleur de la créature, une membrane en double feuillet, et
  // de petits traits entre les deux feuillets, comme sur une gravure.
  g.poly(ring(1), true)
    .fill({ color: PLATE.ground, alpha: 0.5 })
    .stroke({ width: 2, color: glowColor, alpha: 0.95 });
  g.poly(ring(1), true).fill({ color: hsl(hue, 0.4, 0.42), alpha: 0.26 });
  // Le volume : des hachures du côté de l'ombre, plus longues au plus sombre.
  for (let i = 0; i < MEMBRANE_POINTS; i++) {
    const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
    const facing = Math.cos(angle - (LIGHT + Math.PI));
    if (facing < 0.25) continue;
    const r = membraneRadius(base, angle, t, pulse);
    g.moveTo(cx + Math.cos(angle) * r * 0.94, cy + Math.sin(angle) * r * 0.94).lineTo(
      cx + Math.cos(angle) * r * (0.94 - 0.2 * facing * facing),
      cy + Math.sin(angle) * r * (0.94 - 0.2 * facing * facing),
    );
  }
  g.stroke({ width: 0.9, color: glowColor, alpha: 0.4 });
  // Le reflet : un trait clair et épais, là où la lumière touche la membrane.
  const lit: number[] = [];
  for (let i = 0; i < MEMBRANE_POINTS; i++) {
    const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
    if (Math.cos(angle - LIGHT) < 0.72) continue;
    const r = membraneRadius(base, angle, t, pulse) * 0.9;
    lit.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  if (lit.length >= 4) {
    g.moveTo(lit[0] ?? cx, lit[1] ?? cy);
    for (let i = 2; i < lit.length; i += 2) g.lineTo(lit[i] ?? cx, lit[i + 1] ?? cy);
    g.stroke({ width: 3.2, color: BONE, alpha: 0.5, cap: "round", join: "round" });
  }
  g.poly(ring(0.955), true).stroke({ width: 1, color: glowColor, alpha: 0.7 });
  for (let i = 0; i < MEMBRANE_POINTS; i += 2) {
    const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
    const r = membraneRadius(base, angle, t, pulse);
    g.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r).lineTo(
      cx + Math.cos(angle) * r * 0.955,
      cy + Math.sin(angle) * r * 0.955,
    );
  }
  g.stroke({ width: 0.8, color: glowColor, alpha: 0.5 });

  // Les plaques de cuirasse : la membrane se couvre de plaques jointives, comme une thèque.
  if (traits.has("plates")) {
    for (let i = 0; i < MEMBRANE_POINTS; i += 8) {
      const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
      const r = membraneRadius(base, angle, t, pulse);
      g.moveTo(cx + Math.cos(angle) * r * 0.86, cy + Math.sin(angle) * r * 0.86).lineTo(
        cx + Math.cos(angle) * r * 1.03,
        cy + Math.sin(angle) * r * 1.03,
      );
    }
    g.stroke({ width: 1.4, color: pale, alpha: 0.7 });
    g.poly(ring(0.86), true).stroke({ width: 1.2, color: pale, alpha: 0.55 });
  }

  // Les harpons : de fines fléchettes rangées sous la membrane, prêtes à partir.
  if (traits.has("darts")) {
    for (let i = 2; i < MEMBRANE_POINTS; i += 4) {
      const angle = (i / MEMBRANE_POINTS) * Math.PI * 2;
      const r = membraneRadius(base, angle, t, pulse);
      g.moveTo(cx + Math.cos(angle) * r * 0.8, cy + Math.sin(angle) * r * 0.8).lineTo(
        cx + Math.cos(angle) * r * 0.93,
        cy + Math.sin(angle) * r * 0.93,
      );
    }
    g.stroke({ width: 1.6, color: hsl(38, 0.7, 0.72), alpha: 0.8, cap: "round" });
  }

  // La voracité : une bouche en entonnoir, bordée de cils qui rabattent les proies.
  if (traits.has("mouth")) {
    const lip = 0.35;
    const r = membraneRadius(base, lip, t, pulse);
    const throatX = cx + Math.cos(lip) * r * 0.55;
    const throatY = cy + Math.sin(lip) * r * 0.55;
    for (const side of [-1, 1]) {
      const edge = lip + side * 0.2;
      g.moveTo(cx + Math.cos(edge) * r, cy + Math.sin(edge) * r).quadraticCurveTo(
        cx + Math.cos(edge) * r * 0.75,
        cy + Math.sin(edge) * r * 0.75,
        throatX,
        throatY,
      );
    }
    g.stroke({ width: 1.4, color: glowColor, alpha: 0.9 });
    for (let i = 0; i < 4; i++) {
      const edge = lip - 0.18 + i * 0.12;
      const beat = Math.sin(t * 6 + i) * 0.06;
      g.moveTo(cx + Math.cos(edge) * r, cy + Math.sin(edge) * r).lineTo(
        cx + Math.cos(edge + beat) * r * 1.14,
        cy + Math.sin(edge + beat) * r * 1.14,
      );
    }
    g.stroke({ width: 1, color: glowColor, alpha: 0.7 });
    g.circle(throatX, throatY, base * 0.035).fill({ color: glowColor, alpha: 0.5 });
  }

  // Le cytoplasme : des grains entraînés par un lent courant.
  for (const grain of decor.grains) {
    const angle = grain.angle + t * 0.025 * (1.4 - grain.distance);
    g.circle(
      cx + Math.cos(angle) * base * grain.distance,
      cy + Math.sin(angle) * base * grain.distance,
      Math.max(0.7, base * grain.r),
    ).fill({ color: BONE, alpha: 0.3 + grain.r * 40 });
  }

  // Les grains de pigment : propres à chaque joueur, plus nombreux avec la mutation.
  const spotCount = creature.pigmentSpots + (traits.has("spots") ? 7 : 0);
  decor.spots.slice(0, spotCount).forEach((spot, index) => {
    const drift = 0.02 * Math.sin(t * 0.6 + index);
    const x = cx + Math.cos(spot.angle + drift) * base * spot.distance;
    const y = cy + Math.sin(spot.angle + drift) * base * spot.distance;
    const mutated = traits.has("spots") && index >= creature.pigmentSpots;
    const tint = mutated ? hsl(38, 0.7, 0.6) : hsl(hue + 40, 0.45, 0.62);
    g.poly(ellipse(x, y, base * spot.r, base * spot.r * 0.62, spot.angle * 3, 12))
      .fill({ color: tint, alpha: 0.4 })
      .stroke({ width: 1, color: tint, alpha: 0.8 });
  });

  // La poche digestive : une vacuole où finit une proie avalée.
  if (traits.has("pouch")) {
    const px = cx - base * 0.05;
    const py = cy + base * 0.42;
    g.ellipse(px, py, base * 0.34, base * 0.19)
      .fill({ color: hsl(hue - 40, 0.4, 0.5), alpha: 0.16 })
      .stroke({ width: 1.2, color: hsl(hue - 40, 0.45, 0.8), alpha: 0.75 });
    g.poly(ellipse(px, py, base * 0.16, base * 0.06, 0.4 + 0.2 * Math.sin(t * 0.7), 12)).stroke({
      width: 1,
      color: hsl(hue - 40, 0.45, 0.85),
      alpha: 0.6,
    });
  }

  // Organites.
  const place = (id: OrganelleId): { x: number; y: number } => ({
    x: cx + Math.cos(ORGANELLE_ANGLE[id]) * base * 0.56 + base * 0.02 * Math.sin(t * 0.9),
    y: cy + Math.sin(ORGANELLE_ANGLE[id]) * base * 0.5 + base * 0.02 * Math.cos(t * 1.1),
  });
  const growing = (id: OrganelleId): number =>
    scene.building === id ? 0.75 + 0.25 * Math.sin(t * 5) : 1;
  const shown = (id: OrganelleId): boolean => scene.organelles[id] > 0 || scene.building === id;

  if (shown("mitochondrion")) {
    const { x, y } = place("mitochondrion");
    const k = growing("mitochondrion");
    const level = scene.organelles.mitochondrion;
    mitochondrion(g, x, y, base * 0.21 * k, -0.5 + 0.1 * Math.sin(t * 0.5), 0.95);
    // Une cellule bien équipée en porte plusieurs.
    if (level >= 3) {
      mitochondrion(g, x + base * 0.2, y - base * 0.2, base * 0.12, 0.9, 0.8);
    }
    if (level >= 5) {
      mitochondrion(g, x - base * 0.06, y + base * 0.24, base * 0.12, -1.3, 0.8);
    }
  }

  if (shown("vacuole")) {
    const { x, y } = place("vacuole");
    const k = growing("vacuole");
    const r = base * (0.15 + 0.008 * scene.organelles.vacuole) * k;
    const cool = BONE;
    castShadow(g, x, y, r);
    g.circle(x, y, r)
      .fill({ color: PLATE.ground, alpha: 0.55 })
      .stroke({ width: 1.3, color: cool, alpha: 0.9 });
    g.circle(x, y, r).fill({ color: WASH.prussian, alpha: 0.32 });
    roundVolume(g, x, y, r, 0.8);
    // Un reflet sur la paroi, et quelques réserves qui flottent dedans.
    g.moveTo(x + Math.cos(Math.PI * 1.05) * r * 0.72, y + Math.sin(Math.PI * 1.05) * r * 0.72)
      .arc(x, y, r * 0.72, Math.PI * 1.05, Math.PI * 1.5)
      .stroke({
        width: 1,
        color: cool,
        alpha: 0.55,
      });
    for (let i = 0; i < 4; i++) {
      const a = t * 0.4 + i * 1.7;
      g.circle(x + Math.cos(a) * r * 0.4, y + Math.sin(a * 1.3) * r * 0.4, r * 0.09).fill({
        color: cool,
        alpha: 0.5,
      });
    }
  }

  if (shown("ribosome")) {
    // Le réticulum : des feuillets de membrane empilés, piqués de ribosomes.
    const { x, y } = place("ribosome");
    const k = growing("ribosome");
    const green = WASH.verdigris;
    const sheets = 3 + Math.min(2, Math.floor(scene.organelles.ribosome / 2));
    for (let sheet = 0; sheet < sheets; sheet++) {
      const r = base * (0.1 + sheet * 0.045) * k;
      const from = Math.PI * 0.95 + 0.06 * Math.sin(t * 0.8 + sheet);
      const to = Math.PI * 1.75;
      g.moveTo(x + base * 0.1 + Math.cos(from) * r, y + base * 0.12 + Math.sin(from) * r)
        .arc(x + base * 0.1, y + base * 0.12, r, from, to)
        .stroke({
          width: 1.3,
          color: green,
          alpha: 0.9,
        });
      for (let dot = 0; dot <= 4; dot++) {
        const a = from + ((to - from) * dot) / 4;
        g.circle(
          x + base * 0.1 + Math.cos(a) * (r + base * 0.014),
          y + base * 0.12 + Math.sin(a) * (r + base * 0.014),
          Math.max(0.8, base * 0.011),
        ).fill({ color: green, alpha: 0.85 });
      }
    }
  }

  if (shown("nursery")) {
    // Le centrosome : deux centrioles à angle droit, d'où rayonnent des filaments.
    const { x, y } = place("nursery");
    const k = growing("nursery");
    const violet = BONE;
    const rays = 8 + scene.organelles.nursery * 2;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + t * 0.15;
      const reach = base * (0.13 + 0.03 * Math.sin(t * 1.4 + i * 2)) * k;
      g.moveTo(x + Math.cos(a) * base * 0.035, y + Math.sin(a) * base * 0.035).lineTo(
        x + Math.cos(a) * reach,
        y + Math.sin(a) * reach,
      );
    }
    g.stroke({ width: 1, color: violet, alpha: 0.45 });
    const barrel = (angle: number, dx: number, dy: number): void => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const long = base * 0.05 * k;
      const wide = base * 0.022 * k;
      for (const side of [-1, 0, 1]) {
        g.moveTo(
          x + dx - long * cos - side * wide * sin,
          y + dy - long * sin + side * wide * cos,
        ).lineTo(x + dx + long * cos - side * wide * sin, y + dy + long * sin + side * wide * cos);
      }
    };
    barrel(0.3, -base * 0.02, 0);
    barrel(0.3 + Math.PI / 2, base * 0.045, base * 0.01);
    g.stroke({ width: 1.3, color: violet, alpha: 0.95 });
  }

  if (shown("golgi")) {
    // L'appareil de Golgi : des saccules aplatis, empilés, d'où bourgeonnent des vésicules.
    const { x, y } = place("golgi");
    const k = growing("golgi");
    const rose = WASH.madder;
    const stacks = 3 + Math.min(2, Math.floor(scene.organelles.golgi / 2));
    for (let index = 0; index < stacks; index++) {
      const offset = (index - (stacks - 1) / 2) * base * 0.045 * k;
      const half = base * (0.13 - Math.abs(index - (stacks - 1) / 2) * 0.012) * k;
      g.moveTo(x + offset, y - half).quadraticCurveTo(
        x + offset + base * 0.05,
        y,
        x + offset,
        y + half,
      );
    }
    g.stroke({ width: 1.6, color: rose, alpha: 0.9, cap: "round" });
    for (let index = 0; index < 3; index++) {
      const drift = ((t * 0.25 + index / 3) % 1) * base * 0.16;
      g.circle(
        x + base * 0.12 + drift,
        y + (index - 1) * base * 0.07,
        Math.max(1, base * 0.016),
      ).fill({ color: rose, alpha: 0.8 * (1 - drift / (base * 0.16)) });
    }
  }

  if (shown("lysosome")) {
    // Les lysosomes : de petits sacs sombres, pleins d'enzymes.
    const { x, y } = place("lysosome");
    const k = growing("lysosome");
    const acid = WASH.moss;
    const count = 2 + Math.min(3, Math.floor(scene.organelles.lysosome / 2));
    for (let index = 0; index < count; index++) {
      const a = index * 2.2 + 0.4;
      const lx = x + Math.cos(a) * base * 0.07 * (index === 0 ? 0 : 1);
      const ly = y + Math.sin(a) * base * 0.07 * (index === 0 ? 0 : 1);
      const lr = base * (index === 0 ? 0.055 : 0.038) * k;
      g.circle(lx, ly, lr)
        .fill({ color: WASH.moss, alpha: 0.14 })
        .stroke({ width: 1.2, color: acid, alpha: 0.9 });
      for (let grain = 0; grain < 3; grain++) {
        const b = grain * 2.1 + t * 0.6 + index;
        g.circle(
          lx + Math.cos(b) * lr * 0.45,
          ly + Math.sin(b) * lr * 0.45,
          Math.max(0.7, lr * 0.14),
        ).fill({ color: acid, alpha: 0.75 });
      }
    }
  }

  if (shown("receptor")) {
    // Les Récepteurs : des protéines en Y plantées dans la membrane, tournées vers le dehors.
    const { x, y } = place("receptor");
    const k = growing("receptor");
    const out = ORGANELLE_ANGLE.receptor;
    const count = 2 + Math.min(4, Math.floor(scene.organelles.receptor / 2));
    for (let index = 0; index < count; index++) {
      const spread = (index - (count - 1) / 2) * 0.32;
      const a = out + spread;
      const sway = 0.08 * Math.sin(t * 1.4 + index);
      const stem = base * 0.07 * k;
      const fx = x + Math.cos(a + Math.PI / 2) * base * 0.05 * (index - (count - 1) / 2);
      const fy = y + Math.sin(a + Math.PI / 2) * base * 0.05 * (index - (count - 1) / 2);
      const tx = fx + Math.cos(a + sway) * stem;
      const ty = fy + Math.sin(a + sway) * stem;
      const arm = stem * 0.55;
      g.moveTo(fx, fy)
        .lineTo(tx, ty)
        .moveTo(tx, ty)
        .lineTo(tx + Math.cos(a + sway - 0.6) * arm, ty + Math.sin(a + sway - 0.6) * arm)
        .moveTo(tx, ty)
        .lineTo(tx + Math.cos(a + sway + 0.6) * arm, ty + Math.sin(a + sway + 0.6) * arm)
        .stroke({ width: 1.4, color: BONE, alpha: 0.9 });
      g.circle(fx, fy, Math.max(0.8, base * 0.008)).fill({ color: BONE, alpha: 0.9 });
    }
  }

  // Le noyau : une double enveloppe percée de pores, la chromatine, le nucléole.
  const nx = cx + base * 0.04 * Math.sin(t * 0.5);
  const ny = cy + base * 0.04 * Math.cos(t * 0.4);
  const nr = base * 0.25;
  const nucleus = BONE;
  castShadow(g, nx, ny, nr, 0.6);
  g.circle(nx, ny, nr)
    .fill({ color: PLATE.ground, alpha: 0.7 })
    .stroke({ width: 1.6, color: nucleus, alpha: 0.95 });
  g.circle(nx, ny, nr).fill({ color: WASH.madder, alpha: 0.3 });
  roundVolume(g, nx, ny, nr);
  g.circle(nx, ny, nr * 0.9).stroke({ width: 1, color: nucleus, alpha: 0.4 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.05;
    g.circle(
      nx + Math.cos(a) * nr * 0.95,
      ny + Math.sin(a) * nr * 0.95,
      Math.max(0.9, nr * 0.05),
    ).fill({ color: nucleus, alpha: 0.85 });
  }
  // La chromatine : des filaments emmêlés qui bougent à peine.
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + 0.2 * Math.sin(t * 0.3 + i);
    const x1 = nx + Math.cos(a) * nr * 0.65;
    const y1 = ny + Math.sin(a) * nr * 0.65;
    const x2 = nx + Math.cos(a + 2.2) * nr * 0.6;
    const y2 = ny + Math.sin(a + 2.2) * nr * 0.6;
    g.moveTo(x1, y1).bezierCurveTo(
      nx + Math.cos(a + 0.9) * nr * 0.2,
      ny + Math.sin(a + 0.9) * nr * 0.75,
      nx + Math.cos(a + 1.4) * nr * 0.7,
      ny + Math.sin(a + 1.4) * nr * 0.1,
      x2,
      y2,
    );
  }
  g.stroke({ width: 1, color: nucleus, alpha: 0.4 });
  // Le nucléole bat quand le Noyau exprime une évolution.
  const expressing = scene.researching ? 0.2 * Math.sin(t * 4) : 0;
  g.circle(nx + nr * 0.25, ny - nr * 0.2, nr * (0.27 + expressing * 0.3)).fill({
    color: nucleus,
    alpha: 0.55 + expressing,
  });

  // Le premier plan : de grandes taches floues qui passent devant la cellule, tout près de
  // l'objectif. Elles donnent la profondeur.
  decor.motes.slice(0, 3).forEach((mote, index) => {
    const x = ((mote.x + t * mote.speed * 0.6 + index * 0.31) % 1) * width;
    const y = (((mote.y + index * 0.37) % 1) + 0.03 * Math.sin(t * 0.25 + mote.phase)) * height;
    const size = unit * (0.07 + index * 0.025);
    for (let step = 0; step < 6; step++) {
      g.circle(x, y, size * (1 - step * 0.13)).fill({ color: BONE, alpha: 0.012 });
    }
  });

  // Ondes de toucher : un cercle fin qui s'élargit, comme sur l'eau.
  for (const ripple of ripples) {
    const age = (nowMs - ripple.born) / 600;
    if (age < 0 || age > 1) continue;
    g.circle(ripple.x, ripple.y, 8 + age * unit * 0.16).stroke({
      width: 1.4,
      color: hsl(41, 0.7, 0.75),
      alpha: 0.75 * (1 - age),
    });
    g.circle(ripple.x, ripple.y, 4 + age * unit * 0.09).stroke({
      width: 1,
      color: hsl(41, 0.7, 0.8),
      alpha: 0.5 * (1 - age),
    });
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (i - 1) * 0.5;
      const distance = age * unit * 0.14;
      g.circle(
        ripple.x + Math.cos(angle) * distance,
        ripple.y + Math.sin(angle) * distance,
        2.6 * (1 - age) + 0.8,
      ).fill({ color: hsl(41, 0.8, 0.75), alpha: 1 - age });
    }
  }
}
