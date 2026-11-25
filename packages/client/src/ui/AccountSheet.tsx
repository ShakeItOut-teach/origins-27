import type { TextKey } from "@o27/data";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Account, LinkResult } from "../game/api";
import type { Community, GameStats } from "../game/community";
import { translate } from "../game/text";
import type { Lang } from "../game/text";
import type { Installer } from "../game/visit";
import { FeedbackPanel } from "./FeedbackPanel";
import { LegalPanel } from "./LegalPanel";
import { StatsPanel } from "./StatsPanel";

interface Props {
  /** Absent quand le jeu tourne sans serveur : il ne reste alors que l'installation et les règles. */
  readonly account: Account | null;
  readonly community: Community | null;
  readonly installer: Installer;
  readonly lang: Lang;
  readonly onClose: () => void;
  /** Le compte vient d'être supprimé : l'appareil doit tout oublier et repartir de zéro. */
  readonly onDeleted: () => void;
}

const RESULT_TEXT: Readonly<Record<LinkResult, TextKey>> = {
  sent: "account.sent",
  invalid: "account.invalid",
  tooMany: "account.tooMany",
  failed: "account.failed",
};

type Panel = "home" | "feedback" | "legal" | "stats" | "delete";

const PANEL_TITLE: Readonly<Record<Panel, TextKey>> = {
  home: "account.title",
  feedback: "feedback.title",
  legal: "menu.legal",
  stats: "menu.stats",
  delete: "menu.delete",
};

/**
 * La fiche « Ma partie » : retrouver sa partie par e-mail, puis tout ce qui entoure le jeu.
 * Donner son avis, installer le jeu, lire les règles, supprimer son compte ; et pour un
 * gardien, les statistiques. Une chose à la fois : chaque entrée ouvre son propre écran.
 */
export function AccountSheet({ account, community, installer, lang, onClose, onDeleted }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [panel, setPanel] = useState<Panel>("home");
  const [linked, setLinked] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);
  /** Les statistiques : `undefined` tant qu'on ne sait pas, `null` pour un compte ordinaire. */
  const [stats, setStats] = useState<GameStats | null | undefined>(undefined);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const install = useSyncExternalStore(installer.subscribe, installer.mode);

  useEffect(() => {
    if (account === null) return;
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

  // Seul un gardien voit l'entrée des statistiques : on le demande au serveur, une fois.
  useEffect(() => {
    if (community === null) return;
    let alive = true;
    void community.stats().then((found) => {
      if (alive) setStats(found);
    });
    return () => {
      alive = false;
    };
  }, [community]);

  const submit = (): void => {
    if (account === null) return;
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

  const erase = (): void => {
    if (community === null) return;
    setBusy(true);
    setDeleteFailed(false);
    void community.deleteAccount().then((done) => {
      setBusy(false);
      if (done) onDeleted();
      else setDeleteFailed(true);
    });
  };

  const entry = (target: Panel, label: TextKey) => (
    <button
      type="button"
      className="menu-entry"
      data-testid={`menu-${target}`}
      onClick={() => {
        setPanel(target);
      }}
    >
      {t(label)} <span aria-hidden="true">→</span>
    </button>
  );

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet sheet-tall"
        role="dialog"
        aria-modal="true"
        data-testid="account"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>{t(PANEL_TITLE[panel])}</h2>
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>

        {panel !== "home" && (
          <button
            type="button"
            className="link-button menu-back"
            data-testid="menu-back"
            onClick={() => {
              setPanel("home");
            }}
          >
            ← {t("menu.back")}
          </button>
        )}

        {panel === "home" && typeof linked === "string" && (
          <p className="sheet-role" data-testid="account-linked">
            {t("account.linked")} <strong>{linked}</strong>
          </p>
        )}

        {panel === "home" && linked === null && result === "sent" && (
          <p className="sheet-role" data-testid="account-result">
            {t("account.sent")}
          </p>
        )}

        {panel === "home" && linked === null && result !== "sent" && (
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

        {panel === "home" && (
          <nav className="menu" data-testid="menu">
            {community !== null && entry("feedback", "menu.feedback")}
            {install !== "done" && (
              <div className="menu-install" data-testid="menu-install">
                <strong>{t("menu.install")}</strong>
                <span>{t("install.text")}</span>
                {install === "button" && (
                  <button
                    type="button"
                    className="button button-small"
                    data-testid="install-button"
                    onClick={installer.install}
                  >
                    {t("install.button")}
                  </button>
                )}
                {install === "ios" && <span data-testid="install-ios">{t("install.ios")}</span>}
                {install === "menu" && <span data-testid="install-menu">{t("install.menu")}</span>}
              </div>
            )}
            {install === "done" && (
              <p className="account-note" data-testid="install-done">
                {t("install.done")}
              </p>
            )}
            {entry("legal", "menu.legal")}
            {stats !== null && stats !== undefined && entry("stats", "menu.stats")}
            {community !== null && entry("delete", "menu.delete")}
          </nav>
        )}

        {panel === "feedback" && community !== null && (
          <FeedbackPanel community={community} lang={lang} />
        )}
        {panel === "legal" && <LegalPanel lang={lang} />}
        {panel === "stats" && stats !== null && stats !== undefined && (
          <StatsPanel stats={stats} lang={lang} />
        )}
        {panel === "delete" && (
          <div className="menu-delete" data-testid="delete-panel">
            <p className="sheet-role">{t("delete.text")}</p>
            {deleteFailed && (
              <p className="account-error" role="alert" data-testid="delete-failed">
                {t("delete.failed")}
              </p>
            )}
            <button
              type="button"
              className="button"
              data-testid="delete-cancel"
              onClick={() => {
                setPanel("home");
              }}
            >
              {t("delete.cancel")}
            </button>
            <button
              type="button"
              className="button button-quiet"
              disabled={busy}
              data-testid="delete-confirm"
              onClick={erase}
            >
              {t("delete.confirm")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
