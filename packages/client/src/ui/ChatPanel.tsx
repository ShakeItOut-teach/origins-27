/**
 * La discussion d'alliance : du texte libre entre espèces humaines du banc. Le serveur filtre
 * les grossièretés et les liens, limite le rythme, garde les messages une semaine et masque un
 * message signalé par plusieurs membres. L'écran lit toutes les quinze secondes quand il est ouvert.
 */
import { BALANCE } from "@o27/data";
import type { TextKey } from "@o27/data";
import { useEffect, useState } from "react";
import type { ChatLine, ChatResult, Community } from "../game/community";
import { formatAway, translate } from "../game/text";
import type { Lang } from "../game/text";

const REFRESH_MS = 15_000;
const MAX = BALANCE.alliance.chat.maxLength;

interface Props {
  readonly lang: Lang;
  readonly community: Community | null;
  readonly now: number;
}

export function ChatPanel({ lang, community, now }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [lines, setLines] = useState<readonly ChatLine[] | null>(null);
  const [status, setStatus] = useState<ChatResult["status"] | "loading">("loading");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const take = (result: ChatResult): void => {
    setStatus(result.status);
    if (result.status === "done" || result.status === "closed") setLines(result.messages);
  };

  useEffect(() => {
    if (community === null) return;
    let live = true;
    const read = (): void => {
      void community.chat({}).then((result) => {
        if (live) take(result);
      });
    };
    read();
    const timer = setInterval(read, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [community]);

  if (community === null) {
    return (
      <section className="chat" data-testid="chat">
        <h3 className="sheet-title">{t("chat.title")}</h3>
        <p className="account-note">{t("chat.offline")}</p>
      </section>
    );
  }

  const send = (): void => {
    const text = draft.trim();
    if (text === "" || sending) return;
    setSending(true);
    void community.chat({ texte: text }).then((result) => {
      setSending(false);
      take(result);
      if (result.status === "done") setDraft("");
    });
  };

  const notice =
    status === "tooMany"
      ? t("chat.tooMany")
      : status === "invalid"
        ? t("chat.invalid").replace("{n}", String(MAX))
        : status === "failed"
          ? t("chat.failed")
          : null;

  return (
    <section className="chat" data-testid="chat">
      <h3 className="sheet-title">{t("chat.title")}</h3>
      <p className="account-note">{t("chat.text")}</p>
      {status === "closed" ? (
        <p className="sheet-building" data-testid="chat-closed">
          {t("chat.closed")}
        </p>
      ) : (
        <>
          {lines !== null && lines.length === 0 && (
            <p className="sheet-building">{t("chat.empty")}</p>
          )}
          <ol className="chat-list" data-testid="chat-list" aria-live="polite">
            {(lines ?? []).map((line) => (
              <li
                key={line.id}
                className={`chat-line${line.mine ? " is-mine" : ""}`}
                data-testid="chat-line"
              >
                <div className="chat-head">
                  <strong>{line.mine ? t("chat.you") : line.name}</strong>
                  <span>{t("reports.ago").replace("{t}", formatAway(now - line.at, lang))}</span>
                </div>
                <p className="chat-text">{line.text}</p>
                {!line.mine &&
                  (line.reported ? (
                    <small className="chat-count">{t("chat.reported")}</small>
                  ) : (
                    <button
                      type="button"
                      className="link-button"
                      data-testid="chat-report"
                      onClick={() => {
                        void community.chat({ signaler: line.id }).then(take);
                      }}
                    >
                      {t("chat.report")}
                    </button>
                  ))}
              </li>
            ))}
          </ol>
          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <textarea
              value={draft}
              maxLength={MAX}
              rows={2}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
              data-testid="chat-input"
              onChange={(event) => {
                setDraft(event.target.value);
              }}
            />
            <button
              type="submit"
              className="button button-small"
              disabled={draft.trim() === "" || sending}
              data-testid="chat-send"
            >
              {t("chat.send")}
            </button>
          </form>
          <p className="chat-count">
            {draft.length} / {MAX}
          </p>
          {notice !== null && (
            <p className="sheet-building is-warning" data-testid="chat-notice">
              {notice}
            </p>
          )}
        </>
      )}
    </section>
  );
}
