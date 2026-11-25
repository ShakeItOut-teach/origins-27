import { drillMaxLevel, maxLevelOf, seasonDraw } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, DRILL_IDS, EVOLUTION_IDS, ORGANELLE_IDS } from "@o27/data";
import type { OrganelleId, TextKey } from "@o27/data";
import type { ResearchPart } from "../game/research";
import { translate } from "../game/text";
import type { Lang } from "../game/text";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  /** Les évolutions du Noyau et la recherche militaire n'existent qu'à leur palier. */
  readonly showEvolutions: boolean;
  readonly showDrills: boolean;
  readonly onClose: () => void;
  /** Ouvre la fiche d'un organite. */
  readonly onOpen: (id: OrganelleId) => void;
  /** Ouvre l'onglet Recherche à la bonne rubrique. */
  readonly onResearch: (part: ResearchPart) => void;
}

/** Les organites que le palier du joueur a ouverts. */
export function openOrganelles(state: PlayerState): OrganelleId[] {
  return ORGANELLE_IDS.filter((id) => BALANCE.organelles[id].tier <= state.tier);
}

/** Vrai quand tous les organites ouverts ont atteint leur niveau d'origine le plus haut. */
export function ordinaryPathDone(state: PlayerState): boolean {
  const open = openOrganelles(state);
  return (
    open.length >= 3 && open.every((id) => state.organelles[id] >= BALANCE.organelles[id].maxLevel)
  );
}

/**
 * Pour les plus assidus : le chemin ordinaire s'arrête au niveau 5, mais rien ne les bloque.
 * La fenêtre montre ce qui reste à conquérir, et emmène tout droit à la bonne fiche.
 */
export function AdvancedSheet({
  state,
  lang,
  showEvolutions,
  showDrills,
  onClose,
  onOpen,
  onResearch,
}: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const name = (id: OrganelleId): string => t(`organelle.${id}.name`);
  const open = openOrganelles(state);
  const beyond = open.filter((id) => state.organelles[id] > BALANCE.organelles[id].maxLevel);
  const top = maxLevelOf(state, "vacuole");
  // Les évolutions que la saison a endormies ne comptent pas.
  const awake = EVOLUTION_IDS.filter((id) => !seasonDraw(state.worldSeed).dormant.includes(id));
  const deepEvolutions = awake.filter((id) => state.evolutions[id] > 5).length;
  const topDrills = DRILL_IDS.filter((id) => state.drills[id] >= drillMaxLevel()).length;

  const go = (id: OrganelleId, label: string) => (
    <button
      type="button"
      className="link-button"
      data-testid={`advanced-open-${id}`}
      onClick={() => {
        onOpen(id);
      }}
    >
      {label.replace("{o}", name(id))} →
    </button>
  );

  const research = (part: ResearchPart) => (
    <button
      type="button"
      className="link-button"
      data-testid={`advanced-research-${part}`}
      onClick={() => {
        onResearch(part);
      }}
    >
      {t("advanced.open").replace("{o}", t(`research.title.${part}`))} →
    </button>
  );

  return (
    <SheetFrame
      title={t("advanced.title")}
      testId="advanced-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("advanced.intro")}</p>
      <section className="advanced-part" data-testid="advanced-levels">
        <h3>{t("advanced.levels.title")}</h3>
        <p>
          {t("advanced.levels.text")
            .replace("{n}", String(top))
            .replace("{o}", name("vacuole").toLowerCase())}
        </p>
        <p className="sheet-level">
          {t("advanced.count")
            .replace("{n}", String(beyond.length))
            .replace("{m}", String(open.length))}
        </p>
        {go("vacuole", t("advanced.open"))}
      </section>
      {showEvolutions && (
        <section className="advanced-part" data-testid="advanced-evolutions">
          <h3>{t("advanced.evolutions.title")}</h3>
          <p>
            {t("advanced.evolutions.text")
              .replace("{n}", String(BALANCE.research.maxLevel))
              .replace("{o}", name("nucleus"))}
          </p>
          <p className="sheet-level">
            {t("advanced.count")
              .replace("{n}", String(deepEvolutions))
              .replace("{m}", String(awake.length))}
          </p>
          {research("cell")}
        </section>
      )}
      {showDrills && (
        <section className="advanced-part" data-testid="advanced-drills">
          <h3>{t("advanced.drills.title")}</h3>
          <p>{t("advanced.drills.text").replace("{n}", String(drillMaxLevel()))}</p>
          <p className="sheet-level">
            {t("advanced.drills.count")
              .replace("{n}", String(topDrills))
              .replace("{m}", String(DRILL_IDS.length))}
          </p>
          {research("troops")}
        </section>
      )}
    </SheetFrame>
  );
}
