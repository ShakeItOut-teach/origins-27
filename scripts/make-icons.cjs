// Fabrique les icônes du jeu (écran d'accueil, onglet) dans le style « Atlas »
// (docs/identite/charte.md) : la cellule gravée en clair sur une planche noire, cerclée d'un
// double filet, entourée de rayons à l'encre sur le papier.
// Aucune bibliothèque : le dessin est calculé point par point, puis écrit en PNG ; la version
// vectorielle (icon.svg) est écrite à partir des mêmes mesures.
// À relancer si l'identité du jeu change : `node scripts/make-icons.cjs`.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const OUT = path.resolve(__dirname, "..", "packages", "client", "public", "icons");

// Les couleurs du jeu (packages/client/src/theme/tokens.css).
const PAPER = [0xed, 0xe6, 0xd6];
const INK = [0x1e, 0x1b, 0x18];
const PLATE = [0x14, 0x11, 0x0e];
const PLATE_GLOW = [0x26, 0x20, 0x1a];
const BONE = [0xf1, 0xeb, 0xdd];
const GAMBOGE = [0xe6, 0xb9, 0x4a];
const PRUSSIAN = [0x8f, 0xb4, 0xcf];
const MADDER = [0xd9, 0x8b, 0xa6];
const VERDIGRIS = [0x8d, 0xbf, 0xaf];

const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);

// Les mesures du dessin, pour un objectif de rayon 1. Tout est multiplié par le rayon voulu.
const RAYS = 72;
const CELL = {
  membrane: (angle) => 0.64 + 0.03 * Math.sin(3 * angle + 0.6) + 0.02 * Math.sin(5 * angle),
  nucleus: { x: 0, y: 0, r: 0.2 },
  nucleolus: { x: 0.05, y: -0.05, r: 0.075 },
  vacuole: { x: 0.3, y: -0.2, r: 0.13 },
  mitos: [
    { x: -0.3, y: -0.18, long: 0.15, wide: 0.07, angle: -0.5 },
    { x: -0.2, y: 0.3, long: 0.13, wide: 0.06, angle: 0.7 },
  ],
};

