// L'oiseau primitif : le dinosaure qui a appris à voler. Perché sur une branche de ginkgo, les
// ailes levées pour l'envol, des dents dans le bec, des griffes au bout des ailes, une longue
// queue emplumée. Boîte de dessin : 1200 × 760, tête à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, f, sample, polyPath, rng, move, place } = G;

const BODY = [
  [470, 300],
  [500, 330],
  [540, 356],
  [600, 366],
  [680, 380],
  [760, 400],
  [820, 420],
  [822, 446],
  [760, 458],
  [690, 472],
  [620, 482],
  [560, 472],
  [510, 442],
  [476, 402],
  [456, 352],
  [450, 316],
];
const HEAD = [
  [356, 270],
  [374, 254],
  [410, 244],
  [440, 236],
  [468, 244],
  [482, 266],
  [476, 292],
  [452, 302],
  [420, 298],
  [384, 288],
];
const WING = [
  [590, 372],
  [560, 300],
  [524, 230],
  [516, 190],
  [560, 150],
  [640, 110],
  [730, 96],
  [820, 110],
  [884, 150],
  [904, 204],
  [864, 254],
  [800, 302],
  [730, 350],
  [660, 390],
  [620, 402],
];
const TAIL = [
  [808, 424],
  [900, 420],
  [1000, 430],
  [1080, 452],
  [1114, 470],
  [1080, 488],
  [1000, 492],
  [900, 478],
  [810, 452],
];

/** Une feuille de ginkgo : un éventail fendu au milieu. */
function ginkgo(x, y, angle, size) {
  const leaf = [
    [0, 0],
    [-size * 0.5, -size * 0.55],
    [-size * 0.62, -size * 0.95],
    [-size * 0.12, -size * 1.02],
    [0, -size * 0.8],
    [size * 0.12, -size * 1.02],
    [size * 0.62, -size * 0.95],
    [size * 0.5, -size * 0.55],
  ];
  const shape = A.form(place(leaf, x, y, angle, 1), {
    wash: COLORS.verdigris,
    washOpacity: 0.5,
    width: 1.6,
    per: 5,
  });
  let veins = "";
  for (const k of [-0.5, -0.3, -0.12, 0.12, 0.3, 0.5]) {
    const [a, b] = place(
      [
        [0, -2],
        [k * size, -size * 0.9],
      ],
      x,
      y,
      angle,
      1,
    );
    veins += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
  }
  const [p, q] = place(
    [
      [0, 0],
      [0, size * 0.5],
    ],
    x,
    y,
    angle,
    1,
  );
  return (
    A.lines(`M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`, 1.4) +
    shape.svg +
    A.lines(veins, 0.8, 0.8)
  );
}

/** Les grandes plumes d'une aile : des traits du poignet vers le bord, et un bord festonné. */
function quills(wrist, edge) {
  let d = "";
  for (const [x, y] of edge) {
    d += `M${f(wrist[0] + (x - wrist[0]) * 0.22)} ${f(wrist[1] + (y - wrist[1]) * 0.22)}L${f(x)} ${f(y)}`;
  }
  return d;
}

