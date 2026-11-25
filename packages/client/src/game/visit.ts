/**
 * Ce que l'appareil dit de lui au serveur à chaque visite, pour la mesure d'audience : la
 * sorte d'appareil, si le jeu est installé, et d'où le joueur est arrivé. Rien de personnel.
 * Et de quoi proposer l'installation du jeu sur l'écran d'accueil.
 */
import type { DeviceKind } from "@o27/data";

/** Où l'appareil retient la source de la toute première visite. */
const SOURCE_KEY = "o27.source";
const SOURCE_MAX = 24;

/** Réduit un texte à un mot court : minuscules, chiffres et tirets. `null` s'il n'en reste rien. */
function shortWord(text: string): string | null {
  const word = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SOURCE_MAX)
    .replace(/-+$/, "");
  return word === "" ? null : word;
}

/**
 * D'où vient le joueur : le mot que nous mettons dans nos liens (`?s=discord`), sinon le site
 * qui l'a amené. `null` s'il arrive directement ou du jeu lui-même.
 */
export function sourceOf(search: string, referrer: string, ownHost: string): string | null {
  const tagged = new URLSearchParams(search).get("s");
  if (tagged !== null) return shortWord(tagged);
  let host: string;
  try {
    host = new URL(referrer).hostname;
  } catch {
    return null;
  }
  if (host === "" || host === ownHost) return null;
  return shortWord(host.replace(/^www\./, ""));
}

/** Garde la première source connue sur l'appareil, et la renvoie à chaque visite. */
export function rememberSource(
  storage: Pick<Storage, "getItem" | "setItem">,
  found: string | null,
): string | null {
  const kept = storage.getItem(SOURCE_KEY);
  if (kept !== null && kept !== "") return kept;
  if (found !== null) storage.setItem(SOURCE_KEY, found);
  return found;
}

/** La sorte d'appareil, d'après le petit côté de l'écran et le toucher. */
export function deviceKind(shortSide: number, touch: boolean): DeviceKind {
  if (shortSide < 600) return "phone";
  if (shortSide < 1100 && touch) return "tablet";
  return "desktop";
}

/**
 * Comment proposer l'installation : rien si c'est fait, un bouton si le navigateur le permet,
 * le geste à faire sur iPhone, ou une explication générale.
 */
export type InstallMode = "done" | "button" | "ios" | "menu";

export function installMode(device: {
  readonly standalone: boolean;
  readonly canPrompt: boolean;
  readonly userAgent: string;
}): InstallMode {
  if (device.standalone) return "done";
  if (device.canPrompt) return "button";
  return /iphone|ipad|ipod/i.test(device.userAgent) ? "ios" : "menu";
}

/** L'installation du jeu, vue de l'interface : où on en est, et de quoi la lancer. */
export interface Installer {
  readonly mode: () => InstallMode;
  /** Ouvre la fenêtre d'installation du navigateur, quand il en a une. */
  readonly install: () => void;
  readonly subscribe: (listener: () => void) => () => void;
}
