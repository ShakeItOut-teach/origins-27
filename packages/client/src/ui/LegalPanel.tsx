import type { TextKey } from "@o27/data";
import { DISCORD_URL } from "../game/config";
import { translate } from "../game/text";
import type { Lang } from "../game/text";

const PARTS = ["game", "fair", "age", "data", "where", "rights"] as const;

/** Les règles du jeu et ce que nous gardons des joueurs, en mots simples. */
export function LegalPanel({ lang }: { readonly lang: Lang }) {
  const t = (key: TextKey): string => translate(lang, key);
  return (
    <div className="legal" data-testid="legal">
      {PARTS.map((part) => (
        <section key={part}>
          <h3 className="sheet-title">{t(`legal.${part}.title`)}</h3>
          <p>{t(`legal.${part}.text`)}</p>
        </section>
      ))}
      <a className="link-button" href={DISCORD_URL} target="_blank" rel="noreferrer">
        {t("legal.discord")} →
      </a>
    </div>
  );
}