function draw() {
  const rand = rng(118);
  const wash = COLORS.ochre;
  let s = "";

  // La branche de ginkgo et ses feuilles.
  const branch = sample(
    [
      [150, 600],
      [300, 574],
      [480, 566],
      [640, 560],
      [820, 566],
      [1060, 590],
    ],
    false,
    10,
  );
  s += `<path d="${polyPath(branch, false)}" stroke="${COLORS.ink}" stroke-width="20" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${polyPath(branch, false)}" stroke="${COLORS.paper}" stroke-width="15" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${polyPath(branch, false)}" stroke="${COLORS.ochre}" stroke-width="15" fill="none" stroke-linecap="round" opacity=".45"/>`;
  s += A.lines(
    "M190 596q60 -8 120 -4M360 572q70 -4 130 2M560 566q60 -4 110 0M760 566q80 4 150 16M930 578q50 4 100 14",
    1,
    0.8,
  );
  s +=
    ginkgo(250, 580, -0.5, 54) +
    ginkgo(330, 572, 0.4, 46) +
    ginkgo(880, 572, -0.3, 56) +
    ginkgo(970, 580, 0.5, 48) +
    ginkgo(1040, 592, 2.6, 44) +
    ginkgo(200, 600, 2.9, 40);

  // L'aile du fond.
  const farWing = move(WING, -64, -22);
  s += A.far(farWing);
  s += A.lines(quills([452, 168], sample(farWing.slice(4, 12), false, 3)), 0.9, 0.7);

  // La queue : un long os, des plumes par paires.
  const tail = A.form(TAIL, { wash, shade: [{ angle: 1.3, gap: 7, from: () => 0.6 }], width: 2.2 });
  s += tail.svg;
  let barbs = "";
  for (let i = 0; i < 15; i++) {
    const x = 826 + i * 18;
    const y = 437 + i * 2.2;
    barbs += `M${x} ${f(y)}l22 ${f(-14 + i * 0.4)}M${x} ${f(y)}l22 ${f(14 - i * 0.2)}`;
  }
  s += A.lines(`M812 438L1108 470${barbs}`, 1, 0.9);

  // Les pattes, serrées sur la branche.
  s += A.form(
    [
      [584, 470],
      [606, 474],
      [600, 520],
      [596, 556],
      [580, 556],
      [582, 520],
    ],
    { wash, shade: A.SHADE.light, width: 2, per: 5 },
  ).svg;
  s += A.form(
    [
      [640, 474],
      [660, 476],
      [656, 520],
      [654, 556],
      [638, 556],
      [640, 520],
    ],
    { wash, shade: A.SHADE.light, width: 2, per: 5 },
  ).svg;
  s +=
    A.hook(580, 560, 2.4, 14) +
    A.hook(590, 562, 1.7, 14) +
    A.hook(600, 560, 0.8, 14) +
    A.hook(636, 560, 2.4, 14) +
    A.hook(646, 562, 1.7, 14) +
    A.hook(656, 560, 0.8, 14);

  // Le corps, couvert de petites plumes.
  const body = A.form(BODY, { wash, shade: A.SHADE.body, width: 2.4 });
  s += body.svg;
  let down = "";
  let placed = 0;
  for (let tries = 0; placed < 260 && tries < 6000; tries++) {
    const x = 450 + rand() * 380;
    const y = 300 + rand() * 190;
    if (!G.inside(body.poly, x, y) || !G.inside(body.poly, x + 9, y + 3)) continue;
    down += `M${f(x)} ${f(y)}q6 -3 10 3`;
    placed++;
  }
  s += A.lines(down, 0.9, 0.9);

  // L'aile de devant : les grandes plumes, les trois griffes au poignet.
  const wing = A.form(WING, {
    wash: COLORS.prussian,
    washOpacity: 0.36,
    shade: [{ angle: 0.9, gap: 8, from: () => 0.74 }],
    width: 2.4,
  });
  // Le bord festonné des plumes, dessiné avant l'aile pour dépasser du contour.
  s += A.lines(
    G.crest(sample(WING.slice(4, 13), false, 10), { step: 22, height: 9, taper: false, side: 1 }),
    1.4,
  );
  s += wing.svg;
  s += A.lines(quills([516, 190], sample(WING.slice(4, 13), false, 4)), 1, 0.85);
  // Les plumes de couverture, plus courtes, près du bras.
  s += A.lines(
    quills(
      [540, 250],
      [
        [600, 190],
        [650, 180],
        [700, 186],
        [744, 206],
        [770, 240],
        [750, 280],
        [700, 320],
      ],
    ),
    1.2,
    0.8,
  );
  s += A.hook(512, 186, -2.4, 16) + A.hook(520, 178, -1.9, 15) + A.hook(530, 176, -1.4, 14);

  // La tête : un bec garni de dents.
  const head = A.form(HEAD, { wash, shade: A.SHADE.light, width: 2.3 });
  s += head.svg;
  s += A.lines("M360 272Q400 276 440 278", 1.4);
  let teeth = "";
  for (let i = 0; i < 8; i++) teeth += `M${364 + i * 9} ${f(272.5 + i * 0.5)}l2 6l3 -6`;
  s += A.lines(teeth, 1);
  s += A.eye(440, 258, 6.5, -0.1, false);
  s += A.lines("M470 250Q478 240 492 238M474 262Q486 256 498 258", 1.1, 0.85);

  return s;
}

module.exports = {
  id: "earlyBird",
  plate: "IX",
  latin: "Archaeopteryx lithographica",
  metres: 0.5,
  span: [356, 1114],
  ground: 600,
  facts: {
    fr: { era: "Jurassique supérieur", ago: "≈ 150 Ma", size: "≈ 50 cm" },
    en: { era: "Late Jurassic", ago: "≈ 150 Ma", size: "≈ 50 cm" },
  },
  draw,
};
