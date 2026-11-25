// Le tyrannosaure, en attaque : tête basse, gueule grande ouverte, queue relevée, une patte
// en avant. Boîte de dessin : 1200 × 760, sol à y = 696, tête à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, f, sample, polyPath, place, hatch, stipple, scales, crest, rng } = G;

const GROUND = 696;
// L'articulation de la mâchoire : la tête tourne autour de ce point.
const JAW = [322, 316];
const HEAD_SCALE = 0.92;
const UPPER_TILT = 0.14;
const LOWER_DROP = -0.42;

const upper = (pts) => place(pts, JAW[0], JAW[1], UPPER_TILT, HEAD_SCALE);
const lower = (pts) => place(pts, JAW[0], JAW[1], LOWER_DROP, HEAD_SCALE);

// Le crâne, dessiné autour de l'articulation (0, 0), museau vers la gauche.
const SKULL = [
  [-250, 8],
  [-258, -10],
  [-252, -34],
  [-236, -52],
  [-206, -60],
  [-190, -58],
  [-172, -66],
  [-154, -64],
  [-134, -74],
  [-116, -84],
  [-104, -104],
  [-88, -94],
  [-70, -100],
  [-52, -114],
  [-34, -104],
  [-14, -102],
  [6, -90],
  [18, -64],
  [26, -30],
  [20, 2],
  [4, 10],
  [-20, 6],
  [-50, 12],
  [-100, 20],
  [-150, 22],
  [-200, 18],
];
const UPPER_ROW = [
  [-246, 8],
  [-200, 18],
  [-150, 22],
  [-100, 20],
  [-54, 12],
];
const MANDIBLE = [
  [6, 4],
  [-24, 12],
  [-60, 18],
  [-110, 24],
  [-160, 26],
  [-205, 24],
  [-236, 18],
  [-246, 26],
  [-238, 44],
  [-200, 56],
  [-150, 62],
  [-100, 64],
  [-50, 62],
  [-14, 56],
  [16, 40],
  [22, 16],
];
const LOWER_ROW = [
  [-232, 18],
  [-205, 24],
  [-160, 26],
  [-110, 24],
  [-60, 18],
  [-30, 13],
];
const TONGUE = [
  [-24, 6],
  [-80, 0],
  [-140, 4],
  [-186, 14],
  [-150, 22],
  [-80, 22],
  [-30, 18],
];

const BODY = [
  [342, 238],
  [372, 224],
  [410, 213],
  [456, 204],
  [510, 198],
  [570, 200],
  [640, 206],
  [710, 212],
  [770, 214],
  [830, 210],
  [900, 198],
  [980, 180],
  [1060, 160],
  [1130, 142],
  [1176, 132],
  [1178, 140],
  [1130, 158],
  [1060, 184],
  [980, 212],
  [910, 238],
  [850, 268],
  [812, 306],
  [790, 350],
  [740, 396],
  [670, 420],
  [600, 428],
  [540, 420],
  [490, 398],
  [452, 366],
  [428, 340],
  [404, 338],
  [380, 352],
  [356, 360],
  [338, 352],
  [328, 330],
  [332, 296],
];
// La ligne du dos, du cou au bout de la queue : elle porte la crête d'écailles.
const BACK = BODY.slice(0, 15);

const LEG = [
  [730, 224],
  [690, 246],
  [656, 300],
  [628, 366],
  [606, 412],
  [598, 436],
  [606, 462],
  [630, 496],
  [660, 532],
  [678, 560],
  [680, 580],
  [668, 612],
  [652, 644],
  [640, 668],
  [646, 690],
  [690, 694],
  [706, 684],
  [706, 654],
  [714, 620],
  [724, 588],
  [722, 560],
  [702, 520],
  [690, 488],
  [694, 456],
  [716, 430],
  [770, 400],
  [812, 350],
  [826, 300],
  [808, 252],
  [776, 230],
];
const LEG_FAR = [
  [700, 262],
  [684, 330],
  [680, 392],
  [686, 424],
  [706, 446],
  [752, 478],
  [798, 512],
  [826, 540],
  [834, 580],
  [832, 624],
  [822, 656],
  [810, 676],
  [816, 692],
  [852, 694],
  [866, 680],
  [866, 640],
  [872, 596],
  [878, 556],
  [866, 520],
  [836, 480],
  [806, 448],
  [800, 410],
  [820, 370],
  [826, 310],
  [800, 262],
];
// Le bras, dessiné autour de l'épaule (0, 0).
const ARM = [
  [0, -6],
  [18, 2],
  [30, 34],
  [32, 56],
  [20, 70],
  [-2, 80],
  [-14, 92],
  [-22, 104],
  [-26, 92],
  [-30, 86],
  [-40, 94],
  [-34, 80],
  [-22, 70],
  [2, 58],
  [8, 40],
  [-2, 20],
  [-10, 4],
];

