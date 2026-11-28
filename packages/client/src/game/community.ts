/**
 * Autour du jeu, vu du client : donner son avis, lire son Muséum, supprimer son compte, et
 * pour un gardien lire les statistiques. Rien du serveur n'est cru sur parole : chaque
 * réponse est relue champ par champ.
 */
import { parseBattle } from "@o27/core";
import type { Battle, DuelSummary, MuseumPlate } from "@o27/core";
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
  /** Les combats entre humains de la saison ; `null` si le serveur ne les a pas donnés. */
  readonly fights: FightStats | null;
  /** Les alliances : discussion, votes, guerres ; `null` si le serveur ne les a pas donnés. */
  readonly alliances: AllianceStats | null;
}

export interface AllianceStats {
  readonly messages: number;
  readonly reported: number;
  readonly hidden: number;
  readonly voters: number;
  readonly leaders: number;
  readonly wars: number;
}

function readAlliances(value: unknown): AllianceStats | null {
  if (!isRecord(value)) return null;
  return {
    messages: num(value.messages7j),
    reported: num(value.signales),
    hidden: num(value.masques),
    voters: num(value.votants),
    leaders: num(value.chefs),
    wars: num(value.guerres),
  };
}

/** Un message de la discussion d'alliance. */
export interface ChatLine {
  readonly id: number;
  readonly slot: number;
  readonly name: string;
  readonly text: string;
  readonly at: number;
  readonly mine: boolean;
  readonly reported: boolean;
}

/** Ce que répond la discussion : les messages, ou pourquoi elle refuse. */
export type ChatResult =
  | { readonly status: "done" | "closed"; readonly messages: readonly ChatLine[] }
  | { readonly status: "invalid" | "tooMany" | "failed" };

/** Relit les messages envoyés par le serveur ; une ligne mal formée est écartée. */
export function readChat(payload: unknown): readonly ChatLine[] {
  if (!isRecord(payload)) return [];
  return rows(payload.messages)
    .filter((row) => typeof row.id === "number" && typeof row.text === "string")
    .map((row) => ({
      id: num(row.id),
      slot: num(row.slot),
      name: text(row.name),
      text: text(row.text),
      at: num(row.at),
      mine: row.mine === true,
      reported: row.reported === true,
    }));
}

/** Les combats entre humains : jour par jour, sur la dernière semaine. */
export interface FightStats {
  readonly attacks: number;
  readonly spies: number;
  readonly days: readonly {
    readonly day: string;
    readonly attacks: number;
    readonly fights: number;
    readonly wins: number;
    readonly bounced: number;
    readonly recalled: number;
    /** Cellules perdues en moyenne par combat, de chaque côté. */
    readonly attackerLoss: number;
    readonly defenderLoss: number;
    readonly helpers: number;
    readonly loot: number;
  }[];
  readonly spyDays: readonly {
    readonly day: string;
    readonly spies: number;
    readonly succeeded: number;
  }[];
}

function readFights(value: unknown): FightStats | null {
  if (!isRecord(value)) return null;
  return {
    attacks: num(value.attaques),
    spies: num(value.espionnages),
    days: rows(value.jours).map((row) => ({
      day: text(row.jour),
      attacks: num(row.attaques),
      fights: num(row.combats),
      wins: num(row.victoires),
      bounced: num(row.rebonds),
      recalled: num(row.rappels),
      attackerLoss: num(row.pertesAttaque),
      defenderLoss: num(row.pertesDefense),
      helpers: num(row.renforts),
      loot: num(row.butin),
    })),
    spyDays: rows(value.espionnagesJours).map((row) => ({
      day: text(row.jour),
      spies: num(row.espionnages),
      succeeded: num(row.reussis),
    })),
  };
}

/** Une attaque du fil d'alliance : qui attaque qui, où elle en est, et comment elle a fini. */
export interface FeedAttack {
  readonly id: string;
  readonly attackerSlot: number;
  readonly attackerName: string;
  readonly defenderSlot: number;
  readonly defenderName: string;
  readonly attackerBanner: string;
  readonly defenderBanner: string;
  readonly arrivesAt: number;
  readonly resolveAt: number;
  readonly status: "pending" | "resolved" | "bounced" | "cancelled";
  readonly summary: DuelSummary | null;
  /** Le détail du combat, vu de l'attaquant. */
  readonly battle: Battle | null;
  /** Le joueur est l'attaquant, la cible, ou a envoyé des renforts. */
  readonly mine: boolean;
  readonly aimed: boolean;
  readonly helping: boolean;
  /** Les espèces venues en renfort. */
  readonly helpers: readonly string[];
}

