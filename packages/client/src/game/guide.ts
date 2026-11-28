/**
 * Le guide des nouveautés, côté écran : quelles fiches sont ouvertes à ce palier, lesquelles le
 * joueur n'a pas encore lues, et leurs textes avec les noms du vocabulaire qu'il a choisi.
 */
import { GUIDE_STEPS, GUIDE_STEP_TIERS, UNLOCKS } from "@o27/data";
import type { GuideStep, TextKey } from "@o27/data";

const SEEN_KEY = "o27.guide.vu";

/** Le palier où une fiche apparaît : celui du premier élément qu'elle explique. */
export function guideTier(step: GuideStep): number {
  const fixed = GUIDE_STEP_TIERS[step.id];
  if (fixed !== undefined) return fixed;
  const tiers = step.ui.map(
    (element) =>
      UNLOCKS.find((unlock) => unlock.ui.includes(element))?.tier ?? Number.POSITIVE_INFINITY,
  );
  return Math.min(...tiers);
}

/** Les fiches ouvertes à ce palier, dans l'ordre où elles sont apparues. */
export function guideSteps(tier: number): GuideStep[] {
  return GUIDE_STEPS.map((step, index) => ({ step, index, at: guideTier(step) }))
    .filter((entry) => entry.at <= tier)
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map((entry) => entry.step);
}

/** Les fiches ouvertes que le joueur n'a pas encore lues. */
export function pendingGuide(tier: number, seen: ReadonlySet<string>): GuideStep[] {
  return guideSteps(tier).filter((step) => !seen.has(step.id));
}

/**
 * Les fiches déjà lues sur cet appareil. La première fois, un joueur déjà avancé ne reçoit pas
 * toutes les fiches d'un coup : celles des paliers passés comptent comme lues, il ne voit que
 * celles de son palier (et les autres restent dans « Le guide »).
 */
export function readGuideSeen(storage: Pick<Storage, "getItem">, tier: number): Set<string> {
  const raw = storage.getItem(SEEN_KEY);
  if (raw === null) {
    return new Set(GUIDE_STEPS.filter((step) => guideTier(step) < tier).map((step) => step.id));
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [],
    );
  } catch {
    return new Set();
  }
}

export function saveGuideSeen(storage: Pick<Storage, "setItem">, seen: ReadonlySet<string>): void {
  storage.setItem(SEEN_KEY, JSON.stringify([...seen].sort()));
}

/** Le texte d'une fiche, où `{o:…}` et `{r:…}` prennent le nom d'un organite ou d'une ressource. */
export function guideText(text: string, t: (key: TextKey) => string): string {
  return text
    .replace(/\{o:(\w+)\}/g, (_, id: string) => t(`organelle.${id}.name` as TextKey))
    .replace(/\{r:(\w+)\}/g, (_, id: string) => t(`resource.${id}` as TextKey));
}
