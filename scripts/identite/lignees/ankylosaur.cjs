// L'ankylosaure, le blindé : bas sur pattes, couvert de plaques d'os, la massue levée pour frapper.
// Boîte de dessin : 1200 × 760, sol à y = 696, tête à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, f, sample, polyPath, rng, move, place } = G;

const GROUND = 696;

const BODY = [
  [250, 470],
  [320, 430],
  [420, 404],
  [540, 392],
  [660, 396],
  [760, 412],
  [840, 440],
  [900, 450],
  [980, 420],
  [1050, 376],
  [1096, 332],
  [1112, 344],
  [1070, 400],
  [1000, 450],
  [930, 490],
  [880, 524],
  [840, 572],
  [760, 602],
  [640, 614],
  [520, 608],
  [420, 592],
  [340, 562],
  [290, 532],
  [250, 510],
];
const CLUB = [
  [1090, 322],
  [1110, 296],
  [1150, 288],
  [1182, 310],
  [1184, 344],
  [1158, 366],
  [1124, 364],
  [1100, 348],
];
const HEAD = [
  [150, 526],
  [156, 498],
  [186, 480],
  [226, 470],
  [256, 458],
  [286, 436],
  [276, 474],
  [290, 500],
  [306, 538],
  [272, 528],
  [250, 548],
  [200, 554],
  [162, 546],
];
const FRONT_LEG = [
  [360, 540],
  [348, 600],
  [356, 650],
  [350, 686],
  [358, 696],
  [424, 696],
  [428, 680],
  [418, 640],
  [426, 600],
  [444, 550],
];
const HIND_LEG = [
  [770, 530],
  [758, 600],
  [770, 650],
  [764, 686],
  [772, 696],
  [842, 696],
  [848, 680],
  [838, 640],
  [852, 590],
  [866, 540],
  [830, 500],
];
// Une plaque d'os, vue de côté : un ovale à arête.
const SCUTE = [
  [-18, 0],
  [-10, -8],
  [0, -10],
  [10, -8],
  [18, 0],
  [10, 7],
  [-10, 7],
];
// Une pique du flanc.
const SPIKE = [
  [-11, 0],
  [0, -34],
  [11, 0],
];

