// Le ptérosaure, maître du ciel : en plein vol, les ailes de peau tendues sur un doigt géant,
// au-dessus de la mer. Boîte de dessin : 1200 × 760, vu de dessus, bec vers le haut à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, f, sample, polyPath, rng } = G;

const mirror = (pts) => pts.map(([x, y]) => [1200 - x, y]);

// L'aile gauche : le bras, le poignet, le long doigt, puis le bord de fuite jusqu'à la cheville.
const WING = [
  [572, 338],
  [520, 312],
  [470, 296],
  [410, 268],
  [360, 246],
  [280, 262],
  [190, 296],
  [90, 334],
  [170, 354],
  [260, 386],
  [360, 422],
  [460, 448],
  [540, 472],
  [592, 478],
  [598, 420],
  [586, 370],
];
// Les os de l'aile, de l'épaule au bout du doigt.
const BONES = [
  [576, 344],
  [470, 300],
  [360, 250],
  [280, 266],
  [190, 300],
  [96, 334],
];
const TORSO = [
  [600, 318],
  [630, 340],
  [640, 400],
  [628, 460],
  [600, 482],
  [572, 460],
  [560, 400],
  [570, 340],
];
const NECK = [
  [572, 252],
  [606, 246],
  [624, 290],
  [630, 336],
  [578, 340],
  [578, 296],
];
const HEAD = [
  [420, 150],
  [480, 174],
  [540, 204],
  [568, 212],
  [602, 194],
  [652, 164],
  [704, 138],
  [694, 156],
  [652, 198],
  [618, 234],
  [598, 252],
  [570, 260],
  [540, 246],
  [480, 202],
];

function membrane(wing, wrist, rand) {
  // Les fibres de la membrane : de fins traits qui partent du bras vers le bord de fuite.
  let d = "";
  const edge = sample(wing.slice(7, 14), false, 8);
  const arm = sample(wing.slice(0, 8), false, 8);
  for (let i = 2; i < edge.length - 2; i += 2) {
    const [ex, ey] = edge[i];
    const [ax, ay] =
      arm[
        Math.min(arm.length - 1, arm.length - 1 - Math.round((i / edge.length) * (arm.length - 1)))
      ];
    const t = 0.18 + rand() * 0.12;
    d += `M${f(ax + (ex - ax) * t)} ${f(ay + (ey - ay) * t)}L${f(ex - (ex - ax) * 0.06)} ${f(ey - (ey - ay) * 0.06)}`;
  }
  void wrist;
  return A.lines(d, 0.8, 0.7);
}

function draw() {
  const rand = rng(107);
  const wash = COLORS.ochre;
  let s = "";

  // La mer, loin dessous : l'horizon, des vagues, l'ombre de l'animal sur l'eau.
  s += A.lines("M70 640H1150", 1.5);
  let waves = "";
  for (let i = 0; i < 34; i++) {
    const x = 90 + rand() * 1020;
    const y = 654 + rand() * 60;
    const w = 14 + rand() * 22;
    waves += `M${f(x)} ${f(y)}q${f(w / 4)} ${f(-5)} ${f(w / 2)} 0t${f(w / 2)} 0`;
  }
  s += A.lines(waves, 1, 0.8);
  s += A.groundShadow(600, 666, 300, 7);
  // Deux nuages au trait, derrière.
  s += A.lines(
    "M120 120q30 -30 70 -8q30 -22 62 4q34 -6 40 22M930 90q26 -26 60 -6q30 -20 58 6q30 -4 34 20",
    1.1,
    0.6,
  );

  // Les pattes arrière, qui traînent.
  s += A.form(
    [
      [584, 452],
      [596, 456],
      [590, 520],
      [582, 552],
      [572, 548],
      [578, 516],
    ],
    { wash, shade: A.SHADE.light, width: 1.8, per: 5 },
  ).svg;
  s += A.form(
    mirror([
      [584, 452],
      [596, 456],
      [590, 520],
      [582, 552],
      [572, 548],
      [578, 516],
    ]),
    { wash, shade: A.SHADE.light, width: 1.8, per: 5 },
  ).svg;
  s += A.lines(
    "M572 548l-6 14M578 552l-1 15M584 552l5 13M628 548l6 14M622 552l1 15M616 552l-5 13",
    1.5,
  );

  // Les ailes.
  for (const [wing, bones, sign] of [
    [WING, BONES, 1],
    [mirror(WING), mirror(BONES), -1],
  ]) {
    const built = A.form(wing, {
      wash,
      washOpacity: 0.42,
      shade: [{ angle: sign * 0.9, gap: 9, from: () => 0.72 }],
      width: 2.4,
    });
    s += built.svg;
    s += membrane(wing, bones[2], rand);
    // Les os : un trait épais, des articulations.
    const line = sample(bones, false, 8);
    s += `<path d="${polyPath(line, false)}" stroke="${COLORS.ink}" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${polyPath(line, false)}" stroke="${COLORS.paper}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    for (const [x, y] of [bones[1], bones[2]]) {
      s += `<circle cx="${x}" cy="${y}" r="5" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="1.6"/>`;
    }
    // Les trois petits doigts griffus du poignet.
    const [wx, wy] = bones[2];
    s +=
      A.hook(wx - sign * 2, wy - 6, -Math.PI / 2 - sign * 0.5, 13) +
      A.hook(wx + sign * 6, wy - 8, -Math.PI / 2, 12) +
      A.hook(wx + sign * 13, wy - 6, -Math.PI / 2 + sign * 0.5, 11);
  }

  // Le corps, le cou, la tête.
  const torso = A.form(TORSO, {
    wash,
    shade: [{ angle: 0.3, gap: 5, from: (i) => (i % 2 ? 0.4 : 0.6) }],
    width: 2.4,
  });
  s += torso.svg;
  s += `<g fill="${COLORS.ink}">${G.stipple(torso.poly, 160, rand)}</g>`;
  s += A.form(NECK, { wash, shade: A.SHADE.light, width: 2.2, per: 6 }).svg;
  s += A.lines("M580 300Q602 294 622 300M580 318Q604 312 626 320", 1, 0.8);
  const head = A.form(HEAD, {
    wash,
    shade: [{ angle: 0.9, gap: 5.5, from: (i) => (i % 2 ? 0.55 : 0.72) }],
    width: 2.5,
  });
  s += head.svg;
  // La crête, teintée ; le bec fendu ; l'œil.
  s += `<path d="${polyPath(
    sample(
      [
        [602, 194],
        [652, 164],
        [704, 138],
        [694, 156],
        [652, 198],
        [618, 234],
      ],
      true,
      6,
    ),
  )}" fill="${COLORS.madder}" opacity=".4" filter="url(#lavis)"/>`;
  s += A.lines("M426 156Q500 196 566 244M610 200Q650 176 696 146", 1.3);
  s += A.eye(560, 226, 6.5, 0.45, false);

  return s;
}

module.exports = {
  id: "pterosaur",
  plate: "VIII",
  latin: "Pteranodon longiceps",
  metres: 6.5,
  span: [90, 1110],
  ground: 640,
  facts: {
    fr: { era: "Crétacé supérieur", ago: "86 à 84 Ma", size: "envergure ≈ 6,5 m" },
    en: { era: "Late Cretaceous", ago: "86–84 Ma", size: "wingspan ≈ 6.5 m" },
  },
  draw,
};
