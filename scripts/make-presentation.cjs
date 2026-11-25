// Fabrique la page de présentation du jeu, dans le style « Atlas » (docs/identite/charte.md) :
//   /decouvrir/  en français,  /discover/  en anglais.
// Ce sont des pages simples, sans programme à charger : elles s'ouvrent vite et se partagent.
// Les noms et les textes des lignées viennent de packages/data (i18n) ; les figures de
// scripts/make-plates.cjs ; les captures et le film de scripts/make-video.cjs.
// À relancer après un changement de texte ou d'image : `node scripts/make-presentation.cjs`.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "packages", "client", "public");
const SHARED = path.join(PUBLIC, "decouvrir");
const MODULES = path.join(ROOT, "packages", "client", "node_modules");

// Les polices du jeu, recopiées pour cette page (licence libre SIL OFL).
const FONTS = {
  "bodoni.woff2": "@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-normal.woff2",
  "spectral-400.woff2": "@fontsource/spectral/files/spectral-latin-400-normal.woff2",
  "spectral-400-italique.woff2": "@fontsource/spectral/files/spectral-latin-400-italic.woff2",
  "spectral-600.woff2": "@fontsource/spectral/files/spectral-latin-600-normal.woff2",
  "plex-500.woff2": "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
};

/** Lit un texte du jeu dans packages/data, sans le recopier ici. */
function gameTexts(lang) {
  const source = fs.readFileSync(
    path.join(ROOT, "packages", "data", "src", "i18n", `${lang}.ts`),
    "utf8",
  );
  return (key) => {
    const found = new RegExp(`"${key.replaceAll(".", "\\.")}":\\s*"([^"]*)"`).exec(source);
    if (found === null) throw new Error(`texte introuvable : ${key} (${lang})`);
    return found[1];
  };
}

const COPY = {
  fr: {
    path: "decouvrir",
    other: { path: "discover", label: "English" },
    title: "Origins 27 — de la bactérie à l'APEX en 27 jours",
    description:
      "Un jeu de stratégie gratuit, dans le navigateur. Vous naissez bactérie ; en 27 jours, vous tenez tête à 500 organismes et vous sortez de l'eau.",
    kicker: "Jeu de stratégie · gratuit · dans le navigateur",
    h1: ["De la bactérie", "à l'APEX,", "en 27 jours"],
    lead: "Vous naissez bactérie dans un océan primitif. Vous grandissez, vous évoluez, vous tenez tête à cinq cents organismes. Au bout du chemin : sortir de l'eau.",
    play: "Jouer gratuitement",
    playNote: "Rien à installer. Quelques minutes par jour.",
    fig1: "Fig. 1. — Vous commencez ici : une cellule.",
    film: "Le film",
    filmLegend: "Trente-huit secondes, tournées dans le vrai jeu.",
    filmMissing: "Votre navigateur ne lit pas cette vidéo.",
    season: "Une saison",
    seasonLead: "Vingt-sept jours, du premier battement de cil à la terre ferme.",
    steps: [
      [
        "Grandir",
        "capture-cellule",
        "Une cellule qui produit et se construit, organite par organite : mitochondrie, vacuole, noyau.",
      ],
      [
        "Explorer",
        "capture-goutte",
        "Une goutte d'océan à parcourir : récolter, chasser, repérer.",
      ],
      [
        "S'affronter",
        "capture-rivaux",
        "Des troupes, des pillages, des défenses. Et des protections : personne n'est puni de dormir.",
      ],
      [
        "Évoluer",
        "capture-recherche",
        "Des gènes à exprimer, des mutations à choisir : aucune partie ne ressemble à une autre.",
      ],
    ],
    captureAlt: "Capture du jeu sur téléphone",
    apex: "Les neuf lignées d'APEX",
    apexLead:
      "Les meilleurs sortent de l'eau. Chaque lignée a sa planche, gravée d'après un cousin fossile bien réel.",
    plateAlt: "gravé à l'encre",
    facts: "Ce qu'il faut savoir",
    factLines: [
      ["Prix", "Gratuit. Aucun avantage ne s'achète."],
      ["Une saison", "27 jours"],
      ["Un monde", "500 organismes"],
      ["Une visite", "2 à 5 minutes"],
      ["Où", "Dans le navigateur, téléphone d'abord"],
      ["À la fin", "Votre espèce entre au Muséum"],
    ],
    closing: "La saison a commencé.",
    foot: "Origins XXVII — un atlas d'histoire naturelle dont les planches sont vivantes.",
    plate: "Pl.",
  },
  en: {
    path: "discover",
    other: { path: "decouvrir", label: "Français" },
    title: "Origins 27 — from bacterium to APEX in 27 days",
    description:
      "A free strategy game in your browser. You are born a bacterium; in 27 days you stand up to 500 organisms and walk out of the water.",
    kicker: "Strategy game · free · in your browser",
    h1: ["From bacterium", "to APEX,", "in 27 days"],
    lead: "You are born a bacterium in a primeval ocean. You grow, you evolve, you stand up to five hundred organisms. At the end of the road: walking out of the water.",
    play: "Play for free",
    playNote: "Nothing to install. A few minutes a day.",
    fig1: "Fig. 1. — You start here: one cell.",
    film: "The film",
    filmLegend: "Thirty-eight seconds, shot in the real game (captions in French).",
    filmMissing: "Your browser cannot play this video.",
    season: "A season",
    seasonLead: "Twenty-seven days, from the first beat of a cilium to dry land.",
    steps: [
      [
        "Grow",
        "capture-cellule",
        "A cell that produces and builds itself, organelle by organelle: mitochondrion, vacuole, nucleus.",
      ],
      ["Explore", "capture-goutte", "A drop of ocean to roam: harvest, hunt, scout."],
      [
        "Fight",
        "capture-rivaux",
        "Troops, raids, defences. And protections: nobody is punished for sleeping.",
      ],
      [
        "Evolve",
        "capture-recherche",
        "Genes to express, mutations to choose: no two games are alike.",
      ],
    ],
    captureAlt: "The game on a phone (in French)",
    apex: "The nine APEX lineages",
    apexLead:
      "The best walk out of the water. Each lineage has its plate, engraved after a very real fossil cousin.",
    plateAlt: "engraved in ink",
    facts: "Good to know",
    factLines: [
      ["Price", "Free. No advantage can be bought."],
      ["A season", "27 days"],
      ["A world", "500 organisms"],
      ["A visit", "2 to 5 minutes"],
      ["Where", "In your browser, phone first"],
      ["At the end", "Your species enters the Museum"],
    ],
    closing: "The season has begun.",
    foot: "Origins XXVII — a natural history atlas whose plates are alive.",
    plate: "Pl.",
  },
};

