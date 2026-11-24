import { MICRO, contestBoard } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE } from "@o27/data";
import type { TextKey } from "@o27/data";
import { formatAmount, formatCountdown, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
}

/** Un score de concours : le butin se compte en ressources, le reste en points. */
function score(value: number, lang: Lang): string {
  return formatAmount(value * MICRO, lang);
}

/**
 * Le concours de la semaine : ce que l'on mesure, le temps qu'il reste, la place du joueur,
 * les récompenses par rang et les cinquante premiers.
 */
export function ContestSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const board = contestBoard(state);
  const rules = BALANCE.contest;
  let from = 1;
  const bands = rules.rewards.map((band) => {
    const first = from;
    from = band.toRank + 1;
    return { ...band, first };
  });
  return (
    <SheetFrame
      title={t("contest.title")}
      testId="contest-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("contest.text")}</p>
      {board !== null && (
        <>
          <p className="gazette-headline" data-testid="contest-theme">
            {t(`contest.theme.${board.theme}`)}
          </p>
          <p className="sheet-building" data-testid="contest-left">
            {t("label.endsIn")} {formatCountdown(board.endsAt - state.now, lang)}
          </p>
          <p className="sheet-level" data-testid="contest-mine">
            {t("contest.yours")} : <strong>+{score(board.mine.score, lang)}</strong> ·{" "}
            {t("contest.rank").replace("{n}", String(board.mine.rank))}
          </p>
        </>
      )}

      <h3 className="sheet-title">{t("contest.rewards")}</h3>
      <ul className="contest-bands" data-testid="contest-rewards">
        {bands.map((band) => (
          <li
            key={band.toRank}
            className={
              board !== null && board.mine.rank >= band.first && board.mine.rank <= band.toRank
                ? "is-mine"
                : undefined
            }
          >
            <strong>
              {band.first === band.toRank
                ? t("contest.band").replace("{a}", String(band.first))
                : t("contest.bandTo")
                    .replace("{a}", String(band.first))
                    .replace("{b}", String(band.toRank))}
            </strong>
            <span className="contest-loot">
              <span>{t("contest.boosts").replace("{n}", String(band.boosts))}</span>
              {(["sugar", "bricks", "proteins"] as const).map((id) => (
                <span key={id}>
                  <ResourceIcon id={id} />
                  {formatAmount(band[id] * MICRO, lang)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      {board !== null && (
        <>
          <h3 className="sheet-title">{t("contest.top").replace("{n}", String(rules.top))}</h3>
          <ol className="rank-list" data-testid="contest-list">
            {board.rows.map((row) => (
              <li key={row.rank} className={`rank-row${row.me ? " is-me" : ""}`}>
                <span>{row.rank}</span>
                <span className="rank-name">{row.me ? t("gazette.you") : row.name}</span>
                <span className="rank-score">+{score(row.score, lang)}</span>
              </li>
            ))}
            {!board.rows.some((row) => row.me) && (
              <li className="rank-row is-me has-gap" data-testid="contest-me">
                <span>{board.mine.rank}</span>
                <span className="rank-name">{t("gazette.you")}</span>
                <span className="rank-score">+{score(board.mine.score, lang)}</span>
              </li>
            )}
          </ol>
        </>
      )}
    </SheetFrame>
  );
}
