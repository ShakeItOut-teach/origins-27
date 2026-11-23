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
/** La session anonyme d'avant la connexion à un compte : sa partie doit suivre le joueur. */
const PREVIOUS_KEY = "o27.session.precedente";

export interface ApiDeps {
  /** Adresse du projet, sans barre finale. */
  readonly url: string;
  /** Clé publique du projet (elle n'ouvre rien sans le jeton du joueur). */
  readonly key: string;
  readonly fetch: typeof fetch;
  readonly storage: Pick<Storage, "getItem" | "setItem">;
}

/** Résultat d'une demande de lien : envoyé, adresse refusée, trop de demandes, ou panne. */
export type LinkResult = "sent" | "invalid" | "tooMany" | "failed";

export interface Account {
  /** L'e-mail auquel la partie est liée, ou `null` si elle n'est liée à rien. */
  readonly whoAmI: () => Promise<string | null>;
  /**
   * Envoie un lien par e-mail. Si l'adresse est nouvelle, le lien y attache la partie en
   * cours ; si elle a déjà une partie, le lien ouvre cette partie-là sur cet appareil.
   */
  readonly linkEmail: (email: string, returnTo: string) => Promise<LinkResult>;
}

export interface Api extends Remote {
  readonly account: Account;
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

/**
 * Au retour d'un lien reçu par e-mail, l'adresse de la page contient la session du joueur.
 * On la range sur l'appareil. Renvoie vrai si une session a été trouvée.
 */
export function takeSessionFromHash(
  hash: string,
  storage: Pick<Storage, "getItem" | "setItem">,
): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  if (access === null || refresh === null || access === "" || refresh === "") return false;
  // On garde la session d'avant : le serveur s'en servira pour amener la partie en cours
  // sur le compte, si celui-ci n'en a pas encore.
  const before = storage.getItem(SESSION_KEY);
  if (before !== null && before !== "") storage.setItem(PREVIOUS_KEY, before);
  storage.setItem(SESSION_KEY, JSON.stringify({ access, refresh } satisfies Session));
  return true;
}

function errorCode(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const code = payload.error_code ?? payload.code;
  return typeof code === "string" ? code : "";
}

export function createApi(deps: ApiDeps): Api {
  let session: Session | null = null;
  try {
    session = readSession(JSON.parse(deps.storage.getItem(SESSION_KEY) ?? "null"));
  } catch {
    session = null;
  }

  const request = (
    method: "GET" | "POST" | "PUT",
    path: string,
    body: unknown,
    token: string | null,
  ): Promise<Response> =>
    deps.fetch(`${deps.url}${path}`, {
      method,
      headers: {
        apikey: deps.key,
        "Content-Type": "application/json",
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
    });

  const post = (path: string, body: unknown, token: string | null): Promise<Response> =>
    request("POST", path, body, token);

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

  /**
   * Après une connexion par lien : demande au serveur d'amener la partie anonyme d'avant sur
   * le compte. Sans effet s'il n'y a rien à amener. Une panne laisse tout en place pour
   * réessayer au prochain appel.
   */
  const bringPreviousGame = async (): Promise<void> => {
    let previous: Session | null;
    try {
      previous = readSession(JSON.parse(deps.storage.getItem(PREVIOUS_KEY) ?? "null"));
    } catch {
      previous = null;
    }
    if (previous === null) return;

    const renewed = await post(
      "/auth/v1/token?grant_type=refresh_token",
      { refresh_token: previous.refresh },
      null,
    );
    if (renewed.status === 400 || renewed.status === 401) {
      // L'ancienne session n'existe plus : plus rien à amener.
      deps.storage.setItem(PREVIOUS_KEY, "");
      return;
    }
    const fresh = renewed.ok ? readSession(await renewed.json()) : null;
    if (fresh === null) throw new Error("ancienne session indisponible");
    deps.storage.setItem(PREVIOUS_KEY, JSON.stringify(fresh));

    const moved = await call("reprendre", { ancien: fresh.access });
    if (!moved.ok && moved.status !== 400) throw new Error("transfert indisponible");
    deps.storage.setItem(PREVIOUS_KEY, "");
  };

  const readState = (payload: unknown): PlayerState => {
    if (!isRecord(payload)) throw new Error("réponse illisible");
    return deserializeState(JSON.stringify(payload.state));
  };

  const fetchState: Remote["fetchState"] = async () => {
    await bringPreviousGame();
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

  /** Un appel au service des comptes ; jeton périmé → renouvelé, puis un seul nouvel essai. */
  const authCall = async (
    method: "GET" | "PUT",
    path: string,
    body: unknown,
  ): Promise<Response> => {
    const current = session ?? (await renew());
    const first = await request(method, path, body, current.access);
    if (first.status !== 401 && first.status !== 403) return first;
    const renewed = await renew();
    return request(method, path, body, renewed.access);
  };

  const account: Account = {
    async whoAmI() {
      const response = await authCall("GET", "/auth/v1/user", null);
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      if (!isRecord(payload)) return null;
      return typeof payload.email === "string" && payload.email !== "" ? payload.email : null;
    },
    async linkEmail(email, returnTo) {
      const back = `redirect_to=${encodeURIComponent(returnTo)}`;
      const attach = await authCall("PUT", `/auth/v1/user?${back}`, { email });
      if (attach.ok) return "sent";
      if (attach.status === 429) return "tooMany";
      const code = errorCode(await attach.json().catch(() => null));
      if (code === "email_address_invalid" || code === "validation_failed") return "invalid";
      if (code !== "email_exists") return "failed";

      // Cette adresse a déjà une partie : on envoie un lien pour l'ouvrir ici.
      const open = await post(`/auth/v1/otp?${back}`, { email, create_user: false }, null);
      if (open.ok) return "sent";
      return open.status === 429 ? "tooMany" : "failed";
    },
  };

  return { fetchState, sendOrder, account };
}
