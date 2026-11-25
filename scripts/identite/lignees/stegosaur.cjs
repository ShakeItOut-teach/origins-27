// Le stégosaure : impressionner, puis frapper. Le dos arrondi, deux rangs de plaques, la queue
// à quatre piques levée. Boîte de dessin : 1200 × 760, sol à y = 696, tête à gauche.
const G = require("../gravure.cjs");
const A = require("../anatomie.cjs");
const { COLORS, f, sample, polyPath, rng, move, place } = G;

const GROUND = 696;

const BODY = [
  [140, 566],
  [150, 546],
  [180, 536],
  [214, 532],
  [250, 518],
  [310, 480],
  [380, 430],
  [460, 380],
  [550, 340],
  [640, 318],
  [720, 312],
  [800, 330],
  [880, 360],
  [960, 380],
  [1040, 384],
  [1110, 372],
  [1160, 354],
  [1164, 366],
  [1110, 392],
  [1040, 408],
  [960, 412],
  [900, 422],
  [860, 460],
  [800, 520],
  [700, 560],
  [600, 570],
  [500, 560],
  [420, 542],
  [360, 542],
  [300, 560],
  [240, 576],
  [190, 582],
  [156, 580],
];
// La ligne du dos qui porte les plaques, du cou à la queue.
const RIDGE = [
  [262, 510],
  [310, 480],
  [380, 430],
  [460, 380],
  [550, 340],
  [640, 318],
  [720, 312],
  [800, 330],
  [880, 360],
  [960, 380],
  [1030, 384],
];
const FRONT_LEG = [
  [430, 520],
  [420, 580],
  [430, 640],
  [424, 684],
  [432, 696],
  [492, 696],
  [496, 680],
  [488, 640],
  [496, 590],
  [508, 530],
];
const HIND_LEG = [
  [760, 440],
  [738, 520],
  [750, 590],
  [766, 640],
  [760, 684],
  [768, 696],
  [838, 696],
  [842, 680],
  [832, 640],
  [848, 580],
  [868, 520],
  [864, 440],
  [820, 410],
];
// Une plaque : une feuille dressée, posée sur le dos.
const plate = (w, h) => [
  [-w / 2, 4],
  [-w * 0.66, -h * 0.42],
  [-w * 0.3, -h * 0.82],
  [0, -h],
  [w * 0.3, -h * 0.82],
  [w * 0.66, -h * 0.42],
  [w / 2, 4],
];
const SPIKE = [
  [-9, 0],
  [0, -110],
  [9, 0],
];

function draw() {
  const rand = rng(63);
  const wash = COLORS.ochre;
  let s = A.ground(rand, 640, 420, GROUND);

  s += A.far(move(FRONT_LEG, 56, -4));
  s += A.far(move(HIND_LEG, -60, -4));

  // Les plaques : celles du fond d'abord (vert-de-gris), décalées d'un demi-pas.
  const ridge = sample(RIDGE, false, 12);
  const marks = G.along(ridge, 31, false);
  const height = (t) => 34 + 96 * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 1.2;
  const drawPlate = (index, front) => {
    const [x, y, a] = marks[index];
    const t = index / (marks.length - 1);
    const h = height(t) * (front ? 1 : 0.92);
    const shape = place(plate(h * 0.62, h), x, y, a, 1);
    const built = A.form(shape, {
      wash: front ? COLORS.madder : COLORS.verdigris,
      washOpacity: front ? 0.42 : 0.5,
      shade: front ? [{ angle: a + 0.5, gap: 5, from: () => 0.6 }] : A.SHADE.far,
      width: front ? 2.2 : 1.7,
      per: 5,
    });
    // Les sillons qui montent de la base, comme sur l'os.
    let veins = "";
    for (const k of [-0.3, -0.1, 0.1, 0.3]) {
      const [p, q] = place(
        [
          [k * h * 0.5, -2],
          [k * h * 0.9, -h * (0.78 - Math.abs(k) * 0.5)],
        ],
        x,
        y,
        a,
        1,
      );
      veins += `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`;
    }
    return built.svg + A.lines(veins, 0.9, 0.7);
  };
  for (let i = 1; i < marks.length - 1; i += 2) s += drawPlate(i, false);

  // Les piques de la queue : deux au fond, deux devant.
  const spike = (x, y, angle, far) =>
    A.form(place(SPIKE, x, y, angle, 1), {
      wash: far ? COLORS.verdigris : null,
      shade: far ? A.SHADE.far : [{ angle: angle + 1.4, gap: 7 }],
      width: far ? 1.7 : 2.2,
      per: 4,
    }).svg;
  s += spike(1096, 380, 0.5, true) + spike(1134, 370, 1.0, true);

  // Le corps.
  const body = A.form(BODY, { wash, shade: A.SHADE.body, width: 2.6 });
  s += body.svg;
  s += A.skin(body.poly, rand, { scaleCount: 360, dots: 380, size: 3 });
  s += A.lines(
    "M300 500Q292 530 304 556M340 472Q330 510 344 540M560 370Q574 440 610 520M620 356Q636 430 672 516M680 352Q698 430 732 508" +
      "M440 540Q520 552 600 548M900 390Q1000 400 1150 362",
    1.1,
    0.85,
  );

  // Les plaques de devant, puis les piques de devant.
  for (let i = 2; i < marks.length - 1; i += 2) s += drawPlate(i, true);
  s += spike(1110, 384, 0.2, false) + spike(1146, 372, 0.75, false);

  // Les pattes.
  s += A.form(HIND_LEG, { wash, shade: A.SHADE.limb, width: 2.6 }).svg;
  s += A.lines(
    "M820 430Q780 500 776 570M850 460Q820 520 816 580M754 600Q790 610 836 598M762 650Q796 660 834 648",
    1.1,
    0.9,
  );
  s += A.nails(770, 696, 66);
  s += A.form(FRONT_LEG, { wash, shade: A.SHADE.limb, width: 2.6 }).svg;
  s += A.lines("M424 590Q458 600 494 588M428 646Q458 656 490 644", 1.1, 0.9);
  s += A.nails(434, 696, 56);

  // La tête : petite, étroite, un bec.
  s += A.lines("M146 568Q176 566 206 560", 1.5);
  s += A.eye(184, 548, 5.5, -0.1, false);
  s += A.solid(
    sample(
      [
        [150, 554],
        [155, 550],
        [160, 554],
        [155, 558],
      ],
      true,
      5,
    ),
  );
  s += A.lines("M214 534Q224 556 216 578M250 520Q262 546 250 572", 1, 0.8);

  return s;
}

module.exports = {
  id: "stegosaur",
  plate: "VI",
  latin: "Stegosaurus stenops",
  metres: 7,
  span: [140, 1164],
  ground: GROUND,
  facts: {
    fr: { era: "Jurassique supérieur", ago: "155 à 150 Ma", size: "≈ 7 m" },
    en: { era: "Late Jurassic", ago: "155–150 Ma", size: "≈ 7 m" },
  },
  draw,
};
