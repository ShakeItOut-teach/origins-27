/**
 * La terre ferme, au centre de l'océan : une île de papier qui porte une forêt originelle
 * (conifères, fougères arborescentes, feuillus), un lac, une rivière qui descend à la mer, des
 * prairies et quelques collines. C'est le but de la saison : il faut avoir envie d'y arriver.
 *
 * Gravée comme sur une carte ancienne (docs/identite/charte.md) : de petits arbres au trait, un
 * lavis vert, l'eau en bleu de Prusse. Tout se calcule à partir du rayon de l'île à l'écran :
 * de loin, des points ; de près, des arbres. Rien ne bouge : la terre est immobile.
 */
import type { Graphics } from "pixi.js";
import { PLATE } from "./plate";

interface Spot {
  readonly x: number;
  readonly y: number;
}

/** Un nombre entre 0 et 1, toujours le même pour un rang donné. */
function chance(index: number, salt: number): number {
  const mixed = Math.imul(
    Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b),
    0xc2b2ae35,
  );
  return ((mixed >>> 8) & 0xffff) / 0xffff;
}

// Les lieux de l'île, en parts de son rayon ; (0, 0) est son centre.
const LAKE = { x: 0.2, y: -0.08, r: 0.21 };
const RIVER: readonly Spot[] = [
  { x: 0.33, y: 0.06 },
  { x: 0.4, y: 0.26 },
  { x: 0.36, y: 0.44 },
  { x: 0.5, y: 0.6 },
  { x: 0.56, y: 0.78 },
];
const MEADOWS = [
  { x: -0.12, y: 0.4, r: 0.17 },
  { x: 0.46, y: -0.46, r: 0.12 },
  { x: -0.52, y: 0.1, r: 0.1 },
] as const;
const HILLS = [
  { x: -0.4, y: -0.38, s: 1.2 },
  { x: -0.25, y: -0.54, s: 0.9 },
  { x: -0.56, y: -0.2, s: 0.8 },
  { x: -0.2, y: -0.3, s: 0.7 },
] as const;

/** Un contour irrégulier, un peu plus large que haut : un lac, une prairie. */
function blob(centre: Spot, radius: number, salt: number, steps = 28): number[] {
  const points: number[] = [];
  for (let index = 0; index < steps; index++) {
    const angle = (index / steps) * Math.PI * 2;
    const r =
      radius * (1 + 0.16 * Math.sin(angle * 3 + salt) + 0.08 * Math.sin(angle * 5 + salt * 2.3));
    points.push(centre.x + Math.cos(angle) * r * 1.15, centre.y + Math.sin(angle) * r * 0.85);
  }
  return points;
}

/**
 * Dessine l'intérieur de l'île. `radius` est son rayon à l'écran, en pixels ; `cover` est le
 * contour du couvert végétal (la côte, un peu en retrait), pour que le vert suive le rivage.
 */