// Les mêmes valeurs que packages/client/src/theme/tokens.css : cette page ne charge pas le jeu.
const STYLE = `
@font-face{font-family:"Bodoni Moda";src:url("/decouvrir/polices/bodoni.woff2") format("woff2");font-weight:400 900;font-display:swap}
@font-face{font-family:"Spectral";src:url("/decouvrir/polices/spectral-400.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Spectral";src:url("/decouvrir/polices/spectral-400-italique.woff2") format("woff2");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Spectral";src:url("/decouvrir/polices/spectral-600.woff2") format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"IBM Plex Mono";src:url("/decouvrir/polices/plex-500.woff2") format("woff2");font-weight:500;font-display:swap}
:root{
  --ink:#1e1b18;--ink-soft:#5a5148;--paper:#ede6d6;--paper-deep:#e0d7c3;
  --prussian:#1d4f73;--madder:#a63d60;--gamboge:#d9a520;--verdigris:#356b5e;--plate:#14110e;--bone:#f1ebdd;
  --font-title:"Bodoni Moda","Didot","Bodoni MT",Georgia,serif;
  --font-text:"Spectral",Georgia,"Times New Roman",serif;
  --font-number:"IBM Plex Mono",ui-monospace,monospace;
  --double:0 0 0 2px var(--paper),0 0 0 3px var(--ink);
  color-scheme:light;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-text);font-size:18px;line-height:1.45}
img,video{display:block;max-width:100%;height:auto}
a{color:var(--prussian)}
a:focus-visible,video:focus-visible{outline:3px solid var(--gamboge);outline-offset:3px}
.page{max-width:1080px;margin:0 auto;padding:0 20px}
.top{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:18px 0 10px;border-bottom:3px double var(--ink);font-size:14px;letter-spacing:.2em;text-transform:uppercase}
.top a{color:var(--ink);letter-spacing:.12em;min-height:44px;display:inline-flex;align-items:center}
.hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:32px 48px;align-items:center;padding:40px 0 48px}
.kicker{margin:0 0 16px;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft)}
h1,h2,h3{margin:0;font-family:var(--font-title);font-weight:700;text-transform:uppercase;text-wrap:balance}
h1{font-size:clamp(40px,8.6vw,76px);line-height:1;letter-spacing:.03em}
h1 span{display:block}
h2{font-size:clamp(28px,5vw,40px);line-height:1.08;letter-spacing:.06em}
h3{font-size:23px;line-height:1.15;letter-spacing:.06em}
.lead{margin:22px 0 28px;font-size:21px;line-height:1.4;max-width:34em}
.play{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 32px;border:1.5px solid var(--ink);border-radius:2px;background:var(--prussian);color:var(--paper);box-shadow:var(--double);font-weight:600;font-size:20px;text-decoration:none}
.play:active{box-shadow:0 0 0 1px var(--ink);transform:scale(.98)}
.note{margin:16px 0 0;font-style:italic;color:var(--ink-soft);font-size:17px}
figure{margin:0}
figcaption,.legend{margin-top:12px;font-style:italic;font-size:16px;color:var(--ink-soft);text-align:center}
.cell{width:min(100%,420px);margin:0 auto;border-radius:50%;box-shadow:0 0 0 3px var(--paper),0 0 0 4.5px var(--ink)}
section{padding:44px 0;border-top:1px solid var(--ink)}
.head{display:flex;flex-direction:column;gap:10px;margin-bottom:28px;max-width:40em}
.head p{margin:0;font-size:19px}
.film{max-width:360px;margin:0 auto}
.film video{width:100%;border:1.5px solid var(--ink);box-shadow:var(--double);background:var(--paper)}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:36px 28px}
.step{display:flex;flex-direction:column;gap:12px}
.step .n{font-family:var(--font-title);font-weight:600;font-size:19px;letter-spacing:.1em}
.step img{width:100%;border:1.5px solid var(--ink);box-shadow:var(--double)}
.step p{margin:0;font-size:17px}
.plates{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:28px}
.plate{display:flex;flex-direction:column;gap:8px;padding:5px;border:2px solid var(--ink)}
.plate>div{display:flex;flex-direction:column;gap:8px;flex-grow:1;padding:14px 16px 16px;border:1px solid var(--ink)}
.plate .pl{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;letter-spacing:.14em;text-transform:uppercase}
.plate .pl b{font-family:var(--font-title);font-weight:600;font-size:18px;letter-spacing:.04em}
.plate h3{text-align:center}
.plate .latin{text-align:center;font-style:italic}
.plate p{margin:0;font-size:16px;line-height:1.35}
.plate .data{margin-top:auto;padding-top:8px;border-top:1px solid var(--ink);font-family:var(--font-number);font-weight:500;font-size:13px;color:var(--ink-soft)}
.lines{max-width:640px;margin:0;padding:0;list-style:none}
.lines li{display:flex;align-items:baseline;gap:8px;min-height:48px;border-top:1px solid var(--ink)}
.lines li:last-child{border-bottom:1px solid var(--ink)}
.lines .dots{flex:1 1 24px;min-width:24px;border-bottom:1px dotted var(--ink)}
.lines span:last-child{text-align:right}
.lines .num{font-family:var(--font-number);font-weight:500;font-size:17px}
.closing{display:flex;flex-direction:column;align-items:center;gap:24px;text-align:center}
footer{padding:20px 0 40px;border-top:3px double var(--ink);font-size:15px;color:var(--ink-soft);text-align:center}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function page(lang) {
  const c = COPY[lang];
  const t = gameTexts(lang);
  const plates = JSON.parse(
    fs.readFileSync(path.join(PUBLIC, "planches", "planches.json"), "utf8"),
  );
  const play = (label) => `<a class="play" data-play href="/?s=presentation">${escape(label)}</a>`;
  const number = (value) => (/^[\d≈ ]/.test(value) ? ` class="num"` : "");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ede6d6">
<title>${escape(c.title)}</title>
<meta name="description" content="${escape(c.description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escape(c.title)}">
<meta property="og:description" content="${escape(c.description)}">
<meta property="og:image" content="/decouvrir/affiche.jpg">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="alternate" hreflang="${lang === "fr" ? "en" : "fr"}" href="/${c.other.path}/">
<link rel="preload" href="/decouvrir/polices/bodoni.woff2" as="font" type="font/woff2" crossorigin>
<style>${STYLE}</style>
</head>
<body>
<div class="page">
<header class="top"><span>Origins · XXVII</span><a href="/${c.other.path}/" lang="${lang === "fr" ? "en" : "fr"}">${c.other.label}</a></header>
<main>
<div class="hero">
  <div>
    <p class="kicker">${escape(c.kicker)}</p>
    <h1>${c.h1.map((line) => `<span>${escape(line)}</span>`).join("")}</h1>
    <p class="lead">${escape(c.lead)}</p>
    ${play(c.play)}
    <p class="note">${escape(c.playNote)}</p>
  </div>
  <figure>
    <img class="cell" src="/planches/cellule.svg" width="640" height="640" alt="">
    <figcaption>${escape(c.fig1)}</figcaption>
  </figure>
</div>
<section>
  <div class="head"><h2>${escape(c.film)}</h2></div>
  <figure class="film">
    <video controls playsinline preload="none" poster="/decouvrir/affiche.jpg" width="720" height="1280">
      <source src="/decouvrir/origins27.webm" type="video/webm">
      ${escape(c.filmMissing)}
    </video>
    <figcaption>${escape(c.filmLegend)}</figcaption>
  </figure>
</section>
<section>
  <div class="head"><h2>${escape(c.season)}</h2><p>${escape(c.seasonLead)}</p></div>
  <div class="steps">
${c.steps
  .map(
    ([name, image, text], index) => `    <div class="step">
      <span class="n">${roman[index]}</span>
      <h3>${escape(name)}</h3>
      <img src="/decouvrir/${image}.jpg" width="562" height="1218" loading="lazy" alt="${escape(c.captureAlt)} : ${escape(name)}">
      <p>${escape(text)}</p>
    </div>`,
  )
  .join("\n")}
  </div>
</section>
<section>
  <div class="head"><h2>${escape(c.apex)}</h2><p>${escape(c.apexLead)}</p></div>
  <div class="plates">
${plates
  .map((plate) => {
    const name = t(`lineage.${plate.id}.name`);
    const facts = plate.facts[lang];
    return `    <article class="plate"><div>
      <div class="pl"><span>APEX</span><b>${c.plate} ${plate.plate}</b></div>
      <img src="/planches/${plate.id}.svg" width="1200" height="760" loading="lazy" alt="${escape(name)}, ${escape(c.plateAlt)}">
      <h3>${escape(name)}</h3>
      <div class="latin">${escape(plate.latin)}</div>
      <p>${escape(t(`lineage.${plate.id}.text`))}</p>
      <div class="data">${escape(facts.era)} · ${escape(facts.ago)} · ${escape(facts.size)}</div>
    </div></article>`;
  })
  .join("\n")}
  </div>
</section>
<section>
  <div class="head"><h2>${escape(c.facts)}</h2></div>
  <ul class="lines">
${c.factLines.map(([label, value]) => `    <li><span>${escape(label)}</span><span class="dots"></span><span${number(value)}>${escape(value)}</span></li>`).join("\n")}
  </ul>
</section>
<section class="closing">
  <h2>${escape(c.closing)}</h2>
  ${play(c.play)}
</section>
</main>
<footer>${escape(c.foot)}</footer>
</div>
<script>
// Le lien vers le jeu dit d'où vient le visiteur (?s=mot), pour les statistiques d'audience.
(function () {
  var source = new URLSearchParams(location.search).get("s") || "presentation";
  var links = document.querySelectorAll("a[data-play]");
  for (var i = 0; i < links.length; i++) links[i].href = "/?s=" + encodeURIComponent(source);
})();
</script>
</body>
</html>
`;
}

fs.mkdirSync(path.join(SHARED, "polices"), { recursive: true });
for (const [name, source] of Object.entries(FONTS)) {
  fs.copyFileSync(path.join(MODULES, source), path.join(SHARED, "polices", name));
}
for (const lang of ["fr", "en"]) {
  const folder = path.join(PUBLIC, COPY[lang].path);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "index.html"), page(lang));
  process.stdout.write(`/${COPY[lang].path}/index.html\n`);
}
