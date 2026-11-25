// Le parasaurolophe, la harde : dressé, la tête levée, il sonne l'alerte par sa crête creuse.
// Boîte de dessin : 1200 × 760, sol à y = 696, tête à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, sample, polyPath, rng, move, place, crest } = G;

const GROUND = 696;

const BODY = [
  [330, 200],
  [360, 240],
  [400, 280],
  [460, 300],
  [540, 300],
  [640, 296],
  [720, 300],
  [800, 310],
  [880, 326],
  [960, 350],
  [1040, 380],
  [1110, 410],
  [1164, 436],
  [1160, 448],
  [1100, 432],
  [1020, 412],
  [940, 398],
  [870, 398],
  [820, 422],
  [760, 472],
  [680, 492],
  [600, 486],
  [520, 462],
  [460, 422],
  [410, 372],
  [370, 322],
  [330, 272],
  [300, 238],
];
const BACK = BODY.slice(2, 13);
const HEAD = [
  [190, 216],
  [196, 198],
  [230, 186],
  [270, 172],
  [300, 158],
  [334, 170],
  [342, 200],
  [332, 228],
  [300, 234],
  [250, 234],
  [210, 232],
];
const MANDIBLE = [
  [0, 0],
  [-46, 10],
  [-96, 14],
  [-122, 12],
  [-120, 24],
  [-86, 30],
  [-36, 28],
  [-4, 18],
];
// La crête : un long tube d'os creux, courbé vers l'arrière.
const CREST = [
  [290, 164],
  [330, 132],
  [390, 104],
  [450, 84],
  [488, 76],
  [494, 90],
  [454, 104],
  [400, 126],
  [352, 154],
  [328, 174],
];
const LEG = [
  [690, 310],
  [664, 380],
  [650, 440],
  [660, 470],
  [700, 510],
  [726, 552],
  [720, 596],
  [704, 640],
  [696, 672],
  [700, 692],
  [746, 694],
  [758, 682],
  [752, 640],
  [764, 596],
  [772, 560],
  [756, 520],
  [736, 480],
  [740, 450],
  [790, 410],
  [812, 350],
  [780, 310],
];
const ARM = [
  [462, 390],
  [488, 400],
  [482, 460],
  [472, 520],
  [464, 570],
  [452, 588],
  [438, 582],
  [446, 560],
  [450, 510],
  [452, 450],
  [446, 410],
];

function draw() {
  const rand = rng(96);
  const wash = COLORS.ochre;
  let s = A.ground(rand, 720, 360, GROUND);

  // Le son de la crête : des arcs en pointillé, devant le bec.
  s += `<path d="M168 180Q146 214 166 250M140 164Q108 214 138 266M112 148Q70 214 110 282" stroke="${COLORS.ink}" stroke-width="1.4" stroke-dasharray="2 7" stroke-linecap="round" fill="none"/>`;

  s += A.far(move(ARM, 28, -8));
  s += A.far(G.rotate(move(LEG, 62, -6), -0.22, 800, 330));
  s += A.toe(790, 682, -0.5, 0.7, COLORS.verdigris);

  // Le corps.
  const backLine = sample(BACK, false, 10);
  s += A.lines(crest(backLine, { step: 13, height: 5 }), 1.3);
  const body = A.form(BODY, {
    wash,
    shade: [
      ...A.SHADE.body,
      {
        angle: 0.18,
        gap: 3.2,
        to: () => 0.26,
        keep: (i, x) => x > 420 && Math.floor((x - 420) / 32) % 3 === 0,
      },
    ],
    width: 2.6,
  });
  s += body.svg;
  s += A.skin(body.poly, rand, { scaleCount: 380, dots: 420, size: 2.6 });
  s += `<path d="${polyPath(move(backLine, 0, 18), false)}" stroke="${COLORS.verdigris}" stroke-width="30" fill="none" opacity=".35" filter="url(#lavis)"/>`;
  s += A.lines(
    "M352 250Q338 280 352 310M384 280Q372 320 390 356M420 296Q410 344 430 392" +
      "M540 340Q552 400 580 450M600 338Q614 400 642 456M660 340Q676 400 700 452" +
      "M880 340Q1000 372 1150 436",
    1.1,
    0.85,
  );

  // La tête : la crête d'abord, puis le bec de canard, la bouche ouverte.
  const crestBone = A.form(CREST, {
    wash: COLORS.madder,
    washOpacity: 0.45,
    shade: [{ angle: 1.1, gap: 6, from: () => 0.55 }],
    width: 2.4,
  });
  s += crestBone.svg;
  s += A.lines("M306 162Q380 122 480 84", 1, 0.7);
  const jaw = place(MANDIBLE, 328, 228, -0.16, 1);
  s += `<path d="${polyPath([
    [328, 228],
    [250, 234],
    [208, 232],
    ...place(
      [
        [-122, 12],
        [-96, 14],
        [-46, 10],
      ],
      328,
      228,
      -0.16,
      1,
    ),
  ])}" fill="${COLORS.plate}"/>`;
  s += A.form(jaw, { wash, shade: A.SHADE.light, width: 2.2 }).svg;
  const head = A.form(HEAD, {
    wash,
    shade: [{ angle: 0.25, gap: 5, from: (i) => (i % 2 ? 0.55 : 0.72) }],
    width: 2.5,
  });
  s += head.svg;
  s += A.lines("M196 214Q230 222 262 220M218 190Q226 206 220 230", 1.3);
  s += A.eye(294, 190, 7, -0.1, false);
  s += A.solid(
    sample(
      [
        [206, 204],
        [212, 200],
        [218, 205],
        [212, 209],
      ],
      true,
      5,
    ),
  );
  s += `<g fill="${COLORS.ink}">${G.stipple(head.poly, 90, rand)}</g>`;

  // La patte d'appui.
  s += A.toe(700, 682, -0.04, 0.78, wash);
  const leg = A.form(LEG, { wash, shade: A.SHADE.limb, width: 2.6 });
  s += leg.svg;
  s += A.lines(
    "M770 330Q716 390 680 450M800 360Q760 410 740 456M660 474Q676 482 694 476M722 560Q740 566 762 560",
    1.1,
    0.9,
  );
  s += A.lines(
    G.scales(leg.poly, 110, rand, (x, y) => (y < 440 ? 0.8 : 0.1), 2.4),
    0.9,
    0.9,
  );
  s += A.toe(712, 688, 0.06, 0.82, wash);

  // Le bras, qui pend.
  s += A.form(ARM, { wash, shade: A.SHADE.light, width: 2.1 }).svg;
  s += A.lines("M440 584l-6 10M448 588l-2 11M456 588l3 10", 1.6);

  return s;
}

module.exports = {
  id: "parasaurolophus",
  plate: "VII",
  latin: "Parasaurolophus walkeri",
  metres: 9.5,
  span: [190, 1164],
  ground: GROUND,
  facts: {
    fr: { era: "Crétacé supérieur", ago: "76 à 73 Ma", size: "≈ 9,5 m" },
    en: { era: "Late Cretaceous", ago: "76–73 Ma", size: "≈ 9.5 m" },
  },
  draw,
};
