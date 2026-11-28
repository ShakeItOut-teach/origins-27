import {
  allianceLevel,
  allianceToday,
  allianceView,
  bannerRelation,
  bannerList,
  benchOf,
  benchPoints,
  donationCost,
  donationPoints,
  helpRequests,
  isOfficer,
  reinforcements,
  techLevel,
  techThreshold,
} from "@o27/core";
import type { PlayerState } from "@o27/core";
import type { ReactNode } from "react";
import { ALLIANCE_BRANCHES, ALLIANCE_SHOP_IDS, ALLIANCE_TECH_IDS, BALANCE } from "@o27/data";
import type { AllianceShopId, AllianceTechId, BannerId, Order, TextKey } from "@o27/data";
import { DISCORD_URL } from "../game/config";
import { formatAmount, formatCountdown, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";
import { RelationMark } from "./RelationMark";

const RULES = BALANCE.alliance;

/** Le sigle d'une bannière, entre crochets, comme on le lit à côté des noms. */
export function bannerTag(banner: BannerId): string {
  return `[${banner.toUpperCase()}]`;
}

/** Le sigle et le nom d'une bannière. */
export function bannerLabel(lang: Lang, banner: BannerId): string {
  return `${bannerTag(banner)} ${translate(lang, `banner.${banner}.name`)}`;
}

/** Ce qu'une technologie apporte à ce niveau : « Défense +6 % ». */
function techEffect(lang: Lang, tech: AllianceTechId, level: number): string {
  const data = RULES.techs[tech];
  const percent = data.percentPerLevel * level;
  const first = data.stats[0];
  const name =
    first === undefined
      ? translate(lang, "stat.reinforcements")
      : data.stats.length > 1
        ? translate(lang, "stat.production")
        : translate(lang, `stat.${first}` as TextKey);
  return `${name} ${percent > 0 ? "+" : "−"}${String(Math.abs(percent))} %`;
}

function shopLabel(lang: Lang, item: AllianceShopId): string {
  const text = translate(lang, `alliance.shop.${item}`);
  switch (item) {
    case "energy":
      return text.replace("{n}", String(RULES.shop.energy.amount));
    case "ration":
      return text.replace("{n}", String(RULES.shop.ration.proteins));
    case "shield":
      return text.replace("{n}", String(RULES.shop.shield.hours));
    case "instant":
      return text;
  }
}

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
  /** Les fils d'alliance (attaques et espionnages du banc), lus par l'écran principal. */
  readonly children?: ReactNode;
  /** Le chef de la bannière et les guerres. */
  readonly politics?: ReactNode;
  /** La discussion du banc. */
  readonly chat?: ReactNode;
  /** Envoie un ordre ; renvoie vrai s'il a été accepté. */
  readonly onOrder: (order: Order) => boolean;
}

/**
 * L'alliance du joueur : sa bannière, ce qu'il y apporte, les technologies communes, l'entraide,
 * le cadeau du jour, la boutique, et les cinq autres bannières.
 */
