import type { TextKey } from "@o27/data";
import { translate } from "../game/text";
import type { Lang } from "../game/text";

interface Props {
  readonly lang: Lang;
  /** Le joueur a touché « Naître » : la page se lève, la cellule apparaît. */
  readonly onStart: () => void;
}

/**
 * Le premier écran d'une partie neuve : la page de titre de l'atlas. Elle dit la promesse du
 * jeu en une phrase et n'offre qu'un geste. C'est la première impression : rien d'autre à lire,
 * rien d'autre à toucher. Un joueur qui a déjà joué ne la revoit pas.
 */
export function TitlePage({ lang, onStart }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  return (
    <div className="opening" data-testid="opening">
      <p className="opening-head" aria-hidden="true">
        <span>Origins · XXVII</span>
        <span>Pl. I</span>
      </p>
      <img className="opening-cell" src="/planches/cellule.svg" alt="" width="640" height="640" />
      <h1 className="opening-title">
        <span>Origins</span>
        <span>XXVII</span>
      </h1>
      <p className="opening-text">{t("opening.text")}</p>
      <button type="button" className="button" data-testid="opening-start" onClick={onStart}>
        {t("opening.start")}
      </button>
      <p className="opening-note">{t("opening.note")}</p>
    </div>
  );
}
