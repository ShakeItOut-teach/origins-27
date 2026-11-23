import "@fontsource/instrument-serif/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./theme/tokens.css";
import "./theme/app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createStore } from "./game/store";
import { detectLang } from "./game/text";

const lang = detectLang(navigator.languages);
document.documentElement.lang = lang;

const store = createStore({
  clock: () => Date.now(),
  storage: window.localStorage,
  newSeed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 1,
});

const root = document.getElementById("root");
if (root === null) throw new Error("Élément #root introuvable");
createRoot(root).render(
  <StrictMode>
    <App store={store} lang={lang} />
  </StrictMode>,
);
