/**
 * La vie de l'océan, dessinée d'après le réel : des micro-organismes tels qu'on les voit au
 * microscope à fond noir (un contour lumineux, un corps translucide, une structure fine), des
 * sources hydrothermales, de la neige marine, et les grands chasseurs du Cambrien.
 * Tout est tracé à la plume : des traits fins, presque pas d'aplats.
 */
import type { Graphics } from "pixi.js";
import { hsl } from "./draw";

interface Spot {
  readonly x: number;
  readonly y: number;
}

/** Le contour d'une ellipse tournée, en points. */
function ellipse(spot: Spot, rx: number, ry: number, angle: number, steps = 20): number[] {
  const points: number[] = [];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let index = 0; index < steps; index++) {
    const a = (index / steps) * Math.PI * 2;
    const px = Math.cos(a) * rx;
    const py = Math.sin(a) * ry;
    points.push(spot.x + px * cos - py * sin, spot.y + px * sin + py * cos);
  }
  return points;
}

/** Un point placé dans le repère tourné d'un organisme. */
function turned(spot: Spot, angle: number, px: number, py: number): Spot {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: spot.x + px * cos - py * sin, y: spot.y + px * sin + py * cos };
}

const FORMS = 5;
/** La forme de la cellule du joueur vue de loin : un cilié, comme sur sa lame. */
export const HOME_FORM = 0.85;

/**
 * Un micro-organisme. Sa forme dépend de sa case : diatomée ronde, diatomée en navette,
 * radiolaire, dinoflagellé à cornes ou cilié. De loin, ce n'est qu'un point de lumière.
 */
