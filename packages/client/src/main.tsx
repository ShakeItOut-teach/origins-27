import "@fontsource/instrument-serif/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./theme/tokens.css";
import "./theme/app.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createApi, takeSessionFromHash } from "./game/api";
import { SERVER } from "./game/config";
import { TRIAL_SAVE_KEY, readSpeed, resetTrial, trialClock } from "./game/speed";
import { SAVE_KEY, createStore } from "./game/store";
import { initialLang, saveLang } from "./game/text";
import type { Lang } from "./game/text";
import { deviceKind, installMode, rememberSource, sourceOf } from "./game/visit";
import type { Installer } from "./game/visit";
import { SpeedBadge } from "./ui/SpeedBadge";

// D'où vient le joueur : on le lit avant de nettoyer l'adresse, et on ne retient que la première fois.
const source = rememberSource(
  window.localStorage,
  sourceOf(window.location.search, document.referrer, window.location.hostname),
);

// Installé sur l'écran d'accueil ? Android et ordinateur le disent par le mode d'affichage,
// l'iPhone par un drapeau à lui.
const standalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as { standalone?: boolean }).standalone === true;

/** Le navigateur propose l'installation par un événement qu'il faut garder pour plus tard. */
interface InstallEvent extends Event {
  readonly prompt: () => Promise<unknown>;
}
let installEvent: InstallEvent | null = null;
const installListeners = new Set<() => void>();
const installChanged = (): void => {
  for (const listener of installListeners) listener();
};
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installEvent = event as InstallEvent;
  installChanged();
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  installChanged();
});
const installer: Installer = {
  mode: () =>
    installMode({
      standalone: standalone(),
      canPrompt: installEvent !== null,
      userAgent: navigator.userAgent,
    }),
  install() {
    void installEvent?.prompt();
    installEvent = null;
    installChanged();
  },
  subscribe(listener) {
    installListeners.add(listener);
    return () => installListeners.delete(listener);
  },
};

// Hors connexion, le jeu s'ouvre quand même : un petit programme garde la page en réserve.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

// Essai accéléré (×60, ×600) : une partie à part, sur l'appareil, sans serveur.
const speed = readSpeed(window.location.search, window.localStorage);
const params = new URLSearchParams(window.location.search);
if (params.has("vitesse")) {
  if (params.has("recommencer")) {
    resetTrial(window.localStorage);
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);
}
const trial = speed !== 1;
// Un peu de place en bas de page : le rappel de l'essai ne cache rien.
if (trial) document.body.classList.add("trial");

// Retour d'un lien reçu par e-mail : la session arrive dans l'adresse de la page.
if (SERVER !== null && window.location.hash !== "") {
  if (takeSessionFromHash(window.location.hash, window.localStorage)) {
    // La partie affichée doit être celle de ce compte : on attend le serveur.
    window.localStorage.removeItem(SAVE_KEY);
  }
  window.history.replaceState(null, "", window.location.pathname);
}

const api =
  SERVER === null || trial
    ? null
    : createApi({
        ...SERVER,
        fetch: (input, init) => window.fetch(input, init),
        storage: window.localStorage,
        visitInfo: () => ({
          lang: initialLang(window.localStorage, navigator.languages),
          device: deviceKind(
            Math.min(window.screen.width, window.screen.height),
            navigator.maxTouchPoints > 0,
          ),
          installed: standalone(),
          source,
        }),
      });

const store = createStore({
  clock: trial ? trialClock(window.localStorage, () => Date.now(), speed) : () => Date.now(),
  ...(trial ? { saveKey: TRIAL_SAVE_KEY } : {}),
  storage: window.localStorage,
  newSeed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 1,
  ...(api === null ? {} : { remote: api }),
});

function Root() {
  const [lang, setLang] = useState<Lang>(() =>
    initialLang(window.localStorage, navigator.languages),
  );
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <>
      {speed !== 1 && <SpeedBadge speed={speed} lang={lang} />}
      <App
        store={store}
        account={api?.account ?? null}
        community={api?.community ?? null}
        installer={installer}
        onAccountDeleted={() => {
          // Le compte n'existe plus : l'appareil oublie la partie et repart de zéro.
          window.localStorage.removeItem(SAVE_KEY);
          window.location.reload();
        }}
        lang={lang}
        onSwitchLang={() => {
          const next = lang === "fr" ? "en" : "fr";
          saveLang(window.localStorage, next);
          setLang(next);
        }}
      />
    </>
  );
}

const root = document.getElementById("root");
if (root === null) throw new Error("Élément #root introuvable");
createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
