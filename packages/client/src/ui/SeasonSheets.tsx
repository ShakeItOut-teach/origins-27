import { crisisFamily, crisisOf, ranking, speciesOf } from "@o27/core";
import type { PlayerState } from "@o27/core";
import { FOSSIL_AGES } from "@o27/data";
import type { TextKey } from "@o27/data";
import { useState } from "react";
import { formatCountdown, translate } from "../game/text";
import type { Lang } from "../game/text";
import { SheetFrame } from "./SheetFrame";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
}

/** La crise de saison : laquelle, quand, ce qu'elle fait au joueur, et comment s'y préparer. */
export function CrisisSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const crisis = crisisOf(state);
  if (crisis === null) return null;
  const family = t(`family.${crisisFamily(crisis.kind)}.name`);
  return (
    <SheetFrame
      title={t(`crisis.${crisis.kind}.name`)}
      testId="crisis-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="sheet-role">{t(`crisis.${crisis.kind}.text`)}</p>
      <p className="sheet-building" data-testid="crisis-when">
        {crisis.phase === "warning"
          ? `${t("label.crisis")} ${t("crisis.warning")} ${formatCountdown(crisis.startsAt - state.now, lang)}`
          : crisis.phase === "on"
            ? `${t("label.crisis")} ${t("crisis.on")} ${formatCountdown(crisis.endsAt - state.now, lang)}`
            : t("state.open")}
      </p>
      <p className="gazette-headline" data-testid="crisis-effect">
        {t("crisis.effect").replace(
          "{n}",
          `${crisis.percent > 0 ? "+" : "−"}${String(Math.abs(crisis.percent))}`,
        )}
      </p>
      <p className="sheet-role">{t("crisis.rule")}</p>
      <p className="sheet-level" data-testid="crisis-genes">
        {t(crisis.adapted ? "crisis.adapted" : "crisis.unprepared").replace("{family}", family)}
      </p>
    </SheetFrame>
  );
}

/** La planche de l'espèce : son nom latin, son cousin fossile, son rang. On peut la copier. */
export function SpeciesSheet({ state, lang, onClose }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const species = speciesOf(state);
  const power = ranking(state, "power");
  const [copied, setCopied] = useState(false);
  const rank = t("species.rank")
    .replace("{n}", String(power.mine.rank))
    .replace("{total}", String(power.rows.length));
  const cousin = `${t(`fossil.${species.cousin}.name`)} (${t("gazette.ago").replace("{n}", String(FOSSIL_AGES[species.cousin]))})`;
  const copy = (): void => {
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (clipboard === undefined) return;
    const text = [
      `*${species.name}*`,
      `${t("species.cousin")} : ${cousin}`,
      `${rank} · Origins 27`,
    ].join("\n");
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
      title={t("label.species")}
      testId="species-sheet"
      closeLabel={t("action.close")}
      onClose={onClose}
    >
      <p className="species-name" data-testid="species-name">
        {species.name}
      </p>
      <p className="sheet-role">{t("species.text")}</p>
      {species.family !== null && (
        <p className="sheet-level">
          {t("label.lineage")} : <strong>{t(`family.${species.family}.name`)}</strong> · {rank}
        </p>
      )}
      <aside className="fossil" data-testid="species-cousin">
        <p className="gazette-kicker">{t("species.cousin")}</p>
        <p>
          <strong>{cousin}</strong>
        </p>
        <p>{t(`fossil.${species.cousin}.fact`)}</p>
      </aside>
      <button type="button" className="button" data-testid="species-copy" onClick={copy}>
        {copied ? t("species.copied") : t("species.copy")}
      </button>
    </SheetFrame>
  );
}