/** Un espionnage du fil d'alliance. */
export interface FeedSpy {
  readonly spyName: string;
  readonly targetName: string;
  readonly success: boolean;
  readonly at: number;
  readonly mine: boolean;
  readonly aimed: boolean;
}

export interface Feeds {
  readonly attacks: readonly FeedAttack[];
  readonly spies: readonly FeedSpy[];
}

const STATUSES = {
  en_route: "pending",
  resolue: "resolved",
  rebond: "bounced",
  annulee: "cancelled",
} as const;

function readSummary(value: unknown): DuelSummary | null {
  if (!isRecord(value)) return null;
  return {
    fought: value.fought === true,
    attackerWon: value.attackerWon === true,
    attackerForce: num(value.attackerForce),
    defenderForce: num(value.defenderForce),
    attackerLost: num(value.attackerLost),
    defenderLost: num(value.defenderLost),
    helpersLost: num(value.helpersLost),
    helpers: num(value.helpers),
    loot: num(value.loot),
  };
}

/** Relit les fils d'alliance envoyés par le serveur ; une ligne mal formée est écartée. */
export function readFeeds(payload: unknown): Feeds {
  if (!isRecord(payload)) return { attacks: [], spies: [] };
  const attacks = rows(payload.attacks).flatMap((row): FeedAttack[] => {
    const status = STATUSES[text(row.status) as keyof typeof STATUSES] as
      FeedAttack["status"] | undefined;
    if (status === undefined || text(row.id) === "") return [];
    return [
      {
        id: text(row.id),
        attackerSlot: num(row.attackerSlot),
        attackerName: text(row.attackerName),
        defenderSlot: num(row.defenderSlot),
        defenderName: text(row.defenderName),
        attackerBanner: text(row.attackerBanner),
        defenderBanner: text(row.defenderBanner),
        arrivesAt: num(row.arrivesAt),
        resolveAt: num(row.resolveAt),
        status,
        summary: readSummary(row.summary),
        battle: row.battle === null || row.battle === undefined ? null : parseBattle(row.battle),
        mine: row.mine === true,
        aimed: row.aimed === true,
        helping: row.helping === true,
        helpers: Array.isArray(row.helpers)
          ? row.helpers.map(text).filter((name) => name !== "")
          : [],
      },
    ];
  });
  const spies = rows(payload.spies).map((row) => ({
    spyName: text(row.spyName),
    targetName: text(row.targetName),
    success: row.success === true,
    at: num(row.at),
    mine: row.mine === true,
    aimed: row.aimed === true,
  }));
  return { attacks, spies };
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
  /** Les bancs : humains par bannière, et les points qu'ils ont versés. */
  readonly benches: readonly {
    readonly banner: string;
    readonly players: number;
    readonly given: number;
  }[];
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
    benches: rows(value.bancs).map((row) => ({
      banner: text(row.nom),
      players: num(row.joueurs),
      given: num(row.verse),
    })),
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
  /** Les fils d'alliance du joueur ; `null` si le serveur ne répond pas. */
  readonly feeds: () => Promise<Feeds | null>;
  /** La discussion d'alliance : lire (`{}`), écrire (`{ texte }`), signaler (`{ signaler }`). */
  readonly chat: (
    request: Readonly<{ texte: string } | { signaler: number } | Record<string, never>>,
  ) => Promise<ChatResult>;
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
    fights: readFights(stats.combats),
    alliances: readAlliances(stats.alliances),
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
    async feeds() {
      try {
        const response = await call("fils", {});
        return response.ok ? readFeeds(await response.json()) : null;
      } catch {
        return null;
      }
    },
    async chat(request) {
      try {
        const response = await call("discussion", request);
        if (response.status === 400) return { status: "invalid" };
        if (response.status === 429) return { status: "tooMany" };
        if (response.status === 403) return { status: "closed", messages: [] };
        if (!response.ok) return { status: "failed" };
        return { status: "done", messages: readChat(await response.json()) };
      } catch {
        return { status: "failed" };
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
