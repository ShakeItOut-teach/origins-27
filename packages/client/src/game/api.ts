/**
 * Dialogue avec le serveur : compte anonyme, puis les deux appels du jeu.
 * Le joueur ne remplit rien : à sa première visite il reçoit un compte anonyme, gardé sur
 * l'appareil. Aucune bibliothèque : trois appels HTTP suffisent.
 */
import { deserializeState } from "@o27/core";
import type { AbsenceSummary, PlayerState } from "@o27/core";
import type { Order } from "@o27/data";
import type { Remote } from "./store";

const SESSION_KEY = "o27.session.v1";

export interface ApiDeps {
  /** Adresse du projet, sans barre finale. */
  readonly url: string;
  /** Clé publique du projet (elle n'ouvre rien sans le jeton du joueur). */
  readonly key: string;
  readonly fetch: typeof fetch;
  readonly storage: Pick<Storage, "getItem" | "setItem">;
}

interface Session {
  readonly access: string;
  readonly refresh: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSession(value: unknown): Session | null {
  if (!isRecord(value)) return null;
  const access = value.access_token ?? value.access;
  const refresh = value.refresh_token ?? value.refresh;
  return typeof access === "string" && typeof refresh === "string" ? { access, refresh } : null;
}

export function createApi(deps: ApiDeps): Remote {
  let session: Session | null = null;
  try {
    session = readSession(JSON.parse(deps.storage.getItem(SESSION_KEY) ?? "null"));
  } catch {
    session = null;
  }

  const post = (path: string, body: unknown, token: string | null): Promise<Response> =>
    deps.fetch(`${deps.url}${path}`, {
      method: "POST",
      headers: {
        apikey: deps.key,
        "Content-Type": "application/json",
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

  /** Ouvre ou renouvelle la session. Un compte anonyme est créé seulement s'il n'y en a aucun. */
  const openSession = async (): Promise<Session> => {
    if (session !== null) {
      const renewed = await post(
        "/auth/v1/token?grant_type=refresh_token",
        { refresh_token: session.refresh },
        null,
      );
      if (renewed.ok) {
        const next = readSession(await renewed.json());
        if (next !== null) return next;
      } else if (renewed.status !== 400 && renewed.status !== 401) {
        // Panne ou trop d'appels : on réessaiera. Surtout ne pas créer un nouveau compte,
        // le joueur perdrait sa partie.
        throw new Error("serveur indisponible");
      }
    }
    const created = await post("/auth/v1/signup", {}, null);
    const next = created.ok ? readSession(await created.json()) : null;
    if (next === null) throw new Error("connexion impossible");
    return next;
  };

  let opening: Promise<Session> | null = null;
  const renew = (): Promise<Session> => {
    opening ??= openSession()
      .then((next) => {
        session = next;
        deps.storage.setItem(SESSION_KEY, JSON.stringify(next));
        return next;
      })
      .finally(() => {
        opening = null;
      });
    return opening;
  };

  /** Appelle la fonction du jeu ; si le jeton est périmé, le renouvelle et réessaie une fois. */
  const call = async (path: string, body: unknown): Promise<Response> => {
    const current = session ?? (await renew());
    const first = await post(`/functions/v1/jeu/${path}`, body, current.access);
    if (first.status !== 401) return first;
    const renewed = await renew();
    return post(`/functions/v1/jeu/${path}`, body, renewed.access);
  };

  const readState = (payload: unknown): PlayerState => {
    if (!isRecord(payload)) throw new Error("réponse illisible");
    return deserializeState(JSON.stringify(payload.state));
  };

  const fetchState: Remote["fetchState"] = async () => {
    const response = await call("etat", {});
    if (!response.ok) throw new Error(`état : ${String(response.status)}`);
    const payload: unknown = await response.json();
    const state = readState(payload);
    // Le résumé d'absence vient de notre serveur, déjà calculé par le moteur.
    const absence = (payload as { absence: AbsenceSummary }).absence;
    return { state, absence };
  };

  const sendOrder: Remote["sendOrder"] = async (orderId: string, order: Order) => {
    const response = await call("ordre", { orderId, order });
    if (response.ok) return { state: readState(await response.json()) };
    // Demande refusée pour de bon (mal formée, saison fermée) : inutile d'insister,
    // on reprend simplement l'état du serveur.
    if (response.status === 400 || response.status === 403) return fetchState();
    throw new Error(`ordre : ${String(response.status)}`);
  };

  return { fetchState, sendOrder };
}
