// Fabrique la courte vidéo de présentation, à partir de captures scénarisées du vrai jeu.
//
//   pnpm build && node scripts/make-video.cjs
//
// 1. Le jeu construit (packages/client/dist) est servi en local.
// 2. Un navigateur sans fenêtre l'ouvre à la taille d'un téléphone et joue le scénario
//    (scripts/video/scenario.cjs) : une partie neuve, puis une partie au jour 21.
// 3. Les images capturées sont montées avec des cartons dans le style « Atlas »
//    (scripts/video/montage.html) et enregistrées en WebM.
// Le résultat va dans packages/client/public/decouvrir/ : la vidéo, son affiche, et les
// captures fixes qui servent à la page de présentation. Aucune bibliothèque.
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { open, sleep } = require("./video/navigateur.cjs");
const { PLANS, NAMES } = require("./video/scenario.cjs");
const { addDuration } = require("./video/duree.cjs");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "packages", "client", "dist");
const OUT = path.join(ROOT, "packages", "client", "public", "decouvrir");
const MODULES = path.join(ROOT, "packages", "client", "node_modules");
const PORT = 4827;
const PHONE = { width: 375, height: 812, scale: 1.5 };

const FONTS = {
  "bodoni.woff2": "@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-normal.woff2",
  "spectral-400.woff2": "@fontsource/spectral/files/spectral-latin-400-normal.woff2",
  "spectral-400-italic.woff2": "@fontsource/spectral/files/spectral-latin-400-italic.woff2",
  "plex-500.woff2": "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
};
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  process.stderr.write("Le jeu n'est pas construit. Lancez d'abord : pnpm build\n");
  process.exit(1);
}

// Les images capturées, par plan, et la description du montage : servies depuis la mémoire.
const captured = new Map();
let montage = null;

const server = http.createServer((request, response) => {
  const url = decodeURIComponent((request.url ?? "/").split("?")[0]);
  const send = (body, type) => {
    response.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    response.end(body);
  };
  if (url === "/__montage.json") return send(JSON.stringify(montage), TYPES[".json"]);
  if (url.startsWith("/__frames/")) {
    const frame = captured.get(url.slice("/__frames/".length, -".jpg".length));
    if (frame !== undefined) return send(frame, TYPES[".jpg"]);
  }
  let file;
  if (url.startsWith("/__fonts/")) file = path.join(MODULES, FONTS[path.basename(url)] ?? "absent");
  else if (url.startsWith("/__video/")) file = path.join(__dirname, "video", path.basename(url));
  else file = path.join(DIST, url === "/" ? "index.html" : url);
  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("introuvable");
      return;
    }
    send(data, TYPES[path.extname(file)] ?? "application/octet-stream");
  });
});

/** Ce que l'appareil a en mémoire au début d'un plan : une partie neuve, ou celle du jour 21. */
function storage(start) {
  const items = { "o27.essai.vitesse": "60", "o27.langue": "fr" };
  let anchor = "";
  if (start === "day20") {
    const state = JSON.parse(
      fs.readFileSync(path.join(__dirname, "video", "partie-jour-20.json"), "utf8"),
    );
    items["o27.partie-essai.v1"] = JSON.stringify(state);
    items["o27.termes"] = "science";
    items["o27.rapports.vus"] = String(state.now + 1e10);
    items["o27.plus-loin.vu"] = "1";
    // L'horloge de l'essai repart de l'instant où la partie a été gardée.
    anchor = `localStorage.setItem("o27.essai.horloge", JSON.stringify({ real: Date.now(), game: ${String(state.now)}, speed: 60 }));`;
  }
  return `(() => {
    if (location.pathname.startsWith("/__") || sessionStorage.getItem("o27-video")) return;
    localStorage.clear();
    const items = ${JSON.stringify(items)};
    for (const key of Object.keys(items)) localStorage.setItem(key, items[key]);
    ${anchor}
    sessionStorage.setItem("o27-video", "1");
  })();`;
}

/** Joue un plan dans le vrai jeu et garde ses images, avec l'instant de chacune. */
async function capture(browser, plan, index) {
  const page = await browser.page(PHONE);
  await page.before(storage(plan.start));
  await page.goto(`http://127.0.0.1:${String(PORT)}/`);
  // Le repère « ×60 » de l'essai accéléré n'a pas sa place dans une présentation.
  await page.evaluate(`(() => {
    const style = document.createElement("style");
    style.textContent = ".speed-badge { display: none !important; }";
    document.head.appendChild(style);
  })()`);
  await sleep(1800);
  const steps = [...plan.steps].sort((one, other) => one.at - other.at);
  const times = [];
  const began = Date.now();
  let still = null;
  for (;;) {
    const now = Date.now() - began;
    if (now >= plan.ms) break;
    while (steps.length > 0 && steps[0].at <= now) {
      const step = steps.shift();
      if (step.tap !== undefined) await page.tap(step.tap);
      else await page.evaluate(step.run);
    }
    const image = await page.shot();
    captured.set(`${String(index)}/${String(times.length)}`, image);
    times.push(now);
    if (still === null && now >= (plan.stillAt ?? plan.ms * 0.6)) still = image;
  }
  if (plan.still !== undefined && still !== null) {
    fs.writeFileSync(path.join(OUT, `capture-${plan.still}.jpg`), still);
  }
  await page.close();
  process.stdout.write(
    `plan ${String(index + 1)} : ${String(times.length)} images (${plan.caption})\n`,
  );
  return times;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  const browser = await open();
  try {
    const plates = {};
    const list = JSON.parse(fs.readFileSync(path.join(DIST, "planches", "planches.json"), "utf8"));
    for (const plate of list) {
      plates[plate.id] = {
        name: NAMES[plate.id],
        latin: plate.latin,
        plate: plate.plate,
        ...plate.facts.fr,
      };
    }
    const plans = [];
    for (const [index, plan] of PLANS.entries()) {
      if (plan.kind !== "game") {
        plans.push(plan);
        continue;
      }
      const frames = await capture(browser, plan, index);
      plans.push({
        kind: "game",
        ms: plan.ms,
        caption: plan.caption,
        legend: plan.legend,
        frames,
        width: PHONE.width,
        height: PHONE.height,
      });
    }
    montage = { plans, plates };

    const page = await browser.page({ width: 720, height: 1280, scale: 1, mobile: false });
    await page.goto(`http://127.0.0.1:${String(PORT)}/__video/montage.html`);
    for (let wait = 0; wait < 100; wait++) {
      const failed = await page.evaluate("window.failed ?? null");
      if (failed !== null) throw new Error(failed);
      if (await page.evaluate("window.ready === true")) break;
      await sleep(200);
    }
    const total = await page.evaluate("window.total");
    fs.writeFileSync(
      path.join(OUT, "affiche.jpg"),
      Buffer.from(await page.evaluate("window.poster(1600)"), "base64"),
    );
    process.stdout.write(
      `montage : ${String(Math.round(total / 1000))} secondes, enregistrées en temps réel…\n`,
    );
    const count = await page.evaluate("window.record()");
    const parts = [];
    for (let index = 0; index < count; index++) {
      parts.push(Buffer.from(await page.evaluate(`window.chunk(${String(index)})`), "base64"));
    }
    const video = addDuration(Buffer.concat(parts), total);
    fs.writeFileSync(path.join(OUT, "origins27.webm"), video);
    process.stdout.write(`origins27.webm (${String(Math.round(video.length / 1024))} Ko)\n`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${String(error.stack ?? error)}\n`);
  process.exit(1);
});
