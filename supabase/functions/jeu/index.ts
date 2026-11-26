// Fonction Supabase (Deno) : la porte d'entrée du jeu.
//   POST /jeu/etat   → l'état à jour du joueur (le crée à sa première visite)
//   POST /jeu/ordre  → applique un ordre { orderId, order }
//   POST /jeu/reprendre → après connexion à un compte, y amène la partie anonyme { ancien }
//   POST /jeu/avis      → garde l'avis du joueur { rating, text, lang }
//   POST /jeu/musee     → les planches du Muséum du joueur
//   POST /jeu/stats     → les statistiques du jeu, pour un gardien seulement
//   POST /jeu/supprimer → supprime le compte du joueur et tout ce qui est à lui { confirm }
// À chaque visite et à chaque ordre, le serveur note aussi de quoi mesurer l'audience, et met à
// jour la vitrine du joueur : ce que les autres humains de la saison voient de lui.
// Toute la logique est dans packages/server, testée sans Supabase. Ce fichier ne fait que
// trois choses : reconnaître le joueur, brancher la base, traduire la réponse en HTTP.
// `../_shared/server.js` est fabriqué par `pnpm server:bundle` avant le déploiement.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  dayOf,
  describeOrder,
  describeVisit,
  handleFeedback,
  handleOrder,
  handleState,
  humanCard,
  readCrowd,
} from "../_shared/server.js";

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

const STATUS = { done: 200, invalid: 400, closed: 403, busy: 409, tooMany: 429 } as const;

/**
 * Un travail qui ne doit ni retarder la réponse ni la faire échouer : la mesure d'audience.
 * S'il échoue, on l'écrit dans le journal du serveur et le jeu continue.
 */
function later(work: PromiseLike<{ error: unknown }>): void {
  const safe = Promise.resolve(work).then(
    (result) => {
      if (result.error !== null) console.error(result.error);
    },
    (error: unknown) => {
      console.error(error);
    },
  );
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  runtime?.waitUntil(safe);
}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined) throw new Error(`Variable manquante : ${name}`);
  return value;
}

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

/**
 * Les vitrines de la saison, gardées une minute en mémoire : une seule lecture de la base par
 * minute, quel que soit le nombre de joueurs. Si la lecture échoue, le jeu continue sans elles.
 */
const CROWD_MS = 60_000;
let crowdCache: { season: number; at: number; cards: unknown } | null = null;

async function seasonCrowd(season: number): Promise<ReturnType<typeof readCrowd>> {
  const now = Date.now();
  if (crowdCache !== null && crowdCache.season === season && now - crowdCache.at < CROWD_MS) {
    return readCrowd(crowdCache.cards);
  }
  const { data, error } = await admin.rpc("lire_vitrines", { p_saison: season });
  if (error !== null) {
    console.error(error);
    return readCrowd([]);
  }
  crowdCache = { season, at: now, cards: data };
  return readCrowd(data);
}

/** Met à jour la vitrine du joueur, après la réponse. */
function showCard(playerId: string, season: number, state: Parameters<typeof humanCard>[0]): void {
  later(
    admin.rpc("montrer_vitrine", {
      p_joueur: playerId,
      p_saison: season,
      p_place: state.slot,
      p_carte: humanCard(state),
    }),
  );
}

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

  if (path.endsWith("/supprimer")) {
    const body: unknown = await request.json().catch(() => null);
    const sure =
      typeof body === "object" && body !== null && "confirm" in body && body.confirm === true;
    if (!sure) return json(400, { error: "confirm" });
    // Tout ce qui est au joueur part avec son compte ; ses avis restent, sans lui.
    const { error: deleteError } = await admin.auth.admin.deleteUser(playerId);
    if (deleteError !== null) {
      console.error(deleteError);
      return json(500, { error: "server" });
    }
    return json(200, { deleted: true });
  }

  if (path.endsWith("/musee")) {
    const { data, error } = await admin.rpc("lire_planches", { p_joueur: playerId });
    if (error !== null) {
      console.error(error);
      return json(500, { error: "server" });
    }
    return json(200, { plates: data ?? [] });
  }

  if (path.endsWith("/stats")) {
    const { data, error } = await admin.rpc("statistiques", {
      p_joueur: playerId,
      p_aujourdhui: dayOf(Date.now()),
    });
    if (error !== null) {
      console.error(error);
      return json(500, { error: "server" });
    }
    // Seul un gardien reçoit des chiffres.
    if (data === null) return json(403, { error: "gardien" });
    return json(200, { stats: data });
  }

  const { data: season, error: seasonError } = await admin
    .from("saisons")
    .select("id, debut, graine")
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
    worldSeed: Number(season.graine),
    crowd: () => seasonCrowd(Number(season.id)),
    repo: {
      async nextSlot() {
        const { data, error } = await admin.rpc("prendre_place", { p_saison: season.id });
        if (error !== null) throw error;
        return Number(data);
      },
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
      const body: unknown = await request.json().catch(() => null);
      const reply = await handleState(deps, playerId);
      if (reply.status === "done") {
        showCard(playerId, Number(season.id), reply.state);
        const visit = describeVisit(playerId, reply.state, reply.state.now, body);
        later(
          admin.rpc("noter_visite", {
            p_joueur: playerId,
            p_jour: visit.day,
            p_jour_saison: visit.seasonDay,
            p_palier: visit.tier,
            p_puissance: visit.power,
            p_langue: visit.lang,
            p_appareil: visit.device,
            p_installe: visit.installed,
            p_source: visit.source,
            p_saison: reply.state.seasonStart,
            p_planche: visit.plate,
          }),
        );
      }
      return json(STATUS[reply.status], reply);
    }
    if (path.endsWith("/ordre")) {
      const body: unknown = await request.json().catch(() => null);
      const reply = await handleOrder(deps, playerId, body);
      const record =
        reply.status === "done" ? describeOrder(playerId, reply.state.now, body, reply) : null;
      if (reply.status === "done") showCard(playerId, Number(season.id), reply.state);
      if (record !== null) {
        later(
          admin.rpc("noter_ordre", {
            p_joueur: playerId,
            p_jour: record.day,
            p_jour_saison: record.seasonDay,
            p_palier: record.tier,
            p_type: record.type,
            p_accepte: record.ok,
          }),
        );
      }
      return json(STATUS[reply.status], reply);
    }
    if (path.endsWith("/avis")) {
      const body: unknown = await request.json().catch(() => null);
      const reply = await handleFeedback(
        {
          repo: deps.repo,
          clock: deps.clock,
          seasonStart: deps.seasonStart,
          community: {
            async addFeedback(
              record: {
                playerId: string;
                day: string;
                seasonDay: number;
                tier: number;
                rating: number | null;
                text: string;
                lang: string;
              },
              limit: number,
            ) {
              const { data, error } = await admin.rpc("donner_avis", {
                p_joueur: record.playerId,
                p_jour: record.day,
                p_jour_saison: record.seasonDay,
                p_palier: record.tier,
                p_note: record.rating,
                p_texte: record.text,
                p_langue: record.lang,
                p_limite: limit,
              });
              if (error !== null) throw error;
              return data === true;
            },
          },
        },
        playerId,
        body,
      );
      return json(STATUS[reply.status], reply);
    }
    return json(404, { error: "path" });
  } catch (error) {
    console.error(error);
    return json(500, { error: "server" });
  }
});
