// Frontières d'architecture entre paquets. Un import interdit fait échouer `pnpm check`.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-reste-pur",
      comment:
        "Le moteur ne dépend que de lui-même et de data. Aucune bibliothèque, aucun autre paquet.",
      severity: "error",
      from: { path: "^packages/core/src", pathNot: "\.test\.ts$" },
      to: { pathNot: "^packages/(core|data)/src" },
    },
    {
      name: "data-ne-depend-de-rien-du-jeu",
      comment:
        "data contient des données et des schémas, jamais de logique venue d'un autre paquet.",
      severity: "error",
      from: { path: "^packages/data/src" },
      to: { path: "^packages/(core|server|client|bots)/" },
    },
    {
      name: "client-et-serveur-separes",
      comment: "Le client et le serveur ne se connaissent pas : ils partagent core et data.",
      severity: "error",
      from: { path: "^packages/client/" },
      to: { path: "^packages/(server|bots)/" },
    },
    {
      name: "serveur-sans-client",
      severity: "error",
      from: { path: "^packages/server/" },
      to: { path: "^packages/(client|bots)/" },
    },
    {
      name: "robots-jouent-par-le-moteur",
      comment: "Les robots passent par core et data, comme un joueur.",
      severity: "error",
      from: { path: "^packages/bots/" },
      to: { path: "^packages/(client|server)/" },
    },
    {
      name: "pas-de-cycle",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "default"] },
  },
};
