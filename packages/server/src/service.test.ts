import {
  DAY_MS,
  MICRO,
  cellDistance,
  oceanDeposits,
  oceanRivals,
  placeOffer,
  playerCell,
  visiblePlaces,
} from "@o27/core";
import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "./memory";
import { handleOrder, handleState } from "./service";
import type { Repository, ServerDeps } from "./service";

const ALICE = "joueur-alice";
const BOB = "joueur-bob";
const START = 1_000_000;

/** Fabrique un identifiant d'ordre valide et différent à chaque numéro. */
function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function setup(repo: Repository = createMemoryRepository()) {
  const time = { now: START + 60_000 };
  const deps: ServerDeps = {
    repo,
    clock: () => time.now,
    newSeed: () => 42,
    seasonStart: START,
    worldSeed: 27,
  };
  return { deps, time, repo };
}

function harvest(n: number, taps = 1) {
  return { orderId: id(n), order: { type: "harvest", taps } };
}

describe("ordre", () => {
  it("crée le joueur à son premier ordre et applique l'ordre", async () => {
    const { deps } = setup();
    const reply = await handleOrder(deps, ALICE, harvest(1));
    expect(reply.status).toBe("done");
    if (reply.status !== "done") return;
    expect(reply.outcome.ok).toBe(true);
    expect(reply.state.resources.sugar).toBe(MICRO / 10);
    expect(reply.state.seed).toBe(42);
  });

  it("rejouer le même identifiant renvoie le même résultat sans rien refaire", async () => {
    const { deps, time } = setup();
    const first = await handleOrder(deps, ALICE, harvest(1));
    time.now += 5000;
    const again = await handleOrder(deps, ALICE, harvest(1));
    expect(first.status).toBe("done");
    expect(again.status).toBe("done");
    if (first.status !== "done" || again.status !== "done") return;
    expect(again.outcome).toEqual(first.outcome);
    expect(again.state.resources.sugar).toBe(MICRO / 10);
    expect(again.state.counters.harvests).toBe(1);
  });

  it("refuse un ordre d'un palier non atteint", async () => {
    const { deps } = setup();
    const reply = await handleOrder(deps, ALICE, {
      orderId: id(1),
      order: { type: "build", organelle: "mitochondrion" },
    });
    expect(reply).toMatchObject({ status: "done", outcome: { ok: false, error: "locked" } });
  });

  it("ignore l'heure et tout champ en trop envoyés par le client", async () => {
    const { deps } = setup();
    const withTime = { ...harvest(1), now: START + 999_999_999 };
    expect((await handleOrder(deps, ALICE, withTime)).status).toBe("invalid");
    const inOrder = { orderId: id(2), order: { type: "harvest", taps: 1, now: 5 } };
    expect((await handleOrder(deps, ALICE, inOrder)).status).toBe("invalid");
  });

  it.each([
    ["rien", null],
    ["un texte", "harvest"],
    ["un identifiant qui n'en est pas un", { orderId: "abc", order: { type: "harvest", taps: 1 } }],
    ["un ordre inconnu", { orderId: id(1), order: { type: "cheat" } }],
    ["trop de touchers", { orderId: id(1), order: { type: "harvest", taps: 100_000 } }],
  ])("refuse une demande mal formée : %s", async (_label, body) => {
    const { deps, repo } = setup();
    expect((await handleOrder(deps, ALICE, body)).status).toBe("invalid");
    expect(await repo.load(ALICE)).toBeNull();
  });

  it("deux ordres simultanés du même joueur comptent tous les deux, une seule fois", async () => {
    const { deps } = setup();
    await handleOrder(deps, ALICE, harvest(1));
    const replies = await Promise.all([
      handleOrder(deps, ALICE, harvest(2)),
      handleOrder(deps, ALICE, harvest(3)),
      handleOrder(deps, ALICE, harvest(4)),
    ]);
    expect(replies.map((reply) => reply.status)).toEqual(["done", "done", "done"]);
    const final = await handleState(deps, ALICE);
    expect(final.status).toBe("done");
    if (final.status !== "done") return;
    expect(final.state.counters.harvests).toBe(4);
    expect(final.state.resources.sugar).toBe((4 * MICRO) / 10);
  });

  it("deux envois simultanés du même ordre ne comptent qu'une fois", async () => {
    const { deps } = setup();
    const replies = await Promise.all([
      handleOrder(deps, ALICE, harvest(1)),
      handleOrder(deps, ALICE, harvest(1)),
    ]);
    expect(replies.map((reply) => reply.status)).toEqual(["done", "done"]);
    const final = await handleState(deps, ALICE);
    if (final.status !== "done") throw new Error("état attendu");
    expect(final.state.counters.harvests).toBe(1);
  });

  it("répond « occupé » si l'écriture échoue sans cesse, sans tourner en rond", async () => {
    const memory = createMemoryRepository();
    let commits = 0;
    const { deps } = setup({
      ...memory,
      commit: () => {
        commits += 1;
        return Promise.resolve(false);
      },
    });
    expect((await handleOrder(deps, ALICE, harvest(1))).status).toBe("busy");
    expect(commits).toBe(4);
  });

  it("les joueurs ne se mélangent pas", async () => {
    const { deps } = setup();
    await handleOrder(deps, ALICE, harvest(1, 3));
    const bob = await handleState(deps, BOB);
    if (bob.status !== "done") throw new Error("état attendu");
    expect(bob.state.resources.sugar).toBe(0);
    expect(bob.created).toBe(true);
  });

  it("le jeu n'avance pas à reculons si l'horloge du serveur recule", async () => {
    const { deps, time } = setup();
    await handleOrder(deps, ALICE, harvest(1));
    time.now -= 30_000;
    const reply = await handleOrder(deps, ALICE, harvest(2));
    expect(reply).toMatchObject({ status: "done", outcome: { ok: true } });
  });

  it("refuse tout avant le début de la saison", async () => {
    const { deps, time, repo } = setup();
    time.now = START - 1;
    expect((await handleOrder(deps, ALICE, harvest(1))).status).toBe("closed");
    expect((await handleState(deps, ALICE)).status).toBe("closed");
    expect(await repo.load(ALICE)).toBeNull();
  });
});

