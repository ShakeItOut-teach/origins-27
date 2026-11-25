// Le brachiosaure, le géant : le cou dressé jusqu'à la cime d'un arbre que nul autre n'atteint.
// Boîte de dessin : 1200 × 760, sol à y = 696, tête en haut à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, f, sample, rng, move } = G;

const GROUND = 696;

const BODY = [
  [196, 114],
  [200, 96],
  [222, 82],
  [244, 62],
  [268, 70],
  [282, 92],
  [302, 130],
  [342, 190],
  [402, 256],
  [472, 310],
  [542, 344],
  [640, 356],
  [740, 372],
  [820, 392],
  [900, 420],
  [980, 470],
  [1060, 530],
  [1130, 590],
  [1172, 630],
  [1166, 642],
  [1120, 618],
  [1050, 574],
  [980, 536],
  [920, 516],
  [880, 528],
  [860, 548],
  [780, 566],
  [700, 572],
  [620, 566],
  [560, 546],
  [520, 504],
  [490, 444],
  [440, 384],
  [390, 322],
  [340, 254],
  [296, 190],
  [262, 144],
  [240, 130],
  [214, 126],
];
const FRONT_LEG = [
  [522, 460],
  [514, 560],
  [520, 640],
  [512, 682],
  [520, 696],
  [584, 696],
  [590, 680],
  [582, 640],
  [592, 560],
  [608, 470],
];
const HIND_LEG = [
  [800, 470],
  [788, 560],
  [800, 620],
  [794, 682],
  [802, 696],
  [868, 696],
  [874, 680],
  [866, 630],
  [882, 560],
  [902, 490],
  [860, 440],
];

/** Une branche de conifère : un rameau, des touffes d'aiguilles. */
function branch(rand) {
  const stem = sample(
    [
      [20, 40],
      [70, 70],
      [120, 92],
      [170, 108],
      [204, 116],
    ],
    false,
    8,
  );
  let needles = "";
  G.along(stem, 9, false).forEach(([x, y, a]) => {
    for (const side of [-1, 1]) {
      const len = 16 + rand() * 12;
      const angle = a + side * (1.0 + rand() * 0.4);
      needles += `M${f(x)} ${f(y)}l${f(Math.cos(angle) * len)} ${f(Math.sin(angle) * len)}`;
    }
  });
  const twig = sample(
    [
      [90, 80],
      [110, 46],
      [140, 24],
    ],
    false,
    8,
  );
  G.along(twig, 9, false).forEach(([x, y, a]) => {
    for (const side of [-1, 1]) {
      const angle = a + side * 1.1;
      needles += `M${f(x)} ${f(y)}l${f(Math.cos(angle) * 15)} ${f(Math.sin(angle) * 15)}`;
    }
  });
  return (
    `<path d="${G.polyPath(stem, false)}" stroke="${COLORS.verdigris}" stroke-width="26" opacity=".3" fill="none" filter="url(#lavis)"/>` +
    A.lines(needles, 1.1, 0.9) +
    A.lines(G.polyPath(stem, false) + G.polyPath(twig, false), 2.4)
  );
}

function draw() {
  const rand = rng(74);
  const wash = COLORS.ochre;
  let s = A.ground(rand, 700, 380, GROUND);
  s += branch(rand);

  s += A.far(move(FRONT_LEG, 70, -4));
  s += A.far(move(HIND_LEG, -66, -4));

  const body = A.form(BODY, {
    wash,
    shade: [
      { angle: 0.18, gap: 6, bow: 6, from: (i) => (i % 2 ? 0.52 : 0.68) },
      { angle: -0.5, gap: 7, from: () => 0.86 },
      {
        angle: 0.18,
        gap: 3.2,
        to: () => 0.2,
        keep: (i, x) => x > 520 && Math.floor((x - 520) / 36) % 3 === 0,
      },
    ],
    width: 2.6,
  });
  s += body.svg;
  s += A.skin(body.poly, rand, { scaleCount: 420, dots: 460, size: 3 });
  // Les plis du cou : il plie comme un accordéon.
  let folds = "";
  const neckBack = sample(
    [
      [302, 130],
      [342, 190],
      [402, 256],
      [472, 310],
      [542, 344],
    ],
    false,
    6,
  );
  const neckFront = sample(
    [
      [262, 144],
      [296, 190],
      [340, 254],
      [390, 322],
      [440, 384],
    ],
    false,
    6,
  );
  for (let i = 2; i < neckBack.length - 1; i += 2) {
    const [x1, y1] = neckBack[i];
    const [x2, y2] = neckFront[i];
    folds += `M${f(x1)} ${f(y1)}Q${f((x1 + x2) / 2 + 8)} ${f((y1 + y2) / 2 + 10)} ${f(x2)} ${f(y2)}`;
  }
  s += A.lines(folds, 1, 0.75);
  s += A.lines(
    "M600 400Q612 470 640 530M660 404Q674 470 704 536M720 412Q736 470 764 532M560 540Q640 552 720 548M900 430Q1010 500 1150 622",
    1.1,
    0.85,
  );

  // Les pattes : des colonnes.
  s += A.form(HIND_LEG, { wash, shade: A.SHADE.limb, width: 2.6 }).svg;
  s += A.lines(
    "M860 460Q820 520 816 590M796 610Q830 620 866 608M798 660Q830 670 866 656",
    1.1,
    0.9,
  );
  s += A.nails(804, 696, 62);
  s += A.form(FRONT_LEG, { wash, shade: A.SHADE.limb, width: 2.6 }).svg;
  s += A.lines(
    "M540 480Q532 560 544 620M516 634Q548 644 584 632M516 672Q548 682 584 670",
    1.1,
    0.9,
  );
  s += A.nails(522, 696, 60);

  // La tête : petite, une bosse au-dessus du museau.
  s += A.lines("M200 118Q226 116 248 112M232 84Q244 92 252 108", 1.4);
  s += A.eye(252, 96, 5, 0.3, false);
  s += A.solid(
    sample(
      [
        [226, 88],
        [232, 84],
        [238, 89],
        [232, 94],
      ],
      true,
      5,
    ),
  );

  return s;
}

module.exports = {
  id: "brachiosaur",
  plate: "III",
  latin: "Brachiosaurus altithorax",
  metres: 22,
  span: [196, 1172],
  ground: GROUND,
  facts: {
    fr: { era: "Jurassique supérieur", ago: "154 à 150 Ma", size: "≈ 22 m" },
    en: { era: "Late Jurassic", ago: "154–150 Ma", size: "≈ 22 m" },
  },
  draw,
};
