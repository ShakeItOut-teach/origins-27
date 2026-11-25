import { FEEDBACK_MAX_LENGTH } from "@o27/data";
import type { TextKey } from "@o27/data";
import { useState } from "react";
import type { Community, FeedbackResult } from "../game/community";
import { translate } from "../game/text";
import type { Lang } from "../game/text";

interface Props {
  readonly community: Community;
  readonly lang: Lang;
}

const RATINGS = [1, 2, 3, 4, 5] as const;

const RESULT_TEXT: Readonly<Record<Exclude<FeedbackResult, "done">, TextKey>> = {
  invalid: "feedback.failed",
  tooMany: "feedback.tooMany",
  failed: "feedback.failed",
};

/** Donner son avis : une note sur cinq, quelques mots, ou les deux. */
export function FeedbackPanel({ community, lang }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [rating, setRating] = useState<number | null>(null);
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const empty = rating === null && words.trim() === "";

  const send = (): void => {
    setBusy(true);
    setResult(null);
    void community.sendFeedback({ rating, text: words.trim(), lang }).then((outcome) => {
      setBusy(false);
      setResult(outcome);
    });
  };

  if (result === "done") {
    return (
      <p className="sheet-role" role="status" data-testid="feedback-done">
        {t("feedback.done")}
      </p>
    );
  }

  return (
    <form
      className="account-form"
      data-testid="feedback"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <p className="sheet-role">{t("feedback.text")}</p>
      <div className="stars" role="group" aria-label={t("feedback.rating")}>
        {RATINGS.map((value) => (
          <button
            key={value}
            type="button"
            className={`star${rating !== null && value <= rating ? " is-on" : ""}`}
            aria-label={t("feedback.star").replace("{n}", String(value))}
            aria-pressed={rating === value}
            data-testid={`feedback-star-${String(value)}`}
            onClick={() => {
              setRating(rating === value ? null : value);
            }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="field field-area"
        rows={4}
        maxLength={FEEDBACK_MAX_LENGTH}
        placeholder={t("feedback.placeholder")}
        aria-label={t("feedback.placeholder")}
        value={words}
        data-testid="feedback-text"
        onChange={(event) => {
          setWords(event.target.value);
        }}
      />
      {result !== null && (
        <p className="account-error" role="alert" data-testid="feedback-result">
          {t(RESULT_TEXT[result])}
        </p>
      )}
      <button type="submit" className="button" disabled={busy || empty} data-testid="feedback-send">
        {t("feedback.send")}
      </button>
    </form>
  );
}