describe("place dans la goutte", () => {
  it("chaque joueur reçoit sa propre place, dans la goutte de la saison", async () => {
    const { deps } = setup();
    const alice = await handleState(deps, ALICE);
    const bob = await handleState(deps, BOB);
    if (alice.status !== "done" || bob.status !== "done") throw new Error("état attendu");
    expect(alice.state.worldSeed).toBe(27);
    expect(bob.state.worldSeed).toBe(27);
    expect(alice.state.slot).not.toBe(bob.state.slot);
    const again = await handleState(deps, ALICE);
    if (again.status !== "done") throw new Error("état attendu");
    expect(again.state.slot).toBe(alice.state.slot);
  });

  it("une partie d'avant la carte reçoit une place sans rien perdre", async () => {
    const { deps, repo } = setup();
    const first = await handleOrder(deps, ALICE, harvest(1, 3));
    if (first.status !== "done") throw new Error("ordre attendu");
    const stored = await repo.load(ALICE);
    if (stored === null) throw new Error("partie attendue");
    // On retire ce que la carte a ajouté, pour retrouver la forme d'une ancienne sauvegarde.
    const added = ["worldSeed", "slot", "energy", "energyAt", "expedition", "placeReadyAt"];
    const old = Object.fromEntries(
      Object.entries(JSON.parse(stored.state) as Record<string, unknown>).filter(
        ([key]) => !added.includes(key),
      ),
    );
    await repo.commit({
      playerId: ALICE,
      expectedVersion: stored.version,
      state: JSON.stringify({ ...old, version: 1 }),
      order: null,
    });

    const back = await handleState(deps, ALICE);
    if (back.status !== "done") throw new Error("état attendu");
    expect(back.state.version).toBe(11);
    expect(back.state.counters.harvests).toBe(3);
    expect(back.state.worldSeed).toBe(27);
    expect(back.state.slot).toBeGreaterThan(first.state.slot);
    const later = await handleState(deps, ALICE);
    if (later.status !== "done") throw new Error("état attendu");
    expect(later.state.slot).toBe(back.state.slot);
  });

  it("une expédition envoyée passe par le serveur et revient avec son butin", async () => {
    const { deps, time, repo } = setup();
    const start = await handleState(deps, ALICE);
    if (start.status !== "done") throw new Error("état attendu");
    const stored = await repo.load(ALICE);
    if (stored === null) throw new Error("partie attendue");
    // On place le joueur au palier 3 sans rejouer toute la partie.
    const ready = {
      ...start.state,
      tier: 3,
      counters: { ...start.state.counters, harvests: 10, organellesBuilt: 3, mutationsChosen: 1 },
      mutations: ["thrift"],
    };
    await repo.commit({
      playerId: ALICE,
      expectedVersion: stored.version,
      state: JSON.stringify(ready),
      order: null,
    });
    const [nearest] = visiblePlaces(27, start.state.slot);
    if (nearest === undefined) throw new Error("lieu attendu");

    const sent = await handleOrder(deps, ALICE, {
      orderId: id(50),
      order: { type: "sendExpedition", place: nearest.id },
    });
    expect(sent).toMatchObject({ status: "done", outcome: { ok: true } });
    const unknown = await handleOrder(deps, ALICE, {
      orderId: id(51),
      order: { type: "sendExpedition", place: "pas un lieu" },
    });
    expect(unknown.status).toBe("invalid");

    time.now += placeOffer(nearest).durationMs;
    const back = await handleState(deps, ALICE);
    if (back.status !== "done") throw new Error("état attendu");
    expect(back.state.expedition).toBeNull();
    expect(back.state.counters.mapHarvests).toBe(1);
    expect(back.state.resources[placeOffer(nearest).resource]).toBe(placeOffer(nearest).loot);
  });
});

