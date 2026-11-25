// La cellule, gravée en clair sur la planche noire : l'image de référence du jeu hors de l'écran
// (page de présentation, vidéo, charte). Dans le jeu, la même cellule est dessinée et animée par
// packages/client/src/cell/draw.ts ; les deux suivent docs/identite/charte.md.
// Boîte de dessin : 640 × 640, centre (320, 320).
const G = require("./gravure.cjs");
const { COLORS, f, sample, polyPath, hatch, stipple, rng } = G;

const RADIUS = 205;
const NUCLEUS = { x: 320, y: 320, r: 62 };
const NUCLEOLUS = { x: 334, y: 306, r: 20 };
const MITOS = [
  { x: 226, y: 262, long: 46, wide: 21, angle: -0.5 },
  { x: 252, y: 404, long: 40, wide: 18, angle: 0.7 },
];
const VACUOLE = { x: 420, y: 258, r: 44 };
const RIBOSOMES = [
  [206, 334],
  [222, 346],
  [208, 356],
  [352, 440],
  [368, 452],
  [338, 456],
  [300, 218],
  [316, 208],
];

function membrane(radius, points = 72) {
  const out = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r =
      radius *
      (1 +
        0.04 * Math.sin(3 * a + 0.6) +
        0.025 * Math.sin(5 * a - 1.3) +
        0.012 * Math.sin(9 * a + 2.1));
    out.push([320 + Math.cos(a) * r, 320 + Math.sin(a) * r]);
  }
  return out;
}

function oval(x, y, rx, ry, angle, steps = 28) {
  const out = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    out.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  return G.place(out, x, y, angle);
}

