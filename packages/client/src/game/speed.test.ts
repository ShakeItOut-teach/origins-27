import { describe, expect, it } from "vitest";
import { TRIAL_SAVE_KEY, readSpeed, resetTrial, trialClock } from "./speed";

function memory(): Pick<Storage, "getItem" | "setItem" | "removeItem"> & { keys: () => string[] } {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    keys: () => [...data.keys()],
  };
}

describe("essai accéléré", () => {
  it("l'adresse choisit la vitesse, l'appareil la retient, ×1 revient au temps normal", () => {
    const storage = memory();
    expect(readSpeed("", storage)).toBe(1);
    expect(readSpeed("?vitesse=600", storage)).toBe(600);
    expect(readSpeed("", storage)).toBe(600);
    expect(readSpeed("?vitesse=60", storage)).toBe(60);
    expect(readSpeed("?vitesse=42", storage)).toBe(60);
    expect(readSpeed("?vitesse=1", storage)).toBe(1);
    expect(readSpeed("", storage)).toBe(1);
  });

  it("le temps du jeu passe plus vite, sans sauter ni reculer quand on change de vitesse", () => {
    const storage = memory();
    let real = 1_000_000;
    const clock600 = trialClock(storage, () => real, 600);
    expect(clock600()).toBe(1_000_000);
    real += 1000;
    expect(clock600()).toBe(1_000_000 + 600_000);
    // On rouvre l'appareil plus tard : le temps a continué de courir.
    real += 1000;
    const again = trialClock(storage, () => real, 600);
    expect(again()).toBe(1_000_000 + 1_200_000);
    // Passer à ×60 repart de l'instant atteint.
    const clock60 = trialClock(storage, () => real, 60);
    expect(clock60()).toBe(1_000_000 + 1_200_000);
    real += 1000;
    expect(clock60()).toBe(1_000_000 + 1_200_000 + 60_000);
  });

  it("recommencer efface la partie d'essai et son horloge, rien d'autre", () => {
    const storage = memory();
    storage.setItem("o27.partie-locale.v1", "vraie partie");
    storage.setItem(TRIAL_SAVE_KEY, "essai");
    trialClock(storage, () => 5, 600);
    resetTrial(storage);
    expect(storage.keys()).toEqual(["o27.partie-locale.v1"]);
  });
});