describe("océan et alliances", () => {
  it("au jour 9, récolte, espionnage et alliances passent par le serveur", async () => {
    const { deps, time, repo } = setup();
    const start = await handleState(deps, ALICE);
    if (start.status !== "done") throw new Error("état attendu");
    const stored = await repo.load(ALICE);
    if (stored === null) throw new Error("partie attendue");
    // On place le joueur au palier 8, bien installé, sans rejouer toute la partie.
    const ready = {
      ...start.state,
      tier: 8,
      counters: {
        ...start.state.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
      },
      mutations: ["thrift"],
      organelles: { ...start.state.organelles, mitochondrion: 3, vacuole: 5, ribosome: 2 },
      resources: { sugar: 400 * MICRO, bricks: 400 * MICRO, proteins: 50 * MICRO },
      nextRaidAt: START + 30 * DAY_MS,
    };
    await repo.commit({
      playerId: ALICE,
      expectedVersion: stored.version,
      state: JSON.stringify(ready),
      order: null,
    });

    // Avant le jour 9 : pas d'alliance, et ses ordres sont refusés.
    time.now = START + 6 * DAY_MS;
    const early = await handleOrder(deps, ALICE, { orderId: id(60), order: { type: "claimGift" } });
    expect(early).toMatchObject({ status: "done", outcome: { ok: false, error: "locked" } });

    // Le jour 9 : une bannière a recruté le joueur.
    time.now = START + 8 * DAY_MS + 60_000;
    const open = await handleState(deps, ALICE);
    if (open.status !== "done") throw new Error("état attendu");
    expect(open.state.tier).toBe(9);
    expect(open.state.alliance).not.toBeNull();

    const gift = await handleOrder(deps, ALICE, { orderId: id(61), order: { type: "claimGift" } });
    expect(gift).toMatchObject({ status: "done", outcome: { ok: true } });
    const given = await handleOrder(deps, ALICE, {
      orderId: id(62),
      order: { type: "donate", tech: "membrane" },
    });
    expect(given).toMatchObject({ status: "done", outcome: { ok: true } });
    if (given.status !== "done") return;
    expect(given.state.alliance?.donations).toBe(1);

    // Un gisement et un organisme de l'océan : leurs identifiants passent la validation.
    const home = playerCell(given.state);
    const deposit = oceanDeposits(27, time.now)
      .filter((entry) => entry.zone === 0 && entry.endsAt - time.now > 3_600_000)
      .sort((one, other) => cellDistance(home, one) - cellDistance(home, other))[0];
    if (deposit === undefined) throw new Error("gisement attendu");
    const gathered = await handleOrder(deps, ALICE, {
      orderId: id(63),
      order: { type: "gather", deposit: deposit.id },
    });
    expect(gathered).toMatchObject({ status: "done", outcome: { ok: true } });
    const [neighbour] = oceanRivals(given.state);
    if (neighbour === undefined) throw new Error("voisin attendu");
    const spied = await handleOrder(deps, ALICE, {
      orderId: id(64),
      order: { type: "spyRival", rival: neighbour.id },
    });
    expect(spied.status).toBe("done");
    // L'accélérateur passe la validation ; sans accélérateur en réserve, le moteur le refuse.
    const boost = await handleOrder(deps, ALICE, {
      orderId: id(66),
      order: { type: "useBoost", target: "construction" },
    });
    expect(boost).toMatchObject({ status: "done", outcome: { ok: false, error: "noBoost" } });
    if (boost.status !== "done") return;
    // Ouvrir un coffre passe la validation ; sans coffre en attente, le moteur le refuse.
    const chest = await handleOrder(deps, ALICE, {
      orderId: id(67),
      order: { type: "openReward", index: 0 },
    });
    expect(chest.status).toBe("done");
    // Recherche militaire et récolte automatique passent aussi par le serveur.
    const auto = await handleOrder(deps, ALICE, {
      orderId: id(68),
      order: { type: "setAutoHarvest", on: true },
    });
    expect(auto).toMatchObject({ status: "done", outcome: { ok: true } });
    const drilled = await handleOrder(deps, ALICE, {
      orderId: id(69),
      order: { type: "drill", power: "guard" },
    });
    expect(drilled.status).toBe("done");
    // Sortir des eaux passe la validation ; trop tôt, le moteur le refuse.
    const apex = await handleOrder(deps, ALICE, { orderId: id(70), order: { type: "leaveWater" } });
    expect(apex).toMatchObject({ status: "done", outcome: { ok: false, error: "locked" } });
    // Le journal a suivi le joueur côté serveur.
    expect(Array.isArray(boost.state.reports)).toBe(true);
    const wrong = await handleOrder(deps, ALICE, {
      orderId: id(65),
      order: { type: "joinAlliance", banner: "pirates" },
    });
    expect(wrong.status).toBe("invalid");
  });
});

