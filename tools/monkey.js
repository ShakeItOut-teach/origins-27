// Robot « singe » : joue des centaines de parties en cliquant au hasard sur tout ce qui est cliquable,
// fait avancer le temps, et vérifie à chaque pas que l'état du jeu reste sain. Chaque bug est noté avec
// la graine et les dernières actions, pour être rejoué à l'identique : runMonkey({ seeds: [la graine] }).
// La sauvegarde du joueur n'est jamais touchée : le stockage est remplacé par une mémoire temporaire.
window.runMonkey = async function (opts) {
  opts = opts || {};
  const G = window.__o27, games = opts.games || 20, steps = opts.steps || 300;
  const seeds = opts.seeds || Array.from({ length: games }, (_, i) => (opts.seed || 1000) + i * 7919);
  if (!window.__memStore) {
    const mem = {}; window.__memStore = mem;
    Storage.prototype.getItem = function (k) { return k in mem ? mem[k] : null; };
    Storage.prototype.setItem = function (k, v) { mem[k] = String(v); };
    Storage.prototype.removeItem = function (k) { delete mem[k]; };
    Storage.prototype.clear = function () { for (const k in mem) delete mem[k]; };
  }
  const mul = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const bugs = [], seen = new Map(), stats = { games: 0, steps: 0, clicks: 0, gameMinutes: 0, maxDay: 0, acts: {} };
  let cur = null, trail = [];
  const note = (kind, msg, stack) => {
    const key = kind + "|" + String(msg).replace(/\d+(\.\d+)?/g, "#").slice(0, 160);
    if (seen.has(key)) { seen.get(key).count++; return; }
    const b = { kind, msg: String(msg).slice(0, 400), stack: String(stack || "").split("\n").slice(0, 6).join("\n"), seed: cur && cur.seed, souche: cur && cur.souche, step: cur && cur.step, day: G.S ? +(G.S.t / 1440).toFixed(2) : null, trail: trail.slice(-25), count: 1 };
    seen.set(key, b); bugs.push(b);
  };
  const onErr = (e) => note("erreur", e.message || (e.reason && e.reason.message) || e.reason || e, (e.error && e.error.stack) || (e.reason && e.reason.stack));
  window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
  const ce = console.error; console.error = function () { note("console", Array.from(arguments).join(" ")); return ce.apply(console, arguments); };
  const wOpen = window.open; window.open = () => null;
  const realRandom = Math.random;
  const SKIP = new Set(["lang", "reset", "feedback", "style", "quickstart", "intro", "tostrains", "savex", "savei", "savec", "install", "opt", "discord", "opts"]);
  const HOT = { upgrade: 6, buildnew: 6, cell: 4, collect: 4, hunt: 5, huntgo: 5, raid: 5, raidgo: 5, spy: 4, express: 5, glevel: 4, mres: 4, accel: 3, tutnext: 8, tutforce: 4, rwchest: 3, mutpick: 6, lmclaim: 5, instant: 4, revenge: 4, filament: 4, incst: 4, aldon: 5, algift: 4, alhelp: 4, alask: 4, albuy: 3, alrec: 3, algo: 2, allyjoin: 2, autocollect: 3, migrate: 3, popok: 3, bqcancel: 2, cancel: 2, pick: 4, sub: 1, speed: 0.2, zoom: 0.3, recenter: 0.3 };
  const fin = (v) => typeof v === "number" && isFinite(v);
  const check = (where) => {
    const S = G.S; if (!S) return;
    for (const k in S.res) if (!fin(S.res[k]) || S.res[k] < -0.5) note("état", "ressource " + k + " = " + S.res[k] + " (" + where + ")");
    for (const k in S.army) if (!fin(S.army[k]) || S.army[k] < 0 || S.army[k] !== Math.round(S.army[k])) note("état", "armée " + k + " = " + S.army[k] + " (" + where + ")");
    if (!fin(S.idle) || S.idle < 0) note("état", "troupes libres = " + S.idle + " (" + where + ")");
    if (!fin(S.t)) note("état", "temps = " + S.t);
    if (cur.lastT != null && S.t < cur.lastT - 1e-6) note("état", "le temps recule : " + cur.lastT + " → " + S.t);
    cur.lastT = S.t; stats.maxDay = Math.max(stats.maxDay, S.t / 1440);
    for (const M of S.missions) { if (!fin(M.x) || !fin(M.y)) note("état", "mission invalide " + JSON.stringify(M).slice(0, 120)); if (M.u) for (const k in M.u) if (!fin(M.u[k]) || M.u[k] < 0) note("état", "mission : troupe " + k + " = " + M.u[k]); }
    if (S.en != null && (!fin(S.en) || S.en < 0)) note("état", "énergie = " + S.en);
    if (S.hero && (!fin(S.hero.xp) || !fin(S.hero.lvl))) note("état", "héros xp/niveau invalide");
    for (const q of S.queue) if (!q || !fin(q.t)) note("état", "file de production invalide " + JSON.stringify(q));
    const txt = document.body.innerText;
    const m = txt.match(/NaN|undefined|\[object Object\]|Infinity/);
    if (m) { const i = txt.indexOf(m[0]); note("affichage", "« " + m[0] + " » affiché : …" + txt.slice(Math.max(0, i - 60), i + 30).replace(/\s+/g, " ") + "…"); }
  };
  const safe = (label, fn) => { try { fn(); } catch (err) { note("erreur", label + " : " + err.message, err.stack); } };
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const t0 = performance.now();
  for (const seed of seeds) {
    const rnd = mul(seed), souches = (0, eval)("typeof SOUCHES!=='undefined'?Object.keys(SOUCHES):['varenne']");
    const souche = souches[Math.floor(rnd() * souches.length)];
    cur = { seed, souche, step: 0, lastT: null }; trail = [];
    Math.random = mul(seed ^ 0x5bd1e995);
    safe("newGame", () => { G.act("pick", { dataset: { s: souche } }); });
    const keepTut = rnd() < (opts.tutRate == null ? 0.5 : opts.tutRate);
    if (!keepTut && G.S) { G.S.tut = null; G.S.tourDone = true; }
    trail.push((keepTut ? "guide gardé" : "guide sauté") + " · souche " + souche);
    for (let s = 0; s < steps && G.S; s++) {
      cur.step = s; stats.steps++;
      const r = rnd();
      if (r < 0.12) { const m = Math.round(1 + rnd() * rnd() * (opts.maxJump || 600)); trail.push("avance " + m + " min"); safe("advance", () => G.advance(m)); stats.gameMinutes += m; }
      else if (r < 0.2) { const t = ["cell", "map", "evo", "hero", "act"][Math.floor(rnd() * 5)]; trail.push("onglet " + t); safe("tab", () => G.setTab(t)); }
      else if (r < 0.3) { const S = G.S, d = 1 + Math.floor(rnd() * 9), a = rnd() * 6.283, x = Math.round(S.px + Math.cos(a) * d), y = Math.round(S.py + Math.sin(a) * d); trail.push("case " + x + ":" + y); safe("tile", () => { G.setTab("map"); G.setOpen("tile:" + x + ":" + y); }); }
      else if (r < 0.33) { trail.push("sauvegarde + rechargement"); safe("save/load", () => { const n = G.S.missions.length, a = G.S.army && JSON.stringify(G.S.army); G.save(); if (!G.load()) note("sauvegarde", "load() a échoué après save()"); else { if (G.S.missions.length !== n) note("sauvegarde", "missions perdues au rechargement : " + n + " → " + G.S.missions.length); if (JSON.stringify(G.S.army) !== a) note("sauvegarde", "armée changée au rechargement"); } }); }
      else {
        const els = Array.from(document.querySelectorAll("[data-act]")).filter((e) => !SKIP.has(e.dataset.act) && !e.disabled && vis(e));
        if (els.length) {
          let tot = 0; const w = els.map((e) => (tot += HOT[e.dataset.act] == null ? 1 : HOT[e.dataset.act]));
          let pk = rnd() * tot, ix = w.findIndex((v) => v >= pk); if (ix < 0) ix = els.length - 1;
          const el = els[ix], a = el.dataset.act;
          trail.push("clic " + a + (el.dataset.k ? ":" + el.dataset.k : "") + (el.dataset.ref ? ":" + el.dataset.ref : "") + (el.dataset.t ? ":" + el.dataset.t : "") + (el.dataset.id ? ":" + el.dataset.id : ""));
          stats.clicks++; stats.acts[a] = (stats.acts[a] || 0) + 1;
          safe("clic " + a, () => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
        }
      }
      if (opts.rich && s % 30 === 29) { trail.push("cadeau de ressources"); safe("rich", () => { G.dbg.giveRes(opts.rich); G.dbg.enGive(20); }); }
      safe("advance", () => G.advance(0.5 + rnd() * 3));
      safe("renderAll", () => G.renderAll());
      safe("draw", () => G.draw(performance.now(), 0.05));
      safe("check", () => check(trail[trail.length - 1]));
      if (s % 25 === 0) await new Promise((res) => setTimeout(res, 0));
    }
    stats.games++;
    window.__monkeyProgress = { games: stats.games, of: seeds.length, bugs: bugs.length };
  }
  Math.random = realRandom; window.open = wOpen; console.error = ce;
  window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onErr);
  stats.seconds = Math.round((performance.now() - t0) / 1000); stats.maxDay = +stats.maxDay.toFixed(1);
  const res = { ok: bugs.length === 0, stats, bugs };
  window.__monkeyResult = res;
  return res;
};

