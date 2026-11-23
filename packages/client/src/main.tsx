import "@fontsource/instrument-serif/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./theme/tokens.css";
import "./theme/app.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createStore } from "./game/store";
import { initialLang, saveLang } from "./game/text";
import type { Lang } from "./game/text";

const store = createStore({
  clock: () => Date.now(),
  storage: window.localStorage,
  newSeed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 1,
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
