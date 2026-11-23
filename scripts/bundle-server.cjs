// Rassemble packages/server (avec core, data et zod) en un seul fichier que la fonction
// Supabase peut importer : supabase/functions/_shared/server.js.
// Puis vérifie que ce fichier fonctionne vraiment : une visite, un ordre, le même ordre rejoué.
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "supabase", "functions", "_shared");

async function main() {
  const vite = await import(
    pathToFileURL(path.join(root, "packages/client/node_modules/vite/dist/node/index.js")).href
  );
  await vite.build({
    root: path.join(root, "packages/server"),
    configFile: false,
    logLevel: "warn",
    build: {
      outDir,
      emptyOutDir: false,
      minify: false,
      target: "es2022",
      lib: {
        entry: path.join(root, "packages/server/src/index.ts"),
        formats: ["es"],
        fileName: () => "server.js",
      },
    },
  });

  const server = await import(pathToFileURL(path.join(outDir, "server.js")).href);
  const deps = {
    repo: server.createMemoryRepository(),
    clock: () => 2000,
    newSeed: () => 1,
    seasonStart: 1000,
  };
  const body = {
    orderId: "00000000-0000-4000-8000-000000000001",
    order: { type: "harvest", taps: 1 },
  };
  const visit = await server.handleState(deps, "essai");
  const first = await server.handleOrder(deps, "essai", body);
  const again = await server.handleOrder(deps, "essai", body);
  const fine =
    visit.status === "done" &&
    first.status === "done" &&
    first.outcome.ok === true &&
    again.status === "done" &&
    again.state.counters.harvests === 1;
  if (!fine) throw new Error("Le fichier assemblé ne se comporte pas comme attendu");
  process.stdout.write("Serveur assemblé et vérifié : supabase/functions/_shared/server.js\n");
}

main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});