/** Des dents le long d'une rangée : `out` est la direction où elles pointent. */
function teeth(row, out, longest) {
  const line = sample(row, false, 10);
  const marks = G.along(line, 10.5, false);
  let svg = "";
  for (let i = 0; i + 1 < marks.length; i++) {
    const [x, y] = marks[i];
    const [x2, y2] = marks[i + 1];
    const t = (i + 0.5) / (marks.length - 1);
    // Les plus longues au milieu de la rangée, plus courtes au fond.
    const len = longest * (0.45 + 0.55 * Math.sin(Math.min(1, t * 1.25) * Math.PI));
    const mx = (x + x2) / 2;
    const my = (y + y2) / 2;
    const back = [(x2 - x) / 10.5, (y2 - y) / 10.5];
    const tip = [
      mx + out[0] * len + back[0] * len * 0.22,
      my + out[1] * len + back[1] * len * 0.22,
    ];
    const side = [
      mx + out[0] * len * 0.45 + back[0] * 4.6,
      my + out[1] * len * 0.45 + back[1] * 4.6,
    ];
    svg += `<path d="M${f(x + back[0] * 1.2)} ${f(y + back[1] * 1.2)}L${f(tip[0])} ${f(tip[1])}Q${f(side[0])} ${f(side[1])} ${f(x2 - back[0] * 1.2)} ${f(y2 - back[1] * 1.2)}Z" fill="${COLORS.bone}" stroke="${COLORS.ink}" stroke-width="1.1" stroke-linejoin="round"/>`;
  }
  return svg;
}

