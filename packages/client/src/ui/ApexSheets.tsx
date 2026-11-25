import { MICRO, apexArrivals, apexLineage, apexOffer, museumPlate, seasonOver } from "@o27/core";
import type { MuseumPlate, PlayerState } from "@o27/core";
import { BALANCE, RESOURCE_IDS } from "@o27/data";
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

const MUSEUM_KEY = "o27.museum";

/** Les planches gardées sur l'appareil : celles d'avant le serveur, et celles de l'essai. */
function localPlates(): MuseumPlate[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(MUSEUM_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as MuseumPlate[]) : [];
  } catch {
    return [];
  }
}

interface MuseumProps extends Props {
  /** Lit les planches gardées par le serveur ; absent quand le jeu tourne sans serveur. */
  readonly loadPlates: (() => Promise<MuseumPlate[]>) | null;
}

/**
 * Le Muséum : la planche de l'espèce telle qu'elle serait gardée aujourd'hui, et celles des
 * saisons finies. Le serveur les garde avec la partie : on les retrouve sur tout appareil.
 * Sans serveur, elles restent sur l'appareil.
 */
export function MuseumSheet({ state, lang, onClose, loadPlates }: MuseumProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const mine = museumPlate(state);
  const over = seasonOver(state, state.now);
  const [kept, setKept] = useState<MuseumPlate[]>(localPlates);
  const [remote, setRemote] = useState<MuseumPlate[]>([]);
  useEffect(() => {
    if (!over) return;
    const local = localPlates();
    if (local.some((plate) => plate.season === mine.season)) return;
    const next = [mine, ...local].slice(0, 20);
    window.localStorage.setItem(MUSEUM_KEY, JSON.stringify(next));
    setKept(next);
    // La planche n'entre qu'une fois, à la fin : seul le passage de la fin de saison compte.
  }, [over]);
  useEffect(() => {
    if (loadPlates === null) return;
    let alive = true;
    loadPlates().then(
      (found) => {
        if (alive) setRemote(found);
      },
      () => {
        // Pas de réponse : on montre ce que l'appareil a gardé.
      },
    );
    return () => {
      alive = false;
    };
  }, [loadPlates]);
  // Le serveur fait foi ; l'appareil complète. La saison en cours n'est pas une saison passée.
  const seasons = new Set(remote.map((plate) => plate.season));
  const plates = [...remote, ...kept.filter((plate) => !seasons.has(plate.season))]
    .filter((plate) => over || plate.season !== mine.season)
    .sort((one, other) => other.season - one.season);
  const show = (plate: MuseumPlate, key: string) => (
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
