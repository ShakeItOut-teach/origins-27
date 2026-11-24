import type { ReactNode } from "react";

/** Le cadre d'une fiche qui monte du bas de l'écran : un titre, une croix, un contenu. */
export function SheetFrame(props: {
  readonly title: string;
  readonly testId: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="veil veil-bottom" onClick={props.onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        data-testid={props.testId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>{props.title}</h2>
          </div>
          <button
            type="button"
            className="close"
            aria-label={props.closeLabel}
            onClick={props.onClose}
          >
            ×
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