export function drawOrganism(
  g: Graphics,
  spot: Spot,
  radius: number,
  hue: number,
  alpha: number,
  t: number,
  seed: number,
): void {
  const glow = hsl(hue, 0.5, 0.74);
  const body = hsl(hue, 0.55, 0.42);
  if (radius < 4.5) {
    // De loin : une lueur pâle, à peine teintée, comme du plancton qui luit.
    const spark = hsl(hue, 0.3, 0.8);
    g.circle(spot.x, spot.y, radius * 2.2).fill({ color: spark, alpha: alpha * 0.1 });
    g.circle(spot.x, spot.y, radius * 0.8).fill({ color: spark, alpha: alpha * 0.85 });
    return;
  }
  const form = Math.floor(seed * FORMS) % FORMS;
  const angle = seed * Math.PI * 2 + Math.sin(t * 0.35 + seed * 40) * 0.25;
  const breath = 1 + Math.sin(t * 1.1 + seed * 30) * 0.04;
  const r = radius * breath;
  const line = Math.max(1, radius * 0.09);
  const fine = { color: glow, alpha: alpha * 0.55, width: Math.max(0.8, line * 0.6) };
  // Le halo : la lumière diffusée autour d'un être vivant sur fond noir.
  g.circle(spot.x, spot.y, r * 1.5).fill({ color: glow, alpha: alpha * 0.06 });

  if (form === 0) {
    // Diatomée centrique : un disque de verre, des stries qui rayonnent.
    g.circle(spot.x, spot.y, r)
      .fill({ color: body, alpha: alpha * 0.28 })
      .stroke({ color: glow, alpha, width: line });
    g.circle(spot.x, spot.y, r * 0.62).stroke(fine);
    if (radius >= 8) {
      for (let index = 0; index < 16; index++) {
        const a = angle + (index / 16) * Math.PI * 2;
        g.moveTo(spot.x + Math.cos(a) * r * 0.66, spot.y + Math.sin(a) * r * 0.66).lineTo(
          spot.x + Math.cos(a) * r * 0.94,
          spot.y + Math.sin(a) * r * 0.94,
        );
      }
      g.stroke(fine);
    }
    g.circle(spot.x, spot.y, r * 0.2).fill({ color: glow, alpha: alpha * 0.7 });
  } else if (form === 1) {
    // Diatomée pennée : une navette, sa fente centrale, ses stries en travers.
    g.poly(ellipse(spot, r * 1.25, r * 0.48, angle))
      .fill({ color: body, alpha: alpha * 0.28 })
      .stroke({ color: glow, alpha, width: line });
    const tip = turned(spot, angle, r * 1.05, 0);
    const tail = turned(spot, angle, -r * 1.05, 0);
    g.moveTo(tail.x, tail.y).lineTo(tip.x, tip.y).stroke(fine);
    if (radius >= 8) {
      for (let index = -4; index <= 4; index++) {
        if (index === 0) continue;
        const along = (index / 5) * r * 1.05;
        const half = r * 0.4 * Math.sqrt(1 - (index / 5.4) ** 2);
        const one = turned(spot, angle, along, -half);
        const two = turned(spot, angle, along, half);
        g.moveTo(one.x, one.y).lineTo(two.x, two.y);
      }
      g.stroke(fine);
    }
    g.circle(spot.x, spot.y, r * 0.16).fill({ color: glow, alpha: alpha * 0.7 });
  } else if (form === 2) {
    // Radiolaire : une sphère de silice ajourée, hérissée d'épines.
    const spines = 10;
    for (let index = 0; index < spines; index++) {
      const a = angle + (index / spines) * Math.PI * 2;
      const reach = r * (index % 2 === 0 ? 1.55 : 1.25);
      g.moveTo(spot.x + Math.cos(a) * r * 0.8, spot.y + Math.sin(a) * r * 0.8).lineTo(
        spot.x + Math.cos(a) * reach,
        spot.y + Math.sin(a) * reach,
      );
    }
    g.stroke({ color: glow, alpha: alpha * 0.8, width: Math.max(0.8, line * 0.7) });
    g.circle(spot.x, spot.y, r * 0.82)
      .fill({ color: body, alpha: alpha * 0.22 })
      .stroke({ color: glow, alpha, width: line });
    if (radius >= 8) {
      for (let index = 0; index < 6; index++) {
        const a = angle + (index / 6) * Math.PI * 2;
        g.circle(spot.x + Math.cos(a) * r * 0.48, spot.y + Math.sin(a) * r * 0.48, r * 0.17);
      }
      g.stroke(fine);
    }
    g.circle(spot.x, spot.y, r * 0.24).stroke(fine);
  } else if (form === 3) {
    // Dinoflagellé à cornes : un corps cuirassé, une corne devant, deux derrière.
    const horn = turned(spot, angle, r * 1.7, 0);
    const left = turned(spot, angle, -r * 1.2, -r * 0.95);
    const right = turned(spot, angle, -r * 1.2, r * 0.95);
    const neck = turned(spot, angle, r * 0.6, 0);
    const hipLeft = turned(spot, angle, -r * 0.4, -r * 0.5);
    const hipRight = turned(spot, angle, -r * 0.4, r * 0.5);
    g.moveTo(neck.x, neck.y)
      .lineTo(horn.x, horn.y)
      .moveTo(hipLeft.x, hipLeft.y)
      .lineTo(left.x, left.y)
      .moveTo(hipRight.x, hipRight.y)
      .lineTo(right.x, right.y)
      .stroke({ color: glow, alpha: alpha * 0.9, width: line });
    g.poly(ellipse(spot, r * 0.78, r * 0.66, angle, 14))
      .fill({ color: body, alpha: alpha * 0.3 })
      .stroke({ color: glow, alpha, width: line });
    // Le sillon qui ceinture la cellule.
    const beltOne = turned(spot, angle, 0, -r * 0.66);
    const beltTwo = turned(spot, angle, 0, r * 0.66);
    g.moveTo(beltOne.x, beltOne.y).lineTo(beltTwo.x, beltTwo.y).stroke(fine);
  } else {
    // Cilié : un ovale frangé de cils qui battent, un gros noyau.
    const count = radius >= 8 ? 22 : 12;
    for (let index = 0; index < count; index++) {
      const a = (index / count) * Math.PI * 2;
      const wave = Math.sin(t * 5 + index * 0.9) * 0.18;
      const from = turned(spot, angle, Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.68);
      const to = turned(spot, angle, Math.cos(a + wave) * r * 1.34, Math.sin(a + wave) * r * 0.9);
      g.moveTo(from.x, from.y).lineTo(to.x, to.y);
    }
    g.stroke(fine);
    g.poly(ellipse(spot, r * 1.1, r * 0.68, angle))
      .fill({ color: body, alpha: alpha * 0.3 })
      .stroke({ color: glow, alpha, width: line });
    const core = turned(spot, angle, r * 0.15, 0);
    g.poly(ellipse(core, r * 0.42, r * 0.22, angle + 0.4, 12)).fill({
      color: glow,
      alpha: alpha * 0.45,
    });
  }
}

