// Le dromaéosaure, chasseur en meute : en pleine course, gueule ouverte, bras emplumés en avant,
// la griffe en faucille levée. Boîte de dessin : 1200 × 760, sol à y = 696, tête à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, f, sample, polyPath, rng, move, place, crest } = G;

const GROUND = 696;
const JAW = [300, 252];
const upper = (pts) => place(pts, JAW[0], JAW[1], 0.1, 1);
const lower = (pts) => place(pts, JAW[0], JAW[1], -0.34, 1);

const SKULL = [
  [-150, 6],
  [-158, -6],
  [-148, -22],
  [-112, -34],
  [-72, -42],
  [-42, -52],
  [-12, -50],
  [12, -36],
  [20, -12],
  [12, 6],
  [-10, 6],
  [-60, 11],
  [-110, 11],
];
const MANDIBLE = [
  [6, 4],
  [-40, 11],
  [-100, 13],
  [-142, 10],
  [-150, 18],
  [-110, 27],
  [-50, 30],
  [-6, 26],
  [14, 12],
];
const BODY = [
  [306, 214],
  [350, 236],
  [400, 268],
  [450, 298],
  [520, 310],
  [600, 310],
  [680, 312],
  [740, 316],
  [820, 316],
  [900, 310],
  [980, 302],
  [1060, 294],
  [1130, 288],
  [1164, 286],
  [1164, 294],
  [1060, 308],
  [980, 320],
  [900, 334],
  [830, 352],
  [790, 380],
  [720, 410],
  [640, 418],
  [560, 410],
  [500, 392],
  [450, 360],
  [410, 322],
  [370, 292],
  [336, 276],
  [316, 262],
];
const BACK = BODY.slice(0, 9);
const LEG = [
  [700, 330],
  [676, 400],
  [664, 446],
  [676, 470],
  [720, 510],
  [748, 548],
  [738, 590],
  [718, 640],
  [708, 672],
  [712, 692],
  [752, 694],
  [766, 682],
  [762, 640],
  [776, 592],
  [784, 556],
  [768, 516],
  [736, 470],
  [722, 440],
  [760, 410],
  [800, 372],
  [800, 330],
  [760, 316],
];
const LEG_RAISED = [
  [690, 340],
  [652, 388],
  [618, 430],
  [610, 462],
  [618, 500],
  [614, 532],
  [596, 552],
  [572, 566],
  [580, 580],
  [612, 574],
  [636, 552],
  [646, 520],
  [644, 480],
  [650, 450],
  [690, 420],
  [730, 380],
  [730, 340],
];
// Le bras, avec ses longues plumes qui pendent : une petite aile.
const WING = [
  [486, 340],
  [500, 372],
  [472, 420],
  [452, 432],
  [424, 474],
  [384, 486],
  [350, 474],
  [362, 432],
  [338, 414],
  [350, 398],
  [392, 392],
  [440, 396],
  [462, 360],
];

function teeth(row, out, long) {
  let svg = "";
  const marks = G.along(sample(row, false, 8), 8, false);
  for (let i = 0; i + 1 < marks.length; i++) {
    const [x, y] = marks[i];
    const [x2, y2] = marks[i + 1];
    const len = long * (0.5 + 0.5 * Math.sin(((i + 0.5) / marks.length) * Math.PI));
    svg += `<path d="M${f(x)} ${f(y)}L${f((x + x2) / 2 + out[0] * len + 2)} ${f((y + y2) / 2 + out[1] * len)}L${f(x2)} ${f(y2)}Z" fill="${COLORS.bone}" stroke="${COLORS.ink}" stroke-width=".9"/>`;
  }
  return svg;
}

/** Des plumes : de petits traits courbes, tous couchés dans le même sens. */
function feathers(poly, count, rand, direction, length = 9) {
  let d = "";
  const box = poly.reduce(
    (b, [x, y]) => [Math.min(b[0], x), Math.max(b[1], x), Math.min(b[2], y), Math.max(b[3], y)],
    [Infinity, -Infinity, Infinity, -Infinity],
  );
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 30; tries++) {
    const x = box[0] + rand() * (box[1] - box[0]);
    const y = box[2] + rand() * (box[3] - box[2]);
    const a = direction + (rand() - 0.5) * 0.5;
    const ex = x + Math.cos(a) * length;
    const ey = y + Math.sin(a) * length;
    if (!G.inside(poly, x, y) || !G.inside(poly, ex, ey)) continue;
    d += `M${f(x)} ${f(y)}q${f(Math.cos(a) * length * 0.5 + 2)} ${f(Math.sin(a) * length * 0.5 - 3)} ${f(ex - x)} ${f(ey - y)}`;
    placed++;
  }
  return d;
}

