/**
 * La discussion d'alliance : du texte libre, entre espèces humaines d'un même banc seulement
 * (demande du propriétaire du 28/11/2026). Le bilan des jeux comparables (partie 4.4) demande
 * des garde-fous ; les voici :
 * - des messages courts (`BALANCE.alliance.chat.maxLength`) ;
 * - quelques messages par minute, pas plus ;
 * - un filtre de grossièretés, en français et en anglais : les mots sont masqués ;
 * - pas de lien cliquable : une adresse devient « [lien] » ;
 * - un bouton « signaler » ; un message signalé par plusieurs membres est masqué ;
 * - les messages sont gardés une semaine, puis effacés ;
 * - aucun texte libre ne sort du banc.
 */
import { BALANCE, ChatRequestSchema } from "@o27/data";

const RULES = BALANCE.alliance.chat;

/** Les limites de la discussion, pour la base : palier des alliances, rythme, mémoire, masquage. */
export const CHAT_LIMITS = {
  tier: BALANCE.alliance.tier,
  perMinute: RULES.perMinute,
  keepDays: RULES.keepDays,
  hideAfterReports: RULES.hideAfterReports,
} as const;

/** Un message tel que le joueur le lit. */
export interface ChatMessage {
  readonly id: number;
  /** La place de l'auteur dans l'océan, et le nom de son espèce. */
  readonly slot: number;
  readonly name: string;
  readonly text: string;
  readonly at: number;
  readonly mine: boolean;
  /** Le joueur l'a déjà signalé. */
  readonly reported: boolean;
}

export interface ChatRepository {
  /** Les messages de son banc ; `null` s'il n'a pas (encore) de banc. */
  readonly read: (playerId: string) => Promise<ChatMessage[] | null>;
  /** Écrit un message ; « tooMany » au-delà du nombre permis par minute. */
  readonly write: (playerId: string, text: string) => Promise<"done" | "noBench" | "tooMany">;
  /** Signale un message de son banc. Faux s'il n'existe pas ou n'est pas de son banc. */
  readonly report: (playerId: string, id: number) => Promise<boolean>;
}

/**
 * Les mots masqués. Une liste courte et franche, comparée sans accents ni majuscules, mot par
 * mot : un mot qui en contient un autre (« concours ») n'est pas touché.
 */
const BLOCKED = [
  // Français
  "con",
  "cons",
  "conne",
  "connard",
  "connards",
  "connasse",
  "salope",
  "salopes",
  "salaud",
  "pute",
  "putes",
  "putain",
  "encule",
  "enculer",
  "enfoire",
  "batard",
  "batards",
  "merde",
  "merdes",
  "bite",
  "couille",
  "couilles",
  "nique",
  "niquer",
  "ntm",
  "fdp",
  "pd",
  "pede",
  "tapette",
  "negre",
  "bougnoule",
  "youpin",
  "chienne",
  "abruti",
  "debile",
  "gogol",
  "mongol",
  // Anglais
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "bitch",
  "bitches",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "slut",
  "whore",
  "fag",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "wanker",
  "twat",
  "motherfucker",
];

const BLOCKED_SET = new Set(BLOCKED);

/** Un mot ramené à sa forme simple : sans accents, en minuscules, chiffres « leet » remplacés. */
function plain(word: string): string {
  return word
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/(.)\1+/g, "$1$1");
}

function blocked(word: string): boolean {
  const simple = plain(word);
  // « coooonnard » : on essaie aussi avec les lettres doublées ramenées à une seule.
  return BLOCKED_SET.has(simple) || BLOCKED_SET.has(simple.replace(/(.)\1/g, "$1"));
}

const LINK =
  /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|fr|net|org|io|gg|ly|me|co|xyz|ru)\b\S*/giu;

/**
 * Un message propre à publier, ou `null` s'il est vide ou trop long. Les espaces sont
 * resserrés, les caractères invisibles retirés, les liens et les grossièretés masqués.
 */
