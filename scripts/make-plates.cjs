// Fabrique les figures des lignées d'APEX, gravées dans le style « Atlas » (docs/identite/charte.md).
// Aucune bibliothèque : chaque animal est décrit par des points dans scripts/identite/lignees/,
// et dessiné ici en SVG. À relancer après toute retouche : `node scripts/make-plates.cjs`.
// Les figures servent au jeu et à la page de présentation (packages/client/public/planches/).
const fs = require("node:fs");
const path = require("node:path");
const { COLORS, f } = require("./identite/gravure.cjs");

const OUT = path.resolve(__dirname, "..", "packages", "client", "public", "planches");
const BOX = [1200, 760];

// L'ordre de APEX_LINEAGES (packages/data/src/ids.ts). Une lignée sans dessin est dite, pas cachée.
const LINEAGES = [
  "tyrannosaur",
  "dromaeosaur",
  "brachiosaur",
  "triceratops",
  "ankylosaur",
  "stegosaur",
  "parasaurolophus",
  "pterosaur",
  "earlyBird",
];

/** La barre d'échelle : sa longueur en mètres est choisie pour rester lisible. */
function scaleBar(lineage) {
  const perMetre = (lineage.span[1] - lineage.span[0]) / lineage.metres;
  const metres = [5, 2, 1, 0.5, 0.2, 0.1].find((m) => m * perMetre <= 260) ?? 0.1;
  const w = metres * perMetre;
  const y = BOX[1] - 22;
  return {
    metres,
    svg: `<path d="M70 ${y}h${f(w)}M70 ${y - 7}v14M${f(70 + w / 2)} ${y - 4}v8M${f(70 + w)} ${y - 7}v14" stroke="${COLORS.ink}" stroke-width="1.6" fill="none"/>`,
  };
}

function figure(lineage) {
  const bar = scaleBar(lineage);
  return {
    metres: bar.metres,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX[0]} ${BOX[1]}" width="${BOX[0]}" height="${BOX[1]}">
<defs><filter id="lavis" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>
${lineage.draw()}
${bar.svg}
</svg>
`,
  };
}

fs.mkdirSync(OUT, { recursive: true });
const index = [];
for (const id of LINEAGES) {
  const file = path.join(__dirname, "identite", "lignees", `${id}.cjs`);
  if (!fs.existsSync(file)) {
    process.stdout.write(`${id} : pas encore dessinée\n`);
    continue;
  }
  const lineage = require(file);
  const { svg, metres } = figure(lineage);
  fs.writeFileSync(path.join(OUT, `${id}.svg`), svg);
  index.push({
    id,
    plate: lineage.plate,
    latin: lineage.latin,
    scaleMetres: metres,
    facts: lineage.facts,
  });
  process.stdout.write(`${id}.svg (${String(Math.round(svg.length / 1024))} Ko)\n`);
}
// La cellule de référence, pour la page de présentation et la charte.
fs.writeFileSync(path.join(OUT, "cellule.svg"), require("./identite/cellule.cjs").svg());
process.stdout.write("cellule.svg\n");
fs.writeFileSync(path.join(OUT, "planches.json"), JSON.stringify(index, null, 2) + "\n");
