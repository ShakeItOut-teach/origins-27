// Les morceaux d'animal communs à toutes les planches : une forme gravée (trait, ombre, lavis),
// un doigt griffu, un œil. Chaque lignée (scripts/identite/lignees/) assemble ces morceaux.
const G = require("./gravure.cjs");
const { COLORS, f, sample, polyPath, hatch, place } = G;

/**
 * Une forme gravée, de l'arrière vers l'avant :
 *   1. le trait d'ombre (la forme en encre, décalée vers le bas à droite) ;
 *   2. le papier, qui cache ce qui est derrière ;
 *   3. le lavis d'aquarelle, flou et un peu décalé ;
 *   4. les hachures ;
 *   5. le contour.
 * `points` sont les points de passage de la courbe ; `shade` est une liste de réglages de hachures.
 */
function form(
  points,
  { wash = null, washOpacity = 0.55, shade = [], width = 2.2, per = 8, extra = "" } = {},
) {
  const poly = Array.isArray(points.poly) ? points.poly : sample(points, true, per);
  const d = polyPath(poly);
  let out = `<path d="${d}" fill="${COLORS.ink}" transform="translate(1.8 2.2)"/>`;
  out += `<path d="${d}" fill="${COLORS.paper}"/>`;
  if (wash !== null) {
    out += `<path d="${d}" fill="${wash}" opacity="${washOpacity}" filter="url(#lavis)" transform="translate(4 3)"/>`;
  }
  const lines = shade.map((spec) => hatch(poly, spec)).join("");
  if (lines !== "") {
    out += `<path d="${lines}" stroke="${COLORS.ink}" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
  }
  out += extra;
  out += `<path d="${d}" fill="none" stroke="${COLORS.ink}" stroke-width="${width}" stroke-linejoin="round"/>`;
  return { svg: out, poly };
}

/** Des traits fins à l'encre : plis, muscles, rides. `d` est un tracé SVG. */
const lines = (d, width = 1.1, opacity = 1) =>
  `<path d="${d}" stroke="${COLORS.ink}" stroke-width="${width}" fill="none" stroke-linecap="round" opacity="${opacity}"/>`;

/** Une forme pleine à l'encre (griffe, narine, pupille). */
const solid = (poly) => `<path d="${polyPath(poly)}" fill="${COLORS.ink}"/>`;

const TOE = [
  [8, -13],
  [-30, -13],
  [-62, -9],
  [-80, -2],
  [-84, 6],
  [-70, 12],
  [-30, 14],
  [8, 13],
];
const CLAW = [
  [-76, -5],
  [-92, -3],
  [-106, 4],
  [-114, 16],
  [-100, 11],
  [-80, 10],
];

/** Un doigt de pied griffu, pointé vers la gauche quand `angle` vaut 0. */
function toe(x, y, angle = 0, scale = 1, wash = null) {
  const shape = form(place(TOE, x, y, angle, scale), {
    wash,
    shade: [{ angle: angle + 0.2, gap: 5, from: () => 0.55 }],
    width: 1.9,
  });
  // Les écailles en travers du doigt, comme sur une patte d'oiseau.
  let rings = "";
  for (let i = 0; i < 5; i++) {
    const [a, b] = place(
      [
        [-14 - i * 13, -12 + i * 0.6],
        [-17 - i * 13, -3],
      ],
      x,
      y,
      angle,
      scale,
    );
    rings += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
  }
  const claw = sample(place(CLAW, x, y, angle, scale), true, 6);
  return shape.svg + lines(rings, 1) + solid(claw);
}

/** Une griffe seule, en crochet, au bout d'un doigt de main : `angle` est sa direction. */
function hook(x, y, angle, size = 14) {
  const shape = [
    [0, -size * 0.32],
    [size * 0.7, -size * 0.2],
    [size * 1.25, size * 0.35],
    [size * 0.6, size * 0.2],
    [0, size * 0.3],
  ];
  return solid(sample(place(shape, x, y, angle), true, 6));
}

/** Un œil sous une arcade : `fierce` abaisse l'arcade vers le museau. */
function eye(x, y, r, angle = 0, fierce = true) {
  const white = sample(
    place(
      [
        [-r, 0],
        [-r * 0.5, -r * 0.62],
        [r * 0.5, -r * 0.62],
        [r, 0],
        [r * 0.5, r * 0.62],
        [-r * 0.5, r * 0.62],
      ],
      x,
      y,
      angle,
    ),
    true,
    6,
  );
  const pupil = sample(
    place(
      [
        [-r * 0.22, -r * 0.6],
        [r * 0.22, -r * 0.6],
        [r * 0.22, r * 0.6],
        [-r * 0.22, r * 0.6],
      ],
      x - r * 0.1,
      y,
      angle,
    ),
    true,
    5,
  );
  let out = `<path d="${polyPath(white)}" fill="${COLORS.gamboge}" stroke="${COLORS.ink}" stroke-width="1.5"/>`;
  out += solid(pupil);
  if (fierce) {
    const brow = place(
      [
        [-r * 2.1, r * 0.1],
        [-r * 0.6, -r * 0.95],
        [r * 1.5, -r * 1.2],
        [r * 1.9, -r * 0.7],
        [r * 0.9, -r * 0.55],
        [-r * 0.5, -r * 0.5],
      ],
      x,
      y,
      angle,
    );
    out += solid(sample(brow, true, 6));
  }
  return out;
}

/** L'ombre portée au sol : des traits horizontaux qui s'amenuisent. */
function groundShadow(cx, y, half, rows = 9) {
  let d = "";
  for (let i = 0; i < rows; i++) {
    const w = half * (1 - i / (rows + 2));
    d += `M${f(cx - w)} ${f(y + i * 4.2)}L${f(cx + w * 1.05)} ${f(y + i * 4.2)}`;
  }
  return lines(d, 1.1, 0.75);
}

module.exports = { form, lines, solid, toe, hook, eye, groundShadow };
