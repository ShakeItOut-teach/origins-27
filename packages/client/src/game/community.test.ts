import { createPlayer, museumPlate } from "@o27/core";
import { describe, expect, it } from "vitest";
import { createApi } from "./api";
import { readStats } from "./community";

function memory(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

interface Call {
  readonly path: string;
  readonly body: unknown;
  readonly token: string | null;
}

/** Un faux serveur : il note ce qu'il reçoit et répond ce qu'on lui dit. */
function setup(reply: (call: Call) => [number, unknown], extra: { info?: boolean } = {}) {
  const calls: Call[] = [];
  const fetchLike = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    const call: Call = {
      path: url.replace("https://serveur.test", ""),
      body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null,
      token: headers.get("Authorization"),
    };
    calls.push(call);
    const [status, body] = reply(call);
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  }) as typeof fetch;
  const storage = memory({ "o27.session.v1": JSON.stringify({ access: "A", refresh: "R" }) });
  const api = createApi({
    url: "https://serveur.test",
    key: "k",
    fetch: fetchLike,
    storage,
    ...(extra.info === true
      ? {
          visitInfo: () => ({
            lang: "fr" as const,
            device: "phone" as const,
            installed: true,
            source: "discord",
          }),
        }
      : {}),
  });
  return { api, calls, storage };
}

const STATE = createPlayer(1, 1_000_000, 1_000_000);

describe("la visite dit au serveur de quoi mesurer l'audience", () => {
  it("la langue, l'appareil, l'installation et la source partent avec la demande d'état", async () => {
    const { api, calls } = setup(() => [200, { state: STATE, absence: {} }], { info: true });
    await api.fetchState();
    expect(calls[0]?.path).toBe("/functions/v1/jeu/etat");
    expect(calls[0]?.body).toEqual({
      info: { lang: "fr", device: "phone", installed: true, source: "discord" },
    });
  });

  it("sans ces détails, la demande d'état part vide, comme avant", async () => {
    const { api, calls } = setup(() => [200, { state: STATE, absence: {} }]);
    await api.fetchState();
    expect(calls[0]?.body).toEqual({});
  });
});

describe("donner son avis", () => {
  const feedback = { rating: 4, text: "Bien", lang: "fr" } as const;

  it("part vers le serveur avec le jeton du joueur", async () => {
    const { api, calls } = setup(() => [200, { status: "done" }]);
    expect(await api.community.sendFeedback(feedback)).toBe("done");
    expect(calls[0]).toEqual({
      path: "/functions/v1/jeu/avis",
      body: feedback,
      token: "Bearer A",
    });
  });

  it.each([
    [400, "invalid"],
    [429, "tooMany"],
    [500, "failed"],
  ] as const)("réponse %i du serveur → %s", async (status, expected) => {
    const { api } = setup(() => [status, {}]);
    expect(await api.community.sendFeedback(feedback)).toBe(expected);
  });
});

describe("le Muséum gardé par le serveur", () => {
  it("rend les planches, et écarte ce qui n'en a pas la forme", async () => {
    const plate = museumPlate(STATE);
    const { api, calls } = setup(() => [200, { plates: [plate, { n: 1 }, "x", null] }]);
    expect(await api.community.plates()).toEqual([plate]);
    expect(calls[0]?.path).toBe("/functions/v1/jeu/musee");
  });

  it("une panne se voit : la promesse est rejetée", async () => {
    const { api } = setup(() => [500, {}]);
    await expect(api.community.plates()).rejects.toThrow();
  });
});

describe("les statistiques, pour un gardien", () => {
  it("un compte ordinaire ne reçoit rien", async () => {
    const { api } = setup(() => [403, { error: "gardien" }]);
    expect(await api.community.stats()).toBeNull();
  });

  it("relit les chiffres du serveur, y compris ceux envoyés sous forme de texte", () => {
    const stats = readStats({
      stats: {
        joueurs: 12,
        comptesLies: 3,
        actifsAujourdhui: 5,
        actifs7Jours: 9,
        installes: 2,
        jours: [
          {
            jour: "2027-01-11",
            nouveaux: 2,
            actifs: 5,
            visites: "14",
            ordres: 230,
            secondes: 412,
          },
        ],
        retention: [{ jour: 1, arrives: 10, revenus: 4, revenus_ou_apres: 6 }],
        paliers: [{ palier: 4, joueurs: 7 }],
        ordres: [{ type: "harvest", acceptes: 200, refuses: 3 }],
        appareils: [{ nom: "phone", joueurs: 10 }],
        langues: [{ nom: "fr", joueurs: 11 }],
        sources: [{ nom: "discord", joueurs: 6 }],
        avis: {
          nombre: 2,
          moyenne: 4.5,
          derniers: [
            {
              jour: "2027-01-10",
              jour_saison: 10,
              palier: 9,
              note: 4,
              texte: "Bien",
              langue: "fr",
            },
            { jour: "2027-01-10", jour_saison: 10, palier: 9, note: null, texte: "Encore" },
          ],
        },
      },
    });
    expect(stats).toMatchObject({
      players: 12,
      linkedAccounts: 3,
      activeToday: 5,
      active7Days: 9,
      installed: 2,
      retention: [{ day: 1, arrived: 10, returned: 4, returnedOrLater: 6 }],
      tiers: [{ tier: 4, players: 7 }],
      orders: [{ type: "harvest", accepted: 200, refused: 3 }],
      devices: [{ name: "phone", players: 10 }],
      sources: [{ name: "discord", players: 6 }],
    });
    expect(stats?.days[0]).toEqual({
      day: "2027-01-11",
      newPlayers: 2,
      active: 5,
      visits: 14,
      orders: 230,
      seconds: 412,
    });
    expect(stats?.feedback.average).toBe(4.5);
    expect(stats?.feedback.latest[1]).toMatchObject({ rating: null, text: "Encore", lang: "" });
  });

  it("une réponse vide ou tordue ne casse rien", () => {
    expect(readStats(null)).toBeNull();
    expect(readStats({ stats: "x" })).toBeNull();
    const empty = readStats({ stats: {} });
    expect(empty?.players).toBe(0);
    expect(empty?.days).toEqual([]);
    expect(empty?.feedback).toEqual({ count: 0, average: null, latest: [] });
  });
});

describe("supprimer son compte", () => {
  it("demande au serveur, avec confirmation, puis oublie la session sur l'appareil", async () => {
    const { api, calls, storage } = setup(() => [200, { deleted: true }]);
    expect(await api.community.deleteAccount()).toBe(true);
    expect(calls[0]).toMatchObject({
      path: "/functions/v1/jeu/supprimer",
      body: { confirm: true },
    });
    expect(storage.getItem("o27.session.v1")).toBe("");
  });

  it("si le serveur refuse ou ne répond pas, rien n'est oublié", async () => {
    const { api, storage } = setup(() => [500, {}]);
    expect(await api.community.deleteAccount()).toBe(false);
    expect(storage.getItem("o27.session.v1")).toContain('"access":"A"');
  });
});
