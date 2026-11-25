// Le tricératops, qui fait front : tête basse, cornes en avant, collerette dressée.
// Boîte de dessin : 1200 × 760, sol à y = 696, tête à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, sample, polyPath, hatch, crest, rng, move } = G;

const GROUND = 696;

const BODY = [
  [400, 300],
  [470, 270],
  [560, 256],
  [660, 256],
  [760, 272],
  [840, 300],
  [920, 340],
  [1000, 400],
  [1070, 460],
  [1112, 500],
  [1106, 512],
  [1040, 484],
  [960, 446],
  [900, 436],
  [880, 470],
  [800, 520],
  [700, 538],
  [600, 532],
  [500, 512],
  [430, 470],
  [400, 410],
  [388, 350],
];
const HEAD = [
  [150, 472],
  [156, 442],
  [178, 420],
  [198, 404],
  [226, 392],
  [258, 374],
  [300, 340],
  [336, 282],
  [376, 214],
  [428, 178],
  [482, 188],
  [506, 240],
  [496, 312],
  [466, 372],
  [434, 422],
  [400, 462],
  [340, 482],
  [280, 492],
  [220, 498],
  [178, 496],
  [158, 486],
];
// La collerette seule, pour son lavis et ses rayons.
const FRILL = [
  [316, 320],
  [336, 282],
  [376, 214],
  [428, 178],
  [482, 188],
  [506, 240],
  [496, 312],
  [466, 372],
  [420, 400],
  [372, 380],
  [336, 350],
];
const HORN = [
  [272, 332],
  [206, 300],
  [118, 262],
  [200, 322],
  [288, 368],
];
const NOSE_HORN = [
  [188, 410],
  [182, 372],
  [178, 352],
  [198, 372],
  [216, 398],
];
const FRONT_LEG = [
  [430, 440],
  [420, 520],
  [432, 600],
  [424, 660],
  [418, 688],
  [430, 696],
  [500, 696],
  [506, 682],
  [496, 640],
  [506, 580],
  [522, 500],
  [504, 440],
];
const HIND_LEG = [
  [800, 420],
  [768, 500],
  [780, 560],
  [802, 620],
  [796, 670],
  [788, 690],
  [800, 696],
  [872, 696],
  [878, 680],
  [866, 640],
  [882, 580],
  [904, 520],
  [906, 440],
  [860, 400],
];