export function AllianceSheet({ state, lang, onClose, onOrder, children, politics, chat }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const alliance = state.alliance;
  const view = allianceView(state);
  if (alliance === null || view === null) return null;

  const today = allianceToday(state);
  const officer = isOfficer(state);
  const requests = helpRequests(state);
  const cost = donationCost();
  const poor = state.resources.sugar < cost.sugar || state.resources.bricks < cost.bricks;
  const spent = today.donations >= RULES.donation.perDay;
  const free = alliance.freeUntil - state.now;
  const banners = bannerList(state);
  const mine = banners.find((row) => row.mine);
  const construction = state.construction;

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet sheet-tall"
        role="dialog"
        aria-modal="true"
        data-testid="alliance-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2 data-testid="alliance-name">{bannerLabel(lang, alliance.banner)}</h2>
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>
        <p className="sheet-role">{t("alliance.text")}</p>
        {children}
        <dl className="alliance-stats" data-testid="alliance-stats">
          <div>
            <dt>{t("label.level")}</dt>
            <dd data-testid="alliance-level">{allianceLevel(view)}</dd>
          </div>
          <div>
            <dt>{t("label.members")}</dt>
            <dd>
              {mine?.members ?? 0}
              <small>
                {" "}
                · {mine?.near ?? 0} {t("label.nearYou")}
              </small>
            </dd>
          </div>
          <div>
            <dt>{t("label.yourRank")}</dt>
            <dd data-testid="alliance-rank">{officer ? t("label.officer") : t("label.member")}</dd>
          </div>
          <div>
            <dt>{t("label.contribution")}</dt>
            <dd data-testid="alliance-points">
              {alliance.points}
              {!officer && <small> / {RULES.officerPoints}</small>}
            </dd>
          </div>
          <div>
            <dt>{t("label.credits")}</dt>
            <dd data-testid="alliance-credits">{alliance.credits}</dd>
          </div>
          <div>
            <dt>{t("label.reinforcements")}</dt>
            <dd data-testid="alliance-help">+{reinforcements(state, state.now)}</dd>
          </div>
        </dl>

        <div className="alliance-acts">
          <button
            type="button"
            className="button button-small"
            disabled={today.gift}
            data-testid="alliance-gift"
            onClick={() => {
              onOrder({ type: "claimGift" });
            }}
          >
            {today.gift ? t("state.giftClaimed") : t("action.claimGift")}
          </button>
          <button
            type="button"
            className="button button-small"
            disabled={requests === 0}
            data-testid="alliance-help-all"
            onClick={() => {
              onOrder({ type: "helpAllies" });
            }}
          >
            {requests === 0
              ? t("state.noHelp")
              : t("action.helpAll").replace("{n}", String(requests))}
          </button>
        </div>
        {/* Dans une alliance, la demande d'aide part toute seule : plus de bouton. */}
        {construction?.helped === true && (
          <p className="sheet-building" data-testid="alliance-auto-help">
            {t("alliance.autoHelp")}
          </p>
        )}

        {state.crowd !== undefined && (
          <section data-testid="alliance-bench">
            <h3 className="sheet-title">{t("bench.title")}</h3>
            {benchOf(state, alliance.banner).length === 0 ? (
              <p className="sheet-role">{t("bench.alone")}</p>
            ) : (
              <>
                <p className="sheet-role">
                  {t("bench.text")
                    .replace("{n}", String(benchOf(state, alliance.banner).length))
                    .replace("{points}", String(benchPoints(state, alliance.banner)))}
                </p>
                <ol className="rank-list" data-testid="bench-list">
                  {benchOf(state, alliance.banner).map((mate) => (
                    <li key={mate.slot} className="rank-row">
                      <span>{t("label.tierShort").replace("{n}", String(mate.tier))}</span>
                      <span className="rank-name">
                        <RelationMark relation="ally" lang={lang} />
                        {mate.name}
                        <span className="human-tag">{t("label.human")}</span>
                      </span>
                      <span className="rank-score">
                        {t("bench.given").replace("{n}", String(mate.given))}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}

        {politics}
        {chat}

        <h3 className="sheet-title">{t("label.techs")}</h3>
        <p className="sheet-role" data-testid="alliance-donations">
          {t("alliance.techText")
            .replace("{n}", String(RULES.donation.points))
            .replace(
              "{m}",
              String(Math.floor((RULES.donation.points * RULES.donation.recommendedPercent) / 100)),
            )
            .replace("{done}", String(today.donations))
            .replace("{max}", String(RULES.donation.perDay))}
          {officer && ` ${t("alliance.officerText")}`}
        </p>
        <div className="costs">
          <span className={`cost${state.resources.sugar < cost.sugar ? " is-missing" : ""}`}>
            <ResourceIcon id="sugar" />
            {formatAmount(cost.sugar, lang)}
          </span>
          <span className={`cost${state.resources.bricks < cost.bricks ? " is-missing" : ""}`}>
            <ResourceIcon id="bricks" />
            {formatAmount(cost.bricks, lang)}
          </span>
        </div>
        {ALLIANCE_BRANCHES.map((branch) => (
          <section key={branch} className="branch">
            <h3>{t(`alliance.branch.${branch}`)}</h3>
            {ALLIANCE_TECH_IDS.filter((id) => RULES.techs[id].branch === branch).map((id) => {
              const points = view.tech[id];
              const level = techLevel(points);
              const maxed = level >= RULES.tech.maxLevel;
              const from = techThreshold(level);
              const need = techThreshold(level + 1) - from;
              const recommended = view.recommended === id;
              return (
                <div
                  key={id}
                  className={`tech-row${recommended ? " is-recommended" : ""}`}
                  data-testid={`tech-${id}`}
                  data-level={level}
                >
                  <div className="tech-head">
                    <strong>{t(`alliance.tech.${id}.name`)}</strong>
                    <span className="tech-level">
                      {t("label.level")} {level} / {RULES.tech.maxLevel}
                    </span>
                  </div>
                  <p className="tech-effect">
                    {level > 0 && techEffect(lang, id, level)}
                    {level > 0 && !maxed && " → "}
                    {!maxed && techEffect(lang, id, level + 1)}
                    {recommended && <span className="badge">{t("label.recommended")}</span>}
                  </p>
                  {!maxed && (
                    <div className="tech-act">
                      <span className="tech-bar" aria-hidden="true">
                        <i
                          style={{
                            width: `${String(Math.round(((points - from) / need) * 100))}%`,
                          }}
                        />
                      </span>
                      <span className="tech-points">
                        {points - from} / {need}
                      </span>
                      {officer && !recommended && (
                        <button
                          type="button"
                          className="button button-small button-quiet"
                          data-testid={`recommend-${id}`}
                          onClick={() => {
                            onOrder({ type: "recommend", tech: id });
                          }}
                        >
                          {t("action.recommend")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="button button-small"
                        disabled={poor || spent}
                        data-testid={`donate-${id}`}
                        onClick={() => {
                          onOrder({ type: "donate", tech: id });
                        }}
                      >
                        {t("action.donate")} +{donationPoints(state, id)}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}

        <h3 className="sheet-title">{t("label.shop")}</h3>
        <p className="sheet-role">{t("alliance.shopText")}</p>
        <div className="shop" data-testid="alliance-shop">
          {ALLIANCE_SHOP_IDS.map((item) => {
            const price = RULES.shop[item].price;
            return (
              <button
                key={item}
                type="button"
                className="shop-item"
                disabled={alliance.credits < price || (item === "instant" && construction === null)}
                data-testid={`shop-${item}`}
                onClick={() => {
                  onOrder({ type: "buyAlliance", item });
                }}
              >
                <span>{shopLabel(lang, item)}</span>
                <strong>{price}</strong>
              </button>
            );
          })}
        </div>

        <h3 className="sheet-title">{t("label.banners")}</h3>
        <p className="sheet-role" data-testid="alliance-switch">
          {free > 0
            ? `${t("alliance.free")} ${formatCountdown(free, lang)}.`
            : t("alliance.switchCost")}
        </p>
        <ul className="banner-list" data-testid="banner-list">
          {banners.map((row) => (
            <li
              key={row.banner}
              className={`banner-row${row.mine ? " is-mine" : ""}`}
              data-testid={`banner-${row.banner}`}
            >
              <span className="banner-name">
                <strong>
                  <RelationMark relation={bannerRelation(state, row.banner)} lang={lang} />
                  {bannerLabel(lang, row.banner)}
                </strong>
                <small>
                  {t("label.level")} {row.level} · {row.members} {t("label.members")} · {row.near}{" "}
                  {t("label.nearYou")}
                  {row.humans > 0 && ` · ${t("bench.humans").replace("{n}", String(row.humans))}`}
                </small>
              </span>
              {row.mine ? (
                <span className="badge">{t("label.yours")}</span>
              ) : (
                <button
                  type="button"
                  className="button button-small button-quiet"
                  data-testid={`join-${row.banner}`}
                  onClick={() => {
                    onOrder({ type: "joinAlliance", banner: row.banner });
                  }}
                >
                  {t("action.join")}
                </button>
              )}
            </li>
          ))}
        </ul>
        <a
          className="button button-quiet"
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="alliance-discord"
        >
          {t("gazette.discord")}
        </a>
      </div>
    </div>
  );
}
