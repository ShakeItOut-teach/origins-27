import { rivalName } from "@o27/core";
import type { Battle, PlayerState, Report } from "@o27/core";
import type { TextKey } from "@o27/data";
import { useState } from "react";
import { formatAmount, formatAway, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";

type Tab = "all" | "fights" | "harvests";
const TABS: readonly Tab[] = ["all", "fights", "harvests"];

/** Le titre d'un rapport : ce qui s'est passé, et avec qui. */
export function reportTitle(lang: Lang, state: PlayerState, report: Report): string {
  const t = (key: TextKey): string => translate(lang, key);
  const outcome = report.won ? "won" : "lost";
  switch (report.kind) {
    case "raid":
    case "defense":
      return t(`reports.${report.kind}.${outcome}`).replace(
        "{name}",
        rivalName(state, report.who) || t("reports.someone"),
      );
    case "hunt":
      // Une chasse contre l'animal d'un événement : c'était le Léviathan.
      return t(
        report.who.startsWith("e:") ? `reports.beast.${outcome}` : `reports.hunt.${outcome}`,
      );
    case "leviathan":
      return t(`reports.leviathan.${outcome}`);
    case "harvest":
      return t("reports.harvest");
    case "famine":
      return t("reports.famine");
  }
}

/** Ce rapport raconte-t-il une perte de réserves plutôt qu'un gain ? */
function isTaken(report: Report): boolean {
  return !report.won && (report.kind === "defense" || report.kind === "leviathan");
}

/** Un rapport qui porte le détail de son combat : il s'ouvre en page entière. */
export type BattleReport = Report & { readonly battle: Battle };

export function hasBattle(report: Report): report is BattleReport {
  return report.battle !== undefined;
}

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
  readonly onOpenBattle: (report: BattleReport) => void;
}

/** Le journal : attaques envoyées et subies, chasses, récoltes, du plus récent au plus ancien. */
export function JournalSheet({ state, lang, onClose, onOpenBattle }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const [tab, setTab] = useState<Tab>("all");
  const shown = state.reports.filter((report) =>
    tab === "all"
      ? true
      : tab === "harvests"
        ? report.kind === "harvest"
        : report.kind !== "harvest",
  );
  return (
    <SheetFrame
      title={t("label.reports")}
      testId="journal-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("reports.text")}</p>
      <div className="rank-tabs" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`rank-tab${tab === id ? " is-on" : ""}`}
            data-testid={`journal-tab-${id}`}
            onClick={() => {
              setTab(id);
            }}
          >
            {t(`reports.${id}`)}
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="sheet-building" data-testid="journal-none">
          {t("reports.none")}
        </p>
      )}
      <ol className="journal" data-testid="journal-list">
        {shown.map((report, index) => {
          const sign = isTaken(report) ? "−" : "+";
          return (
            <li
              key={`${String(report.at)}-${report.kind}-${String(index)}`}
              className={`journal-row is-${report.kind} ${report.won ? "is-won" : "is-lost"}`}
              data-testid="journal-row"
              data-kind={report.kind}
              data-won={report.won}
            >
              <div className="journal-head">
                <strong>{reportTitle(lang, state, report)}</strong>
                <span className="journal-time">
                  {t("reports.ago").replace("{t}", formatAway(state.now - report.at, lang))}
                </span>
              </div>
              <p className="journal-detail">
                {(["sugar", "bricks", "proteins"] as const)
                  .filter((id) => report[id] > 0)
                  .map((id) => (
                    <span key={id}>
                      <ResourceIcon id={id} />
                      {sign}
                      {formatAmount(report[id], lang)}
                    </span>
                  ))}
                {report.troops > 0 && (
                  <span>
                    {report.troops} {t("reports.cells")}
                  </span>
                )}
                {report.lost > 0 && (
                  <span>
                    {formatAmount(report.lost, lang)} {t("reports.overflow")}
                  </span>
                )}
              </p>
              {hasBattle(report) && (
                <button
                  type="button"
                  className="link-button journal-battle"
                  data-testid="journal-battle"
                  onClick={() => {
                    onOpenBattle(report);
                  }}
                >
                  {t("battle.open")} →
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </SheetFrame>
  );
}
