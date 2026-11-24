import { leagueOf, leagueRewardFor, ranking } from "@o27/core";
import type { PlayerState, RankRow } from "@o27/core";
import { RANKING_IDS, RESOURCE_IDS } from "@o27/data";
import type { RankingId, TextKey } from "@o27/data";
import { useState } from "react";
import { formatAmount, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
}

/** Les premiers, puis les voisins du joueur : il voit toujours qui il peut dépasser. */
function shownRows(rows: readonly RankRow[], mine: RankRow): readonly RankRow[] {
  const keep = new Set<number>([1, 2, 3, 4, 5]);
  for (let rank = mine.rank - 2; rank <= mine.rank + 2; rank++) keep.add(rank);
  return rows.filter((row) => keep.has(row.rank));
}

/** Le classement de l'océan : cinq catégories, la ligue du joueur, ce qu'elle rapporte. */
export function RankingSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [category, setCategory] = useState<RankingId>("power");
  const { rows, mine } = ranking(state, category);
  const power = ranking(state, "power");
  const league = leagueOf(power.mine.rank, power.rows.length);
  const reward = leagueRewardFor(league);
  const shown = shownRows(rows, mine);
  const number = (value: number): string => value.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB");

  return (
    <SheetFrame
      title={t("label.ranking")}
      testId="ranking-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <div className="league" data-testid="league" data-league={league}>
        <span className="league-name">
          {t("label.league")} <strong>{t(`league.${String(league)}.name` as TextKey)}</strong>
        </span>
        <span className="costs">
          <span className="cost">{t("label.leagueReward")}</span>
          {RESOURCE_IDS.map((id) => (
            <span key={id} className="cost cost-gain">
              <ResourceIcon id={id} />+{formatAmount(reward[id], lang)}
            </span>
          ))}
        </span>
      </div>

      <div className="rank-tabs" role="tablist">
        {RANKING_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === category}
            className={`rank-tab${id === category ? " is-on" : ""}`}
            data-testid={`ranking-${id}`}
            onClick={() => {
              setCategory(id);
            }}
          >
            {t(`ranking.${id}`)}
          </button>
        ))}
      </div>
      <p className="sheet-role">{t(`ranking.${category}.text`)}</p>

      <ol className="rank-list" data-testid="ranking-list">
        {shown.map((row, index) => (
          <li
            key={row.rank}
            className={`rank-row${row.me ? " is-me" : ""}${index > 0 && row.rank - (shown[index - 1]?.rank ?? 0) > 1 ? " has-gap" : ""}`}
            data-testid={row.me ? "ranking-me" : undefined}
            data-rank={row.rank}
          >
            <span className="rank-place">{row.rank}</span>
            <span className="rank-name">{row.me ? t("label.you") : row.name}</span>
            <span className="rank-score">{number(row.score)}</span>
          </li>
        ))}
      </ol>
      <p className="sheet-role" data-testid="ranking-mine">
        {t("label.rank").replace("{n}", String(mine.rank)).replace("{total}", String(rows.length))}
      </p>
    </SheetFrame>
  );
}
