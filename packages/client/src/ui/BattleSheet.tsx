import { battleAdvice, rivalName } from "@o27/core";
import type { Battle, BattleLine, BattleSide, PlayerState, Report } from "@o27/core";
import { BALANCE } from "@o27/data";
import type { TextKey } from "@o27/data";
import { formatAmount, formatAway, formatCount, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";
import { reportTitle } from "./JournalSheet";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly report: Report & { readonly battle: Battle };
  readonly onClose: () => void;
}

/** Remplace chaque {clé} d'un texte par sa valeur. */
function fill(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** Le rapport d'un combat, en entier : les deux camps, leurs forces, et la clé de l'issue. */
export function BattleSheet({ state, lang, report, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const n = (value: number): string => formatCount(value, lang);
  const battle = report.battle;
  const advice = battleAdvice(battle);
  const foeName = rivalName(state, report.who) || t("reports.someone");
  const attack = battle.attacker.total;
  const defense = battle.defender.total;
  const attackShare = Math.round((100 * attack) / Math.max(1, attack + defense));
  const raid = battle.mine === "attacker";

  // La clé : la phrase qui dit pourquoi le combat a tourné ainsi.
  const key = fill(
    t(
      raid
        ? advice.won
          ? "battle.key.raidWon"
          : "battle.key.raidLost"
        : advice.won
          ? "battle.key.defenseWon"
          : "battle.key.defenseLost",
    ),
    { a: n(attack), d: n(defense), m: n(advice.margin), p: String(advice.marginPercent) },
  );
  const tips: string[] = [];
  if (!advice.won && advice.troop !== null) {
    tips.push(
      fill(t(raid ? "battle.advice.troops" : "battle.advice.home"), {
        n: n(advice.troopCount),
        troop: t(`troop.${advice.troop}.name`),
      }),
    );
  }
  if (!advice.won && advice.troop === null) tips.push(t("battle.advice.none"));
  if (advice.strikeWouldWin) {
    tips.push(
      fill(t("battle.advice.strike"), { p: String(BALANCE.rivals.raid.strikeAttackPercent) }),
    );
  }

  const sides: readonly { id: "attacker" | "defender"; side: BattleSide }[] = [
    { id: "attacker", side: battle.attacker },
    { id: "defender", side: battle.defender },
  ];
  const taken = !report.won && !raid;

  return (
    <SheetFrame
      title={t("battle.title")}
      testId="battle-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <div className={`battle-verdict ${advice.won ? "is-won" : "is-lost"}`}>
        <strong data-testid="battle-outcome">
          {advice.won ? t("battle.won") : t("battle.lost")}
        </strong>
        <span>{reportTitle(lang, state, report)}</span>
        <span className="journal-time">
          {t("reports.ago").replace("{t}", formatAway(state.now - report.at, lang))}
        </span>
      </div>

      <section className="battle-key" data-testid="battle-key">
        <h3>{t("battle.keyTitle")}</h3>
        <p>{key}</p>
        {tips.map((tip) => (
          <p key={tip} className="battle-tip" data-testid="battle-tip">
            {tip}
          </p>
        ))}
      </section>

      <div className="battle-scale" aria-hidden="true">
        <span className="battle-scale-attack" style={{ width: `${String(attackShare)}%` }} />
      </div>
      <p className="battle-scale-legend" data-testid="battle-share">
        <span>
          {t("battle.attack")} {n(attack)} · {attackShare} %
        </span>
        <span>
          {t("battle.defense")} {n(defense)} · {100 - attackShare} %
        </span>
      </p>

      {sides.map(({ id, side }) => {
        const mine = id === battle.mine;
        return (
          <section
            key={id}
            className={`battle-side${mine ? " is-mine" : ""}`}
            data-testid={`battle-${id}`}
          >
            <h3>
              <span>
                {t(id === "attacker" ? "battle.attack" : "battle.defense")} ·{" "}
                {mine ? t("battle.you") : foeName}
              </span>
              <span className="battle-total">{n(side.total)}</span>
            </h3>
            {side.troops.length > 0 && (
              <table className="battle-table">
                <thead>
                  <tr>
                    <th>{t("battle.col.troop")}</th>
                    <th>{t("battle.col.count")}</th>
                    <th>{t(id === "attacker" ? "battle.col.attack" : "battle.col.defense")}</th>
                    <th>{t("battle.col.share")}</th>
                    <th>{t("battle.col.lost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {side.troops.map((entry) => {
                    const total = entry.count * entry.each;
                    return (
                      <tr key={entry.troop} data-testid="battle-troop">
                        <td>
                          {t(`troop.${entry.troop}.name`)}
                          {entry.strong && (
                            <span
                              className="battle-strong"
                              title={t("battle.strong")}
                            >{` ×${String(BALANCE.hunt.strongMultiplier)}`}</span>
                          )}
                        </td>
                        <td>{n(entry.count)}</td>
                        <td>
                          {n(total)}
                          <small>
                            {n(entry.count)} × {n(entry.each)}
                          </small>
                        </td>
                        <td>{Math.round((100 * total) / Math.max(1, side.total))} %</td>
                        <td className={entry.lost > 0 ? "is-lost" : ""}>
                          {entry.lost > 0 ? `−${n(entry.lost)}` : "0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {side.troops.length === 0 && mine && (
              <p className="battle-note">{t("battle.noTroops")}</p>
            )}
            {side.lines.length > 0 && (
              <ul className="battle-lines">
                {side.lines.map((entry, index) => {
                  // La première ligne d'un camp sans cellules est son point de départ : sans signe.
                  const start = index === 0 && side.troops.length === 0;
                  const sign = start ? "" : entry.value < 0 ? "−" : "+";
                  return (
                    <li key={entry.key} data-testid={`battle-line-${entry.key}`}>
                      <span>{lineLabel(t, entry)}</span>
                      <span>
                        {sign}
                        {n(Math.abs(entry.value))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {side.troops.length === 0 && !mine && (
              <p className="battle-note">{t("battle.simulated")}</p>
            )}
            {side.lossPercent !== null && (
              <p className="battle-losses" data-testid={`battle-losses-${id}`}>
                {lossText(t, n, side, id === "attacker")}
              </p>
            )}
          </section>
        );
      })}

      {(["sugar", "bricks", "proteins"] as const).some((id) => report[id] > 0) && (
        <section className="battle-side">
          <h3>{t(taken ? "battle.loot.taken" : "battle.loot.gained")}</h3>
          <p className="journal-detail">
            {(["sugar", "bricks", "proteins"] as const)
              .filter((id) => report[id] > 0)
              .map((id) => (
                <span key={id}>
                  <ResourceIcon id={id} />
                  {taken ? "−" : "+"}
                  {formatAmount(report[id], lang)}
                </span>
              ))}
          </p>
          {report.lost > 0 && (
            <p className="battle-note">
              {formatAmount(report.lost, lang)} {t("reports.overflow")}
            </p>
          )}
        </section>
      )}

      <section className="battle-rules">
        <h3>{t("battle.rulesTitle")}</h3>
        <p>
          {fill(t(raid ? "battle.rules.raid" : "battle.rules.defense"), {
            a: String(BALANCE.rivals.combat.attackerLossPercent),
            d: String(BALANCE.rivals.combat.defenderLossPercent),
            min: String(BALANCE.rivals.combat.minLossPercent),
            max: String(BALANCE.rivals.combat.maxLossPercent),
          })}
        </p>
      </section>
    </SheetFrame>
  );
}

/**
 * Les pertes : la part que le combat prend, puis ce qu'il en reste une fois comptés les
 * pouvoirs qui épargnent des cellules (recherche militaire).
 */
function lossText(
  t: (key: TextKey) => string,
  n: (value: number) => string,
  side: BattleSide,
  attacker: boolean,
): string {
  const size = side.troops.reduce((sum, entry) => sum + entry.count, 0);
  const lost = side.troops.reduce((sum, entry) => sum + entry.lost, 0);
  // L'attaque garde toujours une survivante pour rentrer.
  const most = attacker ? Math.max(0, size - 1) : size;
  const planned = Math.min(most, Math.floor((size * (side.lossPercent ?? 0)) / 100));
  const text = fill(t("battle.losses"), { p: String(side.lossPercent ?? 0), n: n(lost) });
  return planned > lost ? `${text} ${fill(t("battle.spared"), { k: n(planned - lost) })}` : text;
}

function lineLabel(t: (key: TextKey) => string, entry: BattleLine): string {
  const percent = String(Math.abs(entry.percent));
  return t(`battle.line.${entry.key}`).replace("{p}", percent);
}
