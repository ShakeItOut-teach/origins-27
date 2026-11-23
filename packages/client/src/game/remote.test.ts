import { MICRO, advance, applyOrder, createPlayer, summarizeAbsence } from "@o27/core";
import type { PlayerState } from "@o27/core";
import type { Order } from "@o27/data";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApi, takeSessionFromHash } from "./api";
import { createStore } from "./store";
import type { Remote } from "./store";

function memory(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const START = 1_000_000;

/** Un faux serveur : le vrai moteur, sa propre horloge, et la liste de ce qu'il a reçu. */
function fakeServer(options: { clockAhead?: number; sugarBonus?: number } = {}) {
  const ahead = options.clockAhead ?? 0;
  let state: PlayerState = createPlayer(99, START, START + ahead);
  const received: { id: string; order: Order }[] = [];
  const seen = new Set<string>();
  let failures = 0;
  const serverNow = (): number => Date.now() + ahead;
  const remote: Remote = {
    fetchState() {
      const before = state;
      const step = advance(state, Math.max(serverNow(), state.now));
      state = step.state;
      return Promise.resolve({ state, absence: summarizeAbsence(before, state, step.events) });
    },
    sendOrder(id, order) {
      if (failures > 0) {
        failures -= 1;
        return Promise.reject(new Error("réseau coupé"));
      }
      received.push({ id, order });
      if (!seen.has(id)) {
        seen.add(id);
        const now = Math.max(serverNow(), state.now);
        const result = applyOrder(advance(state, now).state, order, now);
        if (result.ok) state = result.state;
        if (options.sugarBonus !== undefined) {
          state = {
            ...state,
            resources: { ...state.resources, sugar: state.resources.sugar + options.sugarBonus },
          };
        }
      }
      return Promise.resolve({ state });
    },
  };
  return {
    remote,
    received,
    failNext: (count: number) => {
      failures = count;
    },
    getState: () => state,
  };
}

function setup(server: ReturnType<typeof fakeServer>, saved?: Record<string, string>) {
  let n = 0;
  const store = createStore({
    clock: () => Date.now(),
    storage: memory(saved),
    newSeed: () => 1,
    remote: server.remote,
    newId: () => `ordre-${String((n += 1))}`,
  });
  return store;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("jeu branché sur le serveur", () => {
  it("attend le serveur avant de montrer la cellule d'un nouveau joueur", async () => {
    const server = fakeServer();
    const store = setup(server);
    expect(store.isReady()).toBe(false);
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(store.isReady()).toBe(true);
    expect(store.getState().seed).toBe(99);
    stop();
  });

  it("le toucher est compté tout de suite, puis envoyé en un seul ordre groupé", async () => {
    const server = fakeServer();
    const store = setup(server);
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(10);

    for (let tap = 0; tap < 5; tap += 1) {
      await vi.advanceTimersByTimeAsync(120);
      expect(store.send({ type: "harvest", taps: 1 }).ok).toBe(true);
    }
    expect(store.getState().resources.sugar).toBe(5 * MICRO);

    await vi.advanceTimersByTimeAsync(1500);
    const taps = server.received.map((entry) =>
      entry.order.type === "harvest" ? entry.order.taps : 0,
    );
    expect(taps.reduce((sum, value) => sum + value, 0)).toBe(5);
    expect(server.received.length).toBeLessThan(5);
    expect(server.getState().counters.harvests).toBe(5);
    stop();
  });

  it("si le serveur répond autre chose que la prévision, l'écran suit le serveur", async () => {
    const server = fakeServer({ sugarBonus: 7 * MICRO });
    const store = setup(server);
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(200);

    store.send({ type: "harvest", taps: 1 });
    expect(store.getState().resources.sugar).toBe(MICRO);
    await vi.advanceTimersByTimeAsync(1500);
    expect(store.getState().resources.sugar).toBe(8 * MICRO);
    stop();
  });

  it("un envoi raté est réessayé avec le même identifiant, et compté une seule fois", async () => {
    const server = fakeServer();
    const store = setup(server);
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(200);

    server.failNext(2);
    store.send({ type: "harvest", taps: 1 });
    await vi.advanceTimersByTimeAsync(12_000);
    expect(server.received.map((entry) => entry.id)).toEqual(["ordre-1"]);
    expect(server.getState().counters.harvests).toBe(1);
    expect(store.getState().counters.harvests).toBe(1);
    stop();
  });

  it("garde la prévision tant que des ordres attendent, sans retour en arrière à l'écran", async () => {
    const server = fakeServer();
    const store = setup(server);
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(200);

    server.failNext(1);
    store.send({ type: "harvest", taps: 1 });
    await vi.advanceTimersByTimeAsync(1000);
    store.send({ type: "harvest", taps: 1 });
    expect(store.getState().resources.sugar).toBe(2 * MICRO);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(store.getState().resources.sugar).toBe(2 * MICRO);
    expect(server.getState().counters.harvests).toBe(2);
    stop();
  });

  it("se cale sur l'horloge du serveur quand celle de l'appareil est fausse", async () => {
    const server = fakeServer({ clockAhead: 3_600_000 });
    const store = setup(server);
    const stop = store.start();
    await vi.advanceTimersByTimeAsync(500);
    expect(store.getState().now).toBeGreaterThanOrEqual(START + 3_600_000);
    expect(store.send({ type: "harvest", taps: 1 }).ok).toBe(true);
    stop();
  });
});

describe("dialogue avec le serveur", () => {
  function fakeFetch(handler: (url: string, token: string | null) => [number, unknown]) {
    const calls: string[] = [];
    const fetchLike = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const headers = new Headers(init?.headers);
      const token = headers.get("Authorization")?.replace("Bearer ", "") ?? null;
      calls.push(url.replace("https://serveur.test", ""));
      const [status, body] = handler(url, token);
      return Promise.resolve(new Response(JSON.stringify(body), { status }));
    }) as typeof fetch;
    return { fetchLike, calls };
  }

  const state = createPlayer(5, START, START);
  const absence = summarizeAbsence(state, state, []);

  it("crée un compte anonyme à la première visite et le garde sur l'appareil", async () => {
    const storage = memory();
    const { fetchLike, calls } = fakeFetch((url, token) => {
      if (url.includes("/auth/v1/signup")) return [200, { access_token: "A", refresh_token: "R" }];
      return token === "A" ? [200, { state, absence }] : [401, {}];
    });
    const api = createApi({ url: "https://serveur.test", key: "k", fetch: fetchLike, storage });
    expect((await api.fetchState()).state.seed).toBe(5);
    await api.fetchState();
    expect(calls.filter((call) => call.includes("signup")).length).toBe(1);
    expect(storage.getItem("o27.session.v1")).toContain('"refresh":"R"');
  });

  it("renouvelle un jeton périmé sans créer un nouveau compte", async () => {
    const storage = memory({ "o27.session.v1": JSON.stringify({ access: "vieux", refresh: "R" }) });
    const { fetchLike, calls } = fakeFetch((url, token) => {
      if (url.includes("grant_type=refresh_token")) {
        return [200, { access_token: "neuf", refresh_token: "R2" }];
      }
      if (url.includes("signup")) return [200, { access_token: "autre", refresh_token: "X" }];
      return token === "neuf" ? [200, { state, absence }] : [401, {}];
    });
    const api = createApi({ url: "https://serveur.test", key: "k", fetch: fetchLike, storage });
    await api.fetchState();
    expect(calls.some((call) => call.includes("signup"))).toBe(false);
    expect(storage.getItem("o27.session.v1")).toContain("R2");
  });

  it("ne crée pas de nouveau compte quand le serveur est en panne", async () => {
    const storage = memory({ "o27.session.v1": JSON.stringify({ access: "vieux", refresh: "R" }) });
    const { fetchLike, calls } = fakeFetch((url) =>
      url.includes("/auth/") ? [503, {}] : [401, {}],
    );
    const api = createApi({ url: "https://serveur.test", key: "k", fetch: fetchLike, storage });
    await expect(api.fetchState()).rejects.toThrow();
    expect(calls.some((call) => call.includes("signup"))).toBe(false);
    expect(storage.getItem("o27.session.v1")).toContain('"refresh":"R"');
  });
});

