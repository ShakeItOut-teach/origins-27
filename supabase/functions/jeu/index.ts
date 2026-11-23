// Fonction Supabase (Deno) : la porte d'entrée du jeu.
//   POST /jeu/etat   → l'état à jour du joueur (le crée à sa première visite)
//   POST /jeu/ordre  → applique un ordre { orderId, order }
//   POST /jeu/reprendre → après connexion à un compte, y amène la partie anonyme { ancien }
// Toute la logique est dans packages/server, testée sans Supabase. Ce fichier ne fait que
// trois choses : reconnaître le joueur, brancher la base, traduire la réponse en HTTP.
// `../_shared/server.js` est fabriqué par `pnpm server:bundle` avant le déploiement.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleOrder, handleState } from "../_shared/server.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const STATUS = { done: 200, invalid: 400, closed: 403, busy: 409 } as const;

function env(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined) throw new Error(`Variable manquante : ${name}`);
  return value;
}

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (request.method !== "POST") return json(405, { error: "method" });

  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError !== null || auth.user === null) return json(401, { error: "auth" });
  const playerId = auth.user.id;
  const path = new URL(request.url).pathname;

  if (path.endsWith("/reprendre")) {
    const body: unknown = await request.json().catch(() => null);
    const oldToken =
      typeof body === "object" && body !== null && "ancien" in body ? String(body.ancien) : "";
    const { data: previous, error: previousError } = await admin.auth.getUser(oldToken);
    if (previousError !== null || previous.user === null) return json(400, { error: "ancien" });
    // Seule la partie d'un compte anonyme, prouvée par son propre jeton, peut être déplacée.
    if (previous.user.id === playerId || previous.user.is_anonymous !== true) {
      return json(200, { moved: false });
    }
    const { data: moved, error: moveError } = await admin.rpc("transferer", {
      p_de: previous.user.id,
      p_vers: playerId,
    });
    if (moveError !== null) {
      console.error(moveError);
      return json(500, { error: "server" });
    }
    return json(200, { moved: moved === true });
  }

  const { data: season, error: seasonError } = await admin
    .from("saisons")
    .select("id, debut")
    .lte("debut", new Date().toISOString())
    .order("debut", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (seasonError !== null) {
    console.error(seasonError);
    return json(500, { error: "season" });
  }
  if (season === null) return json(403, { status: "closed" });

  const deps = {
    clock: () => Date.now(),
    newSeed: () => crypto.getRandomValues(new Uint32Array(1))[0],
    seasonStart: Date.parse(season.debut),
    repo: {
      async load(id: string) {
        const { data, error } = await admin
          .from("etats_joueur")
          .select("etat, version")
          .eq("joueur", id)
          .maybeSingle();
        if (error !== null) throw error;
        return data === null ? null : { state: JSON.stringify(data.etat), version: data.version };
      },
      async findOutcome(id: string, orderId: string) {
        const { data, error } = await admin
          .from("ordres")
          .select("resultat")
          .eq("joueur", id)
          .eq("id", orderId)
          .maybeSingle();
        if (error !== null) throw error;
        return data === null ? null : data.resultat;
      },
      async commit(change: {
        playerId: string;
        expectedVersion: number;
        state: string;
        order: { id: string; outcome: unknown } | null;
      }) {
        const { data, error } = await admin.rpc("enregistrer", {
          p_joueur: change.playerId,
          p_saison: season.id,
          p_version_attendue: change.expectedVersion,
          p_etat: JSON.parse(change.state),
          p_ordre: change.order?.id ?? null,
          p_resultat: change.order?.outcome ?? null,
        });
        if (error !== null) throw error;
        return data === true;
      },
    },
  };

  try {
    if (path.endsWith("/etat")) {
      const reply = await handleState(deps, playerId);
      return json(STATUS[reply.status], reply);
    }
    if (path.endsWith("/ordre")) {
      const body: unknown = await request.json().catch(() => null);
      const reply = await handleOrder(deps, playerId, body);
      return json(STATUS[reply.status], reply);
    }
    return json(404, { error: "path" });
  } catch (error) {
    console.error(error);
    return json(500, { error: "server" });
  }
});
