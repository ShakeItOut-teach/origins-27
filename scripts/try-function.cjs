// Essai de la fonction du serveur (supabase/functions/jeu/index.ts) hors de Supabase :
// une fausse base en mémoire, de vraies requêtes, toutes les routes. Ce fichier-là tourne
// sous Deno chez Supabase, hors de nos tests habituels : ici, on le fait tourner sous Node.
// À lancer après `pnpm server:bundle` : `pnpm server:try`.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const ts = require(path.join(root, "node_modules/typescript"));

async function main() {
  const source = fs.readFileSync(path.join(root, "supabase/functions/jeu/index.ts"), "utf8");
  const serverUrl = pathToFileURL(path.join(root, "supabase/functions/_shared/server.js")).href;
  let js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  js = js
    .replace(
      'import { createClient } from "npm:@supabase/supabase-js@2";',
      "const createClient = globalThis.__createClient;",
    )
    .replace('"../_shared/server.js"', JSON.stringify(serverUrl));
  const out = path.join(os.tmpdir(), `o27-fonction-${String(process.pid)}.mjs`);
  fs.writeFileSync(out, js);

  // La fausse base. Un autre humain, Bob, est déjà dans l'océan.
  const BOB_CARD = {
    slot: 41,
    name: "Bobus maximus",
    hue: 200,
    tier: 4,
    zone: 0,
    scores: { power: 5000, cell: 4000, troops: 1000, loot: 0, defense: 0 },
    week: 0,
    contest: 0,
    seenAt: Date.now() - 60_000,
    family: "predation",
  };
  const calls = [];
  const states = new Map();
  const outcomes = new Map();
  let slots = 0;
  let guardian = false;
  const rpc = {
    prendre_place: () => slots++,
    enregistrer(a) {
      const current = states.get(a.p_joueur)?.version ?? 0;
      if (current !== a.p_version_attendue) return false;
      if (a.p_ordre !== null) {
        const key = `${a.p_joueur}/${a.p_ordre}`;
        if (outcomes.has(key)) return false;
        outcomes.set(key, a.p_resultat);
      }
      states.set(a.p_joueur, { etat: a.p_etat, version: current + 1 });
      return true;
    },
    noter_visite: () => null,
    noter_ordre: () => null,
    donner_avis: () => true,
    lire_planches: () => [{ season: 1, name: "Protomonas originis" }],
    statistiques: () => (guardian ? { joueurs: 3 } : null),
    lire_foule: () => ({ cards: [BOB_CARD], taken: { "d:1:1:5": "2000" } }),
    montrer_vitrine: () => null,
    prendre_gisement: () => null,
    noter_refus: () => null,
    statistiques_ocean: () => (guardian ? { humains: 2 } : null),
    // Les combats entre humains.
    attaques_dues: () => due.splice(0),
    place_de: () => null,
    noter_attaque: () => null,
    noter_renfort: () => null,
    trouver_attaque: () => null,
    renforts_de: () => [],
    regler_attaque: () => true,
    noter_espionnage: () => null,
    lire_fils: () => ({ attacks: [{ id: "a-1", status: "en_route" }], spies: [] }),
    statistiques_combats: () => (guardian ? { attaques: 1 } : null),
    // La politique des bannières et la discussion d'alliance.
    voter_chef: () => true,
    declarer_guerre: () => true,
    statistiques_alliances: () => (guardian ? { messages7j: 2 } : null),
    lire_messages: () => (bench ? chat.map((text, index) => ({ id: index + 1, text })) : null),
    ecrire_message(a) {
      if (!bench) return "banc";
      if (chat.length >= 2) return "trop";
      chat.push(a.p_texte);
      return "ok";
    },
    signaler_message: () => true,
  };
  // Une attaque arrivée à l'heure du combat, dont le défenseur n'existe plus.
  let bench = true;
  const chat = [];
  const due = [{ id: "attaque-1", attacker: "joueur-1", defender: "joueur-parti", resolveAt: 1 }];
  const builder = (table) => {
    const filters = {};
    const api = {
      select: () => api,
      lte: () => api,
      order: () => api,
      limit: () => api,
      eq(column, value) {
        filters[column] = value;
        return api;
      },
      maybeSingle() {
        if (table === "saisons") {
          return Promise.resolve({
            data: { id: 1, debut: new Date(Date.now() - 3 * 86_400_000).toISOString(), graine: 27 },
            error: null,
          });
        }
        if (table === "etats_joueur") {
          return Promise.resolve({ data: states.get(filters.joueur) ?? null, error: null });
        }
        if (table === "ordres") {
          const found = outcomes.get(`${filters.joueur}/${filters.id}`);
          return Promise.resolve({
            data: found === undefined ? null : { resultat: found },
            error: null,
          });
        }
        throw new Error(`table inattendue : ${table}`);
      },
    };
    return api;
  };
  globalThis.__createClient = () => ({
    auth: {
      getUser: (token) =>
        Promise.resolve(
          token === "JETON"
            ? { data: { user: { id: "joueur-1", is_anonymous: true } }, error: null }
            : { data: { user: null }, error: { message: "inconnu" } },
        ),
      admin: {
        deleteUser(id) {
          calls.push(["deleteUser", id]);
          return Promise.resolve({ error: null });
        },
      },
    },
    from: builder,
    rpc(name, args) {
      calls.push([name, args]);
      if (!(name in rpc)) throw new Error(`fonction inattendue : ${name}`);
      // Comme le vrai client : un objet « thenable », qui ne part que si on l'attend.
      return {
        then: (resolve, reject) =>
          Promise.resolve({ data: rpc[name](args), error: null }).then(resolve, reject),
      };
    },
  });

  let handler = null;
  const waiting = [];
  globalThis.Deno = {
    env: { get: (name) => `faux-${name}` },
    serve(fn) {
      handler = fn;
    },
  };
  globalThis.EdgeRuntime = { waitUntil: (p) => waiting.push(p) };

  await import(pathToFileURL(out).href);
  if (handler === null) throw new Error("la fonction ne s'est pas branchée");

  const post = async (route, body, token = "JETON") => {
    const response = await handler(
      new Request(`https://faux.test/functions/v1/jeu/${route}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    return { status: response.status, body: await response.json() };
  };
  const check = (label, fine, detail) => {
    process.stdout.write(
      `${fine ? "OK   " : "ECHEC"} ${label}${fine ? "" : ` → ${JSON.stringify(detail)}`}\n`,
    );
    if (!fine) process.exitCode = 1;
  };
  const rpcCall = (name) => calls.filter(([n]) => n === name).at(-1)?.[1];

  const unknown = await post("etat", {}, "MAUVAIS");
  check("un inconnu est refusé", unknown.status === 401, unknown);

  const info = { lang: "fr", device: "phone", installed: true, source: "discord" };
  const visit = await post("etat", { info });
  await Promise.all(waiting);
  check("etat : 200 et un état", visit.status === 200 && visit.body.state?.tier === 0, visit);
  const noted = rpcCall("noter_visite");
  check(
    "etat : la visite est notée, avec ce que dit l'appareil",
    noted?.p_joueur === "joueur-1" &&
      /^\d{4}-\d\d-\d\d$/.test(noted.p_jour) &&
      noted.p_jour_saison === 4 &&
      noted.p_palier === 0 &&
      noted.p_langue === "fr" &&
      noted.p_appareil === "phone" &&
      noted.p_installe === true &&
      noted.p_source === "discord" &&
      noted.p_planche === null &&
      typeof noted.p_saison === "number",
    noted,
  );

  check(
    "etat : la foule des autres humains accompagne l'état, avec les prises des gisements",
    visit.body.state?.crowd?.cards?.[0]?.name === "Bobus maximus" &&
      visit.body.state.crowd.taken?.["d:1:1:5"] === 2000,
    visit.body.state?.crowd,
  );
  const shown = rpcCall("montrer_vitrine");
  check(
    "etat : la vitrine du joueur est mise à jour, sans son compte dedans",
    shown?.p_joueur === "joueur-1" &&
      shown.p_place === visit.body.state.slot &&
      shown.p_carte?.slot === visit.body.state.slot &&
      typeof shown.p_carte.name === "string" &&
      shown.p_carte.scores?.power >= 0 &&
      !JSON.stringify(shown.p_carte).includes("joueur-1"),
    shown,
  );
  const reads = calls.filter(([n]) => n === "lire_foule").length;
  const asked = rpcCall("attaques_dues");
  check(
    "etat : les attaques arrivées à l'heure du combat sont cherchées, celles du joueur d'abord",
    asked?.p_joueur === "joueur-1" && asked.p_saison === 1 && asked.p_limite > 0,
    asked,
  );
  const closedFight = rpcCall("regler_attaque");
  check(
    "etat : une attaque dont un joueur a disparu est close, sans combat ni écriture",
    closedFight?.p_attaque === "attaque-1" &&
      closedFight.p_resultat === null &&
      Array.isArray(closedFight.p_ecritures) &&
      closedFight.p_ecritures.length === 0,
    closedFight,
  );

  const plain = await post("etat", {});
  await Promise.all(waiting);
  check(
    "etat sans détail : 200, visite notée sans langue",
    plain.status === 200 && rpcCall("noter_visite").p_langue === null,
    plain.status,
  );

  const order = await post("ordre", {
    orderId: "00000000-0000-4000-8000-000000000001",
    order: { type: "harvest", taps: 3 },
  });
  await Promise.all(waiting);
  check("ordre : 200 et accepté", order.status === 200 && order.body.outcome?.ok === true, order);
  const counted = rpcCall("noter_ordre");
  check(
    "ordre : son type est compté",
    counted?.p_type === "harvest" && counted.p_accepte === true && counted.p_palier === 0,
    counted,
  );

  check(
    "les vitrines ne sont lues qu'une fois par minute",
    calls.filter(([n]) => n === "lire_foule").length === reads,
    reads,
  );

  const locked = await post("ordre", {
    orderId: "00000000-0000-4000-8000-000000000002",
    order: { type: "build", organelle: "mitochondrion" },
  });
  await Promise.all(waiting);
  check(
    "ordre refusé par les règles : son motif est compté",
    locked.status === 200 &&
      locked.body.outcome?.ok === false &&
      rpcCall("noter_refus")?.p_code === locked.body.outcome.error,
    { locked: locked.body, refus: rpcCall("noter_refus") },
  );
  check(
    "un ordre qui ne récolte rien ne vide aucun gisement",
    !calls.some(([n]) => n === "prendre_gisement"),
    calls.map(([n]) => n),
  );

  const help = await post("ordre", {
    orderId: "00000000-0000-4000-8000-000000000003",
    order: {
      type: "reinforceAlly",
      attack: "00000000-0000-4000-8000-0000000000aa",
      slot: 41,
      party: { hunter: 1, armored: 0, swift: 0 },
    },
  });
  await Promise.all(waiting);
  check(
    "renforts : le serveur cherche l'attaque visée dans la file",
    help.status === 200 &&
      help.body.outcome?.ok === false &&
      rpcCall("trouver_attaque")?.p_attaque === "00000000-0000-4000-8000-0000000000aa",
    { help: help.body, cherche: rpcCall("trouver_attaque") },
  );

  const feeds = await post("fils", {});
  check(
    "fils : 200, les attaques et les espionnages du banc du joueur",
    feeds.status === 200 &&
      feeds.body.attacks?.[0]?.id === "a-1" &&
      Array.isArray(feeds.body.spies) &&
      rpcCall("lire_fils")?.p_joueur === "joueur-1" &&
      typeof rpcCall("lire_fils")?.p_maintenant === "number",
    feeds,
  );

  const written = await post("discussion", { texte: "  Bravo   connard !  " });
  check(
    "discussion : le message est nettoyé avant d'entrer en base (espaces, grossièretés)",
    written.status === 200 &&
      rpcCall("ecrire_message")?.p_texte === "Bravo •••••• !" &&
      rpcCall("ecrire_message")?.p_par_minute > 0 &&
      written.body.messages?.[0]?.text === "Bravo •••••• !",
    { written: written.body, base: rpcCall("ecrire_message") },
  );
  const empty2 = await post("discussion", { texte: "   " });
  check("discussion : un message vide est refusé (400)", empty2.status === 400, empty2);
  const odd = await post("discussion", { texte: "x", autre: 1 });
  check("discussion : une demande mal formée est refusée (400)", odd.status === 400, odd);
  await post("discussion", { texte: "deux" });
  const flood = await post("discussion", { texte: "trois" });
  check("discussion : au-delà du rythme permis, 429", flood.status === 429, flood);
  const flagged = await post("discussion", { signaler: 1 });
  check(
    "discussion : signaler un message passe par la base",
    flagged.status === 200 && rpcCall("signaler_message")?.p_message === 1,
    flagged,
  );
  bench = false;
  const alone = await post("discussion", {});
  check("discussion : sans banc, 403", alone.status === 403, alone);

  const bad = await post("ordre", { n: 1 });
  check("ordre mal formé : 400", bad.status === 400, bad);

  const feedback = await post("avis", { rating: 4, text: " Bien ", lang: "fr" });
  const kept = rpcCall("donner_avis");
  check(
    "avis : 200, gardé avec le palier et le jour de saison",
    feedback.status === 200 &&
      kept?.p_note === 4 &&
      kept.p_texte === "Bien" &&
      kept.p_langue === "fr" &&
      kept.p_limite === 5 &&
      kept.p_jour_saison === 4,
    { feedback, kept },
  );
  const empty = await post("avis", { rating: null, text: "", lang: "fr" });
  check("avis vide : 400", empty.status === 400, empty);
  rpc.donner_avis = () => false;
  const tooMany = await post("avis", { rating: 1, text: "", lang: "fr" });
  check("avis au-delà de la limite : 429", tooMany.status === 429, tooMany);

  const museum = await post("musee", {});
  check(
    "musée : 200 et les planches",
    museum.status === 200 && museum.body.plates?.[0]?.name === "Protomonas originis",
    museum,
  );

  const closed = await post("stats", {});
  check("stats pour un compte ordinaire : 403", closed.status === 403, closed);
  guardian = true;
  const open = await post("stats", {});
  check(
    "stats pour un gardien : 200, avec le monde partagé",
    open.status === 200 &&
      open.body.stats?.joueurs === 3 &&
      open.body.stats.ocean?.humains === 2 &&
      open.body.stats.combats?.attaques === 1 &&
      open.body.stats.alliances?.messages7j === 2,
    open,
  );

  const unsure = await post("supprimer", {});
  check(
    "supprimer sans confirmation : 400, rien n'est effacé",
    unsure.status === 400 && !calls.some(([n]) => n === "deleteUser"),
    unsure,
  );
  const gone = await post("supprimer", { confirm: true });
  check(
    "supprimer avec confirmation : 200, le compte du joueur est effacé",
    gone.status === 200 && calls.some(([n, id]) => n === "deleteUser" && id === "joueur-1"),
    gone,
  );
  fs.unlinkSync(out);
  if (process.exitCode !== 1) {
    process.stdout.write("Fonction du serveur essayée : toutes les routes répondent.\n");
  }
}

main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});