describe("retrouver sa partie par e-mail", () => {
  interface Call {
    readonly method: string;
    readonly path: string;
    readonly body: unknown;
  }

  function accountApi(reply: (call: Call) => [number, unknown]) {
    const calls: Call[] = [];
    const fetchLike = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const call: Call = {
        method: init?.method ?? "GET",
        path: url.replace("https://serveur.test", ""),
        body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null,
      };
      calls.push(call);
      const [status, body] = reply(call);
      return Promise.resolve(new Response(JSON.stringify(body), { status }));
    }) as typeof fetch;
    const storage = memory({ "o27.session.v1": JSON.stringify({ access: "A", refresh: "R" }) });
    const api = createApi({ url: "https://serveur.test", key: "k", fetch: fetchLike, storage });
    return { account: api.account, calls };
  }

  it("attache la partie en cours à une adresse nouvelle", async () => {
    const { account, calls } = accountApi(() => [200, {}]);
    expect(await account.linkEmail("ada@exemple.test", "https://jeu.test")).toBe("sent");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("PUT");
    expect(calls[0]?.path).toBe("/auth/v1/user?redirect_to=https%3A%2F%2Fjeu.test");
    expect(calls[0]?.body).toEqual({ email: "ada@exemple.test" });
  });

  it("si l'adresse a déjà une partie, envoie un lien pour l'ouvrir, sans créer de compte", async () => {
    const { account, calls } = accountApi((call) =>
      call.method === "PUT" ? [422, { error_code: "email_exists" }] : [200, {}],
    );
    expect(await account.linkEmail("ada@exemple.test", "https://jeu.test")).toBe("sent");
    expect(calls[1]?.path).toBe("/auth/v1/otp?redirect_to=https%3A%2F%2Fjeu.test");
    expect(calls[1]?.body).toEqual({ email: "ada@exemple.test", create_user: false });
  });

  it.each([
    [422, { error_code: "email_address_invalid" }, "invalid"],
    [429, { error_code: "over_email_send_rate_limit" }, "tooMany"],
    [500, {}, "failed"],
  ])("réponse %i du serveur → message adapté", async (status, body, expected) => {
    const { account } = accountApi(() => [status, body]);
    expect(await account.linkEmail("ada@exemple.test", "https://jeu.test")).toBe(expected);
  });

  it("dit à quelle adresse la partie est liée, ou rien pour un compte anonyme", async () => {
    const linked = accountApi(() => [200, { email: "ada@exemple.test" }]);
    expect(await linked.account.whoAmI()).toBe("ada@exemple.test");
    const anonymous = accountApi(() => [200, { email: "", is_anonymous: true }]);
    expect(await anonymous.account.whoAmI()).toBeNull();
  });

  it("range la session reçue dans l'adresse de la page au retour du lien", () => {
    const storage = memory();
    expect(takeSessionFromHash("#access_token=AA&refresh_token=RR&type=magiclink", storage)).toBe(
      true,
    );
    expect(storage.getItem("o27.session.v1")).toBe('{"access":"AA","refresh":"RR"}');
    expect(takeSessionFromHash("#error=access_denied", memory())).toBe(false);
    expect(takeSessionFromHash("", memory())).toBe(false);
  });
});
