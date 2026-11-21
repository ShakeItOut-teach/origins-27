// Harnais de simulation : joue une partie avec une stratégie « raisonnable » et note les étapes.
window.runSim = function (opts) {
  opts = opts || {};
  const G = window.__o27, X = G.dbg, souche = opts.souche || "varenne", days = opts.days || 5, step = opts.step || 5;
  const order = opts.order || ["P1", "E1", "M1", "P2", "E2b", "M2a", "PT", "PH", "E3b", "M3a", "ENDO", "COLO", "PLURI", "APEX"];
  opts.mutTag = opts.mutTag || { atp: "E", chap: "E", repl: "E", plas: "E" };
  G.newGame(opts.seed || 12345, souche); window.__nextChest = 0; window.__nextDay = 0;
  let S = G.S; S.tourDone = true;
  const ms = {}, mark = (k) => { if (ms[k] == null) ms[k] = Math.round(S.t); };
  const D = (o) => ({ dataset: o }), W = 241;
  const blvl = (k) => k === "noyau" ? S.noyau : ((S.slots.find((s) => s && s.k === k) || {}).l || 0);
  const tta = (c) => { const r = X.rates(), u = X.upkeep(); let t = 0; for (const k in c) { const lack = c[k] - S.res[k]; if (lack <= 0) continue; const net = r[k] - u[k]; if (net <= 0) return 1e9; t = Math.max(t, lack / net * 60); } return t; };
  const prio = { noyau: 0.6, ribo: 0.5, vac: 0.9, flag: 1, photo: 1.3, mito: 0.8, golgi: 1, reti: 1, cyto: 1.2 };
  let idleBuild = 0, idleRes = 0, sends = 0, starved = 0, lastIdle = S.idle;
  const end = days * 1440;
  while (S.t < end) {
    X.questTick();
    if (S.mutOffer) { const pref = opts.mutPref || "E"; const ids = S.mutOffer; const id = ids.find((i) => opts.mutTag && opts.mutTag[i] === pref) || ids[0]; G.act("mutpick", D({ id })); }
    if (opts.auto && S.idle > 0 && !window.__needMig) { G.act("autocollect", D({})); }
    if (!S.build) {
      const cands = [];
      const u0 = X.upgradeInfo("noyau"); if (!X.upgradeBlock(u0)) cands.push(["upgrade", { ref: "noyau" }, u0.cost, prio.noyau]);
      S.fields.forEach((f, i) => { const u = X.upgradeInfo("field:" + i); if (!X.upgradeBlock(u)) { const r = X.rates(), up = X.upkeep(); const scarce = (r[f.k] - up[f.k]) < 6 ? 0.5 : 1; cands.push(["upgrade", { ref: "field:" + i }, u.cost, scarce * (f.k === "nuc" ? 1.3 : 1)]); } });
      S.slots.forEach((s, i) => { if (s) { const u = X.upgradeInfo("slot:" + i); if (!X.upgradeBlock(u)) cands.push(["upgrade", { ref: "slot:" + i }, u.cost, (prio[s.k] || 1) * (1 + s.l * 0.15)]); } });
      ["ribo", "vac", "flag", "photo", "mito", "golgi", "reti", "cyto"].forEach((k) => { if (!S.slots.some((s) => s && s.k === k) && !X.newBlock(k)) { const i = S.slots.findIndex((s, j) => !s && (j < 6 || blvl("cyto") >= j - 5)); if (i >= 0) cands.push(["buildnew", { i: String(i), k }, X.bldCost(k, 0), prio[k] * 0.6]); } });
      const fl = S.fields.reduce((a, f) => a + f.l, 0) / 12, capNow = X.rates().cap;
      const tooBig = cands.some((c) => Object.values(c[2]).some((v) => v > capNow * 0.9));
      cands.forEach((c) => { if (tooBig && c[1].ref && S.slots[+String(c[1].ref).split(":")[1]] && S.slots[+String(c[1].ref).split(":")[1]].k === "vac" && String(c[1].ref).startsWith("slot")) c[3] = 0.02; });
      cands.forEach((c) => { let p = c[3]; if (c[1].ref === "noyau" && S.noyau <= fl + 1.5) p *= 0.12; if (c[1].k === "ribo" || c[1].k === "vac") p *= 0.2; c.push((tta(c[2]) + 30) * p); });
      cands.sort((a, b) => a[4] - b[4]);
      const best = cands[0];
      if (best && tta(best[2]) === 0) G.act(best[0], D(best[1]));
      if (!S.build) idleBuild++;
    }
    if (!S.research) {
      for (const id of order) { if (X.nodeState(id) === "open" && !X.nodeBlock(id)) { G.act("express", D({ id })); if (S.research) break; } }
      if (!S.research && opts.levelGenes !== false) { for (const id of S.nodes) { G.act("glevel", D({ id })); if (S.research) break; } }
      if (!S.research) idleRes++;
    }
    // armée : soldates et porteuses dès que possible, géants aux stades avancés
    if (opts.army && blvl("ribo") >= 1 && !S.queue.length) { const r = X.rates(), u = X.upkeep(); if (r.atp - u.atp > 15) { for (const k of ["pluri", "colo", "sold", "port"]) { if (X.uReq(k) && S.idle + S.missions.reduce((a, m) => a + m.n, 0) < (opts.maxCells || 6) + 30) { G.act("cell", D({ k, n: "2" })); if (S.queue.length) break; } } } }
    // migration vers le centre quand un stade l'exige
    window.__needMig = opts.migrate && (S.nodes.includes("COLO") || S.noyau >= 7) && X.zoneIdx() < (S.nodes.includes("PLURI") ? 3 : 2);
    if (window.__needMig && S.missions.length) G.act("recallall", D({}));
    if (opts.migrate && !S.mig && !S.missions.length && (S.nodes.includes("COLO") || S.noyau >= 7)) { const need = S.nodes.includes("PLURI") ? 3 : 2; if (X.zoneIdx() < need) { const C = 120, dx = C - S.px, dy = C - S.py, L = Math.hypot(dx, dy), step = Math.min(L - 27, 3 + 2 * blvl("flag")); for (let s = step; s >= 2; s--) { const x = Math.round(S.px + dx / L * s), y = Math.round(S.py + dy / L * s), T = S.tiles[y * W + x]; if (T.k || T.w) continue; T.s = 1; G.setOpen("tile:" + x + ":" + y); G.act("migrate", D({})); if (S.mig) { mark("mig" + X.zoneIdx()); break; } } } }
    if (blvl("ribo") >= 1) { const r = X.rates(), u = X.upkeep(); if (S.idle + S.queue.length < 3 + 3 * blvl("ribo") && r.atp - u.atp > 3 && S.res.prot > 150) G.act("cell", D({ n: "1" })); }
    if (S.idle > 0 && !S.mig && !window.__needMig) {
      let best = null; const c = [S.px, S.py], R = 5 + 2 * blvl("flag");
      for (let y = c[1] - R; y <= c[1] + R; y++) for (let x = c[0] - R; x <= c[0] + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= W) continue; const T = S.tiles[y * W + x], d = Math.hypot(x - c[0], y - c[1]);
        if (d < 1 || d > R || S.missions.some((M) => M.x === x && M.y === y)) continue;
        let sc = -1, kind = null;
        if (T.w && T.s && opts.hunt !== false) { const pw = X.huntPower(S.idle, T.w.type) + (S.hero.busy ? 0 : X.heroPower(T.w.type)); if (pw > T.w.def * 1.4) { sc = T.w.bio * 1.5 / d; kind = "hunt"; } }
        if (T.k && T.s && T.a > 50) { const s2 = Math.min(T.a, S.idle * 20) / d; if (s2 > sc) { sc = s2; kind = "collect"; } }
        if (!T.s && sc < 0) { sc = 0.5 / d; kind = "collect"; }
        if (kind && (!best || sc > best[3])) best = [x, y, kind, sc];
      }
      if (best) { S.selN = S.idle; G.setOpen("tile:" + best[0] + ":" + best[1]); G.act(best[2], D({})); sends++; }
    }
    if (opts.rewards && S.t >= (window.__nextChest || 0)) { window.__nextChest = (window.__nextChest || 0) + (opts.chestEvery || 360); X.openChest(X.rollTier()); }
    if (opts.rewards && S.t >= (window.__nextDay || 0)) { window.__nextDay = (window.__nextDay || 0) + 1440; X.giveRes(0.9); X.enGive(16); }
    G.advance(step); S = G.S;
    if (S.idle < lastIdle && !S.missions.length) starved++; lastIdle = S.idle;
    if (S.fields.some((f) => f.l > 0)) mark("canal1"); if (S.noyau >= 2) mark("noyau2"); if (blvl("ribo") >= 1) mark("ribo"); if (S.noyau >= 3) mark("noyau3"); if (S.noyau >= 5) mark("noyau5");
    if (S.nodes.length >= 1) mark("gene1"); if (S.nodes.some((n) => ["PT", "PH", "PP", "PE", "PA"].includes(n))) mark("voieOff");
    if (S.hero.form !== "Larve") mark("heroForm"); if (S.emerg.length) mark("emerg1"); if (S.q >= 12) mark("quetes12");
    if (S.nodes.includes("ENDO")) mark("ENDO"); if (S.nodes.includes("COLO")) mark("COLO"); if (S.nodes.includes("PLURI")) mark("PLURI"); if (X.zoneIdx() >= 2) mark("eauxMoy"); if (X.zoneIdx() >= 3) mark("hautsFonds");
    if (S.won) { mark("APEX"); break; }
  }
  const fmtT = (m) => m == null ? "—" : "J" + (Math.floor(m / 1440) + 1) + " " + String(Math.floor((m % 1440) / 60)).padStart(2, "0") + "h";
  const out = {}; for (const k in ms) out[k] = fmtT(ms[k]);
  const r = X.rates(), u = X.upkeep();
  return { souche, t: fmtT(S.t), jalons: out, quete: S.q, noyau: S.noyau, champs: S.fields.map((f) => f.l).join(""), orgs: S.slots.filter(Boolean).map((s) => s.k + s.l).join(" "), genes: S.nodes.map((n) => n + (S.glv[n] || 1)).join(","), coll: S.idle + S.missions.reduce((a, m) => a + m.n, 0), heros: S.hero.lvl + " " + S.hero.form, pillé: S.reports.filter((r) => r.title.startsWith("Pillage subi")).length, defOk: S.reports.filter((r) => r.title.startsWith("Défense réussie")).length, chasses: S.reports.filter((r) => /^(Victoire|Défaite) ·/.test(r.title)).length, sends, hSansConstruction: Math.round(idleBuild * step / 60), hSansGene: Math.round(idleRes * step / 60), net: Object.fromEntries(["atp", "prot", "lip", "nuc"].map((k) => [k, Math.round(r[k] - u[k])])), cap: r.cap };
};
