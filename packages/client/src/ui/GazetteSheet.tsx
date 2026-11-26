import { MICRO, gazette } from "@o27/core";
import type { Gazette, GazetteNews, PlayerState, RankRow } from "@o27/core";
import { FOSSIL_AGES, GENE_FAMILIES, SEASON_DAYS } from "@o27/data";
import type { TextKey } from "@o27/data";
import { useState } from "react";
import { DISCORD_URL } from "../game/config";
import { formatAmount, translate } from "../game/text";
import { isVisible } from "../game/unlock";
import type { Lang } from "../game/text";
import { bannerLabel } from "./AllianceSheet";
import { SheetFrame } from "./SheetFrame";

/** Une nouvelle, en une phrase. */
function newsText(lang: Lang, news: GazetteNews): string {
  const zone = (index: number): string => translate(lang, `zone.${String(index)}.name` as TextKey);
  switch (news.kind) {
    case "zoneOpens":
      return translate(lang, "news.zoneOpens").replace("{zone}", zone(news.zone));
    case "event":
      return translate(lang, `news.event.${news.event}`).replace("{zone}", zone(news.zone));
    case "lastDays":
      return translate(lang, "news.lastDays").replace("{n}", String(news.days));
    case "leader":
      return news.me
        ? translate(lang, "news.leaderMe")
        : translate(lang, "news.leader").replace("{name}", news.name);
    case "allianceLeads":
      return translate(lang, "news.allianceLeads").replace(
        "{name}",
        bannerLabel(lang, news.banner),
      );
  }
}

/** « Prédation 40 % · Mobilité 30 % · … », de la plus répandue à la plus rare. */
function familiesText(lang: Lang, shares: NonNullable<Gazette["families"]>): string {
  return [...GENE_FAMILIES]
    .sort((one, other) => shares[other] - shares[one])
    .map((family) => `${translate(lang, `family.${family}.name`)} ${String(shares[family])} %`)
    .join(" · ");
}

function rowName(lang: Lang, row: RankRow): string {
  return row.me ? translate(lang, "gazette.you") : row.name;
}

/** La Gazette en quelques lignes de texte, à coller sur Discord. */
export function gazetteText(lang: Lang, paper: Gazette): string {
  const t = (key: TextKey): string => translate(lang, key);
  const lines = [
    `**${t("gazette.kicker")
      .replace("{day}", String(Math.min(paper.day, SEASON_DAYS)))
      .replace("{total}", String(SEASON_DAYS))}**`,
    `> ${paper.headline === null ? t("gazette.calm") : newsText(lang, paper.headline)}`,
    `${t("gazette.top")} : ${paper.top.map((row, index) => `${String(index + 1)}. ${rowName(lang, row)}`).join(" · ")}`,
  ];
  if (paper.leading !== null) {
    lines.push(`${t("gazette.leading")} : ${bannerLabel(lang, paper.leading.banner)}`);
  }
  if (paper.families !== null) {
    lines.push(`${t("gazette.families")} : ${familiesText(lang, paper.families)}`);
  }
  lines.push(
    `${t("gazette.fossil")} : ${t(`fossil.${paper.fossil}.name`)} (${t("gazette.ago").replace("{n}", String(FOSSIL_AGES[paper.fossil]))}). ${t(`fossil.${paper.fossil}.fact`)}`,
    `${t("gazette.myRank")} : ${String(paper.rank)} · ${t(`league.${String(paper.league)}.name` as TextKey)}`,
  );
  return lines.join("\n");
}

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
}