/** Une source hydrothermale : une cheminée sombre, une bouche incandescente, un panache. */
export function drawVent(
  g: Graphics,
  spot: Spot,
  size: number,
  alpha: number,
  t: number,
  seed: number,
): void {
  const ember = hsl(28, 0.9, 0.58);
  if (size < 4.5) {
    g.circle(spot.x, spot.y, size * 1.8).fill({ color: ember, alpha: alpha * 0.16 });
    g.circle(spot.x, spot.y, size * 0.8).fill({ color: ember, alpha });
    return;
  }
  g.circle(spot.x, spot.y - size * 0.6, size * 1.5).fill({ color: ember, alpha: alpha * 0.08 });
  // Le panache : des bouffées qui montent, s'élargissent et s'éteignent.
  for (let index = 0; index < 5; index++) {
    const rise = (t * 0.35 + index / 5 + seed) % 1;
    g.circle(
      spot.x + Math.sin(rise * 5 + index + seed * 9) * size * 0.3,
      spot.y - size * (0.7 + rise * 1.4),
      size * (0.16 + rise * 0.3),
    ).fill({ color: hsl(26 - rise * 10, 0.7, 0.55 - rise * 0.2), alpha: alpha * (1 - rise) * 0.6 });
  }
  g.poly([
    spot.x - size * 0.7,
    spot.y + size * 0.8,
    spot.x - size * 0.28,
    spot.y - size * 0.55,
    spot.x + size * 0.28,
    spot.y - size * 0.55,
    spot.x + size * 0.7,
    spot.y + size * 0.8,
  ])
    .fill({ color: hsl(20, 0.25, 0.14), alpha })
    .stroke({ color: hsl(24, 0.5, 0.45), alpha: alpha * 0.9, width: Math.max(1, size * 0.08) });
  g.ellipse(spot.x, spot.y - size * 0.55, size * 0.28, size * 0.1).fill({ color: ember, alpha });
}

/** De la neige marine : des flocons de matière qui tombent lentement. */
export function drawMarineSnow(
  g: Graphics,
  spot: Spot,
  size: number,
  alpha: number,
  t: number,
  seed: number,
): void {
  const pale = hsl(205, 0.3, 0.86);
  if (size < 4.5) {
    g.circle(spot.x, spot.y, size * 0.8).fill({ color: pale, alpha: alpha * 0.9 });
    return;
  }
  for (let index = 0; index < 9; index++) {
    const a = seed * 20 + index * 2.4;
    const spread = size * (0.25 + ((index * 37) % 10) / 12);
    const fall = ((t * 0.12 + index * 0.13 + seed) % 1) * size * 0.5;
    g.circle(
      spot.x + Math.cos(a) * spread,
      spot.y + Math.sin(a) * spread * 0.8 + fall - size * 0.25,
      Math.max(0.9, size * (0.07 + (index % 3) * 0.05)),
    ).fill({ color: pale, alpha: alpha * (0.5 + (index % 3) * 0.2) });
  }
}

/** Une carcasse : une échine et ses côtes, déjà nettoyées. */
export function drawCarcass(
  g: Graphics,
  spot: Spot,
  size: number,
  alpha: number,
  seed: number,
): void {
  const bone = hsl(18, 0.35, 0.82);
  if (size < 4.5) {
    g.circle(spot.x, spot.y, size * 0.8).fill({ color: hsl(350, 0.55, 0.62), alpha });
    return;
  }
  const angle = seed * Math.PI * 2;
  const width = Math.max(1, size * 0.1);
  const head = turned(spot, angle, size * 1.1, 0);
  const tail = turned(spot, angle, -size * 1.1, 0);
  g.moveTo(tail.x, tail.y).lineTo(head.x, head.y).stroke({ color: bone, alpha, width });
  for (let index = -3; index <= 2; index++) {
    const along = (index / 3) * size * 0.85;
    const reach = size * (0.62 - Math.abs(index) * 0.09);
    for (const side of [-1, 1]) {
      const root = turned(spot, angle, along, 0);
      const bend = turned(spot, angle, along - size * 0.12, side * reach * 0.7);
      const end = turned(spot, angle, along - size * 0.34, side * reach);
      g.moveTo(root.x, root.y).quadraticCurveTo(bend.x, bend.y, end.x, end.y);
    }
  }
  g.stroke({ color: bone, alpha: alpha * 0.85, width: width * 0.7 });
  g.circle(head.x, head.y, size * 0.2).fill({ color: bone, alpha });
}

