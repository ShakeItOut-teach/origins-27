// Pilote un navigateur sans fenêtre (Edge ou Chrome déjà installé) par son port de débogage.
// Aucune bibliothèque : Node sait parler WebSocket. Sert à capturer le vrai jeu pour la vidéo.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CANDIDATES = [
  process.env.O27_BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ouvre le navigateur. Rend de quoi ouvrir des pages, et de quoi tout refermer. */
async function open(port = 9333) {
  const exe = CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (exe === undefined) {
    throw new Error("Aucun navigateur trouvé. Indiquez-en un : O27_BROWSER=/chemin/vers/chrome");
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "o27-video-"));
  const child = spawn(
    exe,
    [
      "--headless=new",
      `--remote-debugging-port=${String(port)}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--autoplay-policy=no-user-gesture-required",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let info = null;
  for (let attempt = 0; attempt < 60 && info === null; attempt++) {
    try {
      info = await (await fetch(`http://127.0.0.1:${String(port)}/json/version`)).json();
    } catch {
      await sleep(250);
    }
  }
  if (info === null) throw new Error("Le navigateur ne répond pas sur son port de débogage.");

  const socket = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error("Connexion au navigateur refusée."));
  });
  let nextId = 1;
  const waiting = new Map();
  const listeners = new Set();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) {
      const entry = waiting.get(message.id);
      waiting.delete(message.id);
      if (entry === undefined) return;
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    } else {
      for (const listener of listeners) listener(message);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      waiting.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });

  /** Une page de la taille d'un écran donné. `scale` est la finesse de l'image. */
  async function page({ width, height, scale = 1, mobile = true }) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    await call("Page.enable");
    await call("Runtime.enable");
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: scale,
      mobile,
    });

    const until = (method) =>
      new Promise((resolve) => {
        const listener = (message) => {
          if (message.method === method && message.sessionId === sessionId) {
            listeners.delete(listener);
            resolve(message.params);
          }
        };
        listeners.add(listener);
      });

    async function evaluate(expression) {
      const result = await call("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(
          result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
        );
      }
      return result.result.value;
    }

    return {
      call,
      evaluate,
      /** Du code lancé avant celui de la page, à chaque ouverture (pour préparer la sauvegarde). */
      before: (source) => call("Page.addScriptToEvaluateOnNewDocument", { source }),
      async goto(url) {
        const loaded = until("Page.loadEventFired");
        await call("Page.navigate", { url });
        await loaded;
      },
      /** Touche le milieu d'un élément. Rend faux s'il n'est pas à l'écran. */
      async tap(selector) {
        const point = await evaluate(`(() => {
          const element = document.querySelector(${JSON.stringify(selector)});
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return [box.x + box.width / 2, box.y + box.height / 2];
        })()`);
        if (point === null) return false;
        const at = { x: point[0], y: point[1], button: "left", clickCount: 1 };
        await call("Input.dispatchMouseEvent", { type: "mousePressed", ...at });
        await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...at });
        return true;
      },
      /** Une image de la page, en JPEG. */
      async shot(quality = 86) {
        const { data } = await call("Page.captureScreenshot", { format: "jpeg", quality });
        return Buffer.from(data, "base64");
      },
      close: () => send("Target.closeTarget", { targetId }),
    };
  }

  return {
    page,
    async close() {
      socket.close();
      child.kill();
      // Le dossier de travail du navigateur : on l'efface si le système le rend ; sinon tant pis.
      await sleep(800);
      try {
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
      } catch {
        // Windows garde parfois un fichier ouvert quelques secondes de plus.
      }
    },
  };
}

module.exports = { open, sleep };