function arc(x, y, r, a0, a1) {
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${f(x + Math.cos(a0) * r)} ${f(y + Math.sin(a0) * r)}A${f(r)} ${f(r)} 0 ${large} 1 ${f(x + Math.cos(a1) * r)} ${f(y + Math.sin(a1) * r)}`;
}

/** Le dessin de la cellule. `ring` ajoute le cercle gradué de l'objectif. */
function draw({ ring = true } = {}) {
  const rand = rng(27);
  const BONE = COLORS.bone;
  const outer = sample(membrane(RADIUS), true, 4);
  const inner = sample(membrane(RADIUS - 9), true, 4);
  let s = `<circle cx="320" cy="320" r="318" fill="${COLORS.plate}"/>`;
  if (ring) {
    let ticks = "";
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r0 = i % 10 === 0 ? 292 : 300;
      ticks += `M${f(320 + Math.cos(a) * r0)} ${f(320 + Math.sin(a) * r0)}L${f(320 + Math.cos(a) * 308)} ${f(320 + Math.sin(a) * 308)}`;
    }
    s += `<path d="${ticks}" stroke="${BONE}" stroke-width="1" opacity=".45"/><circle cx="320" cy="320" r="308" fill="none" stroke="${BONE}" stroke-width="1.2" opacity=".6"/>`;
  }
  // Les lavis : une teinte par organite, floue, un peu à côté du trait.
  s += `<g filter="url(#lavis-cellule)" opacity=".55">
<path d="${polyPath(outer)}" fill="${COLORS.verdigris}" opacity=".3" transform="translate(4 3)"/>
<circle cx="${NUCLEUS.x + 4}" cy="${NUCLEUS.y + 3}" r="${NUCLEUS.r}" fill="${COLORS.madder}" opacity=".85"/>
${MITOS.map((m) => `<path d="${polyPath(oval(m.x + 3, m.y + 3, m.long, m.wide, m.angle))}" fill="${COLORS.gamboge}" opacity=".9"/>`).join("")}
<circle cx="${VACUOLE.x + 3}" cy="${VACUOLE.y + 2}" r="${VACUOLE.r}" fill="${COLORS.prussian}"/>
</g>`;
  // Les cils.
  let cilia = "";
  for (const [x, y] of G.along(outer, 9)) {
    const a = Math.atan2(y - 320, x - 320) + (rand() - 0.5) * 0.5;
    const len = 12 + rand() * 16;
    const bend = (rand() - 0.5) * 10;
    cilia += `M${f(x)} ${f(y)}q${f(Math.cos(a) * len * 0.5 - Math.sin(a) * bend)} ${f(Math.sin(a) * len * 0.5 + Math.cos(a) * bend)} ${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}`;
  }
  s += `<path d="${cilia}" stroke="${BONE}" stroke-width=".9" fill="none" opacity=".7"/>`;
  // La membrane : deux feuillets, de petits barreaux entre les deux.
  let rungs = "";
  for (let i = 0; i < outer.length; i += 2) {
    rungs += `M${f(outer[i][0])} ${f(outer[i][1])}L${f(inner[i][0])} ${f(inner[i][1])}`;
  }
  s += `<path d="${rungs}" stroke="${BONE}" stroke-width=".8" opacity=".55"/>
<path d="${polyPath(outer)}" fill="none" stroke="${BONE}" stroke-width="2.2"/>
<path d="${polyPath(inner)}" fill="none" stroke="${BONE}" stroke-width="1.2"/>`;
  // Le cytoplasme : du pointillé, plus serré près du bord.
  const mitoShapes = MITOS.map((m) => oval(m.x, m.y, m.long + 4, m.wide + 4, m.angle));
  const free = (x, y) => {
    if (Math.hypot(x - NUCLEUS.x, y - NUCLEUS.y) < NUCLEUS.r + 5) return 0;
    if (Math.hypot(x - VACUOLE.x, y - VACUOLE.y) < VACUOLE.r + 4) return 0;
    if (mitoShapes.some((shape) => G.inside(shape, x, y))) return 0;
    const r = Math.hypot(x - 320, y - 320) / RADIUS;
    return 0.12 + r * r * 0.95;
  };
  s += `<g fill="${BONE}" opacity=".75">${stipple(inner, 1500, rand, free, [0.6, 1.3])}</g>`;
  // Le noyau : double enveloppe, pores, chromatine en pointillé, nucléole haché.
  let pores = "";
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    pores += `M${f(NUCLEUS.x + Math.cos(a) * (NUCLEUS.r - 6))} ${f(NUCLEUS.y + Math.sin(a) * (NUCLEUS.r - 6))}L${f(NUCLEUS.x + Math.cos(a) * NUCLEUS.r)} ${f(NUCLEUS.y + Math.sin(a) * NUCLEUS.r)}`;
  }
  const nucleusShape = oval(NUCLEUS.x, NUCLEUS.y, NUCLEUS.r - 9, NUCLEUS.r - 9, 0, 40);
  const nucleolusShape = oval(NUCLEOLUS.x, NUCLEOLUS.y, NUCLEOLUS.r, NUCLEOLUS.r, 0, 28);
  const chromatin = (x, y) =>
    Math.hypot(x - NUCLEOLUS.x, y - NUCLEOLUS.y) < NUCLEOLUS.r + 2 ? 0 : 1;
  s += `<circle cx="${NUCLEUS.x}" cy="${NUCLEUS.y}" r="${NUCLEUS.r}" fill="${COLORS.plate}" fill-opacity=".35" stroke="${BONE}" stroke-width="2"/>
<circle cx="${NUCLEUS.x}" cy="${NUCLEUS.y}" r="${NUCLEUS.r - 6}" fill="none" stroke="${BONE}" stroke-width="1"/>
<path d="${pores}" stroke="${BONE}" stroke-width="1"/>
<g fill="${BONE}" opacity=".85">${stipple(nucleusShape, 240, rand, chromatin, [0.7, 1.6])}</g>
<circle cx="${NUCLEOLUS.x}" cy="${NUCLEOLUS.y}" r="${NUCLEOLUS.r}" fill="none" stroke="${BONE}" stroke-width="1.6"/>
<path d="${hatch(nucleolusShape, { angle: -0.7, gap: 4 })}" stroke="${BONE}" stroke-width="1" fill="none"/>`;
  // Les mitochondries : une enveloppe, des crêtes.
  for (const m of MITOS) {
    const shape = oval(m.x, m.y, m.long, m.wide, m.angle);
    s += `<path d="${polyPath(shape)}" fill="${COLORS.plate}" fill-opacity=".3" stroke="${BONE}" stroke-width="1.8"/>
<path d="${hatch(shape, { angle: m.angle, gap: 9, from: (i) => (i % 2 ? 0 : 0.35), to: (i) => (i % 2 ? 0.65 : 1) })}" stroke="${BONE}" stroke-width="1.3" fill="none"/>`;
  }
  // La vacuole : un cercle, un reflet haché.
  const vacuoleShape = oval(VACUOLE.x, VACUOLE.y, VACUOLE.r, VACUOLE.r, 0, 36);
  s += `<path d="${polyPath(vacuoleShape)}" fill="${COLORS.plate}" fill-opacity=".25" stroke="${BONE}" stroke-width="1.8"/>
<path d="${hatch(vacuoleShape, { angle: 0.7, gap: 5, from: () => 0.72 })}" stroke="${BONE}" stroke-width=".9" fill="none" opacity=".8"/>
<path d="${arc(VACUOLE.x, VACUOLE.y, VACUOLE.r - 10, 3.5, 4.5)}" stroke="${BONE}" stroke-width="1.4" fill="none"/>`;
  // L'appareil de Golgi : des feuillets empilés, deux vésicules.
  let stacks = "";
  for (let i = 0; i < 4; i++) stacks += arc(450, 426, 60 + i * 11, 2.7, 4.15 - i * 0.05);
  s += `<path d="${stacks}" stroke="${BONE}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
<path d="${stacks}" stroke="${COLORS.plate}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
<circle cx="372" cy="372" r="5" fill="none" stroke="${BONE}" stroke-width="1.3"/><circle cx="356" cy="398" r="3.6" fill="none" stroke="${BONE}" stroke-width="1.3"/>
<g fill="${BONE}">${RIBOSOMES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join("")}</g>`;
  return s;
}

function svg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">
<defs><filter id="lavis-cellule" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter></defs>
${draw()}
</svg>
`;
}

module.exports = { draw, svg };
