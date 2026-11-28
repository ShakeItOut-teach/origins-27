import type { GuideStep, GuideTarget, TextKey } from "@o27/data";
import { guideSteps, guideText } from "../game/guide";
import { SheetFrame } from "./SheetFrame";

type Translate = (key: TextKey) => string;

function title(t: Translate, step: GuideStep): string {
  return t(`guide.${step.id}.title` as TextKey);
}

function body(t: Translate, step: GuideStep): string {
  return guideText(t(`guide.${step.id}.text` as TextKey), t);
}

/**
 * La fiche d'une nouveauté, qui s'ouvre d'elle-même quand elle apparaît : ce que c'est, à quoi
 * ça sert, et un bouton qui y emmène. Les fiches d'un même palier se suivent.
 */
export function GuideCard(props: {
  readonly t: Translate;
  readonly step: GuideStep;
  readonly count: number;
  readonly onShow: (target: GuideTarget) => void;
  readonly onNext: () => void;
  readonly onSkip: () => void;
}) {
  const { t, step, count } = props;
  const last = count <= 1;
  return (
    <div className="veil" role="dialog" aria-modal="true">
      <div className="note guide-card" data-testid="guide-card" data-step={step.id}>
        <p className="guide-kicker">
          {t("guide.new")}
          {count > 1 && (
            <span>
              {" · "}
              {t("guide.count").replace("{n}", String(count))}
            </span>
          )}
        </p>
        <h2>{title(t, step)}</h2>
        <p>{body(t, step)}</p>
        <div className="guide-actions">
          {step.go !== null && (
            <button
              type="button"
              className="button"
              data-testid="guide-show"
              onClick={() => {
                if (step.go !== null) props.onShow(step.go);
              }}
            >
              {t("guide.show")}
            </button>
          )}
          <button
            type="button"
            className={step.go === null ? "button" : "button button-quiet"}
            data-testid="guide-next"
            onClick={props.onNext}
          >
            {last ? t("guide.done") : t("guide.next")}
          </button>
        </div>
        {!last && (
          <button
            type="button"
            className="link-button guide-skip"
            data-testid="guide-skip"
            onClick={props.onSkip}
          >
            {t("guide.skip")}
          </button>
        )}
      </div>
    </div>
  );
}

/** « Le guide » : toutes les fiches déjà apparues, à relire quand on veut. */
export function GuideSheet(props: {
  readonly t: Translate;
  readonly tier: number;
  readonly onShow: (target: GuideTarget) => void;
  readonly onClose: () => void;
}) {
  const { t } = props;
  return (
    <SheetFrame
      title={t("guide.title")}
      testId="guide-sheet"
      closeLabel={t("action.close")}
      onClose={props.onClose}
    >
      <p className="sheet-role">{t("guide.text")}</p>
      <ol className="guide-list">
        {guideSteps(props.tier).map((step) => (
          <li key={step.id} data-testid="guide-entry">
            <h3>{title(t, step)}</h3>
            <p>{body(t, step)}</p>
            {step.go !== null && (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  if (step.go !== null) props.onShow(step.go);
                }}
              >
                {t("guide.show")} →
              </button>
            )}
          </li>
        ))}
      </ol>
    </SheetFrame>
  );
}
