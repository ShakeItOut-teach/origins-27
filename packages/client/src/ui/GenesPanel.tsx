import { familyGenes, hasLineage, mutationPool, nextMutationPrice } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, GENE_FAMILIES, MUTATION_IDS, TROOP_IDS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { formatAmount, translate } from "../game/text";
import type { Lang } from "../game/text";
import { MissingHint } from "./MissingHint";
import { ResourceIcon, TroopIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  /** Les familles de gènes ne se montrent qu'à leur palier. */
  readonly families: boolean;
  readonly onOrder: (order: Order) => void;
}

/**
 * Les gènes : de quoi muter, puis ce que l'on porte déjà. Avant le palier des familles, une
 * simple liste ; ensuite les quatre familles, la cellule fille de rang 2 que deux gènes
 * ouvrent, et la lignée que trois gènes ouvrent.
 */
export function GenesPanel({ state, lang, families, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const total = BALANCE.genes.lineageGenes;
  const price = nextMutationPrice(state);
  const left = mutationPool(state).length;
  const poor = state.resources.proteins < price;

  return (
    <div className="genes" data-testid="genes">
      <p className="sheet-role">
        {families ? t("research.genes.families") : t("research.genes.text")}
      </p>
      {left === 0 ? (
        <p className="sheet-note" data-testid="genes-all">
          {t("research.genes.all")}
        </p>
      ) : (
        state.mutationOffer === null && (
          <div className="genes-buy">
            <MissingHint
              state={state}
              cost={{ sugar: 0, bricks: 0, proteins: price }}
              lang={lang}
            />
            <button
              type="button"
              className="mutate"
              disabled={poor}
              data-testid="mutate"
              onClick={() => {
                onOrder({ type: "buyMutation" });
              }}
            >
              {t("action.mutate")} · <ResourceIcon id="proteins" />
              {formatAmount(price, lang)}
            </button>
          </div>
        )
      )}
      {!families && state.mutations.length === 0 && (
        <p className="sheet-note">{t("research.genes.none")}</p>
      )}
      {!families && state.mutations.length > 0 && (
        <ul className="gene-list" data-testid="gene-list">
          {state.mutations.map((id) => (
            <li key={id}>
              <strong>{t(`mutation.${id}.name`)}</strong>
              <span>{t(`mutation.${id}.effect`)}</span>
            </li>
          ))}
        </ul>
      )}
      {families &&
        GENE_FAMILIES.map((family) => {
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
    </div>
  );
}
