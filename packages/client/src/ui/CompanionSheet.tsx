import { companionEffects, companionForm, companionPoints, shareOffer } from "@o27/core";
import type { Companion, PlayerState } from "@o27/core";
import { BALANCE, GENE_FAMILIES } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { formatAmount, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
  readonly onOrder: (order: Order) => void;
}

/** Le nom du compagnon : son espèce, et la forme que ses gènes lui ont donnée. */
export function companionName(lang: Lang, companion: Companion): string {
  const species = translate(lang, `predator.${String(companion.species)}.name` as TextKey);
  const form = companionForm(companion);
  if (form.family === null) return `${species} · ${translate(lang, "companion.young")}`;
  const step = form.stage === 1 ? "1" : form.pure ? "pure" : "2";
  return `${species} ${translate(lang, `companion.form.${form.family}.${step}`)}`;
}

/**
 * Le compagnon : ce qu'il est devenu, ce qu'il apporte, ce qu'il coûte, et les gènes que l'on
 * peut encore lui partager.
 */
export function CompanionSheet({ state, lang, onClose, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const companion = state.companion;
  const rules = BALANCE.companion;

  if (companion === null) {
    return (
      <SheetFrame
        title={t("label.companion")}
        testId="companion-sheet"
        closeLabel={t("action.close")}
        onClose={onClose}
      >
        <p className="sheet-role" data-testid="companion-none">
          {t("state.noCompanion")}
        </p>
        <p className="sheet-role">{t("companion.text")}</p>
      </SheetFrame>
    );
  }

  const points = companionPoints(companion);
  const affinity = rules.species[companion.species]?.affinity;
  return (
    <SheetFrame
      title={companionName(lang, companion)}
      testId="companion-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("companion.text")}</p>
      <p className="sheet-level" data-testid="companion-points">
        {t("label.genesShared")
          .replace("{n}", String(points))
          .replace("{total}", String(rules.adultAt))}
        {affinity !== undefined && (
          <>
            {" "}
            · {t("companion.affinity")} : {t(`family.${affinity}.name`)}
          </>
        )}
      </p>
      <ul className="companion-effects" data-testid="companion-effects">
        {companionEffects(companion).map((effect, index) => (
          <li
            key={`${effect.stat}-${String(index)}`}
            className={effect.weakness ? "is-weakness" : "is-strength"}
          >
            <span>{t(effect.weakness ? "label.weak" : "label.strength")}</span>
            {t(`stat.${effect.stat}` as TextKey)} {effect.percent > 0 ? "+" : "−"}
            {Math.abs(effect.percent)} %
          </li>
        ))}
      </ul>
      {points >= rules.adultAt ? (
        <p className="sheet-building">{t("state.grown")}</p>
      ) : (
        GENE_FAMILIES.map((family) => {
          const offer = shareOffer(state, family);
          const poor = state.resources.proteins < offer.price;
          return (
            <div key={family} className="share-row" data-testid={`share-row-${family}`}>
              <span className="share-family">
                <strong>{t(`family.${family}.name`)}</strong>
                <small>
                  {companion.genes[family]}
                  {offer.blocked === "geneMissing" && ` · ${t("state.shareNeedsGene")}`}
                </small>
              </span>
              <button
                type="button"
                className="button button-small"
                disabled={offer.blocked !== null || poor}
                data-testid={`share-${family}`}
                onClick={() => {
                  onOrder({ type: "shareGene", family });
                }}
              >
                {t("action.shareGene")} · <ResourceIcon id="proteins" />
                {formatAmount(offer.price, lang)}
              </button>
            </div>
          );
        })
      )}
      <button
        type="button"
        className="button button-quiet"
        data-testid="companion-release"
        onClick={() => {
          onOrder({ type: "releaseCompanion" });
        }}
      >
        {t("action.release")}
      </button>
    </SheetFrame>
  );
}