export function drawLand(
  g: Graphics,
  centre: Spot,
  radius: number,
  cover: readonly number[],
): void {
  const at = (x: number, y: number): Spot => ({
    x: centre.x + x * radius,
    y: centre.y + y * radius,
  });
  const { ink, forest, water } = PLATE;

  // Le couvert : un lavis vert sur toute l'île, plus tendre dans les prairies.
  g.poly([...cover]).fill({ color: forest, alpha: 0.22 });
  for (const meadow of MEADOWS) {
    g.poly(blob(at(meadow.x, meadow.y), meadow.r * radius, meadow.x * 9)).fill({
      color: PLATE.moss,
      alpha: 0.55,
    });
  }

  // La plage : un pointillé de sable, tout le long de la côte.
  if (radius > 30) {
    for (let index = 0; index < 72; index++) {
      const angle = (index / 72) * Math.PI * 2;
      const far = radius * (0.87 + chance(index, 1) * 0.05);
      g.circle(
        centre.x + Math.cos(angle) * far,
        centre.y + Math.sin(angle) * far,
        Math.max(0.6, radius * 0.006),
      ).fill({ color: ink, alpha: 0.45 });
    }
  }

  // La rivière : elle sort du lac et serpente jusqu'à la mer.
  const source = RIVER[0];
  if (source !== undefined) {
    let from = at(source.x, source.y);
    g.moveTo(from.x, from.y);
    RIVER.slice(1).forEach((point, index) => {
      const to = at(point.x, point.y);
      const swing = (index % 2 === 0 ? 1 : -1) * radius * 0.05;
      g.quadraticCurveTo((from.x + to.x) / 2 + swing, (from.y + to.y) / 2, to.x, to.y);
      from = to;
    });
    g.stroke({
      color: water,
      alpha: 0.75,
      width: Math.max(1.4, radius * 0.035),
      cap: "round",
      join: "round",
    });
  }

  // Le lac : de l'eau bleue cernée d'encre, et ses lignes de rive.
  const lake = at(LAKE.x, LAKE.y);
  g.poly(blob(lake, LAKE.r * radius, 2.2))
    .fill({ color: water, alpha: 0.55 })
    .stroke({ color: ink, alpha: 0.9, width: 1.2 });
  if (radius > 44) {
    for (const scale of [0.68, 0.38]) {
      g.poly(blob(lake, LAKE.r * radius * scale, 2.2)).stroke({
        color: PLATE.paper,
        alpha: 0.55,
        width: 1,
      });
    }
  }

  // Les collines : un dos rond, hachuré du côté de l'ombre.
  for (const hill of HILLS) {
    const peak = at(hill.x, hill.y);
    const size = radius * 0.09 * hill.s;
    if (size < 2.5) continue;
    g.moveTo(peak.x - size, peak.y + size * 0.55)
      .quadraticCurveTo(peak.x - size * 0.2, peak.y - size * 0.9, peak.x, peak.y - size * 0.6)
      .quadraticCurveTo(
        peak.x + size * 0.3,
        peak.y - size * 0.3,
        peak.x + size,
        peak.y + size * 0.55,
      )
      .stroke({ color: ink, alpha: 0.85, width: 1.2 });
    for (let line = 1; line <= 3; line++) {
      g.moveTo(peak.x + size * 0.2 * line, peak.y - size * 0.4 + line * size * 0.2).lineTo(
        peak.x + size * 0.2 * line + size * 0.12,
        peak.y + size * 0.45,
      );
    }
    g.stroke({ color: ink, alpha: 0.55, width: 0.9 });
  }

  // La forêt : des arbres semés en spirale, sauf sur l'eau, les prairies et les collines.
  const count = radius > 90 ? 130 : radius > 44 ? 76 : 36;
  const base = Math.max(1.6, Math.min(13, radius * 0.05));
  for (let index = 0; index < count; index++) {
    const angle = index * 2.399963;
    const far = Math.sqrt((index + 0.5) / count) * 0.8;
    const x = Math.cos(angle) * far;
    const y = Math.sin(angle) * far;
    if (Math.hypot(x - LAKE.x, (y - LAKE.y) * 1.3) < LAKE.r * 1.35) continue;
    if (MEADOWS.some((meadow) => Math.hypot(x - meadow.x, y - meadow.y) < meadow.r * 0.9)) continue;
    if (HILLS.some((hill) => Math.hypot(x - hill.x, y - hill.y) < 0.1 * hill.s)) continue;
    if (RIVER.some((point) => Math.hypot(x - point.x, y - point.y) < 0.075)) continue;
    const foot = at(x, y);
    const size = base * (0.75 + chance(index, 3) * 0.6);
    if (size < 3.2) {
      // De loin : un point vert.
      g.circle(foot.x, foot.y, Math.max(1, size * 0.55)).fill({ color: forest, alpha: 0.85 });
      continue;
    }
    g.moveTo(foot.x, foot.y + size * 0.9)
      .lineTo(foot.x, foot.y)
      .stroke({ color: ink, alpha: 0.9, width: Math.max(1, size * 0.12) });
    const kind = index % 3;
    if (kind === 0) {
      // Un conifère : une flèche.
      g.poly([
        foot.x,
        foot.y - size * 1.3,
        foot.x + size * 0.6,
        foot.y + size * 0.35,
        foot.x - size * 0.6,
        foot.y + size * 0.35,
      ])
        .fill({ color: forest, alpha: 0.5 })
        .stroke({ color: ink, alpha: 0.9, width: 1 });
    } else if (kind === 1) {
      // Une fougère arborescente : des palmes qui retombent.
      for (let frond = -2; frond <= 2; frond++) {
        const lean = -Math.PI / 2 + frond * 0.55;
        g.moveTo(foot.x, foot.y).quadraticCurveTo(
          foot.x + Math.cos(lean) * size * 0.7,
          foot.y + Math.sin(lean) * size * 0.9,
          foot.x + Math.cos(lean) * size * 1.1,
          foot.y + Math.sin(lean) * size * 0.5 + size * 0.2,
        );
      }
      g.stroke({ color: forest, alpha: 1, width: Math.max(1.1, size * 0.16), cap: "round" });
    } else {
      // Un feuillu : une boule.
      g.circle(foot.x, foot.y - size * 0.45, size * 0.62)
        .fill({ color: forest, alpha: 0.5 })
        .stroke({ color: ink, alpha: 0.9, width: 1 });
    }
  }

  // Les prairies : quelques touffes d'herbe.
  if (radius > 60) {
    MEADOWS.forEach((meadow, which) => {
      for (let tuft = 0; tuft < 7; tuft++) {
        const angle = tuft * 2.4 + which;
        const far = meadow.r * (0.2 + chance(tuft, which) * 0.6);
        const spot = at(meadow.x + Math.cos(angle) * far, meadow.y + Math.sin(angle) * far * 0.8);
        const blade = Math.max(2, radius * 0.018);
        g.moveTo(spot.x - blade * 0.6, spot.y - blade)
          .lineTo(spot.x, spot.y)
          .lineTo(spot.x + blade * 0.6, spot.y - blade);
      }
    });
    g.stroke({ color: ink, alpha: 0.5, width: 0.9 });
  }
}
