// Robot de test automatique (GitHub Actions, ou en local : `npm i -D playwright && npx playwright install chromium && node tools/robot-ci.mjs`).
// Sert le jeu, l'ouvre dans un vrai navigateur (ordinateur et mobile), puis :
//   1. suit le guide des premiers pas comme un nouveau joueur, sur plusieurs graines ;
//   2. lâche le robot « singe » (clics au hasard, temps qui file, sauvegarde/rechargement, vérifications de l'état) ;
//   3. joue 3 stratégies « raisonnables » pour suivre l'équilibrage (jalons atteints par jour).
// Écrit robot-rapport.md (et le résumé de l'action GitHub). Sort en erreur si un bug est trouvé.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAMES = +(process.env.ROBOT_GAMES || 30), STEPS = +(process.env.ROBOT_STEPS || 400), SIM_DAYS = +(process.env.ROBOT_SIM_DAYS || 12);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const monkeySrc = fs.readFileSync(path.join(ROOT, "tools/monkey.js"), "utf8");
const simSrc = fs.readFileSync(path.join(ROOT, "tools/sim.js"), "utf8");

const browser = await chromium.launch();
const profiles = [
  { name: "Ordinateur (1280×800)", ctx: { viewport: { width: 1280, height: 800 } }, games: GAMES, seed: 1000 },
  { name: "Mobile (390×844)", ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, games: Math.ceil(GAMES / 2), seed: 90000 },
];
const out = [];
let failed = false;
for (const P of profiles) {
  const ctx = await browser.newContext(P.ctx), page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html?lang=fr`);
  await page.waitForFunction(() => !!window.__o27, null, { timeout: 30000 });
  await page.evaluate(monkeySrc);
  const guide = await page.evaluate(() => runGuideBot({ seeds: [11, 22, 33, 44, 55] }));
  const guideEn = await page.evaluate(async () => { const r = await runGuideBot({ seeds: [66, 77] }); return r; });
  const monkey = await page.evaluate(({ g, s, seed }) => runMonkey({ games: g, steps: s, rich: 3, maxJump: 900, seed, tutRate: 0.5 }), { g: P.games, s: STEPS, seed: P.seed });
  let sims = [];
  if (P === profiles[0]) {
    await page.evaluate(simSrc);
    for (const so of ["kori", "varenne", "ilheu"]) {
      try { sims.push(await page.evaluate(({ so, d }) => { const r = runSim({ souche: so, days: d, maxCells: 14, auto: true, army: true, migrate: true, rewards: true }); return { souche: r.souche, t: r.t, jalons: r.jalons, noyau: r.noyau }; }, { so, d: SIM_DAYS })); }
      catch (e) { sims.push({ souche: so, erreur: e.message }); }
    }
  }
  const bad = !guide.ok || !guideEn.ok || !monkey.ok || pageErrors.length;
  if (bad) failed = true;
  out.push({ P, guide, guideEn, monkey, sims, pageErrors });
  await ctx.close();
}
await browser.close(); server.close();

// ---- rapport ----
let md = `# Rapport du robot de test\n\n${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · ${failed ? "❌ des problèmes ont été trouvés" : "✅ aucun bug trouvé"}\n`;
for (const r of out) {
  md += `\n## ${r.P.name}\n\n`;
  const g = [...r.guide.runs, ...r.guideEn.runs];
  md += `**Guide des premiers pas :** ${g.filter((x) => x.done).length} / ${g.length} terminés` + (g.some((x) => x.stuck) ? ` · bloqué à : ${g.filter((x) => x.stuck).map((x) => x.stuck + " (graine " + x.seed + ")").join(", ")}` : "") + (g.some((x) => x.errors.length) ? ` · erreurs : ${g.flatMap((x) => x.errors).slice(0, 3).join(" ; ")}` : "") + "\n\n";
  const m = r.monkey, st = m.stats;
  md += `**Robot singe :** ${st.games} parties, ${st.steps} actions, ${st.clicks} clics, jusqu'au jour ${st.maxDay}, en ${st.seconds} s · **${m.bugs.length} bug(s)**\n\n`;
  for (const b of m.bugs) md += `- **${b.kind}** ×${b.count} : ${b.msg}\n  - graine ${b.seed}, souche ${b.souche}, pas ${b.step}, jour ${b.day}\n  - dernières actions : ${b.trail.slice(-8).join(" → ")}\n` + (b.stack ? "  - ```" + b.stack.split("\n").slice(0, 3).join(" | ") + "```\n" : "");
  if (r.pageErrors.length) md += `\n**Erreurs de la page :**\n${[...new Set(r.pageErrors)].map((e) => "- " + e).join("\n")}\n`;
  if (r.sims.length) {
    md += `\n**Équilibrage (3 stratégies, ${SIM_DAYS} jours) :**\n\n| Souche | Noyau | Jalons |\n|---|---|---|\n`;
    for (const s of r.sims) md += `| ${s.souche} | ${s.noyau ?? "—"} | ${s.erreur ? "erreur : " + s.erreur : Object.entries(s.jalons || {}).map(([k, v]) => k + " " + v).join(" · ")} |\n`;
  }
}
md += `\n---\nPour rejouer un bug à l'identique : dans la console du jeu, \`eval(await (await fetch('tools/monkey.js')).text()); runMonkey({ seeds: [GRAINE], steps: ${STEPS}, rich: 3, maxJump: 900 })\`.\n`;
fs.writeFileSync(path.join(ROOT, "robot-rapport.md"), md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
process.exit(failed ? 1 : 0);