function draw() {
  const rand = rng(85);
  const wash = COLORS.ochre;
  let s = A.ground(rand, 720, 330, GROUND);
  // La poussière de la course, derrière le pied d'appui.
  s += `<path d="M800 690q30 -22 60 -4M850 684q24 -30 56 -8M900 690q20 -16 44 -2" stroke="${COLORS.ink}" stroke-width="1.1" stroke-dasharray="2 5" stroke-linecap="round" fill="none"/>`;

  // ─── Le fond : le bras et la patte levée, avec sa faucille ───
  s += A.far(move(WING, 34, -12));
  s += A.far(LEG_RAISED);
  s += A.hook(566, 572, 1.9, 30);
  s += A.hook(590, 578, 1.5, 12) + A.hook(604, 574, 1.4, 12);

  // ─── Le corps ───
  const backLine = sample(BACK, false, 10);
  // Une crête de plumes dressées sur la nuque et le dos.
  s += A.lines(crest(backLine, { step: 9, height: 13, taper: true }), 1.2);
  // L'éventail de plumes au bout de la queue.
  let fan = "";
  for (let i = 0; i < 16; i++) {
    const x = 1010 + i * 10;
    const len = 20 + i * 2.2;
    fan += `M${x} ${298 - i * 0.6}l${f(len * 0.5)} ${f(-len)}M${x} ${312 - i * 0.9}l${f(len * 0.5)} ${f(len)}`;
  }
  s += A.lines(fan, 1.2, 0.9);
  const body = A.form(BODY, { wash, shade: A.SHADE.body, width: 2.4 });
  s += body.svg;
  s += A.lines(feathers(body.poly, 520, rand, 0.25, 10), 0.9, 0.9);
  s += `<path d="${polyPath(move(backLine, 0, 14), false)}" stroke="${COLORS.prussian}" stroke-width="22" fill="none" opacity=".3" filter="url(#lavis)"/>`;

  // ─── La gueule ───
  const gape = [
    ...upper([
      [-10, 6],
      [-60, 11],
      [-110, 11],
      [-150, 6],
    ]),
    ...lower([
      [-150, 18],
      [-142, 10],
      [-100, 13],
      [-40, 11],
      [6, 4],
    ]),
  ];
  s += `<path d="${polyPath(gape)}" fill="${COLORS.plate}"/>`;
  s += `<path d="${polyPath(
    sample(
      lower([
        [-20, 6],
        [-70, 2],
        [-120, 8],
        [-100, 14],
        [-40, 13],
      ]),
      true,
      6,
    ),
  )}" fill="${COLORS.madder}" stroke="${COLORS.ink}" stroke-width="1.1"/>`;
  s += teeth(
    lower([
      [-140, 10],
      [-100, 13],
      [-40, 11],
    ]),
    [Math.sin(-0.34), -Math.cos(-0.34)],
    9,
  );
  s += A.form(lower(MANDIBLE), { wash, shade: A.SHADE.light, width: 2.1 }).svg;
  s += teeth(
    upper([
      [-148, 6],
      [-110, 11],
      [-60, 11],
      [-14, 6],
    ]),
    [-Math.sin(0.1), Math.cos(0.1)],
    13,
  );
  const skull = A.form(upper(SKULL), {
    wash,
    shade: [{ angle: 0.25, gap: 5, from: (i) => (i % 2 ? 0.55 : 0.72) }],
    width: 2.4,
  });
  s += skull.svg;
  const [ex, ey] = upper([[-52, -26]])[0];
  s += A.eye(ex, ey, 7.5, -0.15);
  const [nx, ny] = upper([[-140, -12]])[0];
  s += A.solid(
    sample(
      [
        [nx - 4, ny],
        [nx, ny - 3],
        [nx + 5, ny],
        [nx, ny + 3],
      ],
      true,
      5,
    ),
  );
  s += A.lines(feathers(skull.poly, 40, rand, 0.2, 7), 0.9, 0.8);

  // ─── La patte d'appui ───
  s += A.toe(712, 680, -0.04, 0.78, wash);
  const leg = A.form(LEG, { wash, shade: A.SHADE.limb, width: 2.4 });
  s += leg.svg;
  s += A.lines(feathers(leg.poly, 70, rand, 1.2, 9), 0.9, 0.85);
  let scutes = "";
  for (let i = 0; i < 7; i++) scutes += `M${f(742 - i * 4.6)} ${f(596 + i * 10)}q8 3 15 -1`;
  s += A.lines(scutes, 1, 0.9);
  s += A.toe(722, 688, 0.06, 0.82, wash);

  // ─── Le bras de devant : une aile aux longues plumes, trois griffes ───
  const wing = A.form(WING, {
    wash: COLORS.prussian,
    washOpacity: 0.4,
    shade: [{ angle: 0.5, gap: 6, from: () => 0.7 }],
    width: 2.2,
  });
  s += wing.svg;
  let quills = "";
  for (const [x1, y1, x2, y2] of [
    [470, 400, 452, 440],
    [452, 402, 428, 470],
    [432, 400, 400, 482],
    [410, 398, 378, 484],
    [390, 398, 358, 472],
  ]) {
    quills += `M${x1} ${y1}L${x2} ${y2}`;
  }
  s += A.lines(quills, 1.1, 0.9);
  s += A.hook(340, 410, 2.6, 14) + A.hook(346, 400, 2.9, 13) + A.hook(356, 420, 2.3, 12);

  return s;
}

module.exports = {
  id: "dromaeosaur",
  plate: "II",
  latin: "Deinonychus antirrhopus",
  metres: 3.4,
  span: [142, 1164],
  ground: GROUND,
  facts: {
    fr: { era: "Crétacé inférieur", ago: "115 à 108 Ma", size: "≈ 3,4 m" },
    en: { era: "Early Cretaceous", ago: "115–108 Ma", size: "≈ 3.4 m" },
  },
  draw,
};
