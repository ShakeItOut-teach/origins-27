import { createPlayer, partyOf } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { describe, expect, it } from "vitest";
import { readFeeds, readStats } from "./community";
import { awaitsServer } from "./store";

describe("les fils d'alliance venus du serveur", () => {
  it("relit les attaques et les espionnages, et écarte ce qui n'en a pas la forme", () => {
    const feeds = readFeeds({
      attacks: [
        {
          id: "a-1",
          attackerSlot: 4,
          attackerName: "Alicia",
          attackerBanner: "aby",
          defenderSlot: 5,
          defenderName: "Bobus",
          defenderBanner: "tox",
          arrivesAt: 10,
          resolveAt: "20",
          status: "resolue",
          summary: { fought: true, attackerWon: true, attackerLost: 2, defenderLost: 3, loot: 9 },
          battle: { pas: "un combat" },
          mine: false,
          aimed: true,
          helping: false,
          helpers: ["Fredus", 7],
        },
        { id: "", status: "en_route" },
        { id: "a-2", status: "inconnu" },
      ],
      spies: [{ spyName: "Alicia", targetName: "Bobus", success: false, at: 5, aimed: true }],
    });
    expect(feeds.attacks).toHaveLength(1);
    const [attack] = feeds.attacks;
    expect(attack?.status).toBe("resolved");
    expect(attack?.resolveAt).toBe(20);
    expect(attack?.summary?.attackerWon).toBe(true);
    // Un détail de combat abîmé est écarté, sans faire tomber la ligne.
    expect(attack?.battle).toBeNull();
    expect(attack?.helpers).toEqual(["Fredus"]);
    expect(feeds.spies).toMatchObject([{ success: false, aimed: true, mine: false }]);
    expect(readFeeds(null)).toEqual({ attacks: [], spies: [] });
  });

  it("lit les mesures des combats entre humains pour le gardien", () => {
    const stats = readStats({
      stats: {
        combats: {
          attaques: 3,
          espionnages: 2,
          jours: [{ jour: "2027-01-11", attaques: 3, combats: 2, victoires: 1, rappels: 1 }],
          espionnagesJours: [{ jour: "2027-01-11", espionnages: 2, reussis: 1 }],
        },
      },
    });
    expect(stats?.fights?.attacks).toBe(3);
    expect(stats?.fights?.days[0]?.wins).toBe(1);
    expect(stats?.fights?.spyDays[0]?.succeeded).toBe(1);
    expect(readStats({ stats: {} })?.fights).toBeNull();
  });
});

describe("attendre le serveur", () => {
  const base = createPlayer(1, 0, 1000);
  const raid: NonNullable<PlayerState["raid"]> = {
    rival: "o:5",
    kind: "soft",
    power: 0,
    sugar: 0,
    bricks: 0,
    proteins: 0,
    energy: 2,
    restMs: 0,
    party: partyOf({ hunter: 1 }),
    startedAt: 1000,
    arrivesAt: 2000,
    resolveAt: 3000,
    returnsAt: 5000,
    outcome: null,
    cancelled: false,
    versus: 5,
  };

  it("après l'heure d'un combat entre humains, l'appareil redemande l'état", () => {
    const state: PlayerState = { ...base, raid };
    expect(awaitsServer(state, 2999)).toBe(false);
    expect(awaitsServer(state, 3000)).toBe(true);
    // Contre un organisme simulé, l'appareil joue le combat lui-même.
    const plain: Record<string, unknown> = { ...raid };
    delete plain.versus;
    expect(awaitsServer({ ...base, raid: plain as unknown as typeof raid }, 4000)).toBe(false);
  });

  it("des renforts arrivés attendent aussi le combat", () => {
    const state: PlayerState = {
      ...base,
      escort: {
        attack: "x",
        slot: 5,
        party: partyOf({ hunter: 1 }),
        startedAt: 1000,
        arrivesAt: 2000,
        returnsAt: null,
        losses: partyOf(),
        held: false,
      },
    };
    expect(awaitsServer(state, 1500)).toBe(false);
    expect(awaitsServer(state, 2500)).toBe(true);
  });
});
