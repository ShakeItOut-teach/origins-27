import { VisitInfoSchema } from "@o27/data";
import { describe, expect, it } from "vitest";
import { deviceKind, installMode, rememberSource, sourceOf } from "./visit";

function memory(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

describe("d'où vient le joueur", () => {
  it("le mot court du lien l'emporte : ?s=discord", () => {
    expect(sourceOf("?s=discord", "https://www.reddit.com/r/jeux", "origins-27.pages.dev")).toBe(
      "discord",
    );
  });

  it("sans mot dans le lien, le site d'où il arrive, en mot court", () => {
    expect(sourceOf("", "https://www.reddit.com/r/jeux", "origins-27.pages.dev")).toBe(
      "reddit-com",
    );
    expect(sourceOf("", "https://discord.com/channels/1/2", "origins-27.pages.dev")).toBe(
      "discord-com",
    );
  });

  it("venir du jeu lui-même, ou de nulle part, ne dit rien", () => {
    expect(sourceOf("", "https://origins-27.pages.dev/", "origins-27.pages.dev")).toBeNull();
    expect(sourceOf("", "", "origins-27.pages.dev")).toBeNull();
    expect(sourceOf("", "pas une adresse", "origins-27.pages.dev")).toBeNull();
  });

  it("un mot bizarre dans le lien est nettoyé, ou ignoré s'il n'en reste rien", () => {
    expect(sourceOf("?s=Mon%20Blog!", "", "x")).toBe("mon-blog");
    expect(sourceOf("?s=%3Cscript%3E", "", "x")).toBe("script");
    expect(sourceOf("?s=!!!", "", "x")).toBeNull();
    expect(sourceOf(`?s=${"a".repeat(60)}`, "", "x")).toBe("a".repeat(24));
  });

  it("ce que le client envoie passe toujours le contrôle du serveur", () => {
    for (const source of [
      sourceOf("?s=Mon%20Blog!", "", "x"),
      sourceOf("", "https://un.site.tres-long-vraiment-tres-long.example.org/", "x"),
      sourceOf("", "", "x"),
    ]) {
      const info = { lang: "fr", device: "phone", installed: false, source };
      expect(VisitInfoSchema.safeParse(info).success).toBe(true);
    }
  });

  it("la première source est gardée sur l'appareil : les visites suivantes ne l'écrasent pas", () => {
    const storage = memory();
    expect(rememberSource(storage, "discord")).toBe("discord");
    expect(rememberSource(storage, "reddit-com")).toBe("discord");
    expect(rememberSource(storage, null)).toBe("discord");
    expect(rememberSource(memory(), null)).toBeNull();
  });
});

describe("la sorte d'appareil", () => {
  it("petit écran : téléphone ; écran moyen tactile : tablette ; le reste : ordinateur", () => {
    expect(deviceKind(375, true)).toBe("phone");
    expect(deviceKind(820, true)).toBe("tablet");
    expect(deviceKind(820, false)).toBe("desktop");
    expect(deviceKind(1440, false)).toBe("desktop");
    expect(deviceKind(1366, true)).toBe("desktop");
  });
});

describe("comment proposer d'installer le jeu", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1";
  const android = "Mozilla/5.0 (Linux; Android 15) Chrome/140 Mobile Safari/537.36";

  it("déjà installé : rien à proposer", () => {
    expect(installMode({ standalone: true, canPrompt: true, userAgent: android })).toBe("done");
  });

  it("le navigateur sait installer : un bouton", () => {
    expect(installMode({ standalone: false, canPrompt: true, userAgent: android })).toBe("button");
  });

  it("sur iPhone, pas de bouton possible : on explique le geste", () => {
    expect(installMode({ standalone: false, canPrompt: false, userAgent: iphone })).toBe("ios");
  });

  it("ailleurs : une explication générale", () => {
    expect(installMode({ standalone: false, canPrompt: false, userAgent: android })).toBe("menu");
  });
});
