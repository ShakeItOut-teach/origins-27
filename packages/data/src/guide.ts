/**
 * Le guide des nouveautés : une fiche par chose qui apparaît, qui dit à quoi elle sert et
 * emmène le joueur où elle se trouve. Les fiches suivent la table de déblocage : chacune
 * apparaît au palier de ce qu'elle explique. Un test vérifie que tout ce qui s'ouvre à l'écran
 * a sa fiche.
 */
import { z } from "zod";
import { UI_ELEMENT_IDS } from "./ids";
import type { UiElementId } from "./ids";

/** Où la fiche emmène le joueur quand il touche « Montrer ». */
export const GUIDE_TARGETS = [
  "cell",
  "map",
  "rivals",
  "research:cell",
  "research:troops",
  "research:genes",
  "research:companion",
  "nucleus",
  "nursery",
  "receptor",
  "wall",
  "quests",
  "ranking",
  "contest",
  "calendar",
  "events",
  "alliance",
  "gazette",
  "journal",
  "species",
  "crisis",
  "apex",
  "museum",
] as const;
export type GuideTarget = (typeof GUIDE_TARGETS)[number];

export interface GuideStep {
  /** Ses textes : `guide.<id>.title` et `guide.<id>.text`. */
  readonly id: string;
  /** Ce qu'elle explique, dans la table de déblocage : elle apparaît avec. */
  readonly ui: readonly UiElementId[];
  readonly go: GuideTarget | null;
}

/** Les éléments qui n'ont pas besoin de fiche : la cellule et l'ATP sont là dès le départ. */
export const GUIDE_SKIPPED: readonly UiElementId[] = ["cell", "sugarCounter"];

const GuideStepSchema = z.object({
  id: z.string().regex(/^[a-z][A-Za-z0-9]*$/),
  ui: z.array(z.enum(UI_ELEMENT_IDS)),
  go: z.enum(GUIDE_TARGETS).nullable(),
});

export const GUIDE_STEPS: readonly GuideStep[] = z.array(GuideStepSchema).parse([
  { id: "build", ui: ["buildSlots", "constructionTimer"], go: "cell" },
  { id: "production", ui: ["productionRate"], go: null },
  { id: "upgrade", ui: ["upgradeButton"], go: "nucleus" },
  { id: "bricks", ui: ["bricksCounter"], go: null },
  { id: "mutations", ui: ["mutationChoice", "creatureTraits"], go: null },
  { id: "map", ui: ["map"], go: "map" },
  { id: "energy", ui: ["energy"], go: null },
  { id: "troops", ui: ["troops"], go: "nursery" },
  { id: "hunt", ui: ["hunt"], go: "map" },
  { id: "quests", ui: ["dailyQuests"], go: "quests" },
  { id: "chests", ui: ["chests"], go: null },
  { id: "autoHarvest", ui: ["autoHarvest"], go: "map" },
  { id: "buildQueue", ui: ["buildQueue"], go: "cell" },
  { id: "rivals", ui: ["rivals", "raid"], go: "rivals" },
  { id: "spy", ui: ["spy"], go: "receptor" },
  { id: "defense", ui: ["defense"], go: "wall" },
  { id: "protections", ui: ["protections"], go: "rivals" },
  { id: "reports", ui: [], go: "journal" },
  { id: "ocean", ui: ["worldMap"], go: "map" },
  { id: "deposits", ui: ["deposits"], go: "map" },
  { id: "migration", ui: ["migration"], go: "map" },
  { id: "calendar", ui: ["calendar"], go: "calendar" },
  { id: "power", ui: ["power"], go: null },
  { id: "ranking", ui: ["ranking", "leagues"], go: "ranking" },
  { id: "contest", ui: ["contest"], go: "contest" },
  { id: "predators", ui: ["predators"], go: "map" },
  { id: "evolutions", ui: ["evolutions"], go: "research:cell" },
  { id: "genome", ui: ["genome"], go: "research:genes" },
  { id: "rank2", ui: ["rank2Troops"], go: "nursery" },
  { id: "companion", ui: ["companion"], go: "research:companion" },
  { id: "militaryResearch", ui: ["militaryResearch"], go: "research:troops" },
  { id: "events", ui: ["zoneEvents"], go: "events" },
  { id: "alliances", ui: ["alliances"], go: "alliance" },
  { id: "gazette", ui: ["gazette"], go: "gazette" },
  { id: "higherRanks", ui: ["higherRanks"], go: "nursery" },
  { id: "species", ui: ["speciesSheet"], go: "species" },
  { id: "crisis", ui: ["crisis"], go: "crisis" },
  { id: "apex", ui: ["apexRace"], go: "apex" },
  { id: "museum", ui: ["museum"], go: "museum" },
]);

/** Les fiches qui n’expliquent aucun élément de la table : le palier où elles apparaissent. */
export const GUIDE_STEP_TIERS: Readonly<Record<string, number>> = { reports: 5 };
