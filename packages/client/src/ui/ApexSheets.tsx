import {
  MICRO,
  apexArrivals,
  apexLineage,
  apexOffer,
  crisisKind,
  crisisOf,
  leagueOf,
  ranking,
  seasonDay,
  speciesOf,
} from "@o27/core";
import type { PlayerState } from "@o27/core";
import { BALANCE, RESOURCE_IDS, SEASON_DAYS } from "@o27/data";
import type { Order, TextKey } from "@o27/data";
import { useEffect, useState } from "react";
import { formatAmount, formatCountdown, translate } from "../game/text";
import type { Lang } from "../game/text";
import { ResourceIcon } from "./icons";
import { SheetFrame } from "./SheetFrame";
import { StorageHint } from "./StorageHint";

const RULES = BALANCE.apex;

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
}

/** La course à l'APEX : la lignée que les gènes dessinent, ce qu'il faut pour sortir des eaux, les récompenses. */
export function ApexSheet(
  props: Props & {
    readonly onOrder: (order: Order) => boolean;
    /** Ouvre la fiche de la Vacuole, quand la réserve est trop petite pour le prix. */
    readonly onOpenStore: () => void;
  },
) {
  const { state, lang, onClose, onOrder, onOpenStore } = props;
  const t = (key: TextKey): string => translate(lang, key);
  const offer = apexOffer(state);
  const lineage = apexLineage(state);
  const apex = state.apex;
  let from = 1;
  const bands = RULES.rewards.map((band) => {
    const first = from;
    from = band.toPlace + 1;
    return { ...band, first };
  });
  let blocked: string | null = null;
  if (offer.blocked === "zoneClosed") blocked = t("apex.needsZone");
  else if (offer.blocked === "needsNucleus") {
    blocked = t("apex.needsNucleus").replace("{n}", String(RULES.nucleusLevel));
  } else if (RESOURCE_IDS.some((id) => state.resources[id] < offer.cost[id])) {
    blocked = t("state.missing");
  }
  return (
    <SheetFrame
      title={t("label.apex")}
      testId="apex-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("apex.text").replace("{n}", String(RULES.nucleusLevel))}</p>
      <aside className="fossil" data-testid="apex-lineage" data-lineage={lineage}>
        <p className="gazette-kicker">{t("apex.lineage")}</p>
        <p>
          <strong>{t(`lineage.${lineage}.name`)}</strong>
        </p>
        <p>{t(`lineage.${lineage}.text`)}</p>
      </aside>
      <p className="sheet-level" data-testid="apex-arrived">
        {apexArrivals(state, state.now)} {t("apex.arrived")}
      </p>
      {apex === null ? (
        <>
          <div className="costs">
            {RESOURCE_IDS.map((id) => (
              <span
                key={id}
                className={`cost${state.resources[id] < offer.cost[id] ? " is-missing" : ""}`}
              >
                <ResourceIcon id={id} />
                {formatAmount(offer.cost[id], lang)}
              </span>
            ))}
            <span className="cost cost-time">{formatCountdown(offer.durationMs, lang)}</span>
          </div>
          <StorageHint state={state} cost={offer.cost} lang={lang} onOpenStore={onOpenStore} />
          {blocked !== null && (
            <p className="sheet-building" data-testid="apex-status">
              {blocked}
            </p>
          )}
          <button
            type="button"
            className="button"
            disabled={blocked !== null}
            data-testid="apex-go"
            onClick={() => {
              onOrder({ type: "leaveWater" });
            }}
          >
            {t("action.leaveWater")}
          </button>
        </>
      ) : apex.place === 0 ? (
        <p className="sheet-building" data-testid="apex-status">
          {t("apex.going")} · {formatCountdown(apex.endsAt - state.now, lang)}
        </p>
      ) : (
        <p className="gazette-headline" data-testid="apex-status">
          {t("apex.done")} · {t("apex.place").replace("{n}", String(apex.place))}
        </p>
      )}

      <h3 className="sheet-title">{t("apex.rewards")}</h3>
      <ul className="contest-bands" data-testid="apex-rewards">
        {bands.map((band) => (
          <li key={band.toPlace}>
            <strong>
              {band.first === band.toPlace
                ? t("apex.band").replace("{a}", String(band.first))
                : t("apex.bandTo")
                    .replace("{a}", String(band.first))
                    .replace("{b}", String(band.toPlace))}
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
    </SheetFrame>
  );
}

/** Une planche du Muséum : ce qu'une espèce était à la fin d'une saison. */
interface Plate {
  readonly season: number;
  readonly name: string;
  readonly cousin: string;
  readonly rank: number;
  readonly of: number;
  readonly league: number;
  /** La lignée sortie des eaux, et sa place ; vide si l'espèce est restée dans l'eau. */
  readonly lineage: string;
  readonly place: number;
  readonly crisis: string;
}

const MUSEUM_KEY = "o27.museum";

function readPlates(): Plate[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(MUSEUM_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as Plate[]) : [];
  } catch {
    return [];
  }
}

/** La planche de l'espèce du joueur, à l'instant de son état. */
function plateOf(state: PlayerState): Plate {
  const species = speciesOf(state);
  const power = ranking(state, "power");
  const crisis = crisisOf(state);
  return {
    season: state.seasonStart,
    name: species.name,
    cousin: species.cousin,
    rank: power.mine.rank,
    of: power.rows.length,
    league: leagueOf(power.mine.rank, power.rows.length),
    lineage: state.apex !== null && state.apex.place > 0 ? apexLineage(state) : "",
    place: state.apex?.place ?? 0,
    crisis: crisis !== null && crisis.phase === "done" ? crisisKind(state.worldSeed) : "",
  };
}

/**
 * Le Muséum : la planche de l'espèce telle qu'elle serait gardée aujourd'hui, et celles des
 * saisons finies sur cet appareil. La saison terminée, la planche y entre toute seule.
 */
export function MuseumSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const mine = plateOf(state);
  const over = seasonDay(state, state.now) > SEASON_DAYS;
  const [plates, setPlates] = useState<Plate[]>(readPlates);
  useEffect(() => {
    if (!over) return;
    const kept = readPlates();
    if (kept.some((plate) => plate.season === mine.season)) return;
    const next = [mine, ...kept].slice(0, 20);
    window.localStorage.setItem(MUSEUM_KEY, JSON.stringify(next));
    setPlates(next);
    // La planche n'entre qu'une fois, à la fin : seul le passage de la fin de saison compte.
  }, [over]);
  const show = (plate: Plate, key: string) => (
    <aside key={key} className="fossil" data-testid="museum-plate">
      <p className="species-name">{plate.name}</p>
      <p>
        {t("species.rank").replace("{n}", String(plate.rank)).replace("{total}", String(plate.of))}{" "}
        · {t(`league.${String(plate.league)}.name` as TextKey)}
      </p>
      <p>
        {t("species.cousin")} : {t(`fossil.${plate.cousin}.name` as TextKey)}
      </p>
      <p>
        {plate.lineage === ""
          ? t("museum.aquatic")
          : `${t(`lineage.${plate.lineage}.name` as TextKey)} · ${t("apex.place").replace("{n}", String(plate.place))}`}
      </p>
      {plate.crisis !== "" && (
        <p>{t("museum.survivor").replace("{name}", t(`crisis.${plate.crisis}.name` as TextKey))}</p>
      )}
    </aside>
  );
  return (
    <SheetFrame
      title={t("label.museum")}
      testId="museum-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t("museum.text")}</p>
      {!over && (
        <>
          <h3 className="sheet-title">{t("museum.now")}</h3>
          {show(mine, "now")}
        </>
      )}
      <h3 className="sheet-title">{t("museum.kept")}</h3>
      {plates.length === 0 && (
        <p className="sheet-building" data-testid="museum-none">
          {t("museum.none")}
        </p>
      )}
      {plates.map((plate) => show(plate, String(plate.season)))}
    </SheetFrame>
  );
}
