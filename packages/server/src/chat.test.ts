import { BALANCE } from "@o27/data";
import { DAY_MS, advance, createPlayer, readCrowd, serializeState } from "@o27/core";
import type { BannerId } from "@o27/data";
import { describe, expect, it } from "vitest";
import { cleanMessage, createMemoryChat, handleChat } from "./chat";
import { createMemoryRepository } from "./memory";
import type { PoliticsRepository } from "./politics";
import { handleOrder } from "./service";
import type { ServerDeps } from "./service";

const RULES = BALANCE.alliance.chat;

describe("le nettoyage d'un message", () => {
  it("masque les grossièretés, même déguisées, sans toucher aux mots qui les contiennent", () => {
    expect(cleanMessage("Bravo pour le concours !")).toBe("Bravo pour le concours !");
    expect(cleanMessage("quel CONNARD")).toBe("quel ••••••");
    expect(cleanMessage("espèce de c0nnard")).toBe("espèce de ••••••");
    expect(cleanMessage("Enculé")).toBe("••••••");
    expect(cleanMessage("what the fuuuck")).toBe("what the ••••••");
  });

  it("resserre les espaces, retire les liens, refuse le vide et le trop long", () => {
    expect(cleanMessage("  on   attaque\n\nà minuit  ")).toBe("on attaque à minuit");
    expect(cleanMessage("venez sur https://exemple.test/x")).toBe("venez sur [lien]");
    expect(cleanMessage("voir www.exemple.com")).toBe("voir [lien]");
    expect(cleanMessage("   ")).toBeNull();
    expect(cleanMessage(42)).toBeNull();
    expect(cleanMessage("a".repeat(RULES.maxLength))).not.toBeNull();
    expect(cleanMessage("a".repeat(RULES.maxLength + 1))).toBeNull();
  });
});

describe("la discussion d'alliance", () => {
  const benches: Record<string, { banner: string; slot: number; name: string }> = {
    alice: { banner: "aby", slot: 1, name: "Alicia" },
    bob: { banner: "aby", slot: 2, name: "Bobus" },
    carol: { banner: "aby", slot: 3, name: "Carola" },
    eve: { banner: "tox", slot: 4, name: "Eva" },
  };
  function setup() {
    const time = { now: 1_000_000 };
    const chat = createMemoryChat(
      (id) => benches[id] ?? null,
      () => time.now,
    );
    return { chat, time };
  }

  it("un message ne se lit que dans son banc", async () => {
    const { chat } = setup();
    const sent = await handleChat(chat, "alice", { texte: "On défend Bobus ce soir" });
    expect(sent.status).toBe("done");
    const bob = await handleChat(chat, "bob", {});
    expect(bob.status === "done" && bob.messages.map((entry) => entry.text)).toEqual([
      "On défend Bobus ce soir",
    ]);
    const eve = await handleChat(chat, "eve", {});
    expect(eve.status === "done" && eve.messages).toEqual([]);
    expect(await handleChat(chat, "personne", {})).toEqual({ status: "closed" });
    expect(await handleChat(chat, "personne", { texte: "salut" })).toEqual({ status: "closed" });
  });

  it("quelques messages par minute, pas plus ; une demande mal formée est refusée", async () => {
    const { chat, time } = setup();
    for (let index = 0; index < RULES.perMinute; index += 1) {
      expect((await handleChat(chat, "alice", { texte: `message ${String(index)}` })).status).toBe(
        "done",
      );
    }
    expect(await handleChat(chat, "alice", { texte: "encore" })).toEqual({ status: "tooMany" });
    time.now += 60_001;
    expect((await handleChat(chat, "alice", { texte: "encore" })).status).toBe("done");
    expect(await handleChat(chat, "alice", { texte: "x", autre: 1 })).toEqual({
      status: "invalid",
    });
    expect(await handleChat(chat, "alice", { signaler: -1 })).toEqual({ status: "invalid" });
  });

  it("un message signalé par plusieurs membres est masqué ; on ne signale pas le sien", async () => {
    const { chat } = setup();
    await handleChat(chat, "alice", { texte: "message limite" });
    const id = chat.all()[0]?.id ?? 0;
    await handleChat(chat, "alice", { signaler: id });
    await handleChat(chat, "bob", { signaler: id });
    const seen = await handleChat(chat, "bob", {});
    expect(seen.status === "done" && seen.messages[0]?.reported).toBe(true);
    // Encore visible tant que trop peu de membres l'ont signalé.
    const once = await handleChat(chat, "alice", {});
    expect(once.status === "done" && once.messages.length).toBe(RULES.hideAfterReports > 1 ? 1 : 0);
    await handleChat(chat, "carol", { signaler: id });
    expect(RULES.hideAfterReports).toBeLessThanOrEqual(2);
    const after = await handleChat(chat, "alice", {});
    expect(after.status === "done" && after.messages).toEqual([]);
  });

  it("les messages sont gardés une semaine", async () => {
    const { chat, time } = setup();
    await handleChat(chat, "alice", { texte: "vieux message" });
    time.now += RULES.keepDays * DAY_MS + 1;
    const later = await handleChat(chat, "bob", {});
    expect(later.status === "done" && later.messages).toEqual([]);
  });
});

describe("la politique gardée par le serveur", () => {
  it("le vote du chef et la guerre passent par le moteur, puis sont gardés en base", async () => {
    const SEASON = 1_800_000_000_000;
    const NOW = SEASON + 11 * DAY_MS + 12 * 3_600_000;
    const repo = createMemoryRepository();
    const born = createPlayer(7, SEASON, NOW, { worldSeed: 27, slot: 4 });
    const ready = advance({ ...born, tier: 9, nextRaidAt: NOW + 30 * DAY_MS }, NOW).state;
    const banner: BannerId = ready.alliance?.banner ?? "aby";
    const other: BannerId = banner === "aby" ? "tox" : "aby";
    await repo.commit({
      playerId: "alice",
      expectedVersion: 0,
      state: serializeState(ready),
      order: null,
    });
    const kept: string[] = [];
    const politics: PoliticsRepository = {
      vote: (player, slot) => {
        kept.push(`vote ${player} ${String(slot)}`);
        return Promise.resolve();
      },
      declareWar: (player, target) => {
        kept.push(`guerre ${player} ${target}`);
        return Promise.resolve();
      },
      makePeace: (player, target) => {
        kept.push(`paix ${player} ${target}`);
        return Promise.resolve();
      },
    };
    let leader: number | null = null;
    const deps: ServerDeps = {
      repo,
      politics,
      clock: () => NOW,
      newSeed: () => 1,
      seasonStart: SEASON,
      worldSeed: 27,
      crowd: () =>
        Promise.resolve(
          readCrowd({
            cards: [],
            politics: { leaders: leader === null ? {} : { [banner]: leader }, wars: [], votes: {} },
          }),
        ),
    };
    const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const vote = await handleOrder(deps, "alice", {
      orderId: id(1),
      order: { type: "voteLeader", slot: 4 },
    });
    expect(vote.status === "done" && vote.outcome.ok).toBe(true);
    const refused = await handleOrder(deps, "alice", {
      orderId: id(2),
      order: { type: "declareWar", banner: other },
    });
    expect(refused.status === "done" && refused.outcome).toEqual({ ok: false, error: "notLeader" });
    leader = 4;
    const war = await handleOrder(deps, "alice", {
      orderId: id(3),
      order: { type: "declareWar", banner: other },
    });
    expect(war.status === "done" && war.outcome.ok).toBe(true);
    expect(kept).toEqual(["vote alice 4", `guerre alice ${other}`]);
  });
});
