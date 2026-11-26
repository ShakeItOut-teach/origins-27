/**
 * Autour du jeu, vu du client : donner son avis, lire son Muséum, supprimer son compte, et
 * pour un gardien lire les statistiques. Rien du serveur n'est cru sur parole : chaque
 * réponse est relue champ par champ.
 */
import type { MuseumPlate } from "@o27/core";
import type { Feedback } from "@o27/data";

/** Ce qu'il advient d'un avis : gardé, refusé par le serveur, trop pour aujourd'hui, ou panne. */
export type FeedbackResult = "done" | "invalid" | "tooMany" | "failed";

/** Une part d'un total : un appareil, une langue, une source, et le nombre de joueurs. */
export interface Share {
  readonly name: string;
  readonly players: number;
}

/** Les statistiques du jeu : que des totaux, aucun joueur n'y est reconnaissable. */
export interface GameStats {
  readonly players: number;
  readonly linkedAccounts: number;
  readonly activeToday: number;
  readonly active7Days: number;
  /** Joueurs venus ces sept derniers jours avec le jeu installé sur leur écran d'accueil. */
  readonly installed: number;
  /** Les trente derniers jours, le plus récent d'abord. */
  readonly days: readonly {
    readonly day: string;
    readonly newPlayers: number;
    readonly active: number;
    readonly visits: number;
    readonly orders: number;
    /** Temps de jeu moyen d'un joueur actif ce jour-là, en secondes. */
    readonly seconds: number;
  }[];
  /** Qui revient : parmi les joueurs arrivés depuis assez longtemps, combien étaient là N jours après. */
  readonly retention: readonly {
    readonly day: number;
    readonly arrived: number;
    readonly returned: number;
    readonly returnedOrLater: number;
  }[];
  readonly tiers: readonly { readonly tier: number; readonly players: number }[];
  /** Ce qui est joué, sur sept jours. */
  readonly orders: readonly {
    readonly type: string;
    readonly accepted: number;
    readonly refused: number;
  }[];
  readonly devices: readonly Share[];
  readonly languages: readonly Share[];
  readonly sources: readonly Share[];
  readonly feedback: {
    readonly count: number;
    readonly average: number | null;
    readonly latest: readonly {
      readonly day: string;
      readonly seasonDay: number;
      readonly tier: number;
      readonly rating: number | null;
      readonly text: string;
      readonly lang: string;
    }[];
  };
  /** Le monde partagé de la saison en cours ; `null` si le serveur ne l'a pas donné. */
  readonly ocean: OceanStats | null;
}

export interface OceanStats {
  /** Espèces humaines de la saison, et celles venues ces dernières 24 heures. */
  readonly humans: number;
  readonly active24h: number;
  readonly averagePower: number;
  readonly topPower: number;
  /** Famille de gènes la plus travaillée par chaque humain (« ? » : aucun gène). */
  readonly families: readonly Share[];
  /** Ce que les humains ont pris dans les gisements, en millionièmes d'unité. */
  readonly taken: number;
  /** Pourquoi les ordres sont refusés, sur sept jours. */
  readonly refusals: readonly { readonly code: string; readonly count: number }[];
}

function readOcean(value: unknown): OceanStats | null {
  if (!isRecord(value)) return null;
  return {
    humans: num(value.humains),
    active24h: num(value.actifs24h),
    averagePower: num(value.puissanceMoyenne),
    topPower: num(value.puissanceMax),
    families: shares(value.familles),
    taken: num(value.prises),
    refusals: rows(value.refus).map((row) => ({ code: text(row.code), count: num(row.nombre) })),
  };
}

