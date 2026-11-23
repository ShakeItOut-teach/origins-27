import type { TextKey } from "@o27/data";
import { useEffect, useState } from "react";
import type { Account, LinkResult } from "../game/api";
import { translate } from "../game/text";
import type { Lang } from "../game/text";

interface Props {
  readonly account: Account;
  readonly lang: Lang;
  readonly onClose: () => void;
}

const RESULT_TEXT: Readonly<Record<LinkResult, TextKey>> = {
  sent: "account.sent",
  invalid: "account.invalid",
  tooMany: "account.tooMany",
  failed: "account.failed",
};

/** Fiche « retrouver ma partie » : une adresse, un bouton, un lien reçu par e-mail. */
export function AccountSheet({ account, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [linked, setLinked] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);

  useEffect(() => {
    let alive = true;
    account.whoAmI().then(
      (found) => {
        if (alive) setLinked(found);
      },
      () => {
        if (alive) setLinked(null);
      },
    );
    return () => {
      alive = false;
    };
  }, [account]);

  const submit = (): void => {
    setBusy(true);
    setResult(null);
    account.linkEmail(email.trim(), window.location.origin).then(
      (outcome) => {
        setBusy(false);
        setResult(outcome);
      },
      () => {
        setBusy(false);
        setResult("failed");
      },
    );
  };

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        data-testid="account"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>{t("account.title")}</h2>
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>

        {typeof linked === "string" && (
          <p className="sheet-role" data-testid="account-linked">
            {t("account.linked")} <strong>{linked}</strong>
          </p>
        )}

        {linked === null && result === "sent" && (
          <p className="sheet-role" data-testid="account-result">
            {t("account.sent")}
          </p>
        )}

        {linked === null && result !== "sent" && (
          <form
            className="account-form"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <p className="sheet-role">{t("account.keep")}</p>
            <input
              className="field"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder={t("account.email")}
              aria-label={t("account.email")}
              value={email}
              data-testid="account-email"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
            {result !== null && (
              <p className="account-error" role="alert" data-testid="account-result">
                {t(RESULT_TEXT[result])}
              </p>
            )}
            <button type="submit" className="button" disabled={busy} data-testid="account-send">
              {t("account.send")}
            </button>
            <p className="account-note">{t("account.note")}</p>
          </form>
        )}
      </div>
    </div>
  );
}