/**
 * Un prédateur du Cambrien : Ottoia (un ver à trompe), Opabinia (cinq yeux, une trompe à
 * pince) ou Anomalocaris (deux grands appendices, des nageoires en rang).
 */
export function drawPredator(
  g: Graphics,
  spot: Spot,
  size: number,
  level: number,
  alpha: number,
  t: number,
  seed: number,
  hue = 352,
): void {
  const blood = hsl(hue, 0.72, 0.62);
  const flesh = hsl(hue, 0.6, 0.3);
  if (size < 5) {
    g.circle(spot.x, spot.y, size * 1.8).fill({ color: blood, alpha: alpha * 0.16 });
    g.poly([
      spot.x,
      spot.y - size,
      spot.x + size * 0.85,
      spot.y,
      spot.x,
      spot.y + size,
      spot.x - size * 0.85,
      spot.y,
    ]).fill({ color: blood, alpha });
    return;
  }
  const angle = seed * Math.PI * 2 + Math.sin(t * 0.5 + seed * 20) * 0.2;
  const line = Math.max(1, size * 0.08);
  const sway = Math.sin(t * 2 + seed * 10);
  g.circle(spot.x, spot.y, size * 1.5).fill({ color: blood, alpha: alpha * 0.07 });

  if (level === 0) {
    // Ottoia : un ver annelé qui ondule, sa trompe épineuse projetée en avant.
    const points: Spot[] = [];
    for (let index = 0; index <= 10; index++) {
      const along = (index / 10 - 0.5) * size * 2.2;
      points.push(turned(spot, angle, along, Math.sin(index * 0.8 + t * 2) * size * 0.28));
    }
    const first = points[0] ?? spot;
    g.moveTo(first.x, first.y);
    for (const point of points.slice(1)) g.lineTo(point.x, point.y);
    g.stroke({ color: flesh, alpha, width: size * 0.5, cap: "round", join: "round" });
    g.moveTo(first.x, first.y);
    for (const point of points.slice(1)) g.lineTo(point.x, point.y);
    g.stroke({ color: blood, alpha: alpha * 0.9, width: line, cap: "round", join: "round" });
    const mouth = points[points.length - 1] ?? spot;
    for (let index = -2; index <= 2; index++) {
      const a = angle + index * 0.35;
      g.moveTo(mouth.x, mouth.y).lineTo(
        mouth.x + Math.cos(a) * size * 0.5,
        mouth.y + Math.sin(a) * size * 0.5,
      );
    }
    g.stroke({ color: blood, alpha, width: line * 0.8 });
    return;
  }

  // Opabinia et Anomalocaris : un corps segmenté bordé de lobes qui battent.
  const long = level === 1 ? 1.25 : 1.5;
  const lobes = level === 1 ? 6 : 9;
  for (let index = 0; index < lobes; index++) {
    const along = (index / (lobes - 1) - 0.55) * size * long * 1.5;
    const beat = Math.sin(t * 4 - index * 0.7) * 0.2;
    for (const side of [-1, 1]) {
      const root = turned(spot, angle, along, side * size * 0.3);
      const end = turned(spot, angle, along - size * 0.25, side * size * (0.85 + beat));
      g.moveTo(root.x, root.y).lineTo(end.x, end.y);
    }
  }
  g.stroke({ color: blood, alpha: alpha * 0.75, width: line });
  g.poly(ellipse(spot, size * long, size * 0.38, angle, 18))
    .fill({ color: flesh, alpha: alpha * 0.85 })
    .stroke({ color: blood, alpha, width: line });
  // La queue en éventail.
  const tail = turned(spot, angle, -size * long, 0);
  for (const side of [-1, 0, 1]) {
    const end = turned(spot, angle, -size * (long + 0.55), side * size * 0.45);
    g.moveTo(tail.x, tail.y).lineTo(end.x, end.y);
  }
  g.stroke({ color: blood, alpha: alpha * 0.8, width: line });
  const head = turned(spot, angle, size * long, 0);
  if (level === 1) {
    // La trompe d'Opabinia, terminée par une pince, et ses cinq yeux.
    const bend = turned(spot, angle, size * (long + 0.6), size * 0.5 * sway);
    const claw = turned(spot, angle, size * (long + 1.05), size * 0.2 * sway);
    g.moveTo(head.x, head.y)
      .quadraticCurveTo(bend.x, bend.y, claw.x, claw.y)
      .stroke({ color: blood, alpha, width: line });
    for (const side of [-1, 1]) {
      const prong = turned(spot, angle, size * (long + 1.3), size * (0.2 * sway + side * 0.18));
      g.moveTo(claw.x, claw.y).lineTo(prong.x, prong.y);
    }
    g.stroke({ color: blood, alpha, width: line });
    for (let index = 0; index < 5; index++) {
      const eye = turned(spot, angle, size * (long - 0.28), (index - 2) * size * 0.14);
      g.circle(eye.x, eye.y, Math.max(0.9, size * 0.06)).fill({ color: blood, alpha });
    }
  } else {
    // Les deux grands appendices d'Anomalocaris, recourbés vers la proie, et ses yeux pédonculés.
    for (const side of [-1, 1]) {
      const root = turned(spot, angle, size * (long - 0.1), side * size * 0.18);
      const bend = turned(spot, angle, size * (long + 0.75), side * size * (0.7 + 0.1 * sway));
      const end = turned(spot, angle, size * (long + 0.85), side * size * 0.05);
      g.moveTo(root.x, root.y).quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      const stalk = turned(spot, angle, size * (long - 0.35), side * size * 0.62);
      const base = turned(spot, angle, size * (long - 0.35), side * size * 0.3);
      g.moveTo(base.x, base.y).lineTo(stalk.x, stalk.y);
    }
    g.stroke({ color: blood, alpha, width: line * 1.3, cap: "round" });
    for (const side of [-1, 1]) {
      const eye = turned(spot, angle, size * (long - 0.35), side * size * 0.66);
      g.circle(eye.x, eye.y, Math.max(1.2, size * 0.1)).fill({ color: blood, alpha });
    }
  }
}