/** Un hasard fixe par case : le pointillé est le même à chaque fabrication. */
function chance(ix, iy) {
  let h = (ix * 374761393 + iy * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return [(h & 0xffff) / 0xffff, ((h >>> 16) & 0xffff) / 0xffff];
}

/** La couleur d'un point de l'icône ; x et y vont de 0 à 1. `lens` est le rayon de la planche. */
function colorAt(x, y, lens) {
  const dx = (x - 0.5) / lens;
  const dy = (y - 0.5) / lens;
  const r = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  if (r > 1) {
    // Le double filet, puis les rayons gravés : un long, un court.
    if (r > 1.045 && r <= 1.085) return INK;
    if (r <= 1.15) return PAPER;
    const turn = ((angle / (Math.PI * 2)) * RAYS + RAYS) % RAYS;
    const index = Math.round(turn) % RAYS;
    const offset = Math.abs(turn - Math.round(turn)) * ((Math.PI * 2) / RAYS) * r;
    const reach = index % 2 === 0 ? 9 : 1.34 + (index % 6) * 0.03;
    return offset < 0.011 && r <= reach ? INK : PAPER;
  }

  const ground = mix(PLATE_GLOW, PLATE, Math.min(1, r) ** 2);
  const membrane = CELL.membrane(angle);
  // La membrane : deux traits, de petits barreaux entre les deux.
  if (Math.abs(r - membrane) <= 0.028) return BONE;
  if (Math.abs(r - (membrane - 0.075)) <= 0.011) return BONE;
  if (r < membrane && r > membrane - 0.075) {
    const rung = Math.abs(((angle * 40) / Math.PI) % 1);
    return rung < 0.16 || rung > 0.84 ? mix(ground, BONE, 0.7) : ground;
  }
  // Les cils, autour.
  if (r > membrane && r < membrane + 0.13) {
    const hair = Math.abs(((angle * 28) / Math.PI) % 1);
    return hair < 0.09 || hair > 0.91 ? mix(ground, BONE, 0.75) : ground;
  }
  if (r > membrane) return ground;

  // L'intérieur : un lavis léger, puis les organites, puis le pointillé.
  const inside = mix(ground, VERDIGRIS, 0.1);
  const { nucleus, nucleolus, vacuole, mitos } = CELL;
  const toNucleus = Math.hypot(dx - nucleus.x, dy - nucleus.y);
  if (Math.hypot(dx - nucleolus.x, dy - nucleolus.y) <= nucleolus.r) return BONE;
  if (Math.abs(toNucleus - nucleus.r) <= 0.02) return BONE;
  if (toNucleus < nucleus.r) return mix(PLATE, MADDER, 0.42);
  const toVacuole = Math.hypot(dx - vacuole.x, dy - vacuole.y);
  if (Math.abs(toVacuole - vacuole.r) <= 0.017) return BONE;
  if (toVacuole < vacuole.r) return mix(PLATE, PRUSSIAN, 0.45);
  for (const m of mitos) {
    const cos = Math.cos(m.angle);
    const sin = Math.sin(m.angle);
    const u = ((dx - m.x) * cos + (dy - m.y) * sin) / m.long;
    const v = (-(dx - m.x) * sin + (dy - m.y) * cos) / m.wide;
    const d = Math.hypot(u, v);
    if (Math.abs(d - 1) <= 0.16) return BONE;
    if (d < 1) return Math.abs((u * 2.5) % 1) < 0.22 ? BONE : mix(PLATE, GAMBOGE, 0.5);
  }
  const cell = 0.05;
  const ix = Math.floor(dx / cell);
  const iy = Math.floor(dy / cell);
  const [a, b] = chance(ix, iy);
  const px = (ix + 0.2 + a * 0.6) * cell;
  const py = (iy + 0.2 + b * 0.6) * cell;
  // Plus serré près du bord : c'est l'ombre des gravures.
  if (a + b < 0.5 + (r / membrane) * 1.3 && Math.hypot(dx - px, dy - py) < 0.011) return BONE;
  return inside;
}

/** La même icône en vectoriel, pour l'onglet du navigateur. */
function svg() {
  const lens = 40;
  const at = (v) => Math.round(v * 100) / 100;
  let rays = "";
  for (let index = 0; index < RAYS; index++) {
    const angle = (index / RAYS) * Math.PI * 2;
    const reach = index % 2 === 0 ? 2 : 1.34 + (index % 6) * 0.03;
    rays += `M${at(50 + Math.cos(angle) * lens * 1.15)} ${at(50 + Math.sin(angle) * lens * 1.15)}L${at(50 + Math.cos(angle) * lens * reach)} ${at(50 + Math.sin(angle) * lens * reach)}`;
  }
  let membrane = "";
  for (let i = 0; i <= 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const r = CELL.membrane(angle) * lens;
    membrane += `${i === 0 ? "M" : "L"}${at(50 + Math.cos(angle) * r)} ${at(50 + Math.sin(angle) * r)}`;
  }
  const { nucleus, nucleolus, vacuole, mitos } = CELL;
  const circle = (c, fill, stroke) =>
    `<circle cx="${at(50 + c.x * lens)}" cy="${at(50 + c.y * lens)}" r="${at(c.r * lens)}" fill="${fill}"${stroke ? ` stroke="${hex(BONE)}" stroke-width="1.3"` : ""} />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${hex(PAPER)}" />
  <path d="${rays}" stroke="${hex(INK)}" stroke-width="0.9" />
  <circle cx="50" cy="50" r="${at(lens * 1.065)}" fill="none" stroke="${hex(INK)}" stroke-width="1.6" />
  <circle cx="50" cy="50" r="${lens}" fill="${hex(PLATE)}" />
  <path d="${membrane}Z" fill="${hex(mix(PLATE, VERDIGRIS, 0.1))}" stroke="${hex(BONE)}" stroke-width="2.2" />
  ${mitos.map((m) => `<ellipse cx="${at(50 + m.x * lens)}" cy="${at(50 + m.y * lens)}" rx="${at(m.long * lens)}" ry="${at(m.wide * lens)}" transform="rotate(${at((m.angle * 180) / Math.PI)} ${at(50 + m.x * lens)} ${at(50 + m.y * lens)})" fill="${hex(mix(PLATE, GAMBOGE, 0.5))}" stroke="${hex(BONE)}" stroke-width="1.1" />`).join("\n  ")}
  ${circle(vacuole, hex(mix(PLATE, PRUSSIAN, 0.45)), true)}
  ${circle(nucleus, hex(mix(PLATE, MADDER, 0.42)), true)}
  ${circle(nucleolus, hex(BONE), false)}
</svg>
`;
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

/** Dessine l'icône : chaque point est la moyenne de 4 × 4 mesures, pour des bords doux. */
function png(size, lens) {
  const SAMPLES = 4;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 3 + 1);
    raw[row] = 0;
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const color = colorAt(
            (px + (sx + 0.5) / SAMPLES) / size,
            (py + (sy + 0.5) / SAMPLES) / size,
            lens,
          );
          sum[0] += color[0];
          sum[1] += color[1];
          sum[2] += color[2];
        }
      }
      const at = row + 1 + px * 3;
      raw[at] = Math.round(sum[0] / (SAMPLES * SAMPLES));
      raw[at + 1] = Math.round(sum[1] / (SAMPLES * SAMPLES));
      raw[at + 2] = Math.round(sum[2] / (SAMPLES * SAMPLES));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits par couleur
  header[9] = 2; // rouge, vert, bleu
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
const FILES = [
  ["icon-192.png", 192, 0.37],
  ["icon-512.png", 512, 0.37],
  // Android découpe cette icône en rond ou en carré arrondi : le dessin reste au centre.
  ["icon-maskable-512.png", 512, 0.29],
  ["apple-touch-icon.png", 180, 0.37],
];
for (const [name, size, lens] of FILES) {
  fs.writeFileSync(path.join(OUT, name), png(size, lens));
  process.stdout.write(`${name} (${String(size)} px)\n`);
}
fs.writeFileSync(path.join(OUT, "icon.svg"), svg());
process.stdout.write("icon.svg\n");
