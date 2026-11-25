// Le scénario de la vidéo de présentation : ce qu'on montre, dans quel ordre, avec quels mots.
// Chaque « plan » est soit un carton (du texte sur le papier), soit une capture du vrai jeu
// (une partie préparée, des gestes joués à des instants donnés), soit les planches d'APEX.
// Pour changer la vidéo, on change ce fichier, puis `node scripts/make-video.cjs`.

/** Les gestes sont joués dans le vrai jeu. `at` est en millisecondes depuis le début du plan. */
const tap = (at, selector) => ({ at, tap: selector });
const run = (at, code) => ({ at, run: code });

// Toucher un onglet par son rang (les onglets n'ont pas de nom stable d'une langue à l'autre).
const tab = (at, index) =>
  run(at, `document.querySelectorAll(".views .view")[${String(index)}]?.click()`);

const PLANS = [
  {
    kind: "title",
    ms: 2800,
    title: ["Origins", "XXVII"],
    text: "De la bactérie à l'APEX, en vingt-sept jours.",
  },
  {
    kind: "game",
    ms: 6400,
    start: "fresh",
    caption: "Vous naissez bactérie.",
    legend: "Fig. 1. — Jour 1. Une cellule, rien d'autre.",
    // Vingt-six touches : assez pour que la cellule propose de grandir.
    steps: Array.from({ length: 26 }, (_, index) => tap(700 + index * 170, ".lens-canvas")),
    still: "jour-1",
    stillAt: 5900,
  },
  {
    kind: "game",
    ms: 6000,
    start: "day20",
    caption: "Grandir, organite par organite.",
    legend: "Fig. 2. — Jour 21. La même cellule.",
    steps: [
      tap(2200, '[data-testid="slot-mitochondrion"]'),
      run(5200, 'document.querySelector(".close")?.click()'),
    ],
    still: "cellule",
    stillAt: 1500,
  },
  {
    kind: "game",
    ms: 4200,
    start: "day20",
    caption: "Explorer la goutte.",
    legend: "Fig. 3. — Récolter, chasser, repérer.",
    steps: [tab(300, 1)],
    still: "goutte",
    stillAt: 2600,
  },
  {
    kind: "game",
    ms: 4200,
    start: "day20",
    caption: "Tenir tête à cinq cents organismes.",
    legend: "Fig. 4. — Les rivaux : défendre, riposter.",
    steps: [tab(300, 2), run(1800, "window.scrollBy({ top: 260, behavior: 'smooth' })")],
    still: "rivaux",
    stillAt: 1400,
  },
  {
    kind: "game",
    ms: 4200,
    start: "day20",
    caption: "Évoluer.",
    legend: "Fig. 5. — La recherche : des gènes à exprimer.",
    steps: [tab(300, 3), run(1900, "window.scrollBy({ top: 280, behavior: 'smooth' })")],
    still: "recherche",
    stillAt: 1400,
  },
  {
    kind: "plates",
    ms: 6600,
    caption: "Et sortir de l'eau.",
    ids: ["tyrannosaur", "triceratops", "stegosaur", "pterosaur", "dromaeosaur", "brachiosaur"],
  },
  {
    kind: "title",
    ms: 3200,
    title: ["Origins", "XXVII"],
    text: "Gratuit. Dans votre navigateur. Quelques minutes par jour.",
  },
];

/** Les noms des lignées montrées à la fin (les mêmes que dans packages/data/src/i18n/fr.ts). */
const NAMES = {
  tyrannosaur: "Tyrannosaure",
  dromaeosaur: "Dromaéosaure",
  brachiosaur: "Brachiosaure",
  triceratops: "Tricératops",
  ankylosaur: "Ankylosaure",
  stegosaur: "Stégosaure",
  parasaurolophus: "Parasaurolophe",
  pterosaur: "Ptérosaure",
  earlyBird: "Oiseau primitif",
};

module.exports = { PLANS, NAMES };
