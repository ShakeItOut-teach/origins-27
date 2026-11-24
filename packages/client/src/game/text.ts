/** Textes et mise en forme des nombres, dans la langue du joueur. */
import { MICRO } from "@o27/core";
import { en, enScience, fr, frScience } from "@o27/data";
import type { ScienceTexts, TextKey } from "@o27/data";

export type Lang = "fr" | "en";

export function detectLang(languages: readonly string[]): Lang {
  return languages[0]?.toLowerCase().startsWith("fr") === true ? "fr" : "en";
}

/** Vrais termes de la biologie (par défaut) ou mots simples : le joueur choisit. */
let science = true;
const TERMS_KEY = "o27.termes";

export function isScience(): boolean {
  return science;
}

export function setScience(value: boolean): void {
  science = value;
}

/** Le choix enregistré : `null` tant que le joueur n'a rien choisi. */
export function savedScience(storage: Pick<Storage, "getItem">): boolean | null {
  const value = storage.getItem(TERMS_KEY);
  return value === "science" ? true : value === "simples" ? false : null;
}

export function saveScience(storage: Pick<Storage, "setItem">, value: boolean): void {
  storage.setItem(TERMS_KEY, value ? "science" : "simples");
}

/** Un texte dans la langue du joueur, avec le mot simple ou le vrai terme selon son réglage. */
export function translate(lang: Lang, key: TextKey, real: boolean = science): string {
  const terms: ScienceTexts = lang === "fr" ? frScience : enScience;
  return (real ? terms[key] : undefined) ?? (lang === "fr" ? fr[key] : en[key]);
}

/** Une quantité de ressource, en unités entières. */
export function formatAmount(micro: number, lang: Lang): string {
  return Math.floor(micro / MICRO).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB");
}

/** Une production par seconde, avec une décimale. */
export function formatRate(microPerMs: number, lang: Lang): string {
  const perSecond = (microPerMs * 1000) / MICRO;
  return perSecond.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Une durée courte : « 45 s », « 1 min 30 ». */
/** Une profondeur en mètres, avec l'espace des milliers de la langue. */
export function formatDepth(metres: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US").format(metres);
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${String(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0
    ? `${String(minutes)} min`
    : `${String(minutes)} min ${String(rest).padStart(2, "0")}`;
}

/** Une longue durée, arrondie : « 12 min », « 8 h », « 3 j ». */
export function formatAway(ms: number, lang: Lang): string {
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return `${String(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${String(hours)} ${translate(lang, "unit.hours")}`;
  return `${String(Math.floor(hours / 24))} ${translate(lang, "unit.days")}`;
}

const LANG_KEY = "o27.langue";

/** La langue choisie par le joueur si elle existe, sinon celle de l'appareil. */
export function initialLang(storage: Pick<Storage, "getItem">, languages: readonly string[]): Lang {
  const saved = storage.getItem(LANG_KEY);
  return saved === "fr" || saved === "en" ? saved : detectLang(languages);
}

export function saveLang(storage: Pick<Storage, "setItem">, lang: Lang): void {
  storage.setItem(LANG_KEY, lang);
}
