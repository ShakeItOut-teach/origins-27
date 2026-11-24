import type { TextKey } from "@o27/data";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { formatAmount, translate } from "../game/text";
import type { Lang } from "../game/text";
import { EnergyIcon, ResourceIcon } from "./icons";

/** Ce qu'un coffre contient : ressources en millionièmes d'unité, énergie et accélérateurs en unités. */
export interface ChestLoot {
  readonly sugar: number;
  readonly bricks: number;
  readonly proteins: number;
  readonly energy: number;
  readonly boosts: number;
}

/** D'où vient le coffre : sa couleur en dépend. */
export type ChestTone =
  "quest" | "challenge" | "league" | "leviathan" | "contest" | "apex" | "gift";

interface Props {
  readonly lang: Lang;
  readonly title: string;
  readonly tone: ChestTone;
  /** Coffres qui attendent encore (celui-ci compris tant qu'il est fermé). */
  readonly waiting: number;
  /** Le joueur touche le coffre : on envoie l'ordre, et on rend ce qu'il contenait. */
  readonly onOpen: () => ChestLoot | null;
  readonly onNext: () => void;
  readonly onClose: () => void;
}

/**
 * Un coffre à ouvrir : une boîte de naturaliste, fermée. Le joueur la touche, le couvercle se
 * lève, et ce qu'elle contenait en sort. Ce n'est que de l'affichage : le contenu est fixé par
 * le moteur avant l'ouverture.
 */
export function ChestOverlay({ lang, title, tone, waiting, onOpen, onNext, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  // Le titre est figé à l'apparition : après l'ouverture, la liste des coffres a déjà avancé.
  const [shown] = useState({ title, tone });
  const [loot, setLoot] = useState<ChestLoot | null>(null);
  const open = (): void => {
    if (loot !== null) return;
    const found = onOpen();
    if (found === null) onClose();
    else setLoot(found);
  };
  const items: { key: string; node: ReactNode }[] = [];
  if (loot !== null) {
    for (const id of ["sugar", "bricks", "proteins"] as const) {
      if (loot[id] > 0) {
        items.push({
          key: id,
          node: (
            <>
              <ResourceIcon id={id} />+{formatAmount(loot[id], lang)}
            </>
          ),
        });
      }
    }
    if (loot.energy > 0) {
      items.push({
        key: "energy",
        node: (
          <>
            <EnergyIcon />+{loot.energy} {t("chest.energy")}
          </>
        ),
      });
    }
    if (loot.boosts > 0) {
      items.push({
        key: "boosts",
        node: (
          <>
            +{loot.boosts} {t("label.boost")}
          </>
        ),
      });
    }
  }
  return (
    <div className="veil chest-veil" onClick={onClose}>
      <div
        className={`chest-stage is-${shown.tone}${loot !== null ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={shown.title}
        data-testid="chest-overlay"
        data-open={loot !== null}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 className="chest-title">{shown.title}</h2>
        <button
          type="button"
          className="chest-box"
          aria-label={t("action.openChest")}
          disabled={loot !== null}
          data-testid="chest-box"
          onClick={open}
        >
          <svg viewBox="0 0 160 130" aria-hidden="true">
            <g className="chest-rays">
              {[-60, -36, -12, 12, 36, 60].map((angle) => (
                <line
                  key={angle}
                  x1="80"
                  y1="56"
                  x2={80 + Math.sin((angle * Math.PI) / 180) * 64}
                  y2={56 - Math.cos((angle * Math.PI) / 180) * 64}
                />
              ))}
            </g>
            <rect className="chest-inside" x="26" y="52" width="108" height="16" rx="3" />
            <g className="chest-lid">
              <path d="M22 62 L22 46 Q22 28 40 28 L120 28 Q138 28 138 46 L138 62 Z" />
              <rect className="chest-strap" x="44" y="28" width="12" height="34" />
              <rect className="chest-strap" x="104" y="28" width="12" height="34" />
            </g>
            <rect className="chest-body" x="22" y="62" width="116" height="52" rx="6" />
            <rect className="chest-strap" x="44" y="62" width="12" height="52" />
            <rect className="chest-strap" x="104" y="62" width="12" height="52" />
            <rect className="chest-label" x="64" y="82" width="32" height="18" rx="2" />
            <circle className="chest-lock" cx="80" cy="66" r="7" />
          </svg>
        </button>
        {loot === null ? (
          <p className="chest-hint" data-testid="chest-hint">
            {t("chest.tap")}
          </p>
        ) : (
          <>
            <ul className="chest-items" data-testid="chest-items">
              {items.map((item, index) => (
                <li key={item.key} style={{ "--chest-order": index } as CSSProperties}>
                  {item.node}
                </li>
              ))}
            </ul>
            <div className="chest-acts">
              {waiting > 0 && (
                <button type="button" className="button" data-testid="chest-next" onClick={onNext}>
                  {t("action.nextChest").replace("{n}", String(waiting))}
                </button>
              )}
              <button
                type="button"
                className={`button${waiting > 0 ? " button-quiet" : ""}`}
                data-testid="chest-close"
                onClick={onClose}
              >
                {t("action.continue")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