describe("état", () => {
  it("première visite : une cellule neuve", async () => {
    const { deps } = setup();
    const reply = await handleState(deps, ALICE);
    if (reply.status !== "done") throw new Error("état attendu");
    expect(reply.created).toBe(true);
    expect(reply.state.tier).toBe(0);
    expect((await handleState(deps, ALICE)).status).toBe("done");
  });

  it("retour après 8 heures : la production est comptée et racontée", async () => {
    const { deps, time } = setup();
    // Dix récoltes ouvrent le palier 1, puis on construit la centrale.
    for (let n = 1; n <= 10; n += 1) {
      time.now += 200;
      await handleOrder(deps, ALICE, harvest(n));
    }
    const build = await handleOrder(deps, ALICE, {
      orderId: id(11),
      order: { type: "build", organelle: "mitochondrion" },
    });
    expect(build).toMatchObject({ status: "done", outcome: { ok: true } });

    time.now += 8 * 3_600_000;
    const back = await handleState(deps, ALICE);
    if (back.status !== "done") throw new Error("état attendu");
    expect(back.created).toBe(false);
    expect(back.state.organelles.mitochondrion).toBe(1);
    expect(back.absence.elapsedMs).toBe(8 * 3_600_000);
    expect(back.absence.constructionsDone).toEqual([{ organelle: "mitochondrion", level: 1 }]);
    // La réserve de base plafonne le sucre à 80.
    expect(back.state.resources.sugar).toBe(80 * MICRO);
  });
});
