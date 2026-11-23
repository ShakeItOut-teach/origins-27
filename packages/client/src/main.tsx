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
import { SAVE_KEY, createStore } from "./game/store";
import { initialLang, saveLang } from "./game/text";
import type { Lang } from "./game/text";

// Retour d'un lien reçu par e-mail : la session arrive dans l'adresse de la page.
if (SERVER !== null && window.location.hash !== "") {
  if (takeSessionFromHash(window.location.hash, window.localStorage)) {
    // La partie affichée doit être celle de ce compte : on attend le serveur.
    window.localStorage.removeItem(SAVE_KEY);
  }
  window.history.replaceState(null, "", window.location.pathname);
}

const api =
  SERVER === null
    ? null
    : createApi({
        ...SERVER,
        fetch: (input, init) => window.fetch(input, init),
        storage: window.localStorage,
      });

const store = createStore({
  clock: () => Date.now(),
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
    <App
      store={store}
      account={api?.account ?? null}
      lang={lang}
      onSwitchLang={() => {
        const next = lang === "fr" ? "en" : "fr";
        saveLang(window.localStorage, next);
        setLang(next);
      }}
    />
  );
}

const root = document.getElementById("root");
if (root === null) throw new Error("Élément #root introuvable");
createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
