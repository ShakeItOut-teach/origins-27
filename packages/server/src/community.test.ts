import { DAY_MS, createPlayer, museumPlate } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { FEEDBACK_MAX_LENGTH, FEEDBACK_PER_DAY, SEASON_DAYS } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  createMemoryCommunity,
  dayOf,
  describeOrder,
  describeVisit,
  handleFeedback,
} from "./community";
import { createMemoryRepository } from "./memory";
import { handleOrder, handleState } from "./service";
import type { ServerDeps } from "./service";

const ALICE = "joueur-alice";
// Le 1er janvier 2027 à minuit, heure universelle.
const START = Date.UTC(2027, 0, 1);

function player(day: number, patch: Partial<PlayerState> = {}): PlayerState {
  const now = START + (day - 1) * DAY_MS + 3_600_000;
  return { ...createPlayer(7, START, now, { worldSeed: 27, slot: 4 }), ...patch };
}

function setup() {
  const time = { now: START + 60_000 };
  const deps: ServerDeps = {
    repo: createMemoryRepository(),
    clock: () => time.now,
    newSeed: () => 42,
    seasonStart: START,
    worldSeed: 27,
  };
  return { deps, time, community: createMemoryCommunity() };
}

describe("le jour d'une visite", () => {
  it("est celui de l'heure universelle, pas celui de l'appareil", () => {
    expect(dayOf(START)).toBe("2027-01-01");
    expect(dayOf(START + DAY_MS - 1)).toBe("2027-01-01");
    expect(dayOf(START + DAY_MS)).toBe("2027-01-02");
  });
});

describe("ce que le serveur note d'une visite", () => {
  const info = { lang: "fr", device: "phone", installed: true, source: "discord" };

  it("le jour, le jour de saison, le palier et ce que l'appareil dit de lui", () => {
    const state = player(3, { tier: 5 });
    const visit = describeVisit(ALICE, state, state.now, { info });
    expect(visit).toMatchObject({
      playerId: ALICE,
      day: "2027-01-03",
      seasonDay: 3,
      tier: 5,
      lang: "fr",
      device: "phone",
      installed: true,
      source: "discord",
    });
    expect(visit.power).toBeGreaterThanOrEqual(0);
  });

  it("une visite sans rien, ou avec n'importe quoi, est notée quand même, sans ces détails", () => {
    const state = player(3);
    for (const body of [null, {}, { info: { lang: "xx" } }, { info: { ...info, extra: 1 } }, 12]) {
      const visit = describeVisit(ALICE, state, state.now, body);
      expect(visit.day).toBe("2027-01-03");
      expect(visit.lang).toBeNull();
      expect(visit.device).toBeNull();
      expect(visit.installed).toBeNull();
      expect(visit.source).toBeNull();
    }
  });

  it("une source qui n'est pas un mot court de notre choix est refusée", () => {
    const state = player(3);
    for (const source of ["Discord", "a b", "x".repeat(25), "<script>"]) {
      const visit = describeVisit(ALICE, state, state.now, { info: { ...info, source } });
      expect(visit.source).toBeNull();
    }
  });

  it("avant l'ouverture du Muséum, aucune planche n'est gardée", () => {
    const state = player(10, { tier: 9 });
    expect(describeVisit(ALICE, state, state.now, null).plate).toBeNull();
  });

  it("le Muséum ouvert, la planche du jour est gardée", () => {
    const state = player(22, { tier: 12 });
    expect(describeVisit(ALICE, state, state.now, null).plate).toEqual(museumPlate(state));
  });

  it("la saison finie, la planche est gardée quel que soit le palier atteint", () => {
    const state = player(SEASON_DAYS + 1, { tier: 4 });
    expect(describeVisit(ALICE, state, state.now, null).plate).toEqual(museumPlate(state));
  });
});

