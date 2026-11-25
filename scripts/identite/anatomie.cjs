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

/** Les réglages de hachures les plus courants. */
const SHADE = {
  // Un corps : les traits descendent du flanc vers le ventre, croisés tout en bas.
  body: [
    { angle: 0.18, gap: 6, bow: 6, from: (i) => (i % 2 ? 0.5 : 0.66) },
    { angle: -0.5, gap: 7, from: () => 0.84 },
  ],
  // Un membre au premier plan.
  limb: [
    { angle: 0.3, gap: 5.4, bow: 4, from: (i) => (i % 2 ? 0.4 : 0.6) },
    { angle: -0.7, gap: 7, from: () => 0.76 },
  ],
  // Un membre du fond : entièrement hachuré, croisé.
  far: [
    { angle: 0.5, gap: 4.5 },
    { angle: -0.6, gap: 6 },
  ],
  // Une petite pièce (tête, main, corne).
  light: [{ angle: 0.3, gap: 5, from: () => 0.55 }],
};

/** Un membre du fond : hachuré en entier, lavé de vert-de-gris, trait plus fin. */
const far = (points, options = {}) =>
  form(points, { wash: COLORS.verdigris, shade: SHADE.far, width: 1.8, ...options }).svg;

/** La peau : des écailles sur le flanc, du pointillé sur le dos. `depth` règle la hauteur du dos. */
function skin(poly, rand, { scaleCount = 300, dots = 300, size = 2.5, depth = 70 } = {}) {
  const flank = (x, y) => (G.inside(poly, x, y - depth * 1.5) ? 0 : 0.9);
  const back = (x, y) => (G.inside(poly, x, y - depth) ? 0 : 1);
  return (
    lines(G.scales(poly, scaleCount, rand, flank, size), 0.9, 0.9) +
    `<g fill="${COLORS.ink}">${G.stipple(poly, dots, rand, back)}</g>`
  );
}

/** Le sol : l'ombre de l'animal, la ligne de terre, quelques cailloux. */
function ground(rand, cx, half, y) {
  let pebbles = "";
  for (let i = 0; i < 26; i++) {
    const x = 90 + rand() * 1040;
    const py = y + 10 + rand() * 34;
    const w = 4 + rand() * 9;
    pebbles += `M${f(x)} ${f(py)}q${f(w / 2)} ${f(-w * 0.6)} ${f(w)} 0`;
  }
  return (
    groundShadow(cx, y + 6, half, 10) + lines(`M70 ${y + 3}H1150`, 1.5) + lines(pebbles, 1, 0.8)
  );
}

/** Un pied en colonne (grands herbivores) : de petits ongles au bas d'une patte. */
function nails(x, y, width, count = 3) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const nx = x + (i / count) * width;
    d += `M${f(nx)} ${f(y)}q${f(width / count / 2)} ${f(-13)} ${f(width / count)} 0`;
  }
  return lines(d, 1.6);
}

module.exports = {
  form,
  lines,
  solid,
  toe,
  hook,
  eye,
  groundShadow,
  SHADE,
  far,
  skin,
  ground,
  nails,
};
