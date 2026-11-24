import { LEXICON } from "@o27/data";
import type { TextKey } from "@o27/data";
import { isScience, translate } from "../game/text";
import type { Lang } from "../game/text";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly lang: Lang;
  readonly onClose: () => void;
  /** Le joueur choisit : vrais termes de la biologie, ou mots simples. */
  readonly onChoose: (science: boolean) => void;
}

/** Les mots du jeu : chaque vrai terme, son mot simple, ce qu'il veut dire. Et le choix. */
export function LexiconSheet({ lang, onClose, onChoose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const science = isScience();
  return (
    <SheetFrame
      title={t("lexicon.title")}
      testId="lexicon-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("lexicon.intro")}</p>
      <div className="rank-tabs" role="radiogroup">
        {([true, false] as const).map((value) => (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={science === value}
            className={`rank-tab${science === value ? " is-on" : ""}`}
            data-testid={value ? "terms-science" : "terms-simple"}
            onClick={() => {
              onChoose(value);
            }}
          >
            {t(value ? "lexicon.science" : "lexicon.simple")}
          </button>
        ))}
      </div>
      <dl className="lexicon" data-testid="lexicon-list">
        {LEXICON.map(([word, meaning]) => (
          <div key={word} className="lexicon-row">
            <dt>
              <strong>{translate(lang, word, true)}</strong>
              <span className="lexicon-simple"> · {translate(lang, word, false)}</span>
            </dt>
            <dd>{t(meaning)}</dd>
          </div>
        ))}
      </dl>
    </SheetFrame>
  );
}
