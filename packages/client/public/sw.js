// Le petit programme qui garde le jeu en réserve sur l'appareil (« service worker »).
// Il sert à deux choses : le jeu s'ouvre même sans connexion, et il peut s'installer sur
// l'écran d'accueil. Il ne touche jamais aux échanges avec le serveur du jeu.
//
// Règles, pour ne jamais enfermer un joueur dans une vieille version :
//   - la page elle-même est toujours demandée au réseau d'abord ; la réserve ne sert qu'en panne ;
//   - les fichiers de /assets/ portent une empreinte dans leur nom : un nom = un contenu, pour
//     toujours. Ceux-là viennent de la réserve.
// Changer ce nom vide l'ancienne réserve : à faire quand un fichier gardé change sans changer
// de nom (les icônes, refaites pour l'identité « Atlas »).
const CACHE = "o27-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

async function pageFirstFromNetwork(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) await cache.put("/", fresh.clone());
    return fresh;
  } catch (error) {
    const kept = await cache.match("/");
    if (kept !== undefined) return kept;
    throw error;
  }
}

async function assetFirstFromCache(request) {
  const cache = await caches.open(CACHE);
  const kept = await cache.match(request);
  if (kept !== undefined) return kept;
  const fresh = await fetch(request);
  if (fresh.ok) await cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Tout ce qui n'est pas le site lui-même (le serveur du jeu, par exemple) passe tel quel.
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Seule la page du jeu a une réserve. Les autres pages du site (la présentation, par
    // exemple) viennent toujours du réseau : sinon elles prendraient la place du jeu en réserve.
    if (url.pathname === "/" || url.pathname === "/index.html") {
      event.respondWith(pageFirstFromNetwork(request));
    }
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(assetFirstFromCache(request));
  }
});