export interface Community {
  readonly sendFeedback: (feedback: Feedback) => Promise<FeedbackResult>;
  /** Les planches gardées par le serveur. Promesse rejetée : pas de réponse. */
  readonly plates: () => Promise<MuseumPlate[]>;
  /** Les statistiques, ou `null` si ce compte n'est pas gardien (ou si le serveur ne répond pas). */
  readonly stats: () => Promise<GameStats | null>;
  /** Supprime le compte et tout ce qui est au joueur. Vrai si c'est fait. */
  readonly deleteAccount: () => Promise<boolean>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number {
  const found = typeof value === "string" ? Number(value) : value;
  return typeof found === "number" && Number.isFinite(found) ? found : 0;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function shares(value: unknown): Share[] {
  return rows(value).map((row) => ({ name: text(row.nom), players: num(row.joueurs) }));
}

/** Relit les planches envoyées par le serveur ; ce qui n'en a pas la forme est écarté. */
export function readPlates(payload: unknown): MuseumPlate[] {
  if (!isRecord(payload)) return [];
  return rows(payload.plates)
    .filter((row) => typeof row.season === "number" && typeof row.name === "string")
    .map((row) => ({
      season: num(row.season),
      name: text(row.name),
      cousin: text(row.cousin),
      rank: num(row.rank),
      of: num(row.of),
      league: num(row.league),
      lineage: text(row.lineage),
      place: num(row.place),
      crisis: text(row.crisis),
    }));
}

/** Relit les statistiques envoyées par le serveur. Un champ absent vaut zéro, ou une liste vide. */
export function readStats(payload: unknown): GameStats | null {
  if (!isRecord(payload) || !isRecord(payload.stats)) return null;
  const stats = payload.stats;
  const feedback = isRecord(stats.avis) ? stats.avis : {};
  return {
    players: num(stats.joueurs),
    linkedAccounts: num(stats.comptesLies),
    activeToday: num(stats.actifsAujourdhui),
    active7Days: num(stats.actifs7Jours),
    installed: num(stats.installes),
    days: rows(stats.jours).map((row) => ({
      day: text(row.jour),
      newPlayers: num(row.nouveaux),
      active: num(row.actifs),
      visits: num(row.visites),
      orders: num(row.ordres),
      seconds: num(row.secondes),
    })),
    retention: rows(stats.retention).map((row) => ({
      day: num(row.jour),
      arrived: num(row.arrives),
      returned: num(row.revenus),
      returnedOrLater: num(row.revenus_ou_apres),
    })),
    tiers: rows(stats.paliers).map((row) => ({ tier: num(row.palier), players: num(row.joueurs) })),
    orders: rows(stats.ordres).map((row) => ({
      type: text(row.type),
      accepted: num(row.acceptes),
      refused: num(row.refuses),
    })),
    devices: shares(stats.appareils),
    languages: shares(stats.langues),
    sources: shares(stats.sources),
    feedback: {
      count: num(feedback.nombre),
      average:
        feedback.moyenne === null || feedback.moyenne === undefined ? null : num(feedback.moyenne),
      latest: rows(feedback.derniers).map((row) => ({
        day: text(row.jour),
        seasonDay: num(row.jour_saison),
        tier: num(row.palier),
        rating: row.note === null || row.note === undefined ? null : num(row.note),
        text: text(row.texte),
        lang: text(row.langue),
      })),
    },
    ocean: readOcean(stats.ocean),
  };
}

/**
 * Branche ces quatre appels sur la fonction du jeu. `call` porte déjà le jeton du joueur ;
 * `forget` oublie la session sur l'appareil, une fois le compte supprimé.
 */
export function createCommunity(
  call: (path: string, body: unknown) => Promise<Response>,
  forget: () => void,
): Community {
  return {
    async sendFeedback(feedback) {
      try {
        const response = await call("avis", feedback);
        if (response.ok) return "done";
        if (response.status === 400) return "invalid";
        return response.status === 429 ? "tooMany" : "failed";
      } catch {
        return "failed";
      }
    },
    async plates() {
      const response = await call("musee", {});
      if (!response.ok) throw new Error(`musée : ${String(response.status)}`);
      return readPlates(await response.json());
    },
    async stats() {
      try {
        const response = await call("stats", {});
        return response.ok ? readStats(await response.json()) : null;
      } catch {
        return null;
      }
    },
    async deleteAccount() {
      try {
        const response = await call("supprimer", { confirm: true });
        if (!response.ok) return false;
        forget();
        return true;
      } catch {
        return false;
      }
    },
  };
}
