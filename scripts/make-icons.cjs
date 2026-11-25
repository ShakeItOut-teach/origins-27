// Fabrique les icônes du jeu (écran d'accueil, onglet) : la cellule vue dans l'objectif, sur
// le papier du carnet de laboratoire. Aucune bibliothèque : le dessin est calculé point par
// point, puis écrit en PNG. À relancer si l'identité du jeu change : `node scripts/make-icons.cjs`.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const OUT = path.resolve(__dirname, "..", "packages", "client", "public", "icons");

// Les couleurs du jeu (packages/client/src/theme/tokens.css).
const PAPER = [0xf4, 0xef, 0xe4];
const INK = [0x1d, 0x24, 0x33];
const LENS_CENTER = [0x17, 0x28, 0x3f];
const LENS_EDGE = [0x06, 0x0a, 0x12];
const IODINE = [0xd9, 0xa4, 0x41];
const MEMBRANE = [0xe9, 0xa9, 0xb4];
const NUCLEUS = [0x3a, 0x24, 0x4a];
const ALGAE = [0x6f, 0xbf, 0x95];
const EOSIN = [0xd9, 0x69, 0x4f];

const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);

/** La couleur d'un point de l'icône ; x et y vont de 0 à 1. `lens` est le rayon de l'objectif. */
function colorAt(x, y, lens) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const k = lens / 0.4;

  if (r <= lens) {
    // La cellule : un noyau, son nucléole, deux organites, une membrane qui ondule.
    if (Math.hypot(dx - 0.02 * k, dy + 0.02 * k) <= 0.03 * k) return IODINE;
    if (r <= 0.085 * k) return NUCLEUS;
    if (r <= 0.1 * k) return IODINE;
    if (Math.hypot(dx - 0.125 * k, dy - 0.085 * k) <= 0.03 * k) return ALGAE;
    if (Math.hypot(dx + 0.13 * k, dy - 0.06 * k) <= 0.026 * k) return EOSIN;
    if (Math.hypot(dx + 0.05 * k, dy + 0.15 * k) <= 0.022 * k) return ALGAE;
    const membrane = (0.255 + 0.012 * Math.sin(3 * angle + 0.6) + 0.008 * Math.sin(5 * angle)) * k;
    if (Math.abs(r - membrane) <= 0.011 * k) return MEMBRANE;
    return mix(LENS_CENTER, LENS_EDGE, Math.min(1, r / (lens * 0.95)) ** 2);
  }
  // Le bord de l'objectif, puis son ombre franche, décalée vers le bas à droite.
  if (r <= lens + 0.028 * k) return INK;
  if (Math.hypot(dx - 0.03 * k, dy - 0.03 * k) <= lens + 0.028 * k) return INK;
  return PAPER;
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
  ["icon-192.png", 192, 0.4],
  ["icon-512.png", 512, 0.4],
  // Android découpe cette icône en rond ou en carré arrondi : le dessin reste au centre.
  ["icon-maskable-512.png", 512, 0.31],
  ["apple-touch-icon.png", 180, 0.4],
];
for (const [name, size, lens] of FILES) {
  fs.writeFileSync(path.join(OUT, name), png(size, lens));
  process.stdout.write(`${name} (${String(size)} px)\n`);
}