/** La Gazette de l'océan : la nouvelle du jour, les plus forts, la journée du joueur, un fossile. */
export function GazetteSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const paper = gazette(state);
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    const text = gazetteText(lang, paper);
    // Le presse-papiers n'existe pas partout (vieux navigateurs, pages non sécurisées).
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (clipboard === undefined) return;
    void clipboard.writeText(text).then(
      () => {
        setCopied(true);
      },
      () => {
        setCopied(false);
      },
    );
  };
  return (
    <SheetFrame
      title={t("label.gazette")}
      testId="gazette-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="gazette-kicker" data-testid="gazette-day">
        {t("gazette.kicker")
          .replace("{day}", String(Math.min(paper.day, SEASON_DAYS)))
          .replace("{total}", String(SEASON_DAYS))}
      </p>
      <p className="gazette-headline" data-testid="gazette-headline">
        {paper.headline === null ? t("gazette.calm") : newsText(lang, paper.headline)}
      </p>
      <p className="sheet-role" data-testid="gazette-left">
        {paper.daysLeft > 0
          ? t("gazette.daysLeft").replace("{n}", String(paper.daysLeft))
          : t("gazette.over")}
      </p>

      <div className="gazette-columns">
        <section>
          <h3>{t("gazette.top")}</h3>
          <ol className="gazette-top" data-testid="gazette-top">
            {paper.top.map((row) => (
              <li key={row.rank} className={row.me ? "is-me" : undefined}>
                <span>{rowName(lang, row)}</span>
                <small>{row.score}</small>
              </li>
            ))}
          </ol>
        </section>
        <section>
          {paper.leading !== null && (
            <>
              <h3>{t("gazette.leading")}</h3>
              <p data-testid="gazette-alliance">
                <strong>{bannerLabel(lang, paper.leading.banner)}</strong>
                <small>
                  {" "}
                  {paper.leading.members} {t("label.members")}
                </small>
              </p>
            </>
          )}
          {paper.raider !== null && (
            <>
              <h3>{t("gazette.raider")}</h3>
              <p data-testid="gazette-raider">
                <strong>{rowName(lang, paper.raider)}</strong>
                <small>
                  {" "}
                  {formatAmount(paper.raider.score * MICRO, lang)} {t("gazette.looted")}
                </small>
              </p>
            </>
          )}
        </section>
      </div>

      <h3 className="sheet-title">{t("gazette.yourDay")}</h3>
      <p className="sheet-level" data-testid="gazette-mine">
        {t("gazette.rank")} <strong>{paper.rank}</strong> ·{" "}
        {t(`league.${String(paper.league)}.name` as TextKey)} · {paper.wins} {t("gazette.wins")},{" "}
        {paper.losses} {t("gazette.losses")}
      </p>

      {paper.briefs.length > 0 && (
        <>
          <h3 className="sheet-title">{t("gazette.briefs")}</h3>
          <ul className="gazette-briefs" data-testid="gazette-briefs">
            {paper.briefs.map((news, index) => (
              <li key={`${news.kind}-${String(index)}`}>{newsText(lang, news)}</li>
            ))}
          </ul>
        </>
      )}

      {paper.families !== null && isVisible("genome", state.tier) && (
        <>
          <h3 className="sheet-title">{t("gazette.families")}</h3>
          <p className="sheet-role" data-testid="gazette-families">
            {familiesText(lang, paper.families)}
          </p>
        </>
      )}

      <aside className="fossil" data-testid="gazette-fossil" data-fossil={paper.fossil}>
        <p className="gazette-kicker">{t("gazette.fossil")}</p>
        <p>
          <strong>{t(`fossil.${paper.fossil}.name`)}</strong>
          <small> · {t("gazette.ago").replace("{n}", String(FOSSIL_AGES[paper.fossil]))}</small>
        </p>
        <p>{t(`fossil.${paper.fossil}.fact`)}</p>
      </aside>

      <div className="alliance-acts">
        <button
          type="button"
          className="button button-small"
          data-testid="gazette-copy"
          onClick={copy}
        >
          {copied ? t("gazette.copied") : t("gazette.copy")}
        </button>
        <a
          className="button button-small button-quiet"
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="gazette-discord"
        >
          {t("gazette.discord")}
        </a>
      </div>
    </SheetFrame>
  );
}
