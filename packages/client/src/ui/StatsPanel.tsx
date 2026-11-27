import type { TextKey } from "@o27/data";
import type { GameStats, Share, FightStats } from "../game/community";
import { formatAmount, formatDuration, translate } from "../game/text";
import type { Lang } from "../game/text";

interface Props {
  readonly stats: GameStats;
  readonly lang: Lang;
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${String(Math.round((part * 100) / whole))} %` : "â€“";
}

/**
 * Les statistiques du jeu, pour un gardien : qui vient, qui revient, oÃ¹ en sont les joueurs,
 * ce qui est jouÃ©, d'oÃ¹ ils arrivent, et leurs avis. Que des totaux.
 */
export function StatsPanel({ stats, lang }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const totals: readonly (readonly [TextKey, number])[] = [
    ["stats.players", stats.players],
    ["stats.today", stats.activeToday],
    ["stats.week", stats.active7Days],
    ["stats.linked", stats.linkedAccounts],
    ["stats.installed", stats.installed],
  ];
  const mostPlayers = Math.max(1, ...stats.tiers.map((tier) => tier.players));
  const shareList = (title: TextKey, list: readonly Share[], testId: string) =>
    list.length > 0 && (
      <section data-testid={testId}>
        <h3 className="sheet-title">{t(title)}</h3>
        <ul className="stat-list">
          {list.map((share) => (
            <li key={share.name}>
              <span>{share.name}</span>
              <strong>{share.players}</strong>
              <small>{percent(share.players, stats.players)}</small>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="stats" data-testid="stats">
      <dl className="stat-totals">
        {totals.map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section data-testid="stats-retention">
        <h3 className="sheet-title">{t("stats.retention.title")}</h3>
        <p className="account-note">{t("stats.retention.text")}</p>
        <ul className="stat-list">
          {stats.retention.map((row) => (
            <li key={row.day}>
              <span>
                {t("stats.retention.row").replace("{n}", String(row.day))}{" "}
                <small>{t("stats.retention.of").replace("{n}", String(row.arrived))}</small>
              </span>
              <strong>{percent(row.returned, row.arrived)}</strong>
              <small>{percent(row.returnedOrLater, row.arrived)}</small>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="stats-tiers">
        <h3 className="sheet-title">{t("stats.tiers.title")}</h3>
        <ul className="stat-list">
          {stats.tiers.map((tier) => (
            <li key={tier.tier}>
              <span>{t("stats.tier").replace("{n}", String(tier.tier))}</span>
              <span className="stat-bar" aria-hidden="true">
                <i style={{ width: `${String((tier.players * 100) / mostPlayers)}%` }} />
              </span>
              <strong>{tier.players}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="stats-days">
        <h3 className="sheet-title">{t("stats.days.title")}</h3>
        <div className="stat-scroll">
          <table className="stat-table">
            <thead>
              <tr>
                <th>{t("stats.col.day")}</th>
                <th>{t("stats.col.new")}</th>
                <th>{t("stats.col.active")}</th>
                <th>{t("stats.col.visits")}</th>
                <th>{t("stats.col.orders")}</th>
                <th>{t("stats.col.time")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.days.map((day) => (
                <tr key={day.day}>
                  <td>{day.day.slice(5)}</td>
                  <td>{day.newPlayers}</td>
                  <td>{day.active}</td>
                  <td>{day.visits}</td>
                  <td>{day.orders}</td>
                  <td>{day.seconds > 0 ? formatDuration(day.seconds * 1000) : "â€“"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {stats.orders.length > 0 && (
        <section data-testid="stats-orders">
          <h3 className="sheet-title">{t("stats.orders.title")}</h3>
          <ul className="stat-list">
            {stats.orders.map((order) => (
              <li key={order.type}>
                <span>{order.type}</span>
                <strong>{order.accepted}</strong>
                <small>
                  {order.refused > 0 ? `${String(order.refused)} ${t("stats.refused")}` : ""}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.ocean !== null && (
        <section data-testid="stats-ocean">
          <h3 className="sheet-title">{t("stats.ocean.title")}</h3>
          <ul className="stat-list">
            <li>
              <span>{t("stats.ocean.humans")}</span>
              <strong>{stats.ocean.humans}</strong>
              <small>{t("stats.ocean.active").replace("{n}", String(stats.ocean.active24h))}</small>
            </li>
            <li>
              <span>{t("stats.ocean.power")}</span>
              <strong>{stats.ocean.averagePower}</strong>
              <small>{t("stats.ocean.top").replace("{n}", String(stats.ocean.topPower))}</small>
            </li>
            <li>
              <span>{t("stats.ocean.taken")}</span>
              <strong>{formatAmount(stats.ocean.taken, lang)}</strong>
              <small />
            </li>
            {stats.ocean.families.map((family) => (
              <li key={family.name}>
                <span>
                  {family.name === "?"
                    ? t("stats.ocean.noGenes")
                    : t(`family.${family.name}.name` as TextKey)}
                </span>
                <strong>{family.players}</strong>
                <small>{percent(family.players, stats.ocean?.humans ?? 0)}</small>
              </li>
            ))}
          </ul>
          {stats.ocean.benches.length > 0 && (
            <>
              <h3 className="sheet-title">{t("stats.benches.title")}</h3>
              <ul className="stat-list" data-testid="stats-benches">
                {stats.ocean.benches.map((bench) => (
                  <li key={bench.banner}>
                    <span>[{bench.banner.toUpperCase()}]</span>
                    <strong>{bench.players}</strong>
                    <small>{t("bench.given").replace("{n}", String(bench.given))}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
          {stats.ocean.refusals.length > 0 && (
            <>
              <h3 className="sheet-title">{t("stats.refusals.title")}</h3>
              <p className="account-note">{t("stats.refusals.text")}</p>
              <ul className="stat-list" data-testid="stats-refusals">
                {stats.ocean.refusals.map((refusal) => (
                  <li key={refusal.code}>
                    <span>{refusal.code}</span>
                    <strong>{refusal.count}</strong>
                    <small />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {stats.fights !== null && <FightsList t={t} fights={stats.fights} />}

      {shareList("stats.sources.title", stats.sources, "stats-sources")}
      {shareList("stats.devices.title", stats.devices, "stats-devices")}
      {shareList("stats.languages.title", stats.languages, "stats-languages")}

      <section data-testid="stats-feedback">
        <h3 className="sheet-title">{t("stats.feedback.title")}</h3>
        {stats.feedback.count === 0 ? (
          <p className="account-note">{t("stats.feedback.none")}</p>
        ) : (
          <p className="sheet-level">
            {t("stats.feedback.summary")
              .replace("{n}", String(stats.feedback.count))
              .replace(
                "{m}",
                stats.feedback.average === null ? "â€“" : String(stats.feedback.average),
              )}
          </p>
        )}
        <ul className="stat-feedback">
          {stats.feedback.latest.map((entry, index) => (
            <li key={`${entry.day}-${String(index)}`}>
              <small>
                {entry.rating !== null && `${"â˜…".repeat(entry.rating)} Â· `}
                {t("stats.feedback.row")
                  .replace("{d}", String(entry.seasonDay))
                  .replace("{t}", String(entry.tier))}
                {entry.lang !== "" && ` Â· ${entry.lang}`}
              </small>
              {entry.text !== "" && <span>{entry.text}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Les combats entre humains, sur la semaine : ce qu'il faut pour juger les garde-fous. */
function FightsList({
  t,
  fights,
}: {
  readonly t: (key: TextKey) => string;
  readonly fights: FightStats;
}) {
  const sum = (pick: (day: FightStats["days"][number]) => number): number =>
    fights.days.reduce((total, day) => total + pick(day), 0);
  const fought = sum((day) => day.fights);
  const average = (pick: (day: FightStats["days"][number]) => number): string => {
    if (fought === 0) return "0";
    const weighted = fights.days.reduce((total, day) => total + pick(day) * day.fights, 0);
    return String(Math.round((10 * weighted) / fought) / 10);
  };
  const spies = fights.spyDays.reduce((total, day) => total + day.spies, 0);
  const succeeded = fights.spyDays.reduce((total, day) => total + day.succeeded, 0);
  return (
    <section data-testid="stats-fights">
      <h3 className="sheet-title">{t("stats.fights.title")}</h3>
      <ul className="stat-list">
        <li>
          <span>{t("stats.fights.attacks")}</span>
          <strong>{sum((day) => day.attacks)}</strong>
          <small>{t("stats.fights.season").replace("{n}", String(fights.attacks))}</small>
        </li>
        <li>
          <span>{t("stats.fights.wins")}</span>
          <strong>{sum((day) => day.wins)}</strong>
          <small>{t("stats.fights.of").replace("{n}", String(fought))}</small>
        </li>
        <li>
          <span>{t("stats.fights.losses")}</span>
          <strong>{average((day) => day.attackerLoss)}</strong>
          <small>
            {t("stats.fights.lossesRow")
              .replace(
                "{a}",
                average((day) => day.attackerLoss),
              )
              .replace(
                "{d}",
                average((day) => day.defenderLoss),
              )}
          </small>
        </li>
        <li>
          <span>{t("stats.fights.other")}</span>
          <strong>{sum((day) => day.bounced + day.recalled)}</strong>
          <small>
            {t("stats.fights.otherRow")
              .replace("{b}", String(sum((day) => day.bounced)))
              .replace("{r}", String(sum((day) => day.recalled)))}
          </small>
        </li>
        <li>
          <span>{t("stats.fights.helpers")}</span>
          <strong>{sum((day) => day.helpers)}</strong>
          <small />
        </li>
        <li>
          <span>{t("stats.fights.loot")}</span>
          <strong>{sum((day) => day.loot)}</strong>
          <small />
        </li>
        <li>
          <span>{t("stats.fights.spies")}</span>
          <strong>{succeeded}</strong>
          <small>{t("stats.fights.spiesRow").replace("{n}", String(spies))}</small>
        </li>
      </ul>
    </section>
  );
}