function draw() {
  const rand = rng(68);
  const wash = COLORS.ochre;
  let s = "";

  // Le sol : l'ombre, la ligne, quelques cailloux, la poussière soulevée par la patte arrière.
  s += A.groundShadow(700, GROUND + 6, 330, 10);
  s += A.lines(`M70 ${GROUND + 3}H1150`, 1.5);
  let pebbles = "";
  for (let i = 0; i < 26; i++) {
    const x = 90 + rand() * 1040;
    const y = GROUND + 10 + rand() * 34;
    const w = 4 + rand() * 9;
    pebbles += `M${f(x)} ${f(y)}q${f(w / 2)} ${f(-w * 0.6)} ${f(w)} 0`;
  }
  s += A.lines(pebbles, 1, 0.8);

  // ─── Les membres du fond ───
  const farShade = [
    { angle: 0.5, gap: 4.5 },
    { angle: -0.6, gap: 6 },
  ];
  s += A.toe(824, 680, -0.06, 0.82, COLORS.verdigris);
  s += A.form(LEG_FAR, { wash: COLORS.verdigris, shade: farShade, width: 1.9 }).svg;
  s += A.toe(812, 686, 0.04, 0.86, COLORS.verdigris);
  const armFar = place(ARM, 474, 360, 0.12, 1);
  s += A.form(armFar, { wash: COLORS.verdigris, shade: farShade, width: 1.7 }).svg;
  s += A.hook(452, 462, 2.2, 11) + A.hook(436, 452, 2.5, 11);

  // ─── Le corps : cou, tronc, queue ───
  const backLine = sample(BACK, false, 10);
  const body = A.form(BODY, {
    wash,
    shade: [
      // Le volume : les traits partent du flanc et descendent vers le ventre.
      { angle: 0.18, gap: 6, bow: 6, from: (i) => (i % 2 ? 0.5 : 0.66) },
      // L'ombre du ventre, croisée.
      { angle: -0.5, gap: 7, from: () => 0.84 },
      // Les bandes sombres du dos, comme un pelage rayé.
      {
        angle: 0.18,
        gap: 3.1,
        to: () => 0.3,
        keep: (i, x) => Math.floor((x - 350) / 30) % 3 === 0,
      },
    ],
    width: 2.6,
    extra: `<path d="${polyPath(G.move(backLine, 0, 20), false)}" stroke="${COLORS.verdigris}" stroke-width="34" fill="none" opacity=".4" filter="url(#lavis)"/>`,
  });
  // La crête d'écailles du dos, dessinée avant le corps pour dépasser du contour.
  s += A.lines(crest(backLine, { step: 12, height: 7 }), 1.5);
  s += body.svg;
  // La peau : écailles sur le flanc, pointillé sur le dos.
  const upperHalf = (x, y) => (G.inside(body.poly, x, y - 70) ? 0 : 1);
  s += A.lines(
    scales(body.poly, 420, rand, (x, y) => (G.inside(body.poly, x, y - 110) ? 0 : 0.9), 2.5),
    0.9,
    0.9,
  );
  s += `<g fill="${COLORS.ink}">${stipple(body.poly, 520, rand, upperHalf)}</g>`;
  // Plis du cou, omoplate, côtes, plis du ventre, muscle de la queue.
  s += A.lines(
    "M366 240Q352 296 366 352M392 226Q378 288 392 346M420 214Q408 276 416 338M446 208Q438 262 440 330" +
      "M486 226Q462 292 474 366" +
      "M520 300Q528 350 556 392M552 296Q562 350 592 398M586 296Q598 350 628 398M622 300Q634 350 662 396" +
      "M500 404Q530 392 560 396M580 414Q620 404 660 408" +
      "M836 236Q980 198 1150 143",
    1.1,
    0.85,
  );

  // ─── La gueule ───
  const upperRow = upper(UPPER_ROW);
  const lowerRow = lower(LOWER_ROW);
  const gape = [
    ...upper([
      [-20, 6],
      [-50, 12],
      [-100, 20],
      [-150, 22],
      [-200, 18],
      [-250, 8],
    ]),
    ...lower([
      [-246, 26],
      [-236, 18],
      [-205, 24],
      [-160, 26],
      [-110, 24],
      [-60, 18],
      [-24, 12],
      [6, 4],
    ]),
  ];
  s += `<path d="${polyPath(gape)}" fill="${COLORS.plate}"/>`;
  // Le palais, strié, et la langue.
  s += `<path d="${hatch(
    sample(
      upper([
        [-40, 14],
        [-100, 22],
        [-190, 20],
        [-180, 40],
        [-100, 46],
        [-40, 36],
      ]),
      true,
      6,
    ),
    { angle: 1.2, gap: 5 },
  )}" stroke="${COLORS.madder}" stroke-width="1.2" fill="none"/>`;
  const tongue = place(TONGUE, JAW[0], JAW[1], -0.3, HEAD_SCALE);
  s += `<path d="${polyPath(sample(tongue, true, 8))}" fill="${COLORS.madder}" stroke="${COLORS.ink}" stroke-width="1.4"/>`;
  s += A.lines(
    polyPath(
      sample(
        place(
          [
            [-40, 10],
            [-100, 8],
            [-160, 12],
          ],
          JAW[0],
          JAW[1],
          -0.3,
          HEAD_SCALE,
        ),
        false,
        6,
      ),
      false,
    ),
    1,
  );
  // Les dents du bas, puis la mâchoire qui recouvre leur base.
  const up = [Math.sin(LOWER_DROP), -Math.cos(LOWER_DROP)];
  s += teeth(lowerRow, up, 15);
  s += A.form(lower(MANDIBLE), {
    wash,
    shade: [
      { angle: 1.25, gap: 4.6, from: (i) => (i % 2 ? 0.35 : 0.55) },
      { angle: 0.3, gap: 6, from: () => 0.7 },
    ],
    width: 2.4,
  }).svg;
  // La peau tendue au coin de la gueule.
  const corner = [
    upper([[-50, 12]])[0],
    upper([[20, 2]])[0],
    lower([[22, 16]])[0],
    lower([[-24, 12]])[0],
    [300, 332],
  ];
  s += A.form(corner, {
    wash: COLORS.madder,
    washOpacity: 0.4,
    shade: [{ angle: 0.5, gap: 3.6 }],
    width: 1.6,
    per: 6,
  }).svg;
  // Les dents du haut, puis le crâne.
  const down = [-Math.sin(UPPER_TILT), Math.cos(UPPER_TILT)];
  s += teeth(upperRow, down, 25);
  const skull = A.form(upper(SKULL), {
    wash,
    shade: [
      { angle: 0.25, gap: 5.4, bow: 3, from: (i) => (i % 2 ? 0.52 : 0.7) },
      { angle: -0.6, gap: 6.5, from: () => 0.86 },
    ],
    width: 2.6,
  });
  s += skull.svg;
  // Les creux du crâne : devant l'œil, derrière l'œil.
  const hollow = (pts, angle, gap) =>
    `<path d="${hatch(sample(upper(pts), true, 6), { angle, gap })}" stroke="${COLORS.ink}" stroke-width=".9" fill="none"/>`;
  s += hollow(
    [
      [-214, -34],
      [-190, -48],
      [-140, -52],
      [-124, -36],
      [-150, -22],
      [-196, -20],
    ],
    0.9,
    3.4,
  );
  s += hollow(
    [
      [-44, -80],
      [-20, -84],
      [-4, -60],
      [-10, -30],
      [-36, -28],
      [-50, -54],
    ],
    -0.4,
    3.4,
  );
  // Rugosités du museau, ligne de la joue, rides autour de l'œil.
  const marks = upper([
    [-236, -50],
    [-206, -58],
    [-172, -64],
    [-134, -72],
  ]);
  s += A.lines(crest(sample(marks, false, 8), { step: 9, height: 5, taper: false }), 1.3);
  const cheek = upper([
    [-120, -8],
    [-60, -14],
    [14, -8],
  ]);
  s += A.lines(polyPath(sample(cheek, false, 8), false), 1.2);
  const [ex, ey] = upper([[-98, -68]])[0];
  s += A.eye(ex, ey, 8.5, UPPER_TILT - 0.25);
  const wrinkles = upper([
    [-120, -56],
    [-104, -50],
    [-84, -52],
    [-74, -60],
  ]);
  s += A.lines(polyPath(sample(wrinkles, false, 6), false), 1);
  const [nx, ny] = upper([[-240, -32]])[0];
  s += A.solid(
    sample(
      place(
        [
          [-6, 0],
          [0, -4],
          [7, -1],
          [2, 4],
        ],
        nx,
        ny,
        UPPER_TILT,
      ),
      true,
      6,
    ),
  );
  // Pointillé du crâne.
  s += `<g fill="${COLORS.ink}">${stipple(skull.poly, 150, rand, (x, y) => (G.inside(skull.poly, x, y - 30) ? 0.15 : 1))}</g>`;

  // ─── La patte de devant ───
  s += A.toe(644, 670, -0.08, 0.9, wash);
  const leg = A.form(LEG, {
    wash,
    shade: [
      { angle: 0.3, gap: 5.4, bow: 4, from: (i) => (i % 2 ? 0.4 : 0.6) },
      { angle: -0.7, gap: 7, from: () => 0.76 },
    ],
    width: 2.6,
  });
  s += leg.svg;
  // Muscles de la cuisse, rides du genou, tendon, écailles du pied.
  let scutes = "";
  for (let i = 0; i < 9; i++) {
    const y = 586 + i * 9;
    const x = 680 - i * 4.2;
    scutes += `M${f(x)} ${f(y)}q10 3 18 -1`;
  }
  s += A.lines(
    "M770 248Q704 320 636 420M806 300Q752 372 708 434M700 250Q672 320 650 380" +
      "M604 440Q616 448 630 444M610 456Q622 464 636 458" +
      "M648 500Q692 540 708 584" +
      scutes,
    1.1,
    0.9,
  );
  s += A.lines(
    scales(leg.poly, 130, rand, (x, y) => (y < 430 ? 0.8 : 0.15), 2.4),
    0.9,
    0.9,
  );
  s += A.toe(654, 680, 0.02, 1, wash);
  s += A.toe(668, 686, 0.1, 1, wash);
  // L'ergot, à l'arrière du pied.
  s += A.hook(706, 662, 0.9, 13);

  // ─── Le bras de devant ───
  s += A.form(place(ARM, 448, 366, 0, 1), {
    wash,
    shade: [{ angle: 0.4, gap: 4.5, from: () => 0.45 }],
    width: 2,
  }).svg;
  s += A.hook(426, 468, 2.2, 13) + A.hook(408, 458, 2.5, 13);

  return s;
}

module.exports = {
  id: "tyrannosaur",
  plate: "I",
  latin: "Tyrannosaurus rex",
  // La longueur réelle de l'animal, pour l'échelle, et la largeur qu'il occupe dans le dessin.
  metres: 12,
  span: [119, 1178],
  ground: GROUND,
  facts: {
    fr: { era: "Crétacé supérieur", ago: "68 à 66 Ma", size: "≈ 12 m" },
    en: { era: "Late Cretaceous", ago: "68–66 Ma", size: "≈ 12 m" },
  },
  draw,
};