describe("ce que le serveur note d'un ordre", () => {
  it("son type, et s'il a été accepté ou refusé par les règles", async () => {
    const { deps, time } = setup();
    const body = {
      orderId: "00000000-0000-4000-8000-000000000001",
      order: { type: "harvest", taps: 1 },
    };
    const accepted = await handleOrder(deps, ALICE, body);
    expect(describeOrder(ALICE, time.now, body, accepted)).toMatchObject({
      playerId: ALICE,
      day: "2027-01-01",
      seasonDay: 1,
      tier: 0,
      type: "harvest",
      ok: true,
    });

    const locked = {
      orderId: "00000000-0000-4000-8000-000000000002",
      order: { type: "build", organelle: "mitochondrion" },
    };
    const refused = await handleOrder(deps, ALICE, locked);
    expect(describeOrder(ALICE, time.now, locked, refused)).toMatchObject({
      type: "build",
      ok: false,
    });
  });

  it("une demande mal formée n'est pas notée", async () => {
    const { deps, time } = setup();
    const reply = await handleOrder(deps, ALICE, { n: 1 });
    expect(reply.status).toBe("invalid");
    expect(describeOrder(ALICE, time.now, { n: 1 }, reply)).toBeNull();
  });
});

describe("donner son avis", () => {
  it("garde la note, le texte, le jour de saison et le palier du joueur", async () => {
    const { deps, community } = setup();
    await handleState(deps, ALICE);
    const reply = await handleFeedback({ ...deps, community }, ALICE, {
      rating: 4,
      text: "  J'aime bien, mais je me perds dans les recherches.  ",
      lang: "fr",
    });
    expect(reply).toEqual({ status: "done" });
    expect(community.feedback()).toEqual([
      {
        playerId: ALICE,
        day: "2027-01-01",
        seasonDay: 1,
        tier: 0,
        rating: 4,
        text: "J'aime bien, mais je me perds dans les recherches.",
        lang: "fr",
      },
    ]);
  });

  it("accepte une note seule, ou un texte seul", async () => {
    const { deps, community } = setup();
    const send = (body: unknown) => handleFeedback({ ...deps, community }, ALICE, body);
    expect(await send({ rating: 5, text: "", lang: "en" })).toEqual({ status: "done" });
    expect(await send({ rating: null, text: "Bravo", lang: "fr" })).toEqual({ status: "done" });
    expect(community.feedback()).toHaveLength(2);
  });

  it("refuse un avis vide, trop long, mal noté ou mal formé", async () => {
    const { deps, community } = setup();
    const send = (body: unknown) => handleFeedback({ ...deps, community }, ALICE, body);
    for (const body of [
      null,
      {},
      { rating: null, text: "   ", lang: "fr" },
      { rating: 6, text: "", lang: "fr" },
      { rating: 0, text: "", lang: "fr" },
      { rating: 2.5, text: "", lang: "fr" },
      { rating: 3, text: "x".repeat(FEEDBACK_MAX_LENGTH + 1), lang: "fr" },
      { rating: 3, text: "ok", lang: "de" },
      { rating: 3, text: "ok", lang: "fr", joueur: "un-autre" },
    ]) {
      expect(await send(body)).toEqual({ status: "invalid" });
    }
    expect(community.feedback()).toHaveLength(0);
  });

  it("au-delà de la limite du jour, répond « trop » sans rien garder ; le lendemain, c'est rouvert", async () => {
    const { deps, time, community } = setup();
    const send = () =>
      handleFeedback({ ...deps, community }, ALICE, { rating: 3, text: "", lang: "fr" });
    for (let n = 0; n < FEEDBACK_PER_DAY; n++) expect(await send()).toEqual({ status: "done" });
    expect(await send()).toEqual({ status: "tooMany" });
    expect(community.feedback()).toHaveLength(FEEDBACK_PER_DAY);
    time.now += DAY_MS;
    expect(await send()).toEqual({ status: "done" });
  });

  it("un joueur qui n'a pas encore de partie peut quand même donner son avis", async () => {
    const { deps, community } = setup();
    const reply = await handleFeedback({ ...deps, community }, "inconnu", {
      rating: 1,
      text: "",
      lang: "en",
    });
    expect(reply).toEqual({ status: "done" });
    expect(community.feedback()[0]).toMatchObject({ tier: 0, seasonDay: 1 });
  });
});
