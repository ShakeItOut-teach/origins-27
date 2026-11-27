import {
  DAY_MS,
  advance,
  capacity,
  createPlayer,
  deserializeState,
  humanCard,
  oceanRivals,
  partyOf,
  readCrowd,
  serializeState,
} from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, BANNER_IDS } from "@o27/data";
import type { BannerId } from "@o27/data";
import { describe, expect, it } from "vitest";
import { createMemoryRepository, createMemoryWar } from "./memory";
import { handleOrder, handleState } from "./service";
import type { ServerDeps } from "./service";

const SEASON = 1_800_000_000_000;
const NOW = SEASON + 9 * DAY_MS + 12 * 3_600_000;
const ALICE = "joueur-alice";
const BOB = "joueur-bob";
const CAROL = "joueur-carol";

function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function flag(index: number): BannerId {
  const found = BANNER_IDS[index];
  if (found === undefined) throw new Error("bannière attendue");
  return found;
}

/** Un humain du palier 9 dans l'océan, sous une bannière donnée. */
function human(seed: number, slot: number, hunters: number, banner: BannerId) {
  const at = NOW;
  const born = createPlayer(seed, SEASON, at, { worldSeed: 27, slot });
  const ready: PlayerState = {
    ...born,
    tier: 9,
    energy: BALANCE.energy.max,
    organelles: { ...born.organelles, receptor: 5, vacuole: born.organelles.vacuole + 30 },
    spies: 5,
    troops: partyOf({ hunter: hunters }),
    shieldUntil: 0,
    nextRaidAt: at + 20 * DAY_MS,
  };
  const half = (res: "sugar" | "bricks" | "proteins"): number =>
    Math.floor(capacity(ready, res) / 2);
  const rich = advance(
    {
      ...ready,
      resources: { sugar: half("sugar"), bricks: half("bricks"), proteins: half("proteins") },
    },
    at,
  ).state;
  if (rich.alliance === null) throw new Error("alliance attendue");
  return { ...rich, alliance: { ...rich.alliance, banner } };
}

/** Trois humains : Alice attaque Bob ; Carol est du banc de Bob. */
async function world() {
  const repo = createMemoryRepository();
  const war = createMemoryWar(repo);
  const time = { now: NOW };
  const alice0 = human(7, 4, 60, flag(0));
  // Bob n'est pas tout près d'Alice : Carol, sa voisine, arrive avant l'attaque.
  const near = oceanRivals(alice0)[5];
  if (near === undefined) throw new Error("voisin attendu");
  const bob0 = human(8, Number(near.id.slice(2)), 10, flag(1));
  const spot = oceanRivals(bob0).find((rival) => rival.id !== `o:${String(alice0.slot)}`);
  if (spot === undefined) throw new Error("voisin attendu");
  const carol0 = human(9, Number(spot.id.slice(2)), 30, flag(1));
  const seeds: [string, PlayerState][] = [
    [ALICE, alice0],
    [BOB, bob0],
    [CAROL, carol0],
  ];
  for (const [player, state] of seeds) {
    await repo.commit({
      playerId: player,
      expectedVersion: 0,
      state: serializeState(state),
      order: null,
    });
    war.place(state.slot, player);
  }
  const crowd = async () => {
    const cards = [];
    for (const [player] of seeds) {
      const stored = await repo.load(player);
      if (stored !== null) cards.push(humanCard(deserializeState(stored.state)));
    }
    return readCrowd({ cards });
  };
  const deps: ServerDeps = {
    repo,
    war,
    crowd,
    clock: () => time.now,
    newSeed: () => 1,
    seasonStart: SEASON,
    worldSeed: 27,
  };
  return { repo, war, time, deps, alice0, bob0, carol0 };
}

async function stateOf(repo: ReturnType<typeof createMemoryRepository>, player: string) {
  const stored = await repo.load(player);
  if (stored === null) throw new Error("partie attendue");
  return deserializeState(stored.state);
}

