import { familyGenes, hasLineage } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, GENE_FAMILIES, MUTATION_IDS, TROOP_IDS } from "@o27/data";
import type { TextKey } from "@o27/data";
import { translate } from "../game/text";
import type { Lang } from "../game/text";
import { TroopIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
}

/**
 * Le génome : les quatre familles de gènes, ceux que le joueur possède, la cellule fille de
 * rang 2 que deux gènes ouvrent, et la lignée que trois gènes ouvrent.
 */
export function GenomeSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const total = BALANCE.genes.lineageGenes;
  return (
    <SheetFrame
      title={t("label.genome")}
      testId="genome-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("unlock.8.text")}</p>
      {GENE_FAMILIES.map((family) => {
        const owned = familyGenes(state, family);
        const lineage = hasLineage(state, family);
        const troop = TROOP_IDS.find((id) => BALANCE.troops[id].family === family);
        const unlocked = troop !== undefined && owned >= BALANCE.troops[troop].genes;
        return (
          <section
            key={family}
            className={`family${lineage ? " is-lineage" : ""}`}
            data-testid={`family-${family}`}
            data-genes={owned}
          >
            <h3>
              {t(`family.${family}.name`)}
              <span className="family-count">
                {owned} / {total} {t("label.genes")}
              </span>
            </h3>
            <ul className="family-genes">
              {MUTATION_IDS.filter((id) => BALANCE.mutations[id].family === family).map((id) => (
                <li key={id} className={state.mutations.includes(id) ? "is-owned" : ""}>
                  {t(`mutation.${id}.name`)}
                </li>
              ))}
            </ul>
            {troop !== undefined && (
              <p className={`family-line${unlocked ? " is-on" : ""}`}>
                <TroopIcon id={troop} />
                <span>
                  {t("label.opensTroop")} : <strong>{t(`troop.${troop}.name`)}</strong>.{" "}
                  {t(`troop.${troop}.role` as TextKey)}
                </span>
              </p>
            )}
            <p className={`family-line${lineage ? " is-on" : ""}`}>
              <span>
                {lineage ? t("label.lineageOpen") : t("label.lineage")} :{" "}
                {t(`lineage.${family}.text`)}
              </span>
            </p>
          </section>
        );
      })}
    </SheetFrame>
  );
}
