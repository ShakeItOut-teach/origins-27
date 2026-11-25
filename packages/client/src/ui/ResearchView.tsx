import type { PlayerState } from "@o27/core";
import type { Order, OrganelleId, TextKey } from "@o27/data";
import type { ResearchPart } from "../game/research";
import { translate } from "../game/text";
import type { Lang } from "../game/text";
import { CompanionPanel } from "./CompanionPanel";
import { DrillPanel } from "./DrillPanel";
import { EvolutionPanel } from "./EvolutionPanel";
import { GenesPanel } from "./GenesPanel";
import { OrganelleIcon } from "./icons";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  /** Les rubriques ouvertes au palier du joueur : jamais vide. */
  readonly parts: readonly ResearchPart[];
  readonly part: ResearchPart;
  readonly onPart: (part: ResearchPart) => void;
  /** Les familles de gènes ne se montrent qu'à leur palier. */
  readonly families: boolean;
  readonly onOrder: (order: Order) => void;
  readonly onOpenStore: () => void;
  /** Ouvre la fiche d'un organite, sur la cellule. */
  readonly onOpenOrganelle: (id: OrganelleId) => void;
}

/**
 * L'onglet Recherche : tout ce qui fait évoluer l'organisme, au même endroit. Les évolutions
 * de la cellule, la recherche militaire, les gènes et le compagnon : une rubrique à la fois.
 */
export function ResearchView({
  state,
  lang,
  parts,
  part,
  onPart,
  families,
  onOrder,
  onOpenStore,
  onOpenOrganelle,
}: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const nucleus = state.organelles.nucleus;

  return (
    <section className="research" data-testid="research-view">
      {parts.length > 1 && (
        <div className="views parts" role="tablist">
          {parts.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={part === id}
              className={`view${part === id ? " is-on" : ""}`}
              data-testid={`research-part-${id}`}
              onClick={() => {
                onPart(id);
              }}
            >
              {t(`research.part.${id}`)}
            </button>
          ))}
        </div>
      )}
      <div className="research-body" data-testid={`research-${part}`}>
        <h2 className="research-title">{t(`research.title.${part}`)}</h2>
        {part === "cell" && (
          <>
            <button
              type="button"
              className="research-lab"
              data-testid="research-nucleus"
              onClick={() => {
                onOpenOrganelle("nucleus");
              }}
            >
              <OrganelleIcon id="nucleus" />
              <span>
                <strong>{t("organelle.nucleus.name")}</strong>
                {nucleus > 0
                  ? ` · ${t("label.level")} ${String(nucleus)}`
                  : ` · ${t("research.notBuilt")}`}
              </span>
              <span className="research-lab-go">{t("research.open")} →</span>
            </button>
            <p className="sheet-role">
              {nucleus > 0 ? t("research.cell.text") : t("research.cell.needsNucleus")}
            </p>
            <EvolutionPanel state={state} lang={lang} onOrder={onOrder} onOpenStore={onOpenStore} />
          </>
        )}
        {part === "troops" && (
          <DrillPanel state={state} lang={lang} onOrder={onOrder} onOpenStore={onOpenStore} />
        )}
        {part === "genes" && (
          <GenesPanel state={state} lang={lang} families={families} onOrder={onOrder} />
        )}
        {part === "companion" && <CompanionPanel state={state} lang={lang} onOrder={onOrder} />}
      </div>
    </section>
  );
}