// Robot « nouveau joueur » : suit le guide des premiers pas comme un joueur appliqué (il clique ce que la flèche montre),
// sur plusieurs graines, en français et en anglais. Il signale toute étape où il reste bloqué.
window.runGuideBot = async function (opts) {
  opts = opts || {}; const rr = Math.random;
  const G = window.__o27, E = (s) => (0, eval)(s), seeds = opts.seeds || [11, 22, 33, 44, 55, 66];
  const out = { ok: true, runs: [] };
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const click = (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  for (const seed of seeds) {
    Math.random = ((a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(seed); G.act("pick", { dataset: { s: opts.souche || "kori" } });
    const run = { seed, steps: {}, stuck: null, errors: [], ms: 0 };
    const t0 = performance.now();
    let guard = 0, last = -1, same = 0;
    while (G.S && G.S.tut != null && guard++ < 1500) {
      try {
        E("tutTick()");
        const i = G.S.tut, st = E("TUT")[i];
        if (i !== last) { last = i; same = 0; } else same++;
        run.steps[st.id] = (run.steps[st.id] || 0) + 1;
        if (same > 120) { run.stuck = st.id; break; }
        const mc = document.querySelector("#modal.on [data-act=mclose], #modal.on [data-act=popok], #modal.on [data-act=closeintro]");
        if (vis(mc) && !document.querySelector("#coach .cbub")) { click(mc); run.modals = (run.modals || 0) + 1; }
        const nb = document.querySelector('#coach [data-act="tutnext"]');
        if (vis(nb)) click(nb);
        else if (st.sel) { const el = document.querySelector(st.sel); if (vis(el) && !el.disabled) click(el); else G.advance(0.5); }
        else if (st.rect) { const b = G.S.bots.find((x) => x.tut); if (b) { G.setTab("map"); G.setOpen("tile:" + b.x + ":" + b.y); } }
        else G.advance(0.5);
        G.advance(0.2); G.renderAll();
      } catch (err) { run.errors.push(err.message + " @ " + (err.stack || "").split("\n")[1]); if (run.errors.length > 5) break; }
      if (guard % 20 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    run.ms = Math.round(performance.now() - t0);
    run.done = G.S && G.S.tut == null && !run.stuck;
    run.gameMin = G.S ? Math.round(G.S.t) : null;
    if (!run.done || run.errors.length) out.ok = false;
    out.runs.push(run);
  }
  Math.random = rr;
  window.__guideResult = out;
  return out;
};