function draw() {
  const rand = rng(41);
  const wash = COLORS.ochre;
  let s = A.ground(rand, 650, 400, GROUND);

  // Les membres et la corne du fond.
  s += A.far(move(FRONT_LEG, 62, -4));
  s += A.far(move(HIND_LEG, -64, -4));
  s += A.far(move(HORN, 22, -16), { wash: null });

  // Le corps.
  const backLine = sample(BODY.slice(0, 10), false, 10);
  const body = A.form(BODY, {
    wash,
    shade: [
      ...A.SHADE.body,
      {
        angle: 0.18,
        gap: 3.2,
        to: () => 0.24,
        keep: (i, x) => Math.floor((x - 420) / 34) % 3 === 0,
      },
    ],
    width: 2.6,
  });
  s += A.lines(crest(backLine, { step: 14, height: 5 }), 1.4);
  s += body.svg;
  s += A.skin(body.poly, rand, { scaleCount: 380, dots: 420, size: 3.2 });
  // Plis derrière la collerette, côtes, plis du ventre, de la queue.
  s += A.lines(
    "M420 300Q404 370 420 450M452 286Q438 366 452 470M486 276Q474 360 484 490" +
      "M560 330Q570 400 600 470M610 326Q622 400 652 474M660 328Q672 400 702 476M710 334Q722 400 750 470" +
      "M520 500Q580 486 640 494M900 350Q980 400 1090 494",
    1.1,
    0.85,
  );

  // Les pattes de devant.
  const hind = A.form(HIND_LEG, { wash, shade: A.SHADE.limb, width: 2.6 });
  s += hind.svg;
  s += A.lines(
    "M860 420Q810 480 800 540M890 450Q850 500 840 560M790 590Q820 600 850 592M792 640Q826 650 860 640",
    1.1,
    0.9,
  );
  s += A.nails(800, 696, 70);
  const front = A.form(FRONT_LEG, { wash, shade: A.SHADE.limb, width: 2.6 });
  s += front.svg;
  s += A.lines(
    "M450 460Q440 520 452 580M430 606Q462 616 496 606M428 652Q460 662 496 650",
    1.1,
    0.9,
  );
  s += A.nails(428, 696, 70);

  // La tête : la collerette, puis le museau, puis les cornes par-dessus.
  const head = A.form(HEAD, {
    wash,
    shade: [
      { angle: 0.2, gap: 5.6, bow: 3, from: (i) => (i % 2 ? 0.62 : 0.76) },
      { angle: -0.6, gap: 6.5, from: () => 0.9 },
    ],
    width: 2.6,
  });
  // Les petites pointes du bord de la collerette, dessinées avant pour dépasser du contour.
  s += A.lines(
    crest(sample(HEAD.slice(7, 14), false, 10), { step: 17, height: 9, taper: false }),
    1.6,
  );
  s += head.svg;
  const frill = sample(FRILL, true, 8);
  s += `<path d="${polyPath(frill)}" fill="${COLORS.madder}" opacity=".38" filter="url(#lavis)"/>`;
  // Les rayons de la collerette, et ses deux creux.
  let rays = "";
  for (const [x, y] of [
    [350, 250],
    [384, 206],
    [428, 190],
    [476, 200],
    [496, 250],
    [488, 310],
    [462, 360],
  ]) {
    rays += `M330 330L${x} ${y}`;
  }
  s += A.lines(rays, 1, 0.7);
  s += `<path d="${hatch(
    sample(
      [
        [372, 250],
        [404, 216],
        [436, 226],
        [430, 280],
        [396, 300],
      ],
      true,
      6,
    ),
    { angle: 0.6, gap: 3.6 },
  )}${hatch(
    sample(
      [
        [448, 240],
        [478, 236],
        [484, 300],
        [456, 340],
        [440, 300],
      ],
      true,
      6,
    ),
    { angle: 0.6, gap: 3.6 },
  )}" stroke="${COLORS.ink}" stroke-width=".9" fill="none"/>`;
  s += A.lines("M316 320Q340 352 372 380Q398 396 432 420", 1.6);
  // Le bec, la bouche, la joue.
  s += A.lines(
    "M158 478Q220 470 300 474Q340 474 372 462M178 420Q184 452 176 494M300 392Q330 420 360 470",
    1.4,
  );
  s += A.solid(
    sample(
      [
        [176, 440],
        [184, 434],
        [192, 440],
        [184, 448],
      ],
      true,
      5,
    ),
  );
  s += A.eye(300, 384, 8, -0.2);
  s += `<g fill="${COLORS.ink}">${G.stipple(head.poly, 200, rand, (x, y) => (y > 380 ? 0.9 : 0.2))}</g>`;
  // Les cornes : claires, annelées.
  const horn = A.form(HORN, {
    shade: [
      { angle: 1.2, gap: 7 },
      { angle: 0.3, gap: 6, from: () => 0.6 },
    ],
    width: 2.4,
    per: 6,
  });
  s += horn.svg;
  s += A.form(NOSE_HORN, {
    shade: [{ angle: 0.2, gap: 4, from: () => 0.5 }],
    width: 2.2,
    per: 6,
  }).svg;

  return s;
}

module.exports = {
  id: "triceratops",
  plate: "IV",
  latin: "Triceratops horridus",
  metres: 9,
  span: [118, 1112],
  ground: GROUND,
  facts: {
    fr: { era: "Crétacé supérieur", ago: "68 à 66 Ma", size: "≈ 9 m" },
    en: { era: "Late Cretaceous", ago: "68–66 Ma", size: "≈ 9 m" },
  },
  draw,
};
