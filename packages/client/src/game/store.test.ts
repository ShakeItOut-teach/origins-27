import { MICRO, createPlayer, serializeState } from "@o27/core";
import { describe, expect, it } from "vitest";
import { ABSENCE_MIN_MS, createStore } from "./store";
import { formatAway, initialLang } from "./text";

function memory(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const SAVE_KEY = "o27.partie-locale.v1";

/** Une partie sauvegardée avec une centrale, quittée à l'instant 1000. */
function savedWithPlant(): string {
  const start = createPlayer(7, 0, 1000);
  return serializeState({
    ...start,
    tier: 1,
    counters: { ...start.counters, harvests: 10, organellesBuilt: 1 },
    organelles: { ...start.organelles, mitochondrion: 1 },
  });
}

describe("retour du joueur", () => {
  it("raconte ce qui a été gagné après une longue absence", () => {
    const store = createStore({
      clock: () => 1000 + 8 * 3_600_000,
      storage: memory({ [SAVE_KEY]: savedWithPlant() }),
      newSeed: () => 1,
    });
    store.start()();
    const absence = store.getAbsence();
    expect(absence?.elapsedMs).toBe(8 * 3_600_000);
    expect(absence?.gained.sugar).toBe(80 * MICRO);
  });

  it("ne dit rien après une courte pause", () => {
    const store = createStore({
      clock: () => 1000 + ABSENCE_MIN_MS - 1,
      storage: memory({ [SAVE_KEY]: savedWithPlant() }),
      newSeed: () => 1,
    });
    store.start()();
    expect(store.getAbsence()).toBeNull();
  });

  it("ne dit rien à un nouveau joueur", () => {
    const store = createStore({ clock: () => 5000, storage: memory(), newSeed: () => 1 });
    store.start()();
    expect(store.getAbsence()).toBeNull();
  });

  it("ne dit rien si rien n'a été gagné", () => {
    const store = createStore({
      clock: () => 1000 + 8 * 3_600_000,
      storage: memory({ [SAVE_KEY]: serializeState(createPlayer(7, 0, 1000)) }),
      newSeed: () => 1,
    });
    store.start()();
    expect(store.getAbsence()).toBeNull();
  });
});

describe("textes", () => {
  it("arrondit les longues durées", () => {
    expect(formatAway(12 * 60_000, "fr")).toBe("12 min");
    expect(formatAway(8 * 3_600_000 + 5, "fr")).toBe("8 h");
    expect(formatAway(3 * 86_400_000, "fr")).toBe("3 j");
    expect(formatAway(3 * 86_400_000, "en")).toBe("3 d");
  });

  it("préfère la langue choisie à celle de l'appareil", () => {
    expect(initialLang(memory({ "o27.langue": "en" }), ["fr-FR"])).toBe("en");
    expect(initialLang(memory(), ["fr-FR"])).toBe("fr");
    expect(initialLang(memory({ "o27.langue": "xx" }), ["de"])).toBe("en");
  });
});