function draw() {
  const rand = rng(52);
  const wash = COLORS.ochre;
  let s = A.ground(rand, 620, 420, GROUND);

  s += A.far(move(FRONT_LEG, 58, -4));
  s += A.far(move(HIND_LEG, -62, -4));

  // Le corps et la queue.
  const body = A.form(BODY, { wash, shade: A.SHADE.body, width: 2.6 });
  // Les piques du flanc dépassent du dos : on les dessine avant le corps.
  const back = sample(BODY.slice(0, 8), false, 12);
  let spikes = "";
  G.along(back, 46, false).forEach(([x, y, a], i) => {
    if (i === 0) return;
    spikes += A.form(place(SPIKE, x, y + 4, a, 0.8 + 0.3 * Math.sin(i * 0.5)), {
      shade: [{ angle: a, gap: 4, from: () => 0.5 }],
      width: 1.8,
      per: 4,
    }).svg;
  });
  s += spikes;
  s += body.svg;
  // Trois rangs de plaques d'os, de plus en plus petites vers le ventre.
  for (const [drop, size, step] of [
    [30, 1, 44],
    [66, 0.86, 40],
    [100, 0.7, 36],
  ]) {
    const row = G.along(move(back, 0, drop), step, false);
    row.forEach(([x, y, a], i) => {
      if (i === 0 || i === row.length - 1 || !G.inside(body.poly, x, y + 12)) return;
      const shape = sample(place(SCUTE, x, y, a, size), true, 5);
      s += `<path d="${polyPath(shape)}" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="1.5"/>`;
      s += `<path d="${polyPath(shape)}" fill="${COLORS.gamboge}" opacity=".28"/>`;
      const [l, r] = place(
        [
          [-12, -1],
          [12, -1],
        ],
        x,
        y,
        a,
        size,
      );
      s += A.lines(`M${f(l[0])} ${f(l[1])}L${f(r[0])} ${f(r[1])}`, 1.1);
    });
  }
  // Une pique à mi-flanc, entre les rangs.
  let flank = "";
  G.along(move(back, 0, 128), 58, false).forEach(([x, y, a], i) => {
    if (i < 1 || !G.inside(body.poly, x, y)) return;
    flank += A.form(place(SPIKE, x, y, a + Math.PI * 0.94, 0.7), {
      shade: [{ angle: a, gap: 4, from: () => 0.4 }],
      width: 1.6,
      per: 4,
    }).svg;
  });
  s += flank;
  s += `<g fill="${COLORS.ink}">${G.stipple(body.poly, 380, rand, (x, y) => (G.inside(body.poly, x, y - 130) ? 0.9 : 0.05))}</g>`;
  // Les anneaux de la queue, les plis du ventre.
  s += A.lines(
    "M900 452Q906 480 934 488M940 438Q950 464 974 468M980 420Q992 444 1012 444M1020 396Q1034 418 1050 416M1056 368Q1070 388 1086 384" +
      "M360 566Q440 584 520 580M560 590Q640 598 720 592",
    1.2,
    0.9,
  );

  // La massue : deux gros os soudés.
  const club = A.form(CLUB, {
    wash: COLORS.madder,
    washOpacity: 0.35,
    shade: [
      { angle: 0.5, gap: 5, from: () => 0.5 },
      { angle: -0.5, gap: 6, from: () => 0.78 },
    ],
    width: 2.6,
  });
  s += club.svg;
  s += A.lines("M1128 300Q1140 330 1130 362M1108 318Q1116 334 1110 350", 1.3);
  // Le mouvement de la massue : trois arcs en pointillé.
  s += `<path d="M1040 300Q1080 256 1136 250M1010 284Q1064 226 1140 220" stroke="${COLORS.ink}" stroke-width="1.3" stroke-dasharray="2 7" stroke-linecap="round" fill="none"/>`;

  // Les pattes de devant.
  s += A.form(HIND_LEG, { wash, shade: A.SHADE.limb, width: 2.6 }).svg;
  s += A.lines("M764 606Q800 616 842 604M766 652Q800 662 840 650", 1.1);
  s += A.nails(774, 696, 66);
  s += A.form(FRONT_LEG, { wash, shade: A.SHADE.limb, width: 2.6 }).svg;
  s += A.lines("M352 606Q386 616 424 604M354 652Q386 662 422 650", 1.1);
  s += A.nails(360, 696, 62);

  // La tête : large, basse, quatre cornes aux coins.
  const head = A.form(HEAD, {
    wash,
    shade: [{ angle: 0.2, gap: 5, from: (i) => (i % 2 ? 0.55 : 0.72) }],
    width: 2.6,
  });
  s += head.svg;
  // Le pavage d'os du crâne.
  s += A.lines(
    "M186 482Q196 500 190 520M214 474Q226 494 220 520M240 466Q252 488 248 516M168 508Q210 500 262 502M160 526Q210 520 266 524",
    1,
    0.85,
  );
  s += A.lines("M158 532Q200 540 250 536", 1.5);
  s += A.eye(232, 494, 6.5, -0.15);
  s += A.solid(
    sample(
      [
        [160, 508],
        [166, 503],
        [172, 508],
        [166, 513],
      ],
      true,
      5,
    ),
  );

  return s;
}

module.exports = {
  id: "ankylosaur",
  plate: "V",
  latin: "Ankylosaurus magniventris",
  metres: 8,
  span: [150, 1184],
  ground: GROUND,
  facts: {
    fr: { era: "Crétacé supérieur", ago: "68 à 66 Ma", size: "≈ 8 m" },
    en: { era: "Late Cretaceous", ago: "68–66 Ma", size: "≈ 8 m" },
  },
  draw,
};