export function cleanMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (text.length === 0 || text.length > RULES.maxLength) return null;
  const unlinked = text.replace(LINK, "[lien]");
  return unlinked.replace(/[\p{L}\p{N}@$]+/gu, (word) =>
    blocked(word) ? "•".repeat(Math.min(6, word.length)) : word,
  );
}

export type ChatReply =
  | { readonly status: "done"; readonly messages: readonly ChatMessage[] }
  /** Pas de banc : pas de discussion. */
  | { readonly status: "closed" }
  | { readonly status: "invalid" }
  | { readonly status: "tooMany" };

/**
 * Lire, écrire ou signaler. `body` vient du client : `{ texte }` pour écrire, `{ signaler }`
 * pour signaler un message, rien pour lire. On renvoie toujours la discussion à jour.
 */
export async function handleChat(
  chat: ChatRepository,
  playerId: string,
  body: unknown,
): Promise<ChatReply> {
  const parsed = ChatRequestSchema.safeParse(body ?? {});
  if (!parsed.success) return { status: "invalid" };
  const request = parsed.data;
  if ("texte" in request) {
    const text = cleanMessage(request.texte);
    if (text === null) return { status: "invalid" };
    const written = await chat.write(playerId, text);
    if (written === "noBench") return { status: "closed" };
    if (written === "tooMany") return { status: "tooMany" };
  } else if ("signaler" in request) {
    await chat.report(playerId, request.signaler);
  }
  const messages = await chat.read(playerId);
  return messages === null ? { status: "closed" } : { status: "done", messages };
}

/** Une discussion en mémoire, avec les mêmes règles que la base. Sert aux tests. */
export function createMemoryChat(
  benchOf: (
    playerId: string,
  ) => { readonly banner: string; readonly slot: number; readonly name: string } | null,
  clock: () => number,
): ChatRepository & { readonly all: () => readonly (ChatMessage & { readonly banner: string })[] } {
  interface Stored {
    readonly id: number;
    readonly banner: string;
    readonly author: string;
    readonly slot: number;
    readonly name: string;
    readonly text: string;
    readonly at: number;
    readonly reports: Set<string>;
  }
  const messages: Stored[] = [];
  let next = 1;
  const keepMs = RULES.keepDays * 86_400_000;
  const fresh = (): Stored[] => messages.filter((entry) => entry.at > clock() - keepMs);
  return {
    all: () =>
      messages.map((entry) => ({
        id: entry.id,
        banner: entry.banner,
        slot: entry.slot,
        name: entry.name,
        text: entry.text,
        at: entry.at,
        mine: false,
        reported: false,
      })),
    read(playerId) {
      const bench = benchOf(playerId);
      if (bench === null) return Promise.resolve(null);
      return Promise.resolve(
        fresh()
          .filter(
            (entry) => entry.banner === bench.banner && entry.reports.size < RULES.hideAfterReports,
          )
          .map((entry) => ({
            id: entry.id,
            slot: entry.slot,
            name: entry.name,
            text: entry.text,
            at: entry.at,
            mine: entry.author === playerId,
            reported: entry.reports.has(playerId),
          })),
      );
    },
    write(playerId, text) {
      const bench = benchOf(playerId);
      if (bench === null) return Promise.resolve("noBench");
      const recent = messages.filter(
        (entry) => entry.author === playerId && entry.at > clock() - 60_000,
      ).length;
      if (recent >= RULES.perMinute) return Promise.resolve("tooMany");
      messages.push({
        id: next++,
        banner: bench.banner,
        author: playerId,
        slot: bench.slot,
        name: bench.name,
        text,
        at: clock(),
        reports: new Set(),
      });
      return Promise.resolve("done");
    },
    report(playerId, id) {
      const bench = benchOf(playerId);
      const found = messages.find((entry) => entry.id === id);
      if (bench === null || found?.banner !== bench.banner || found.author === playerId) {
        return Promise.resolve(false);
      }
      found.reports.add(playerId);
      return Promise.resolve(true);
    },
  };
}