describe("la file des attaques entre humains", () => {
  it("une attaque partie entre dans la file, puis se joue à son heure pour les deux joueurs", async () => {
    const { repo, war, time, deps, bob0 } = await world();
    const sent = await handleOrder(deps, ALICE, {
      orderId: id(1),
      order: { type: "sendRaid", rival: `o:${String(bob0.slot)}`, party: partyOf({ hunter: 60 }) },
    });
    expect(sent.status === "done" && sent.outcome).toMatchObject({ ok: true });
    const [queued] = war.attacks();
    expect(queued?.status).toBe("pending");
    expect(queued?.defender).toBe(BOB);
    if (queued === undefined) return;

    // Bob revient après l'heure du combat : sa visite joue l'attaque.
    time.now = queued.record.resolveAt + 1000;
    const bob = await handleState(deps, BOB);
    expect(bob.status).toBe("done");
    if (bob.status !== "done") return;
    expect(war.attacks()[0]?.status).toBe("resolved");
    expect(war.attacks()[0]?.summary?.attackerWon).toBe(true);
    expect(war.attacks()[0]?.battle?.attacker.troops.length).toBe(1);
    const report = bob.state.reports.find((entry) => entry.kind === "defense");
    expect(report?.who).toBe("o:4");
    expect(report?.battle?.attacker.troops[0]?.count).toBe(60);
    expect(bob.state.resources.sugar).toBeLessThan(bob0.resources.sugar);

    // Alice, à son retour, a le rapport et le butin.
    const alice = await stateOf(repo, ALICE);
    expect(alice.raid?.outcome?.won).toBe(true);
    time.now = (alice.raid?.returnsAt ?? 0) + 1000;
    const back = await handleState(deps, ALICE);
    if (back.status !== "done") throw new Error("état attendu");
    expect(back.state.reports[0]?.kind).toBe("raid");
    expect(back.state.reports[0]?.battle?.defender.troops[0]?.count).toBe(10);
  });

  it("le serveur juge les garde-fous sur la vraie partie de la cible", async () => {
    const { repo, deps, bob0 } = await world();
    // Bob passe en mode absent : sa vitrine ne le dit pas encore, sa partie, si.
    const away = await handleOrder(deps, BOB, { orderId: id(5), order: { type: "goAway" } });
    expect(away.status === "done" && away.outcome.ok).toBe(true);
    const stored = await stateOf(repo, BOB);
    expect(stored.shieldUntil).toBeGreaterThan(NOW);
    const refused = await handleOrder(deps, ALICE, {
      orderId: id(6),
      order: { type: "sendRaid", rival: `o:${String(bob0.slot)}`, party: partyOf({ hunter: 10 }) },
    });
    expect(refused.status === "done" && refused.outcome).toEqual({ ok: false, error: "shielded" });
  });

  it("un allié du banc envoie des renforts ; ils comptent dans la défense, à son nom", async () => {
    const { repo, war, time, deps, bob0 } = await world();
    await handleOrder(deps, ALICE, {
      orderId: id(1),
      order: { type: "sendRaid", rival: `o:${String(bob0.slot)}`, party: partyOf({ hunter: 60 }) },
    });
    const queued = war.attacks()[0];
    if (queued === undefined) throw new Error("attaque attendue");
    const bogus = await handleOrder(deps, CAROL, {
      orderId: id(2),
      order: {
        type: "reinforceAlly",
        attack: id(999),
        slot: bob0.slot,
        party: partyOf({ hunter: 30 }),
      },
    });
    expect(bogus.status === "done" && bogus.outcome).toEqual({ ok: false, error: "noAttack" });
    const help = await handleOrder(deps, CAROL, {
      orderId: id(3),
      order: {
        type: "reinforceAlly",
        attack: queued.id,
        slot: bob0.slot,
        party: partyOf({ hunter: 30 }),
      },
    });
    expect(help.status === "done" && help.outcome).toMatchObject({ ok: true });

    time.now = queued.record.resolveAt + 1000;
    await handleState(deps, ALICE);
    const summary = war.attacks()[0]?.summary;
    expect(summary?.helpers).toBe(1);
    const bob = await stateOf(repo, BOB);
    const lines = bob.reports.find((entry) => entry.kind === "defense")?.battle?.defender.lines;
    expect(lines?.some((entry) => entry.key === "reinforcements" && entry.name !== undefined)).toBe(
      true,
    );
    const carol = await stateOf(repo, CAROL);
    expect(carol.escort?.returnsAt).not.toBeNull();
  });

  it("une attaque rappelée sort de la file sans combat", async () => {
    const { war, time, deps, bob0 } = await world();
    await handleOrder(deps, ALICE, {
      orderId: id(1),
      order: { type: "sendRaid", rival: `o:${String(bob0.slot)}`, party: partyOf({ hunter: 20 }) },
    });
    time.now += 1000;
    await handleOrder(deps, ALICE, { orderId: id(2), order: { type: "cancelRaid" } });
    expect(war.attacks()[0]?.status).toBe("cancelled");
  });

  it("l'espionnage d'un humain lit sa vraie partie, et la cible en est prévenue dans le fil", async () => {
    const { repo, war, deps, bob0 } = await world();
    const rival = `o:${String(bob0.slot)}`;
    const spied = await handleOrder(deps, ALICE, {
      orderId: id(4),
      order: { type: "spyRival", rival },
    });
    expect(spied.status === "done" && spied.outcome.ok).toBe(true);
    const alice = await stateOf(repo, ALICE);
    expect(alice.intel[rival]?.level).toBe(5);
    expect(alice.intel[rival]?.defense).toBeGreaterThan(0);
    expect(war.spies()).toMatchObject([{ spy: ALICE, target: BOB, success: true }]);
  });
});