/**
 * Le Léviathan : un orthocône géant, cousin lointain des pieuvres, dans sa longue coquille
 * droite et cloisonnée. Ses bras ondulent devant l'ouverture.
 */
export function drawLeviathan(
  g: Graphics,
  spot: Spot,
  size: number,
  alpha: number,
  t: number,
  seed: number,
): void {
  const blood = hsl(352, 0.78, 0.62);
  const shell = hsl(18, 0.32, 0.26);
  const pale = hsl(30, 0.4, 0.72);
  if (size < 7) {
    g.circle(spot.x, spot.y, size * 1.9).fill({ color: blood, alpha: alpha * 0.18 });
    g.poly([
      spot.x - size * 1.3,
      spot.y,
      spot.x + size * 0.9,
      spot.y - size * 0.55,
      spot.x + size * 0.9,
      spot.y + size * 0.55,
    ]).fill({ color: blood, alpha });
    return;
  }
  const angle = seed * Math.PI * 2 + Math.sin(t * 0.3 + seed * 20) * 0.12;
  const line = Math.max(1, size * 0.05);
  g.circle(spot.x, spot.y, size * 2).fill({ color: blood, alpha: alpha * 0.06 });
  // La coquille : un long cône, pointe en arrière, cerclé de cloisons.
  const tip = turned(spot, angle, -size * 2.1, 0);
  const upper = turned(spot, angle, size * 0.7, -size * 0.5);
  const lower = turned(spot, angle, size * 0.7, size * 0.5);
  g.poly([tip.x, tip.y, upper.x, upper.y, lower.x, lower.y])
    .fill({ color: shell, alpha: alpha * 0.92 })
    .stroke({ color: pale, alpha: alpha * 0.85, width: line });
  for (let index = 1; index <= 7; index++) {
    const part = index / 8;
    const along = -size * 2.1 + part * size * 2.8;
    const half = part * size * 0.5;
    const from = turned(spot, angle, along, -half);
    const to = turned(spot, angle, along, half);
    g.moveTo(from.x, from.y).lineTo(to.x, to.y);
  }
  g.stroke({ color: pale, alpha: alpha * 0.4, width: line * 0.8 });
  // La tête et son œil.
  const head = turned(spot, angle, size * 0.95, 0);
  g.poly(ellipse(head, size * 0.42, size * 0.46, angle, 16))
    .fill({ color: hsl(352, 0.5, 0.3), alpha: alpha * 0.9 })
    .stroke({ color: blood, alpha, width: line });
  const eye = turned(spot, angle, size * 0.92, -size * 0.2);
  g.circle(eye.x, eye.y, Math.max(1.5, size * 0.11)).fill({ color: pale, alpha });
  g.circle(eye.x, eye.y, Math.max(0.8, size * 0.05)).fill({ color: hsl(0, 0, 0.05), alpha });
  // Les bras : huit, qui ondulent chacun à son rythme.
  for (let index = 0; index < 8; index++) {
    const spread = (index - 3.5) * 0.13;
    const wave = Math.sin(t * 2.2 + index * 0.9 + seed * 6);
    const root = turned(spot, angle, size * 1.3, spread * size * 2);
    const bend = turned(spot, angle, size * 1.9, spread * size * 4.5 + wave * size * 0.25);
    const end = turned(spot, angle, size * 2.5, spread * size * 5.5 - wave * size * 0.35);
    g.moveTo(root.x, root.y).quadraticCurveTo(bend.x, bend.y, end.x, end.y);
  }
  g.stroke({ color: blood, alpha: alpha * 0.9, width: line * 1.4, cap: "round" });
}

