// Outils de gravure de l'identité « Atlas » (docs/identite/charte.md) : courbes lisses, hasard
// reproductible, hachures, pointillé, écailles. Tout dessin du jeu fait hors de l'écran (planches
// d'APEX, icône, illustrations de la page de présentation) passe par ces outils, pour que le
// trait reste le même partout.

/** Les couleurs de la charte. Les mêmes valeurs que packages/client/src/theme/tokens.css. */
const COLORS = {
  ink: "#1E1B18",
  inkSoft: "#5A5148",
  paper: "#EDE6D6",
  paperDeep: "#E0D7C3",
  bone: "#F1EBDD",
  plate: "#14110E",
  prussian: "#1D4F73",
  madder: "#A63D60",
  gamboge: "#D9A520",
  verdigris: "#356B5E",
  ochre: "#A9975A",
};

/** Un hasard reproductible : la même graine donne toujours le même dessin. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

/** Les quatre points de contrôle de chaque tronçon d'une courbe lisse passant par les points. */
function segments(pts, closed = true) {
  const n = pts.length;
  const P = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const out = [];
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    out.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return out;
}

/** La courbe lisse, en points rapprochés. C'est la forme de travail de tous les outils. */
function sample(pts, closed = true, per = 8) {
  const out = [];
  for (const [a, b, c, d] of segments(pts, closed)) {
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const u = 1 - t;
      out.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}

const polyPath = (poly, closed = true) =>
  "M" + poly.map((p) => `${f(p[0])} ${f(p[1])}`).join("L") + (closed ? "Z" : "");

function inside(poly, x, y) {
  let inPoly = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inPoly = !inPoly;
  }
  return inPoly;
}

/** Des points posés à intervalle régulier le long d'un tracé : [x, y, direction]. */
function along(poly, step, closed = true) {
  const out = [];
  let carry = 0;
  const n = poly.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let at = carry;
    while (at < len) {
      const t = at / len;
      out.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        Math.atan2(b[1] - a[1], b[0] - a[0]),
      ]);
      at += step;
    }
    carry = at - len;
  }
  return out;
}

const move = (pts, dx, dy, scale = 1) => pts.map(([x, y]) => [x * scale + dx, y * scale + dy]);

function rotate(pts, angle, ox = 0, oy = 0) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return pts.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c]);
}

/** Place une forme dessinée autour de (0, 0) : échelle, rotation, puis position. */
const place = (pts, x, y, angle = 0, scale = 1) =>
  move(rotate(move(pts, 0, 0, scale), angle), x, y);

/**
 * Des hachures dans une forme. Les traits sont parallèles, inclinés de `angle` (0 = verticaux) ;
 * `from` et `to` disent où chaque trait commence et finit dans l'épaisseur de la forme
 * (0 = bord du haut, 1 = bord du bas). C'est ce qui fait l'ombre : plus dense vers le bas.
 * `keep(i, x)` permet de ne garder que certains traits (des bandes, par exemple).
 */
function hatch(
  poly,
  { angle = 0, gap = 6, from = () => 0, to = () => 1, bow = 0, keep = () => true },
) {
  const turned = rotate(poly, -angle);
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x] of turned) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  let d = "";
  let index = 0;
  for (let x = minX + gap / 2; x < maxX; x += gap, index++) {
    if (!keep(index, x)) continue;
    const ys = [];
    for (let i = 0, j = turned.length - 1; i < turned.length; j = i++) {
      const [xi, yi] = turned[i];
      const [xj, yj] = turned[j];
      if (xi > x !== xj > x) ys.push(yi + ((x - xi) / (xj - xi)) * (yj - yi));
    }
    ys.sort((a, b) => a - b);
    for (let k = 0; k + 1 < ys.length; k += 2) {
      const y0 = ys[k] + (ys[k + 1] - ys[k]) * from(index, x) + 1;
      const y1 = ys[k] + (ys[k + 1] - ys[k]) * to(index, x) - 1.5;
      if (y1 - y0 < 3) continue;
      const [a, m, b] = rotate(
        [
          [x, y0],
          [x + bow, (y0 + y1) / 2],
          [x, y1],
        ],
        angle,
      );
      d += `M${f(a[0])} ${f(a[1])}Q${f(m[0])} ${f(m[1])} ${f(b[0])} ${f(b[1])}`;
    }
  }
  return d;
}

/** Du pointillé dans une forme : `chance(x, y)` (0 à 1) dit où il est le plus serré. */
function stipple(poly, count, rand, chance = () => 1, size = [0.6, 1.4]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  let out = "";
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 40; tries++) {
    const x = minX + rand() * (maxX - minX);
    const y = minY + rand() * (maxY - minY);
    if (!inside(poly, x, y) || rand() > chance(x, y)) continue;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(size[0] + rand() * (size[1] - size[0]))}"/>`;
    placed++;
  }
  return out;
}

/** De petites écailles : des arcs semés dans une forme. */
function scales(poly, count, rand, chance = () => 1, size = 2.6) {
  let d = "";
  const box = poly.reduce(
    (b, [x, y]) => [Math.min(b[0], x), Math.max(b[1], x), Math.min(b[2], y), Math.max(b[3], y)],
    [Infinity, -Infinity, Infinity, -Infinity],
  );
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 40; tries++) {
    const x = box[0] + rand() * (box[1] - box[0]);
    const y = box[2] + rand() * (box[3] - box[2]);
    if (!inside(poly, x, y) || !inside(poly, x + size * 2, y) || rand() > chance(x, y)) continue;
    const r = size * (0.7 + rand() * 0.6);
    d += `M${f(x)} ${f(y)}a${f(r)} ${f(r)} 0 0 1 ${f(r * 2)} 0`;
    placed++;
  }
  return d;
}

/** Une crête de petites bosses le long d'un tracé ouvert (dos, queue, arcade…). */
function crest(line, { step = 13, height = 6, taper = true, side = -1 }) {
  const pts = along(line, step, false);
  let d = "";
  pts.forEach(([x, y, a], i) => {
    if (i === pts.length - 1) return;
    const k = taper ? Math.sin(((i + 0.5) / pts.length) * Math.PI) * 0.7 + 0.3 : 1;
    const h = height * k;
    const nx = -Math.sin(a) * side;
    const ny = Math.cos(a) * side;
    const [x2, y2] = pts[i + 1];
    d += `M${f(x)} ${f(y)}Q${f((x + x2) / 2 - nx * h * 1.6)} ${f((y + y2) / 2 - ny * h * 1.6)} ${f(x2)} ${f(y2)}`;
  });
  return d;
}

module.exports = {
  COLORS,
  rng,
  f,
  segments,
  sample,
  polyPath,
  inside,
  along,
  move,
  rotate,
  place,
  hatch,
  stipple,
  scales,
  crest,
};