/**
 * L'étendue d'un événement : une auréole sur la carte. Chaude pour une éruption, verte et
 * pleine de plancton pour une efflorescence, rouge pour le Léviathan, sombre et terne pour
 * une zone sans oxygène.
 */
export function drawEventZone(
  g: Graphics,
  spot: Spot,
  radius: number,
  kind: "eruption" | "bloom" | "leviathan" | "anoxia",
  alpha: number,
  t: number,
  seed: number,
): void {
  const pulse = 1 + Math.sin(t * 1.4 + seed * 9) * 0.025;
  const ring = Math.max(1, Math.min(2.2, radius * 0.02));
  if (kind === "eruption") {
    const ember = hsl(24, 0.9, 0.55);
    for (const part of [1, 0.66, 0.36]) {
      g.circle(spot.x, spot.y, radius * part * pulse).fill({ color: ember, alpha: alpha * 0.07 });
    }
    g.circle(spot.x, spot.y, radius * pulse).stroke({
      color: ember,
      alpha: alpha * 0.6,
      width: ring,
    });
    return;
  }
  if (kind === "bloom") {
    const leaf = hsl(96, 0.6, 0.5);
    g.circle(spot.x, spot.y, radius).fill({ color: leaf, alpha: alpha * 0.1 });
    g.circle(spot.x, spot.y, radius).stroke({ color: leaf, alpha: alpha * 0.55, width: ring });
    // Le plancton : des grains de lumière verte qui dérivent dans toute la zone.
    const count = radius > 40 ? 46 : 18;
    for (let index = 0; index < count; index++) {
      const a = index * 2.399963 + seed * 6;
      const far = Math.sqrt((index + 0.5) / count) * radius * 0.94;
      const drift = Math.sin(t * 0.6 + index * 1.7) * radius * 0.025;
      g.circle(
        spot.x + Math.cos(a) * far + drift,
        spot.y + Math.sin(a) * far - drift,
        Math.max(0.7, radius * 0.012 + (index % 3) * 0.3),
      ).fill({ color: hsl(88 + (index % 4) * 8, 0.7, 0.62), alpha: alpha * 0.55 });
    }
    return;
  }
  if (kind === "leviathan") {
    const blood = hsl(352, 0.8, 0.58);
    g.circle(spot.x, spot.y, radius).fill({ color: blood, alpha: alpha * 0.06 });
    g.circle(spot.x, spot.y, radius * pulse).stroke({
      color: blood,
      alpha: alpha * 0.7,
      width: ring,
    });
    // Sa portée : des tirets, comme une zone de danger sur une carte marine.
    const dashes = 36;
    for (let index = 0; index < dashes; index += 2) {
      const from = (index / dashes) * Math.PI * 2 + t * 0.05;
      const to = ((index + 1) / dashes) * Math.PI * 2 + t * 0.05;
      g.moveTo(spot.x + Math.cos(from) * radius * 0.86, spot.y + Math.sin(from) * radius * 0.86)
        .arc(spot.x, spot.y, radius * 0.86, from, to)
        .stroke({ color: blood, alpha: alpha * 0.35, width: ring * 0.8 });
    }
    return;
  }
  // Zone anoxique : l'eau s'assombrit et vire au violet terne.
  const dead = hsl(276, 0.3, 0.22);
  g.circle(spot.x, spot.y, radius).fill({ color: dead, alpha: alpha * 0.5 });
  g.circle(spot.x, spot.y, radius * 0.6).fill({ color: hsl(280, 0.25, 0.1), alpha: alpha * 0.3 });
  g.circle(spot.x, spot.y, radius).stroke({
    color: hsl(276, 0.45, 0.62),
    alpha: alpha * 0.6,
    width: ring,
  });
}
